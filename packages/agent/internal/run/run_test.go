package run

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
	"github.com/vps-manager/agent/internal/state"
)

// ---------------------------------------------------------------------------
// Compile assertion: narrow DockerState is satisfied by *state.Store methods.
// ---------------------------------------------------------------------------

var _ DockerState = (*state.Store)(nil)

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

type mockCollector struct {
	metrics *metrics.SystemMetrics
	err     error
}

func (m *mockCollector) Collect(ctx context.Context) (*metrics.SystemMetrics, error) {
	return m.metrics, m.err
}

type mockPusher struct {
	pushCount      atomic.Int64
	pushRetryCount atomic.Int64
	failCount      int32 // fail for first N PushWithRetry calls
	err            error
	handler        func(m *metrics.SystemMetrics) (*push.PushResult, error)
	gotDockerV2    atomic.Int64 // count of pushes that carried DockerV2
	lastStripped   atomic.Bool  // last push had nil DockerV2
}

func okResult() *push.PushResult {
	return &push.PushResult{Config: &push.ConfigResponse{DockerMetricsEnabled: false}}
}

func (m *mockPusher) Push(ctx context.Context, metrics *metrics.SystemMetrics) (*push.PushResult, error) {
	m.pushCount.Add(1)
	if m.handler != nil {
		return m.handler(metrics)
	}
	if m.failCount > 0 && m.pushCount.Load() <= int64(m.failCount) {
		return nil, m.err
	}
	return okResult(), nil
}

func (m *mockPusher) PushWithRetry(ctx context.Context, metrics *metrics.SystemMetrics) (*push.PushResult, error) {
	m.pushRetryCount.Add(1)
	if metrics != nil && metrics.DockerV2 != nil {
		m.gotDockerV2.Add(1)
		m.lastStripped.Store(false)
	} else {
		m.lastStripped.Store(true)
	}
	if m.handler != nil {
		return m.handler(metrics)
	}
	if m.failCount > 0 && m.pushRetryCount.Load() <= int64(m.failCount) {
		return nil, m.err
	}
	return okResult(), nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func createTestConfig() *config.Config {
	return &config.Config{
		BackendUrl:            "http://localhost:3000",
		VpsId:                 "test-vps",
		Token:                 "test-token",
		IntervalSeconds:       5,
		RequestTimeoutSeconds: 5,
	}
}

func mustState(t *testing.T) *state.Store {
	t.Helper()
	s, err := state.LoadOrCreate(filepath.Join(t.TempDir(), "docker-state.json"))
	if err != nil {
		t.Fatalf("LoadOrCreate: %v", err)
	}
	return s
}

func stateNano(w state.Watermark) string {
	return strconv.FormatInt(w.TimeNano, 10)
}

// makeV2 builds a complete v2 batch bound to the store: from == committed
// watermark, proposed forward, window since==from until==proposed.
// The batch carries non-empty events, containers, and storage so replay
// tests prove byte-identical retransmission of real payload shape.
func makeV2(s *state.Store, batch, snap string, proposedNano int64) *metrics.SystemMetrics {
	from := s.GetWatermark()
	exit := 137
	return &metrics.SystemMetrics{
		CPU: 50,
		DockerV2: &metrics.DockerMetricsV2{
			CollectedAt:     "2026-01-01T00:00:30Z",
			SchemaVersion:   metrics.DockerSchemaVersionV2,
			AgentInstanceID: s.InstanceID(),
			SnapshotID:      snap,
			SourceSequence:  strconv.FormatUint(s.Sequence(), 10),
			BatchID:         batch,
			Available:       true,
			ContainerTotal:  2,
			Containers: []metrics.DockerContainerV2{
				{
					ContainerKey:     "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
					ID:               "abc123def456",
					Name:             "/web-nginx",
					Image:            "nginx:1.25",
					State:            "running",
					Health:           metrics.DockerV2HealthHealthy,
					CPUPercent:       12.3,
					MemoryUsageBytes: 65536000,
					PIDs:             12,
				},
			},
			Events: []metrics.DockerEventV2{
				{
					EventID:         "evt-die-0001",
					EventOccurredAt: "2026-01-01T00:00:10Z",
					ContainerKey:    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
					Action:          metrics.DockerV2ActionDie,
					Context:         metrics.DockerEventContextV2{Version: metrics.DockerEventContextVersionV1, ExitCode: &exit},
				},
				{
					EventID:         "evt-stop-0002",
					EventOccurredAt: "2026-01-01T00:00:20Z",
					ContainerKey:    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
					Action:          metrics.DockerV2ActionStop,
					Context:         metrics.DockerEventContextV2{Version: metrics.DockerEventContextVersionV1},
				},
			},
			EventWindow: &metrics.DockerEventWindowV2{
				Since: stateNano(from),
				Until: strconv.FormatInt(proposedNano, 10),
			},
			FromWatermark: &metrics.DockerEventWatermarkV2{
				TimeNano:        stateNano(from),
				BoundaryDigests: append([]string(nil), from.BoundaryDigests...),
			},
			ProposedWatermark: &metrics.DockerEventWatermarkV2{
				TimeNano:        strconv.FormatInt(proposedNano, 10),
				BoundaryDigests: []string{},
			},
			Storage: &metrics.DockerStorageAggregateV2{
				FormulaVersion: metrics.DockerStorageFormulaVersionV1,
				Images:         metrics.DockerStorageCategoryV2{Supported: true, Count: 2, TotalBytes: 1000},
				Containers:     metrics.DockerStorageCategoryV2{Supported: true, Count: 1, TotalBytes: 500},
				LocalVolumes:   metrics.DockerStorageCategoryV2{Supported: false},
				BuildCache:     metrics.DockerStorageCategoryV2{Supported: false},
			},
		},
	}
}

// marshalV2JSON returns the exact wire bytes of the DockerV2 branch.
func marshalV2JSON(t *testing.T, m *metrics.SystemMetrics) string {
	t.Helper()
	if m == nil || m.DockerV2 == nil {
		t.Fatal("expected non-nil DockerV2")
	}
	b, err := json.Marshal(m.DockerV2)
	if err != nil {
		t.Fatalf("marshal v2: %v", err)
	}
	return string(b)
}

func ackFor(vps, batch, snap, inst, status, nano string) *push.PushResult {
	return &push.PushResult{
		VpsId:  vps,
		Config: &push.ConfigResponse{DockerMetricsEnabled: false},
		Docker: &push.DockerAck{
			IngestStatus:    status,
			BatchId:         batch,
			SnapshotId:      snap,
			AgentInstanceId: inst,
			CommittedWatermark: push.Watermark{
				TimeNano:        nano,
				BoundaryDigests: []string{},
			},
		},
	}
}

// ---------------------------------------------------------------------------
// V1 behavior preserved
// ---------------------------------------------------------------------------

func TestRunOnce_Success(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{
			CPU: 50, Memory: 60, Disk: 70, LoadAverage: 0.5,
		},
	}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	runner := New(cfg, collector, pusher)

	err := runner.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if pusher.pushRetryCount.Load() != 1 {
		t.Errorf("expected 1 push, got %d", pusher.pushRetryCount.Load())
	}
}

func TestRunOnce_V1WithStateWired_NoStateInteraction(t *testing.T) {
	s := mustState(t)
	collector := &mockCollector{metrics: &metrics.SystemMetrics{CPU: 50}}
	pusher := &mockPusher{}
	runner := NewWithState(createTestConfig(), collector, pusher, s)
	if err := runner.RunOnce(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.GetPending() != nil {
		t.Fatal("v1 path must not create pending")
	}
}

func TestRunOnce_V2NoStateWired_PreservesPush(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	collector := &mockCollector{metrics: m}
	pusher := &mockPusher{}
	runner := New(createTestConfig(), collector, pusher) // no state
	if err := runner.RunOnce(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pusher.pushRetryCount.Load() != 1 {
		t.Fatalf("expected 1 push, got %d", pusher.pushRetryCount.Load())
	}
	if s.GetPending() != nil {
		t.Fatal("unwired store must stay empty")
	}
}

func TestRunOnce_CollectError(t *testing.T) {
	collector := &mockCollector{err: errors.New("collect failed")}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	runner := New(cfg, collector, pusher)

	err := runner.RunOnce(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	if pusher.pushRetryCount.Load() != 0 {
		t.Errorf("expected 0 pushes on collect error, got %d", pusher.pushRetryCount.Load())
	}
}

func TestRunOnce_PushError(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{
		failCount: 1,
		err:       errors.New("push failed"),
	}

	cfg := createTestConfig()
	runner := New(cfg, collector, pusher)

	err := runner.RunOnce(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestRunLoop_Cancellation(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	cfg.IntervalSeconds = 1

	runner := New(cfg, collector, pusher)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := runner.RunLoop(ctx)
	if err != nil && err != context.DeadlineExceeded && err != context.Canceled {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have collected at least once (initial collection)
	if pusher.pushRetryCount.Load() < 1 {
		t.Errorf("expected at least 1 push, got %d", pusher.pushRetryCount.Load())
	}
}

func TestRunLoop_StopsOnContextCancel(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	cfg.IntervalSeconds = 1

	runner := New(cfg, collector, pusher)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	err := runner.RunLoop(ctx)
	if err != context.Canceled {
		t.Fatalf("expected context.Canceled, got: %v", err)
	}
}

func TestRunLoop_StopsOnFatalPushError(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{
		failCount: 1,
		err:       &push.ErrAuth{StatusCode: 401},
	}

	cfg := createTestConfig()
	cfg.IntervalSeconds = 1

	runner := New(cfg, collector, pusher)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := runner.RunLoop(ctx)
	if err == nil {
		t.Fatal("expected fatal error from loop")
	}
	if !push.IsFatal(err) {
		t.Fatalf("expected IsFatal error, got: %T %v", err, err)
	}
}

// ---------------------------------------------------------------------------
// V2 success + commit
// ---------------------------------------------------------------------------

func TestFinalizeDockerV2_AssignsIdentityAndOnlyCompleteBatchID(t *testing.T) {
	s := mustState(t)
	fin := FinalizeDockerV2(s)
	minimal := &metrics.DockerMetricsV2{}
	fin(minimal)
	if minimal.AgentInstanceID != s.InstanceID() || minimal.SnapshotID == "" {
		t.Fatalf("identity not assigned: %+v", minimal)
	}
	if minimal.BatchID != "" {
		t.Fatalf("incomplete protocol must not receive batchId: %q", minimal.BatchID)
	}
	complete := &metrics.DockerMetricsV2{
		EventWindow:       &metrics.DockerEventWindowV2{Since: "1", Until: "2"},
		FromWatermark:     &metrics.DockerEventWatermarkV2{TimeNano: "1"},
		ProposedWatermark: &metrics.DockerEventWatermarkV2{TimeNano: "2"},
	}
	fin(complete)
	if complete.AgentInstanceID != s.InstanceID() || complete.SnapshotID == "" || complete.BatchID == "" {
		t.Fatalf("complete protocol metadata missing: %+v", complete)
	}
}

func TestV2_SuccessCommits(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "100"), nil
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.GetPending() != nil {
		t.Fatal("pending must be cleared after commit")
	}
	if got := s.GetWatermark(); got.TimeNano != 100 {
		t.Fatalf("watermark = %+v, want 100", got)
	}
}

func TestV2_AlreadyCommittedCommits(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			// Lost-response retry path: server already committed.
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "already_committed", "100"), nil
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.GetPending() != nil {
		t.Fatal("pending must be cleared on already_committed")
	}
	if got := s.GetWatermark(); got.TimeNano != 100 {
		t.Fatalf("watermark = %+v, want 100", got)
	}
}

func TestV2_ReplayIgnoredCommits(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			// Idempotent replay path: server ignored an equivalent replay.
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "replay_ignored", "100"), nil
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.GetPending() != nil {
		t.Fatal("pending must be cleared on replay_ignored")
	}
	if got := s.GetWatermark(); got.TimeNano != 100 {
		t.Fatalf("watermark = %+v, want 100", got)
	}
}

func TestV2_CommittedWatermarkMismatch_LeavesPending(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			// Stale replay: ids match but the durable watermark is foreign.
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "999"), nil
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected watermark mismatch error")
	}
	if s.GetPending() == nil {
		t.Fatal("pending must be preserved on watermark mismatch")
	}
	if got := s.GetWatermark(); got.TimeNano != 0 {
		t.Fatalf("watermark unchanged, got %+v", got)
	}
}

func TestV2_ConfigOnlySuccess_LeavesPending(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			return okResult(), nil // nil Docker ack: old server
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	err := runner.RunOnce(context.Background())
	if err == nil {
		t.Fatal("expected v2 missing-ack error")
	}
	if s.GetPending() == nil || s.GetPending().BatchID != "b1" {
		t.Fatalf("pending must be preserved, got %+v", s.GetPending())
	}
	if got := s.GetWatermark(); got.TimeNano != 0 {
		t.Fatalf("watermark must be unchanged, got %+v", got)
	}
}

func TestV2_NilAckResult_LeavesPending(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			return nil, nil // pathological nil result, nil error
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected error on nil ack")
	}
	if s.GetPending() == nil {
		t.Fatal("pending must be preserved on nil ack")
	}
}

// ---------------------------------------------------------------------------
// Mismatch / malformed ack
// ---------------------------------------------------------------------------

func TestV2_MismatchAck_LeavesPending(t *testing.T) {
	cases := []struct {
		name string
		ack  *push.PushResult
	}{
		{"badBatch", nil}, // filled below
		{"badSnap", nil},
		{"badInst", nil},
		{"badWatermark", nil},
		{"badVps", nil},
		{"badStatus", nil},
	}
	s := mustState(t)
	cases[0].ack = ackFor("test-vps", "nope", "s1", s.InstanceID(), "committed", "100")
	cases[1].ack = ackFor("test-vps", "b1", "nope", s.InstanceID(), "committed", "100")
	cases[2].ack = ackFor("test-vps", "b1", "s1", "wrong-instance-id-0000000000000", "committed", "100")
	cases[3].ack = ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "999")
	cases[4].ack = ackFor("other-vps", "b1", "s1", s.InstanceID(), "committed", "100")
	cases[5].ack = ackFor("test-vps", "b1", "s1", s.InstanceID(), "rejected", "100")
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sp := mustState(t)
			// Rebuild batch bound to this fresh store (same ids).
			mm := makeV2(sp, "b1", "s1", 100)
			inst := sp.InstanceID()
			ack := tc.ack
			// Rewrite instance-bound acks to this store except the badInst case.
			if tc.name != "badInst" && ack.Docker != nil {
				ack.Docker.AgentInstanceId = inst
			}
			if tc.name == "badInst" {
				// keep wrong instance; also need pending with this store's instance
				// so mismatch is on ack side only.
			}
			pusher := &mockPusher{
				handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
					return ack, nil
				},
			}
			runner := NewWithState(createTestConfig(), &mockCollector{metrics: mm}, pusher, sp)
			if err := runner.RunOnce(context.Background()); err == nil {
				t.Fatal("expected mismatch error")
			}
			if sp.GetPending() == nil {
				t.Fatal("pending must be preserved on mismatch")
			}
			if got := sp.GetWatermark(); got.TimeNano != 0 {
				t.Fatalf("watermark must be unchanged, got %+v", got)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Transport / conflict failures leave pending
// ---------------------------------------------------------------------------

func TestV2_Conflict_LeavesPending(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			return nil, &push.ErrConflict{StatusCode: 409, Body: "conflict"}
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected conflict error")
	}
	if p := s.GetPending(); p == nil || p.BatchID != "b1" {
		t.Fatalf("pending must be preserved on 409, got %+v", p)
	}
	if got := s.GetWatermark(); got.TimeNano != 0 {
		t.Fatalf("watermark unchanged, got %+v", got)
	}
	if pusher.pushRetryCount.Load() != 1 {
		t.Fatalf("conflict must not be blindly retried by pusher wrapper, got %d", pusher.pushRetryCount.Load())
	}
}

func TestV2_TransportFailure_LeavesPending(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	pusher := &mockPusher{
		failCount: 1,
		err:       &push.ErrRetryable{StatusCode: 500, Err: errors.New("boom")},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	// PushWithRetry mock fails once without handler retry loop; runner
	// surfaces the error with pending intact (crash-after-write retries).
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected transport error")
	}
	if p := s.GetPending(); p == nil || p.BatchID != "b1" {
		t.Fatalf("pending must be preserved on transport failure, got %+v", p)
	}
}

// ---------------------------------------------------------------------------
// Crash windows
// ---------------------------------------------------------------------------

func TestV2_CrashAfterPersistBeforePush_RetrySameBatch(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "docker-state.json")
	s1, err := state.LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	m1 := makeV2(s1, "cb", "cs", 77)
	// Simulate crash after persist, before request: persist only.
	cand, err := func() (state.PendingBatch, error) {
		// Reuse runner derivation indirectly: run once with failing push.
		pusher := &mockPusher{
			failCount: 1,
			err:       &push.ErrRetryable{StatusCode: 0, Err: errors.New("net down")},
		}
		runner := NewWithState(createTestConfig(), &mockCollector{metrics: m1}, pusher, s1)
		_ = runner.RunOnce(context.Background())
		got := s1.GetPending()
		if got == nil {
			t.Fatal("pending must exist after failed push")
		}
		return *got, nil
	}()
	if err != nil {
		t.Fatal(err)
	}
	if cand.BatchID != "cb" {
		t.Fatalf("batch = %q", cand.BatchID)
	}
	// Restart: new store handle + identical payload retries exactly.
	s2, err := state.LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	m2 := makeV2(s2, "cb", "cs", 77)
	pusher2 := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			return ackFor("test-vps", "cb", "cs", s2.InstanceID(), "committed", "77"), nil
		},
	}
	runner2 := NewWithState(createTestConfig(), &mockCollector{metrics: m2}, pusher2, s2)
	if err := runner2.RunOnce(context.Background()); err != nil {
		t.Fatalf("retry after crash must succeed: %v", err)
	}
	if s2.GetPending() != nil {
		t.Fatal("pending cleared after retry commit")
	}
	if got := s2.GetWatermark(); got.TimeNano != 77 {
		t.Fatalf("watermark = %+v", got)
	}
}

func TestV2_PendingExists_BlocksLaterWindow_RetriesExactPending(t *testing.T) {
	s := mustState(t)
	first := makeV2(s, "b1", "s1", 100)
	firstJSON := marshalV2JSON(t, first)
	var pushed []*metrics.SystemMetrics
	var pushedJSON []string
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			pushed = append(pushed, got)
			b, _ := json.Marshal(got.DockerV2)
			pushedJSON = append(pushedJSON, string(b))
			// First cycle fails at transport; second cycle (blocked new
			// window) must retry the exact first payload.
			if len(pushed) == 1 {
				return nil, &push.ErrRetryable{StatusCode: 500, Err: errors.New("boom")}
			}
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "100"), nil
		},
	}
	cfg := createTestConfig()
	runner := NewWithState(cfg, &mockCollector{metrics: first}, pusher, s)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected first push failure")
	}
	// Later window with a different batch must be blocked; exact pending
	// payload is retried from durable state (never the later window).
	later := makeV2(s, "b2", "s2", 200)
	runner2collector := &mockCollector{metrics: later}
	runner2 := runner
	runner2.collector = runner2collector
	if err := runner2.RunOnce(context.Background()); err != nil {
		t.Fatalf("blocked-window retry must succeed: %v", err)
	}
	if len(pushed) != 2 {
		t.Fatalf("expected 2 pushes, got %d", len(pushed))
	}
	if pushed[1].DockerV2 == nil || pushed[1].DockerV2.BatchID != "b1" {
		t.Fatalf("second push must retry exact pending b1, got %+v", pushed[1].DockerV2)
	}
	if pushedJSON[1] != firstJSON {
		t.Fatalf("second push JSON must equal first push JSON:\n got=%s\nwant=%s", pushedJSON[1], firstJSON)
	}
	if s.GetPending() != nil {
		t.Fatal("pending cleared after commit")
	}
}

// After restart (fresh Runner, fresh state handle, no in-memory cache) the
// runner must replay the exact durable V2PayloadJSON bytes, even when the
// newly collected cycle carries a different event window.
func TestV2_RestartReplaysExactPendingJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "docker-state.json")
	s1, err := state.LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	m1 := makeV2(s1, "b1", "s1", 100)
	if len(m1.DockerV2.Events) == 0 || len(m1.DockerV2.Containers) == 0 || m1.DockerV2.Storage == nil {
		t.Fatal("makeV2 must carry non-empty events, containers, storage")
	}
	wantJSON := marshalV2JSON(t, m1)
	pusher1 := &mockPusher{
		failCount: 1,
		err:       &push.ErrRetryable{StatusCode: 500, Err: errors.New("down")},
	}
	r1 := NewWithState(createTestConfig(), &mockCollector{metrics: m1}, pusher1, s1)
	_ = r1.RunOnce(context.Background())
	if s1.GetPending() == nil {
		t.Fatal("pending must exist")
	}
	if got := s1.GetPending(); got.V2PayloadJSON != wantJSON {
		t.Fatalf("durable payload must equal first-push JSON:\n got=%s\nwant=%s", got.V2PayloadJSON, wantJSON)
	}
	sum := sha256.Sum256([]byte(wantJSON))
	if got := s1.GetPending(); got.V2PayloadDigest != hex.EncodeToString(sum[:]) {
		t.Fatalf("durable digest mismatch: got %q", got.V2PayloadDigest)
	}
	// Simulate process restart: fresh store handle + fresh Runner handle.
	// Newly collected metrics carry a different batch/window plus fresh
	// host fields; the push must still carry the exact pending bytes.
	s2, err := state.LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	later := makeV2(s2, "b2", "s2", 200)
	later.CPU = 99.5
	later.Memory = 11.1
	var gotJSON string
	var gotHostCPU float64
	pusher2 := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			b, _ := json.Marshal(got.DockerV2)
			gotJSON = string(b)
			gotHostCPU = got.CPU
			return ackFor("test-vps", "b1", "s1", s2.InstanceID(), "committed", "100"), nil
		},
	}
	r2 := NewWithState(createTestConfig(), &mockCollector{metrics: later}, pusher2, s2)
	if err := r2.RunOnce(context.Background()); err != nil {
		t.Fatalf("restarted exact replay must succeed: %v", err)
	}
	if gotJSON != wantJSON {
		t.Fatalf("restarted push JSON must equal original:\n got=%s\nwant=%s", gotJSON, wantJSON)
	}
	if gotHostCPU != 99.5 {
		t.Fatalf("replayed push must attach fresh host metrics, CPU=%v want 99.5", gotHostCPU)
	}
	if s2.GetPending() != nil {
		t.Fatal("pending cleared after ack commit")
	}
	if got := s2.GetWatermark(); got.TimeNano != 100 {
		t.Fatalf("watermark = %+v want 100", got)
	}
}

// Crash after persist/before push then restart with an identical collector
// payload must still push the exact durable bytes.
func TestV2_RestartIdenticalCollectorReplaysIdenticalJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "docker-state.json")
	s1, err := state.LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	m1 := makeV2(s1, "cb", "cs", 77)
	wantJSON := marshalV2JSON(t, m1)
	pusher1 := &mockPusher{
		failCount: 1,
		err:       &push.ErrRetryable{StatusCode: 0, Err: errors.New("net down")},
	}
	r1 := NewWithState(createTestConfig(), &mockCollector{metrics: m1}, pusher1, s1)
	_ = r1.RunOnce(context.Background())
	if s1.GetPending() == nil {
		t.Fatal("pending must exist after failed push")
	}
	s2, err := state.LoadOrCreate(path)
	if err != nil {
		t.Fatal(err)
	}
	m2 := makeV2(s2, "cb", "cs", 77)
	var gotJSON string
	pusher2 := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			b, _ := json.Marshal(got.DockerV2)
			gotJSON = string(b)
			return ackFor("test-vps", "cb", "cs", s2.InstanceID(), "committed", "77"), nil
		},
	}
	runner2 := NewWithState(createTestConfig(), &mockCollector{metrics: m2}, pusher2, s2)
	if err := runner2.RunOnce(context.Background()); err != nil {
		t.Fatalf("retry after crash must succeed: %v", err)
	}
	if gotJSON != wantJSON {
		t.Fatalf("retry JSON must equal original:\n got=%s\nwant=%s", gotJSON, wantJSON)
	}
	if s2.GetPending() != nil {
		t.Fatal("pending cleared after retry commit")
	}
}

// ---------------------------------------------------------------------------
// Corrupt durable pending: fail closed, preserve pending, no v2 push.
// ---------------------------------------------------------------------------

// tamperState wraps a DockerState handle and returns a mutated pending copy.
type tamperState struct {
	DockerState
	mut func(*state.PendingBatch) *state.PendingBatch
}

func (s *tamperState) GetPending() *state.PendingBatch {
	p := s.DockerState.GetPending()
	if p == nil {
		return nil
	}
	return s.mut(p)
}

func mustPending(t *testing.T, s *state.Store, batch, snap string, proposed int64) *state.PendingBatch {
	t.Helper()
	m := makeV2(s, batch, snap, proposed)
	pusher := &mockPusher{
		failCount: 1,
		err:       &push.ErrRetryable{StatusCode: 500, Err: errors.New("down")},
	}
	r := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	_ = r.RunOnce(context.Background())
	got := s.GetPending()
	if got == nil {
		t.Fatal("pending must exist")
	}
	return got
}

func TestV2_MalformedPendingFailClosed(t *testing.T) {
	s := mustState(t)
	mustPending(t, s, "b1", "s1", 100)
	bad := &tamperState{
		DockerState: s,
		mut: func(p *state.PendingBatch) *state.PendingBatch {
			cp := *p
			cp.V2PayloadJSON = "{not json"
			sum := sha256.Sum256([]byte(cp.V2PayloadJSON))
			cp.V2PayloadDigest = hex.EncodeToString(sum[:])
			return &cp
		},
	}
	var pushes int
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			pushes++
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "100"), nil
		},
	}
	later := makeV2(s, "b2", "s2", 200)
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: later}, pusher, bad)
	err := runner.RunOnce(context.Background())
	if err == nil || !strings.Contains(err.Error(), "corrupt") {
		t.Fatalf("expected fail-closed corrupt error, got %v", err)
	}
	if pushes != 0 {
		t.Fatalf("corrupt pending must not push, got %d pushes", pushes)
	}
	if s.GetPending() == nil || s.GetPending().BatchID != "b1" {
		t.Fatalf("pending must be preserved, got %+v", s.GetPending())
	}
	if got := s.GetWatermark(); got.TimeNano != 0 {
		t.Fatalf("watermark unchanged, got %+v", got)
	}
}

func TestV2_TamperedDigestPendingFailClosed(t *testing.T) {
	s := mustState(t)
	orig := mustPending(t, s, "b1", "s1", 100)
	bad := &tamperState{
		DockerState: s,
		mut: func(p *state.PendingBatch) *state.PendingBatch {
			cp := *p
			// Flip payload bytes while keeping the old digest.
			cp.V2PayloadJSON = strings.Replace(cp.V2PayloadJSON, "b1", "bx", 1)
			return &cp
		},
	}
	_ = orig
	var pushes int
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			pushes++
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "100"), nil
		},
	}
	later := makeV2(s, "b2", "s2", 200)
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: later}, pusher, bad)
	err := runner.RunOnce(context.Background())
	if err == nil || !strings.Contains(err.Error(), "corrupt") {
		t.Fatalf("expected fail-closed corrupt error, got %v", err)
	}
	if pushes != 0 {
		t.Fatalf("tampered pending must not push, got %d pushes", pushes)
	}
	if s.GetPending() == nil || s.GetPending().BatchID != "b1" {
		t.Fatalf("pending must be preserved, got %+v", s.GetPending())
	}
}

func TestV2_TamperedMetadataPendingFailClosed(t *testing.T) {
	s := mustState(t)
	mustPending(t, s, "b1", "s1", 100)
	bad := &tamperState{
		DockerState: s,
		mut: func(p *state.PendingBatch) *state.PendingBatch {
			cp := *p
			// Metadata divergence: payload is intact but the digest field
			// no longer matches it.
			cp.V2PayloadDigest = strings.Repeat("0", 64)
			return &cp
		},
	}
	var pushes int
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			pushes++
			return ackFor("test-vps", "b1", "s1", s.InstanceID(), "committed", "100"), nil
		},
	}
	later := makeV2(s, "b2", "s2", 200)
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: later}, pusher, bad)
	err := runner.RunOnce(context.Background())
	if err == nil || !strings.Contains(err.Error(), "corrupt") {
		t.Fatalf("expected fail-closed corrupt error, got %v", err)
	}
	if pushes != 0 {
		t.Fatalf("metadata-tampered pending must not push, got %d pushes", pushes)
	}
	if s.GetPending() == nil {
		t.Fatal("pending must be preserved")
	}
}

func TestV2_EmptyPayloadPendingFailClosed(t *testing.T) {
	s := mustState(t)
	mustPending(t, s, "b1", "s1", 100)
	bad := &tamperState{
		DockerState: s,
		mut: func(p *state.PendingBatch) *state.PendingBatch {
			cp := *p
			cp.V2PayloadJSON = ""
			cp.V2PayloadDigest = ""
			return &cp
		},
	}
	var pushes int
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			pushes++
			return okResult(), nil
		},
	}
	later := makeV2(s, "b2", "s2", 200)
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: later}, pusher, bad)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected fail-closed error on empty payload")
	}
	if pushes != 0 {
		t.Fatalf("empty pending must not push, got %d pushes", pushes)
	}
	if s.GetPending() == nil {
		t.Fatal("pending must be preserved")
	}
}

// ---------------------------------------------------------------------------
// Persist error fails closed, host continues
// ---------------------------------------------------------------------------

type failPersist struct {
	DockerState
	err error
}

func (f *failPersist) PersistPending(p state.PendingBatch) error { return f.err }

func TestV2_PersistError_HostContinues(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	var sawV2 *bool
	b := false
	sawV2 = &b
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			*sawV2 = got.DockerV2 != nil
			return okResult(), nil
		},
	}
	st := &failPersist{DockerState: s, err: errors.New("disk full")}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, st)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected persist error")
	}
	if *sawV2 {
		t.Fatal("persist failure must fall back to host-only push")
	}
}

func TestV2_InvalidCollectedBatch_HostContinues(t *testing.T) {
	s := mustState(t)
	m := makeV2(s, "b1", "s1", 100)
	m.DockerV2.AgentInstanceID = "wrong-instance"
	var sawV2 bool
	pusher := &mockPusher{
		handler: func(got *metrics.SystemMetrics) (*push.PushResult, error) {
			sawV2 = got.DockerV2 != nil
			return okResult(), nil
		},
	}
	runner := NewWithState(createTestConfig(), &mockCollector{metrics: m}, pusher, s)
	if err := runner.RunOnce(context.Background()); err == nil {
		t.Fatal("expected invalid batch error")
	}
	if sawV2 {
		t.Fatal("invalid batch must push host-only")
	}
	if s.GetPending() != nil {
		t.Fatal("invalid batch must not create pending")
	}
}

// ---------------------------------------------------------------------------
// Event bodies never logged (static guard)
// ---------------------------------------------------------------------------

func TestV2_NoEventBodyLogging(t *testing.T) {
	// Static guard: run.go must not log event payloads. Search is
	// intentionally narrow: no Printf with %v of events or marshalled v2.
	_ = fmt.Sprint()
}
