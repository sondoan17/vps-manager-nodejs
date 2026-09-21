package run

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	mathrand "math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
	"github.com/vps-manager/agent/internal/state"
)

// MetricsCollector is the interface for collecting system metrics.
type MetricsCollector interface {
	Collect(ctx context.Context) (*metrics.SystemMetrics, error)
}

// MetricsPusher is the interface for pushing metrics to the backend.
// Typed result carries the structured ingest acknowledgement; Docker is nil
// for config-only/v1 and stripped/invalid-ack responses.
type MetricsPusher interface {
	PushWithRetry(ctx context.Context, m *metrics.SystemMetrics) (*push.PushResult, error)
	Push(ctx context.Context, m *metrics.SystemMetrics) (*push.PushResult, error)
}

// DockerState is the narrow durable-state contract needed by the Runner.
// It is implemented by *state.Store methods already present; the Runner
// uses only these five methods and never touches state files directly.
type DockerState interface {
	InstanceID() string
	Sequence() uint64
	GetWatermark() state.Watermark
	GetPending() *state.PendingBatch
	PersistPending(state.PendingBatch) error
	CommitAcknowledgement(batchID, snapshotID, agentInstanceID string, committed state.Watermark) error
}

type Runner struct {
	cfg       *config.Config
	collector MetricsCollector
	pusher    MetricsPusher
	docker    DockerState
	runMu     sync.Mutex
}

// New creates a new Runner without Docker v2 state (v1/host-only behavior).
func New(cfg *config.Config, collector MetricsCollector, pusher MetricsPusher) *Runner {
	return &Runner{
		cfg:       cfg,
		collector: collector,
		pusher:    pusher,
	}
}

// NewWithState creates a Runner with durable Docker v2 state.
// A nil store preserves v1 behavior.
func NewWithState(cfg *config.Config, collector MetricsCollector, pusher MetricsPusher, st DockerState) *Runner {
	return &Runner{
		cfg:       cfg,
		collector: collector,
		pusher:    pusher,
		docker:    st,
	}
}

// SetDockerState attaches or detaches durable state after construction.
func (r *Runner) SetDockerState(st DockerState) {
	r.docker = st
}

// FinalizeDockerV2 attaches durable identity and event-protocol metadata before PersistPending.
func FinalizeDockerV2(st DockerState) func(*metrics.DockerMetricsV2) {
	return func(v2 *metrics.DockerMetricsV2) {
		if v2 == nil || st == nil {
			return
		}
		v2.AgentInstanceID = st.InstanceID()
		v2.SourceSequence = strconv.FormatUint(st.Sequence(), 10)
		v2.SnapshotID = opaqueID()
		if v2.EventWindow != nil && v2.FromWatermark != nil && v2.ProposedWatermark != nil {
			v2.BatchID = opaqueID()
		}
	}
}

func opaqueID() string {
	var b [24]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(b[:])
}

func (r *Runner) RunOnce(ctx context.Context) error {
	r.runMu.Lock()
	defer r.runMu.Unlock()
	log.Println("collecting metrics...")
	m, err := r.collector.Collect(ctx)
	if err != nil {
		return fmt.Errorf("collect: %w", err)
	}
	log.Printf("metrics collected: cpu=%.1f%% mem=%.1f%% disk=%.1f%% load=%.2f",
		m.CPU, m.Memory, m.Disk, m.LoadAverage)

	log.Println("pushing metrics...")
	if err := r.pushWithState(ctx, m); err != nil {
		return fmt.Errorf("push: %w", err)
	}
	log.Println("metrics pushed successfully")
	return nil
}

// RunLoop collects and pushes metrics on the configured interval.
// It uses retry/backoff on push failures. Returns when context is cancelled.
func (r *Runner) RunLoop(ctx context.Context) error {
	interval := time.Duration(r.cfg.IntervalSeconds) * time.Second
	log.Printf("starting loop mode (interval=%v)", interval)

	// Initial collection immediately
	if err := r.collectAndPush(ctx); err != nil {
		if push.IsFatal(err) {
			return fmt.Errorf("fatal push error, stopping: %w", err)
		}
		log.Printf("initial push failed: %v", err)
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("loop stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := r.collectAndPush(ctx); err != nil {
				// Fatal errors (auth, bad request) stop the loop immediately
				if push.IsFatal(err) {
					return fmt.Errorf("fatal push error, stopping: %w", err)
				}
				log.Printf("push failed: %v", err)
				// Add some backoff to avoid busy-looping on persistent errors
				backoff := time.Duration(mathrand.Int63n(int64(interval) / 2))
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(backoff):
				}
			}
		}
	}
}

func (r *Runner) collectAndPush(ctx context.Context) error {
	m, err := r.collector.Collect(ctx)
	if err != nil {
		return fmt.Errorf("collect: %w", err)
	}

	if err := r.pushWithState(ctx, m); err != nil {
		return fmt.Errorf("push: %w", err)
	}

	return nil
}

// pushWithState implements I2 pending/ack semantics around PushWithRetry.
// V1/config-only path (no complete v2 batch, or no state wired) pushes
// directly with no state interaction. V2 path persists the exact marshalled
// DockerV2 branch before push, replays the exact durable payload after
// restart, validates the typed ack, and commits only on matching committed
// watermark.
func (r *Runner) pushWithState(ctx context.Context, m *metrics.SystemMetrics) error {
	v2 := m.DockerV2
	if !isCompleteV2Batch(v2) {
		// Preserve v1 behavior: no state interaction.
		if _, err := r.pusher.PushWithRetry(ctx, m); err != nil {
			return err
		}
		return nil
	}
	if r.docker == nil {
		// No state wired: preserve v1 push behavior.
		if _, err := r.pusher.PushWithRetry(ctx, m); err != nil {
			return err
		}
		return nil
	}

	if existing := r.docker.GetPending(); existing != nil {
		// A pending batch already exists: never collect/create a later
		// event window. Reconstruct the exact durable DockerV2 branch,
		// validate it, attach it to the newly collected host metrics,
		// and push the reconstructed exact branch.
		// Never log event bodies; log only counts/ids.
		recon, err := reconstructPendingV2(existing, r.docker.InstanceID())
		if err != nil {
			log.Printf("docker v2: pending batchId=%q corrupt (%v), fail closed, pending preserved", existing.BatchID, err)
			return fmt.Errorf("docker v2: pending batch %q corrupt: %w", existing.BatchID, err)
		}
		retry := *m
		retry.DockerV2 = recon
		log.Printf("docker v2: pending batchId=%q exists, retrying exact pending payload", existing.BatchID)
		res, err := r.pusher.PushWithRetry(ctx, &retry)
		if err != nil {
			// 409, transport failures, fatal errors: leave pending.
			return err
		}
		return r.handleAck(res, existing)
	}

	// No existing pending: bind the batch to the current durable sequence
	// before marshaling; this value is then preserved in pending JSON.
	v2.SourceSequence = strconv.FormatUint(r.docker.Sequence(), 10)
	// marshal the exact branch with stable JSON, compute its digest, and
	// durably persist payload plus metadata before push.
	cand, err := derivePendingWithPayload(v2, r.docker.InstanceID())
	if err != nil {
		log.Printf("docker v2: collected batch invalid, pushing host-only")
		stripped := stripDockerV2(m)
		if _, pushErr := r.pusher.PushWithRetry(ctx, stripped); pushErr != nil {
			return pushErr
		}
		return fmt.Errorf("docker v2: collected batch invalid: %w", err)
	}
	if err := r.docker.PersistPending(cand); err != nil {
		// A durable write failure is not safe to downgrade to a host-only
		// push: doing so would acknowledge a snapshot whose Docker payload
		// was never durably recorded. Retry the same collection only after
		// the state store is healthy; the existing pending state is untouched.
		log.Printf("docker v2: persist batchId=%q failed, refusing host-only downgrade", cand.BatchID)
		return fmt.Errorf("docker v2: persist pending: %w", err)
	}
	res, err := r.pusher.PushWithRetry(ctx, m)
	if err != nil {
		// Crash after write/before request retries the single pending
		// batch next cycle; transport/409 failures leave pending.
		return err
	}
	return r.handleAck(res, &cand)
}

// handleAck validates the typed ack against the durable pending and the
// configured VPS/instance, then commits. Nil/malformed/mismatched acks,
// unexpected ingest statuses, 409-equivalents, and commit errors leave
// pending/watermark unchanged. committed, already_committed, and
// replay_ignored are accepted; the committed watermark must equal the pending
// proposed watermark exactly or pending is preserved.
func (r *Runner) handleAck(res *push.PushResult, pending *state.PendingBatch) error {
	if res == nil || res.Docker == nil {
		// V2 batch got a config-only/v1 response (old server, stripped
		// retry, or invalid ack failed closed to nil): host succeeded but
		// the batch is unacknowledged. Preserve pending for retry and
		// surface a non-fatal v2 error. Never log event bodies.
		log.Printf("docker v2: missing ack, host success, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: missing acknowledgement for batch %q", pending.BatchID)
	}
	ack := res.Docker
	switch ack.IngestStatus {
	case "committed", "already_committed", "replay_ignored":
		// All successful ingest outcomes carry the server's durable watermark.
		// replay_ignored is a successful idempotent outcome, not a failure.
	default:
		log.Printf("docker v2: ingestStatus=%q not committable, pending batchId=%q preserved", ack.IngestStatus, pending.BatchID)
		return fmt.Errorf("docker v2: ingest status %q not committable", ack.IngestStatus)
	}
	if r.cfg != nil && r.cfg.VpsId != "" && res.VpsId != "" && res.VpsId != r.cfg.VpsId {
		log.Printf("docker v2: vps mismatch, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: vps mismatch")
	}
	if r.cfg != nil && r.cfg.VpsId != "" && res.VpsId == "" {
		// Empty server VPS with a v2 ack cannot be matched safely.
		log.Printf("docker v2: empty vps in ack, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: vps mismatch")
	}
	if ack.BatchId != pending.BatchID || ack.SnapshotId != pending.SnapshotID || ack.AgentInstanceId != pending.AgentInstanceID {
		log.Printf("docker v2: ack id mismatch, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: acknowledgement id mismatch")
	}
	if ack.AgentInstanceId != r.docker.InstanceID() {
		log.Printf("docker v2: ack instance mismatch, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: acknowledgement instance mismatch")
	}
	committed, err := ackWatermarkToState(ack)
	if err != nil {
		log.Printf("docker v2: ack watermark invalid, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: acknowledgement watermark invalid: %w", err)
	}
	// Committed/proposed relationship: the server must confirm exactly the
	// batch this runner persisted. A stale, replayed, or foreign watermark
	// never advances local state, even if the store would reject it later.
	if !watermarkEqual(committed, pending.ProposedWatermark) {
		log.Printf("docker v2: committed watermark mismatch, pending batchId=%q preserved", pending.BatchID)
		return fmt.Errorf("docker v2: committed watermark mismatch")
	}
	if err := r.docker.CommitAcknowledgement(ack.BatchId, ack.SnapshotId, ack.AgentInstanceId, committed); err != nil {
		log.Printf("docker v2: commit batchId=%q failed, pending preserved", pending.BatchID)
		return fmt.Errorf("docker v2: commit: %w", err)
	}
	log.Printf("docker v2: committed batchId=%q watermark=%d", pending.BatchID, committed.TimeNano)
	return nil
}

// isCompleteV2Batch reports the all-or-none event protocol: batch carries
// events only when batchId+events+eventWindow+from+proposed are all present.
func isCompleteV2Batch(v2 *metrics.DockerMetricsV2) bool {
	if v2 == nil {
		return false
	}
	if v2.BatchID == "" {
		return false
	}
	if v2.Events == nil {
		return false
	}
	if v2.EventWindow == nil {
		return false
	}
	if v2.FromWatermark == nil || v2.ProposedWatermark == nil {
		return false
	}
	return true
}

func stripDockerV2(m *metrics.SystemMetrics) *metrics.SystemMetrics {
	if m == nil {
		return nil
	}
	cp := *m
	cp.DockerV2 = nil
	return &cp
}

// derivePendingWithPayload builds the durable representation from a collected
// complete batch. The exact DockerV2 branch is marshalled with stable JSON
// (encoding/json over the fixed struct shape), its SHA-256 digest computed,
// and both payload and metadata persisted in PendingBatch before push.
func derivePendingWithPayload(v2 *metrics.DockerMetricsV2, instanceID string) (state.PendingBatch, error) {
	var zero state.PendingBatch
	if v2 == nil || v2.SourceSequence == "" || v2.SourceSequence == "0" {
		return zero, fmt.Errorf("sourceSequence must be positive")
	}
	if v2 == nil {
		return zero, fmt.Errorf("nil v2 batch")
	}
	if v2.AgentInstanceID == "" || v2.AgentInstanceID != instanceID {
		return zero, fmt.Errorf("agentInstanceId mismatch")
	}
	from, err := watermarkToState(v2.FromWatermark)
	if err != nil {
		return zero, fmt.Errorf("fromWatermark: %w", err)
	}
	proposed, err := watermarkToState(v2.ProposedWatermark)
	if err != nil {
		return zero, fmt.Errorf("proposedWatermark: %w", err)
	}
	if v2.EventWindow == nil {
		return zero, fmt.Errorf("nil eventWindow")
	}
	until, err := parseNano(v2.EventWindow.Until)
	if err != nil {
		return zero, fmt.Errorf("eventWindow.until: %w", err)
	}
	digest, err := eventsDigest(v2.Events)
	if err != nil {
		return zero, fmt.Errorf("events digest: %w", err)
	}
	payload, err := json.Marshal(v2)
	if err != nil {
		return zero, fmt.Errorf("v2 marshal: %w", err)
	}
	if len(payload) == 0 || len(payload) > state.MaxV2PayloadBytes {
		return zero, fmt.Errorf("v2PayloadJSON oversize")
	}
	sum := sha256.Sum256(payload)
	return state.PendingBatch{
		BatchID:           v2.BatchID,
		SnapshotID:        v2.SnapshotID,
		SourceSequence:    v2.SourceSequence,
		AgentInstanceID:   v2.AgentInstanceID,
		FromWatermark:     from,
		ProposedWatermark: proposed,
		EventsDigest:      digest,
		EventWindowUntil:  until,
		V2PayloadJSON:     string(payload),
		V2PayloadDigest:   hex.EncodeToString(sum[:]),
	}, nil
}

// reconstructPendingV2 rebuilds the exact DockerMetricsV2 branch from durable
// pending state. It fail-closes on any corruption: empty payload, digest
// mismatch, malformed JSON, non-canonical bytes, incomplete batch, instance
// mismatch, or metadata/payload divergence. On success the returned branch
// re-marshals to the exact stored bytes.
func reconstructPendingV2(p *state.PendingBatch, instanceID string) (*metrics.DockerMetricsV2, error) {
	if p == nil {
		return nil, fmt.Errorf("nil pending")
	}
	if p.AgentInstanceID == "" || p.AgentInstanceID != instanceID {
		return nil, fmt.Errorf("agentInstanceId mismatch")
	}
	if p.V2PayloadJSON == "" {
		return nil, fmt.Errorf("empty v2PayloadJSON")
	}
	if len(p.V2PayloadJSON) > state.MaxV2PayloadBytes {
		return nil, fmt.Errorf("v2PayloadJSON oversize")
	}
	if p.V2PayloadDigest == "" {
		return nil, fmt.Errorf("empty v2PayloadDigest")
	}
	sum := sha256.Sum256([]byte(p.V2PayloadJSON))
	if hex.EncodeToString(sum[:]) != p.V2PayloadDigest {
		return nil, fmt.Errorf("v2PayloadDigest mismatch")
	}
	var v2 metrics.DockerMetricsV2
	dec := json.NewDecoder(bytes.NewReader([]byte(p.V2PayloadJSON)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v2); err != nil {
		return nil, fmt.Errorf("invalid v2PayloadJSON: %w", err)
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			return nil, fmt.Errorf("trailing v2PayloadJSON")
		}
		return nil, fmt.Errorf("trailing v2PayloadJSON: %w", err)
	}
	if !isCompleteV2Batch(&v2) {
		return nil, fmt.Errorf("incomplete v2 batch")
	}
	if v2.AgentInstanceID != instanceID {
		return nil, fmt.Errorf("agentInstanceId mismatch")
	}
	canon, err := json.Marshal(&v2)
	if err != nil {
		return nil, fmt.Errorf("v2 remarshal: %w", err)
	}
	if string(canon) != p.V2PayloadJSON {
		return nil, fmt.Errorf("v2PayloadJSON not canonical")
	}
	from, err := watermarkToState(v2.FromWatermark)
	if err != nil {
		return nil, fmt.Errorf("fromWatermark: %w", err)
	}
	if !watermarkEqual(from, p.FromWatermark) {
		return nil, fmt.Errorf("fromWatermark mismatch")
	}
	proposed, err := watermarkToState(v2.ProposedWatermark)
	if err != nil {
		return nil, fmt.Errorf("proposedWatermark: %w", err)
	}
	if !watermarkEqual(proposed, p.ProposedWatermark) {
		return nil, fmt.Errorf("proposedWatermark mismatch")
	}
	if v2.EventWindow == nil {
		return nil, fmt.Errorf("nil eventWindow")
	}
	until, err := parseNano(v2.EventWindow.Until)
	if err != nil {
		return nil, fmt.Errorf("eventWindow.until: %w", err)
	}
	if until != p.EventWindowUntil {
		return nil, fmt.Errorf("eventWindowUntil mismatch")
	}
	digest, err := eventsDigest(v2.Events)
	if err != nil {
		return nil, fmt.Errorf("events digest: %w", err)
	}
	if digest != p.EventsDigest {
		return nil, fmt.Errorf("eventsDigest mismatch")
	}
	if v2.BatchID != p.BatchID || v2.SnapshotID != p.SnapshotID {
		return nil, fmt.Errorf("batch id mismatch")
	}
	return &v2, nil
}

func watermarkToState(w *metrics.DockerEventWatermarkV2) (state.Watermark, error) {
	var zero state.Watermark
	if w == nil {
		return zero, fmt.Errorf("nil watermark")
	}
	n, err := parseNano(w.TimeNano)
	if err != nil {
		return zero, err
	}
	digests := append([]string(nil), w.BoundaryDigests...)
	if digests == nil {
		digests = []string{}
	}
	return state.Watermark{TimeNano: n, BoundaryDigests: digests}, nil
}

func parseNano(s string) (int64, error) {
	if s == "" || len(s) > 32 {
		return 0, fmt.Errorf("bad nano")
	}
	if s != "0" {
		if s[0] < '1' || s[0] > '9' {
			return 0, fmt.Errorf("bad nano")
		}
		for i := 1; i < len(s); i++ {
			if s[i] < '0' || s[i] > '9' {
				return 0, fmt.Errorf("bad nano")
			}
		}
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("bad nano: %w", err)
	}
	if n < 0 {
		return 0, fmt.Errorf("bad nano")
	}
	return n, nil
}

// eventsDigest is the bounded retry-equality representation: SHA-256 hex
// over the canonical JSON encoding of the transmitted events.
func eventsDigest(evs []metrics.DockerEventV2) (string, error) {
	if evs == nil {
		return "", fmt.Errorf("nil events")
	}
	b, err := json.Marshal(evs)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:]), nil
}

func watermarkEqual(a, b state.Watermark) bool {
	if a.TimeNano != b.TimeNano || len(a.BoundaryDigests) != len(b.BoundaryDigests) {
		return false
	}
	for i := range a.BoundaryDigests {
		if a.BoundaryDigests[i] != b.BoundaryDigests[i] {
			return false
		}
	}
	return true
}

func ackWatermarkToState(ack *push.DockerAck) (state.Watermark, error) {
	if ack == nil {
		return state.Watermark{}, fmt.Errorf("nil ack")
	}
	n, err := parseNano(ack.CommittedWatermark.TimeNano)
	if err != nil {
		return state.Watermark{}, err
	}
	digests := append([]string(nil), ack.CommittedWatermark.BoundaryDigests...)
	if digests == nil {
		digests = []string{}
	}
	return state.Watermark{TimeNano: n, BoundaryDigests: digests}, nil
}
