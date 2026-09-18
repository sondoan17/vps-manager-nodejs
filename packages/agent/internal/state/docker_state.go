// Package state implements durable Docker installation state (I2).
//
// Closed decisions from docs/docker-monitoring-plan.md:
//   - versioned, owner-checked 0600 state file with 256-bit random key.
//   - agentInstanceId = base64url(HMAC-SHA-256(key, "vps-manager/docker/agent-instance/v1"))[0:32]
//   - containerKey = base64url(HMAC-SHA-256(key, "vps-manager/docker/container/v1\x00" || fullID))[0:32]
//   - first creation is race-safe create-exclusive temp publication with
//     no-replace semantics; winner validation/read on contention.
//   - malformed/short/wrong-version/wrong-owner/over-permissive fails closed,
//     never replaced. Later updates are same-directory atomic replacements.
//
// Wire-neutral: this package defines its own Watermark/PendingBatch types and
// does not import the metrics package (cycle avoidance).
package state

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

// Contract constants. Domain separators and output lengths are fixed.
const (
	// StateVersion is the only accepted state file version.
	StateVersion = 1
	// InstallationKeyBytes is the required 256-bit key length.
	InstallationKeyBytes = 32
	// DerivedIDLen is the fixed base64url output prefix length.
	DerivedIDLen = 32
	// MaxBoundaryDigests caps the watermark digest set per plan.
	MaxBoundaryDigests = 256
	// MaxDigestLen caps a single digest string.
	MaxDigestLen = 128
	// MaxOpaqueIDLen caps batch/snapshot IDs.
	MaxOpaqueIDLen = 64
	// MaxV2PayloadBytes caps the durable exact v2 branch canonical JSON.
	// Strictly bounded Gate-3 remediation unit: 128KiB.
	MaxV2PayloadBytes = 128 * 1024

	// AgentInstanceDomain is the exact HMAC domain for agentInstanceId.
	AgentInstanceDomain = "vps-manager/docker/agent-instance/v1"
	// ContainerDomainPrefix is the exact HMAC domain prefix for containerKey
	// (the NUL separator is appended explicitly per contract).
	ContainerDomainPrefix = "vps-manager/docker/container/v1"
)

// Watermark is the durable event watermark: last committed boundary.
type Watermark struct {
	TimeNano        int64    `json:"timeNano"`
	BoundaryDigests []string `json:"boundaryDigests"`
}

// PendingBatch is exactly one durable pending batch.
type PendingBatch struct {
	BatchID           string    `json:"batchId"`
	SnapshotID        string    `json:"snapshotId"`
	SourceSequence    string    `json:"sourceSequence"`
	AgentInstanceID   string    `json:"agentInstanceId"`
	FromWatermark     Watermark `json:"fromWatermark"`
	ProposedWatermark Watermark `json:"proposedWatermark"`
	EventsDigest      string    `json:"eventsDigest"`
	EventWindowUntil  int64     `json:"eventWindowUntil"`
	// V2PayloadJSON is the exact canonical JSON DockerMetricsV2 branch.
	V2PayloadJSON   string `json:"v2PayloadJSON"`
	V2PayloadDigest string `json:"v2PayloadDigest"`
}

type persistedState struct {
	Version         int           `json:"version"`
	InstallationKey string        `json:"installationKey"`
	Watermark       Watermark     `json:"watermark"`
	Pending         *PendingBatch `json:"pending"`
	Sequence        uint64        `json:"sequence"`
}

// Store is a narrow durable-state handle bound to one file path.
type Store struct {
	mu   sync.Mutex
	path string
	key  [32]byte
	// v2 separates immutable identity from mutable, MAC-protected delivery state.
	identityPath    string
	deliveryKeyPath string
	deliveryKey     [32]byte
	containerKey    [32]byte
	v2              bool
	// cached derived instance id
	instanceID string
	watermark  Watermark
	pending    *PendingBatch
	sequence   uint64
}

// LoadOrCreate opens the state file, creating it race-safe on first install.
func LoadOrCreate(path string) (*Store, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("state: resolve path: %w", err)
	}
	if fi, err := os.Stat(abs); err == nil {
		return loadExisting(abs, fi)
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("state: stat: %w", err)
	}
	// Missing: race-safe create.
	if err := ensureParentDir(filepath.Dir(abs)); err != nil {
		return nil, err
	}
	var key [32]byte
	if _, err := rand.Read(key[:]); err != nil {
		return nil, fmt.Errorf("state: random key: %w", err)
	}
	initial := persistedState{
		Version:         StateVersion,
		InstallationKey: base64.RawURLEncoding.EncodeToString(key[:]),
		Watermark:       Watermark{TimeNano: 0, BoundaryDigests: []string{}},
		Pending:         nil,
		Sequence:        1,
	}
	blob, err := json.Marshal(initial)
	if err != nil {
		return nil, fmt.Errorf("state: encode: %w", err)
	}
	published, err := publishExclusive(abs, blob, 0600)
	if err != nil {
		return nil, err
	}
	_ = published
	// Read back (winner or self) with full validation.
	fi, err := os.Stat(abs)
	if err != nil {
		return nil, fmt.Errorf("state: stat after create: %w", err)
	}
	return loadExisting(abs, fi)
}

func loadExisting(abs string, fi os.FileInfo) (*Store, error) {
	if err := checkFilePermissions(fi); err != nil {
		return nil, err
	}
	if err := checkFileOwnership(abs, fi); err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(abs)
	if err != nil {
		return nil, fmt.Errorf("state: read: %w", err)
	}
	ps, err := parseAndValidate(raw)
	if err != nil {
		return nil, err
	}
	var key [32]byte
	decoded, err := decodeKey(ps.InstallationKey)
	if err != nil {
		return nil, err
	}
	copy(key[:], decoded)
	s := &Store{
		path:       abs,
		key:        key,
		watermark:  ps.Watermark,
		pending:    ps.Pending,
		sequence:   ps.Sequence,
		instanceID: deriveAgentInstanceID(decoded),
	}
	// Cross-check stored pending instance binding fail-closed.
	if s.pending != nil && s.pending.AgentInstanceID != s.instanceID {
		return nil, fmt.Errorf("state: pending agentInstanceId mismatch: fail closed")
	}
	return s, nil
}

// Path returns the backing file path.
func (s *Store) Path() string { return s.path }

// InstanceID returns the stable derived agentInstanceId.
func (s *Store) InstanceID() string { return s.instanceID }

// ContainerKey derives the stable per-installation key for a full Docker ID.
func (s *Store) ContainerKey(fullContainerID string) string {
	if s.v2 {
		return deriveContainerKey(s.containerKey[:], fullContainerID)
	}
	return deriveContainerKey(s.key[:], fullContainerID)
}

// GetWatermark returns a deep copy of the committed watermark.
func (s *Store) GetWatermark() Watermark { return cloneWatermark(s.snapshot().watermark) }

// GetPending returns a deep copy of the pending batch or nil.
func (s *Store) GetPending() *PendingBatch {
	snap := s.snapshot()
	if snap.pending == nil {
		return nil
	}
	cp := *snap.pending
	cp.FromWatermark = cloneWatermark(snap.pending.FromWatermark)
	cp.ProposedWatermark = cloneWatermark(snap.pending.ProposedWatermark)
	return &cp
}

// Sequence returns the monotonic durable sequence.
func (s *Store) Sequence() uint64 { return s.snapshot().sequence }

type storeSnapshot struct {
	watermark Watermark
	pending   *PendingBatch
	sequence  uint64
}

func (s *Store) snapshot() storeSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	var p *PendingBatch
	if s.pending != nil {
		cp := *s.pending
		p = &cp
	}
	return storeSnapshot{watermark: cloneWatermark(s.watermark), pending: p, sequence: s.sequence}
}

// PersistPending durably records exactly one pending batch before push.
// Idempotent retry of the identical batch succeeds; a different second batch
// conflicts. fromWatermark must equal the committed watermark exactly and the
// proposed watermark must move monotonically forward.
func (s *Store) PersistPending(p PendingBatch) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := validatePendingFields(s.instanceID, p); err != nil {
		return err
	}
	if s.pending != nil {
		if pendingEqual(s.pending, &p) {
			return nil
		}
		return fmt.Errorf("state: pending batch already exists: conflict")
	}
	if !watermarkEqual(s.watermark, p.FromWatermark) {
		return fmt.Errorf("state: fromWatermark does not match committed watermark: conflict")
	}
	if !watermarkForward(s.watermark, p.ProposedWatermark) {
		return fmt.Errorf("state: proposedWatermark must advance monotonically: conflict")
	}
	if s.v2 {
		next := DeliveryState{Version: IdentityVersion, Watermark: s.watermark, Pending: clonePending(&p), Sequence: s.sequence + 1}
		if err := atomicReplaceDelivery(s.path, next, s.deliveryKey[:]); err != nil {
			return err
		}
	} else {
		next := persistedState{Version: StateVersion, InstallationKey: base64.RawURLEncoding.EncodeToString(s.key[:]), Watermark: s.watermark, Pending: clonePending(&p), Sequence: s.sequence + 1}
		if err := atomicReplace(s.path, next); err != nil {
			return err
		}
	}
	s.pending = clonePending(&p)
	s.sequence++
	return nil
}

// CommitAcknowledgement validates matching IDs plus exact monotonic committed
// watermark, then clears pending and advances the watermark.
func (s *Store) CommitAcknowledgement(batchID, snapshotID, agentInstanceID string, committed Watermark) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.pending == nil {
		return fmt.Errorf("state: no pending batch: conflict")
	}
	if batchID != s.pending.BatchID || snapshotID != s.pending.SnapshotID || agentInstanceID != s.pending.AgentInstanceID {
		return fmt.Errorf("state: acknowledgement id mismatch: conflict")
	}
	if agentInstanceID != s.instanceID {
		return fmt.Errorf("state: acknowledgement instance mismatch: conflict")
	}
	if err := validateWatermark(committed); err != nil {
		return fmt.Errorf("state: committed watermark invalid: %w", err)
	}
	if !watermarkEqual(committed, s.pending.ProposedWatermark) {
		return fmt.Errorf("state: committed watermark must equal proposed exactly: conflict")
	}
	if !watermarkForwardOrEqual(s.watermark, committed) {
		return fmt.Errorf("state: committed watermark must be monotonic: conflict")
	}
	// Forbid no-op commit that equals the already-committed watermark while a
	// pending exists only if proposed also equals committed (i.e. pending was
	// non-advancing, which PersistPending already rejects). Allow equal only
	// when from==committed is impossible here since proposed is forward.
	if s.v2 {
		next := DeliveryState{Version: IdentityVersion, Watermark: cloneWatermark(committed), Pending: nil, Sequence: s.sequence + 1}
		if err := atomicReplaceDelivery(s.path, next, s.deliveryKey[:]); err != nil {
			return err
		}
	} else {
		next := persistedState{Version: StateVersion, InstallationKey: base64.RawURLEncoding.EncodeToString(s.key[:]), Watermark: cloneWatermark(committed), Pending: nil, Sequence: s.sequence + 1}
		if err := atomicReplace(s.path, next); err != nil {
			return err
		}
	}
	s.watermark = cloneWatermark(committed)
	s.pending = nil
	s.sequence++
	return nil
}

// ---- derivation ----

func deriveAgentInstanceID(key []byte) string {
	m := hmac.New(sha256.New, key)
	_, _ = m.Write([]byte(AgentInstanceDomain))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))[:DerivedIDLen]
}

func deriveContainerKey(key []byte, fullID string) string {
	m := hmac.New(sha256.New, key)
	_, _ = m.Write([]byte(ContainerDomainPrefix))
	_, _ = m.Write([]byte{0})
	_, _ = m.Write([]byte(fullID))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))[:DerivedIDLen]
}

// ---- validation ----

func parseAndValidate(raw []byte) (*persistedState, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil, fmt.Errorf("state: empty file: fail closed")
	}
	var ps persistedState
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&ps); err != nil {
		return nil, fmt.Errorf("state: malformed: fail closed: %w", err)
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("state: trailing data: fail closed")
	}
	if ps.Version != StateVersion {
		return nil, fmt.Errorf("state: wrong version %d: fail closed", ps.Version)
	}
	keyBytes, err := decodeKey(ps.InstallationKey)
	if err != nil {
		return nil, err
	}
	if len(keyBytes) != InstallationKeyBytes {
		return nil, fmt.Errorf("state: short installation key: fail closed")
	}
	if err := validateWatermark(ps.Watermark); err != nil {
		return nil, fmt.Errorf("state: watermark invalid: fail closed: %w", err)
	}
	if ps.Pending != nil {
		if err := validatePendingFields(deriveAgentInstanceID(keyBytes), *ps.Pending); err != nil {
			return nil, fmt.Errorf("state: pending invalid: fail closed: %w", err)
		}
		// Pending fromWatermark should equal committed watermark; enforce on
		// load to catch torn writes (a torn file would otherwise replay).
		if !watermarkEqual(ps.Watermark, ps.Pending.FromWatermark) {
			return nil, fmt.Errorf("state: pending fromWatermark mismatch: fail closed")
		}
		if !watermarkForward(ps.Watermark, ps.Pending.ProposedWatermark) {
			return nil, fmt.Errorf("state: pending proposedWatermark not forward: fail closed")
		}
	}
	return &ps, nil
}

func decodeKey(enc string) ([]byte, error) {
	if enc == "" {
		return nil, fmt.Errorf("state: missing installation key: fail closed")
	}
	if b, err := base64.RawURLEncoding.DecodeString(enc); err == nil {
		if len(b) == InstallationKeyBytes {
			return b, nil
		}
		return nil, fmt.Errorf("state: short installation key: fail closed")
	}
	// Tolerate padded StdEncoding only to produce a precise fail-closed error;
	// any successful decode must still be exactly 32 bytes.
	if b, err := base64.StdEncoding.DecodeString(enc); err == nil && len(b) == InstallationKeyBytes {
		return b, nil
	}
	if b, err := base64.URLEncoding.DecodeString(enc); err == nil && len(b) == InstallationKeyBytes {
		return b, nil
	}
	return nil, fmt.Errorf("state: malformed installation key: fail closed")
}

func validateWatermark(w Watermark) error {
	if w.TimeNano < 0 {
		return fmt.Errorf("negative timeNano")
	}
	if w.BoundaryDigests == nil {
		return fmt.Errorf("nil boundaryDigests")
	}
	if len(w.BoundaryDigests) > MaxBoundaryDigests {
		return fmt.Errorf("too many boundaryDigests")
	}
	seen := make(map[string]struct{}, len(w.BoundaryDigests))
	prev := ""
	for i, d := range w.BoundaryDigests {
		if d == "" || len(d) > MaxDigestLen {
			return fmt.Errorf("bad boundary digest %d", i)
		}
		if _, ok := seen[d]; ok {
			return fmt.Errorf("duplicate boundary digest %d", i)
		}
		seen[d] = struct{}{}
		if i > 0 && d <= prev {
			return fmt.Errorf("boundaryDigests must be sorted unique")
		}
		prev = d
	}
	return nil
}

func validateV2Payload(payload, digest string) error {
	if payload == "" {
		return fmt.Errorf("state: empty v2PayloadJSON")
	}
	if len(payload) > MaxV2PayloadBytes {
		return fmt.Errorf("state: v2PayloadJSON oversize")
	}
	if digest == "" || len(digest) > MaxDigestLen {
		return fmt.Errorf("state: bad v2PayloadDigest")
	}
	dec := json.NewDecoder(bytes.NewReader([]byte(payload)))
	var v any
	if err := dec.Decode(&v); err != nil {
		return fmt.Errorf("state: invalid v2PayloadJSON: %w", err)
	}
	if _, ok := v.(map[string]any); !ok {
		return fmt.Errorf("state: v2PayloadJSON must be object")
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			return fmt.Errorf("state: trailing v2PayloadJSON")
		}
		return fmt.Errorf("state: trailing v2PayloadJSON: %w", err)
	}
	sum := sha256.Sum256([]byte(payload))
	want := hex.EncodeToString(sum[:])
	if want != digest {
		return fmt.Errorf("state: v2PayloadDigest mismatch: fail closed")
	}
	return nil
}

func validatePendingFields(instanceID string, p PendingBatch) error {
	if p.BatchID == "" || len(p.BatchID) > MaxOpaqueIDLen {
		return fmt.Errorf("state: bad batchId")
	}
	if p.SnapshotID == "" || len(p.SnapshotID) > MaxOpaqueIDLen {
		return fmt.Errorf("state: bad snapshotId")
	}
	if p.AgentInstanceID == "" || p.AgentInstanceID != instanceID {
		return fmt.Errorf("state: bad agentInstanceId")
	}
	if err := validateWatermark(p.FromWatermark); err != nil {
		return fmt.Errorf("state: bad fromWatermark: %w", err)
	}
	if err := validateWatermark(p.ProposedWatermark); err != nil {
		return fmt.Errorf("state: bad proposedWatermark: %w", err)
	}
	if p.EventsDigest == "" || len(p.EventsDigest) > MaxDigestLen {
		return fmt.Errorf("state: bad eventsDigest")
	}
	if p.EventWindowUntil < 0 {
		return fmt.Errorf("state: bad eventWindowUntil")
	}
	if p.EventWindowUntil < p.ProposedWatermark.TimeNano {
		return fmt.Errorf("state: eventWindowUntil before proposedWatermark")
	}
	if p.EventWindowUntil < p.FromWatermark.TimeNano {
		return fmt.Errorf("state: eventWindowUntil before fromWatermark")
	}
	if err := validateV2Payload(p.V2PayloadJSON, p.V2PayloadDigest); err != nil {
		return err
	}
	return nil
}

func watermarkEqual(a, b Watermark) bool {
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

// watermarkForward requires strict forward progress: greater timeNano, or
// equal timeNano with a different (non-equal) digest set. Exact equality is
// not forward (used by PersistPending).
func watermarkForward(from, proposed Watermark) bool {
	if proposed.TimeNano > from.TimeNano {
		return true
	}
	if proposed.TimeNano < from.TimeNano {
		return false
	}
	return !watermarkEqual(from, proposed)
}

func watermarkForwardOrEqual(from, committed Watermark) bool {
	if committed.TimeNano > from.TimeNano {
		return true
	}
	if committed.TimeNano < from.TimeNano {
		return false
	}
	return true // equal timeNano allowed; exact digest equality already checked by caller
}

func pendingEqual(a, b *PendingBatch) bool {
	if a.BatchID != b.BatchID || a.SnapshotID != b.SnapshotID || a.AgentInstanceID != b.AgentInstanceID {
		return false
	}
	if !watermarkEqual(a.FromWatermark, b.FromWatermark) {
		return false
	}
	if !watermarkEqual(a.ProposedWatermark, b.ProposedWatermark) {
		return false
	}
	if a.EventsDigest != b.EventsDigest || a.EventWindowUntil != b.EventWindowUntil {
		return false
	}
	return a.V2PayloadJSON == b.V2PayloadJSON && a.V2PayloadDigest == b.V2PayloadDigest
}

func cloneWatermark(w Watermark) Watermark {
	cp := Watermark{TimeNano: w.TimeNano, BoundaryDigests: make([]string, len(w.BoundaryDigests))}
	copy(cp.BoundaryDigests, w.BoundaryDigests)
	if cp.BoundaryDigests == nil {
		cp.BoundaryDigests = []string{}
	}
	return cp
}

func clonePending(p *PendingBatch) *PendingBatch {
	if p == nil {
		return nil
	}
	cp := *p
	cp.FromWatermark = cloneWatermark(p.FromWatermark)
	cp.ProposedWatermark = cloneWatermark(p.ProposedWatermark)
	return &cp
}

func checkFilePermissions(fi os.FileInfo) error {
	if runtime.GOOS == "windows" {
		return nil
	}
	if fi.Mode().Perm() != 0o600 {
		return fmt.Errorf("state: mode %04o: want 0600: fail closed", fi.Mode().Perm())
	}
	return nil
}

func ensureParentDir(dir string) error {
	if dir == "" || dir == "." {
		return nil
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("state: mkdir parent: %w", err)
	}
	return nil
}
