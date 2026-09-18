package metrics

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"time"
)

// Docker monitoring runtime collection link (metrics scope only).
//
// The collector reuses the existing v1 Docker collection (same bounded
// list/stats data under the global 5s collection context) and derives an
// additive v2 snapshot: authoritative counts, selected container samples
// with explicit coverage, and stable opaque containerKey values. When Runner
// supplies durable event-window input through the narrow provider below, the
// existing bounded fixed-window /events helper populates the event branch.
// When storage is enabled and its five-minute cadence is due, the existing
// bounded /system/df decoder populates sanitized storage aggregates.
// No state/run/push imports.
//
// The collector never fabricates durable identity: BatchID, SnapshotID,
// AgentInstanceID, and watermark advancement/binding remain Runner/state
// responsibilities. The narrow FinalizeHook is the attachment point Runner
// uses after collection.
//
// Failure isolation: any v2 derivation, provider, request, decode, or hook
// failure clears or omits only the affected v2 branch; v1 output and host
// metrics are always preserved.

// DockerV2ContainerKeyFunc maps a daemon container ID to an opaque
// containerKey. It must return a value that passes
// validateDockerV2ContainerKey, or the container is skipped.
type DockerV2ContainerKeyFunc func(fullID string) string

// DockerV2FinalizeFunc is the narrow runner attachment hook. It runs
// synchronously after the minimal snapshot is built and may attach durable
// batch metadata (agentInstanceId/snapshotId/batchId/event branch/storage)
// before push. It must be non-blocking and must not perform I/O.
type DockerV2FinalizeFunc func(*DockerMetricsV2)

// DockerV2EventInput is durable event-window input supplied by Runner/state.
type DockerV2EventInput struct {
	SinceNano       string
	UntilNano       string
	AgentInstanceID string
	FromDigests     []string
}

// DockerV2EventInputProvider supplies durable event-window input without
// importing state/run. Nil means events are omitted for this cycle.
type DockerV2EventInputProvider func() (DockerV2EventInput, bool)

// SetDockerV2EventInputProvider configures durable event inputs.
func (c *Collector) SetDockerV2EventInputProvider(p DockerV2EventInputProvider) {
	c.dockerMu.Lock()
	defer c.dockerMu.Unlock()
	c.dockerV2EventInput = p
}

// SetDockerV2StorageEnabled enables /system/df on its five-minute cadence.
func (c *Collector) SetDockerV2StorageEnabled(enabled bool) {
	c.dockerMu.Lock()
	defer c.dockerMu.Unlock()
	c.dockerV2Storage = enabled
	if !enabled {
		c.dockerV2LastStorage = time.Time{}
	}
}

// DockerV2 event/storage calls use the existing v1 client and base URL.
func (c *Collector) collectDockerV2API(ctx context.Context, out *DockerMetricsV2) {
	// Keep optional v2 work inside the same five-second upper bound used by
	// v1. The caller's cancellation/deadline remains authoritative.
	// The caller owns the single collection deadline shared with v1.
	// Do not create a second timeout here.
	c.dockerMu.RLock()
	client, base, eventProvider, storageEnabled, lastStorage := c.dockerHTTPClient, c.dockerBaseURL, c.dockerV2EventInput, c.dockerV2Storage, c.dockerV2LastStorage
	c.dockerMu.RUnlock()
	if client == nil || base == "" {
		return
	}
	start := time.Now()
	if eventProvider != nil && dockerV2RemainingBudget(start, 5*time.Second, 100*time.Millisecond) {
		if in, ok := eventProvider(); ok && in.AgentInstanceID != "" {
			if req, err := dockerV2EventsRequest(ctx, base, in.SinceNano, in.UntilNano); err == nil {
				if resp, err := client.Do(req); err == nil {
					func() {
						defer resp.Body.Close()
						if resp.StatusCode >= 200 && resp.StatusCode < 300 {
							evs, win, prop, err := collectDockerV2EventWindow(ctx, resp.Body, in.SinceNano, in.UntilNano, in.AgentInstanceID, in.FromDigests, c.v2KeyFunc())
							if err == nil {
								out.Events, out.EventWindow, out.FromWatermark, out.ProposedWatermark = evs, win, &DockerEventWatermarkV2{TimeNano: in.SinceNano, BoundaryDigests: append([]string(nil), in.FromDigests...)}, prop
							}
						}
					}()
				}
			}
		}
	}
	if storageEnabled && dockerV2StorageDue(lastStorage, time.Now()) && dockerV2RemainingBudget(start, 5*time.Second, 100*time.Millisecond) {
		if req, err := dockerV2SystemDFRequest(ctx, base); err == nil {
			if resp, err := client.Do(req); err == nil {
				func() {
					defer resp.Body.Close()
					if resp.StatusCode >= 200 && resp.StatusCode < 300 {
						if s, err := decodeDockerV2SystemDF(resp.Body); err == nil {
							out.Storage = s
							c.dockerMu.Lock()
							c.dockerV2LastStorage = time.Now()
							c.dockerMu.Unlock()
						}
					}
				}()
			}
		}
	}
}

func (c *Collector) v2KeyFunc() func(string) string {
	c.dockerMu.RLock()
	defer c.dockerMu.RUnlock()
	if c.dockerV2KeyFunc != nil {
		return c.dockerV2KeyFunc
	}
	return defaultDockerV2ContainerKey
}

// SetDockerV2Enabled enables (true) or disables (false) the additive v2
// runtime gate. Default false. Disabling clears v2 hooks/overrides; it never
// touches v1 collection state or the shared HTTP client.
func (c *Collector) SetDockerV2Enabled(enabled bool) {
	c.dockerMu.Lock()
	defer c.dockerMu.Unlock()
	c.dockerV2Enabled = enabled
	// Capability toggles gate execution only; state-derived hooks and inputs
	// remain installed so a later re-enable resumes the same durable state.
	if !enabled {
		return
	}
}

func (c *Collector) isDockerV2Enabled() bool {
	c.dockerMu.RLock()
	defer c.dockerMu.RUnlock()
	return c.dockerV2Enabled
}

// SetDockerV2ContainerKeyFunc overrides stable containerKey derivation.
// A nil value restores the deterministic local helper.
func (c *Collector) SetDockerV2ContainerKeyFunc(fn DockerV2ContainerKeyFunc) {
	c.dockerMu.Lock()
	defer c.dockerMu.Unlock()
	c.dockerV2KeyFunc = fn
}

// SetDockerV2FinalizeHook installs the narrow runner attachment hook for
// durable batch metadata. A nil value clears it.
func (c *Collector) SetDockerV2FinalizeHook(fn DockerV2FinalizeFunc) {
	c.dockerMu.Lock()
	defer c.dockerMu.Unlock()
	c.dockerV2Finalize = fn
}

// defaultDockerV2ContainerKey is the deterministic local helper: opaque,
// stable, charset-safe (base64url, 32 chars), derived from the daemon ID.
// It never embeds raw IDs, names, or labels.
func defaultDockerV2ContainerKey(fullID string) string {
	sum := sha256.Sum256([]byte("vps-manager/docker/container/v2\x00" + fullID))
	return base64.RawURLEncoding.EncodeToString(sum[:])[:MaxContainerKeyLen]
}

// dockerV2FromV1 derives a minimal canonical v2 snapshot from the same
// bounded v1 list/stats data. Counts stay authoritative from v1
// (full-list totals, not the capped sample). Samples are deterministically
// selected via the existing bounded helper; coverage is explicit, so a
// capped list yields partial coverage with a cohort digest over the sampled
// keys. Events/storage/watermark/batch branches stay nil here.
func dockerV2FromV1(v1 *DockerMetrics, keyForID DockerV2ContainerKeyFunc, rotations ...uint64) (out *DockerMetricsV2) {
	if v1 == nil {
		return nil
	}
	if keyForID == nil {
		keyForID = defaultDockerV2ContainerKey
	}
	defer func() {
		// Never let v2 derivation break v1/host collection.
		if recover() != nil {
			out = nil
		}
	}()

	out = &DockerMetricsV2{
		CollectedAt:      v1.CollectedAt,
		EngineVersion:    v1.EngineVersion,
		APIVersion:       v1.APIVersion,
		OS:               v1.OS,
		Architecture:     v1.Architecture,
		SchemaVersion:    DockerSchemaVersionV2,
		Available:        v1.Available,
		ErrorCode:        v1.ErrorCode,
		ContainerTotal:   v1.ContainerTotal,
		ContainerRunning: v1.ContainerRunning,
		CPUPercent:       v1.CPUPercent,
		MemoryUsageBytes: v1.MemoryUsageBytes,
		MemoryLimitBytes: v1.MemoryLimitBytes,
		NetworkRxBytes:   v1.NetworkRxBytes,
		NetworkTxBytes:   v1.NetworkTxBytes,
		BlockReadBytes:   v1.BlockReadBytes,
		BlockWriteBytes:  v1.BlockWriteBytes,
		PIDs:             v1.PIDs,
		Containers:       []DockerContainerV2{},
	}

	// Build the candidate pool from the bounded v1 sample, then apply the
	// existing deterministic selection (priority signals unavailable from
	// v1 stats are left false; running state is carried over).
	sel := make([]DockerV2Selection, 0, len(v1.Containers))
	byKey := make(map[string]DockerContainerV2, len(v1.Containers))
	for _, vc := range v1.Containers {
		id := vc.fullID
		if id == "" {
			id = vc.ID
		}
		key := keyForID(id)
		if err := validateDockerV2ContainerKey(key); err != nil {
			continue
		}
		sel = append(sel, DockerV2Selection{
			ContainerKey: key,
			Running:      vc.State == "running",
		})
		byKey[key] = sanitizeDockerV2Display(DockerContainerV2{
			ContainerKey:     key,
			ID:               vc.ID,
			Name:             vc.Name,
			Image:            vc.Image,
			State:            vc.State,
			Status:           vc.Status,
			CreatedAt:        vc.CreatedAt,
			CPUPercent:       vc.CPUPercent,
			MemoryUsageBytes: vc.MemoryUsageBytes,
			MemoryLimitBytes: vc.MemoryLimitBytes,
			NetworkRxBytes:   vc.NetworkRxBytes,
			NetworkTxBytes:   vc.NetworkTxBytes,
			BlockReadBytes:   vc.BlockReadBytes,
			BlockWriteBytes:  vc.BlockWriteBytes,
			PIDs:             vc.PIDs,
		})
	}
	var rotation uint64
	if len(rotations) > 0 {
		rotation = rotations[0]
	}
	picked := selectDockerV2Containers(sel, MaxContainers, rotation)
	for _, s := range picked {
		out.Containers = append(out.Containers, byKey[s.ContainerKey])
	}
	agg := dockerV2SampledAggregate(out.Containers, v1.ContainerTotal)
	out.SampledContainerAggregate = &agg
	// Event batch (batchId/events/eventWindow/watermarks) and storage stay
	// nil: only safe when durable inputs/cadence are available, which the
	// collector does not have. The finalize hook may attach them.
	return out
}

// collectDockerV2 builds the additive snapshot from an already-collected v1
// result and applies the finalize hook when set. It returns nil when the v2
// gate is off, when v1 is nil, or on any derivation/hook failure, preserving
// v1 output by contract.
func (c *Collector) collectDockerV2(ctx context.Context, v1 *DockerMetrics) (out *DockerMetricsV2) {
	if !c.isDockerV2Enabled() || v1 == nil {
		return nil
	}
	c.dockerMu.RLock()
	keyFunc := c.dockerV2KeyFunc
	finalize := c.dockerV2Finalize
	c.dockerMu.RUnlock()

	defer func() {
		if recover() != nil {
			out = nil
		}
	}()
	c.dockerMu.Lock()
	rotation := c.dockerV2Rotation
	c.dockerV2Rotation++
	c.dockerMu.Unlock()
	out = dockerV2FromV1(v1, keyFunc, rotation)
	if out == nil {
		return nil
	}
	// Existing v1 collection owns the global deadline; these optional calls
	// share its context and are strictly budget/cadence gated.
	c.collectDockerV2API(ctx, out)
	if finalize != nil {
		finalize(out)
	}
	return out
}
