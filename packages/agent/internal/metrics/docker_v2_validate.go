package metrics

import (
	"fmt"
	"strings"
)

// Docker monitoring Phase 1 increment I0 — additive schema-v2 validation.
//
// Fail-closed contract validation for identity/digest/action/context-version
// fields. Display strings (name/image/state/status/createdAt) may truncate
// via cappedString; the fields below never truncate or coerce: invalid
// input is rejected with an error.

func isSafeIDChar(r rune) bool {
	switch {
	case r >= 'A' && r <= 'Z':
		return true
	case r >= 'a' && r <= 'z':
		return true
	case r >= '0' && r <= '9':
		return true
	case r == '.' || r == '_' || r == '~' || r == '-':
		return true
	}
	return false
}

func validateSafeID(value string, max int) error {
	if value == "" || len(value) > max {
		return fmt.Errorf("invalid bounded id")
	}
	for _, r := range value {
		if !isSafeIDChar(r) {
			return fmt.Errorf("invalid bounded id")
		}
	}
	return nil
}

// isCanonicalNanoDecimal reports whether s is a canonical non-negative
// decimal integer string: "0" or [1-9][0-9]*, length 1..MaxDockerV2NanoLen.
// Leading zeros (except "0" itself), signs, whitespace, and non-digits fail.
func isCanonicalNanoDecimal(s string) bool {
	if s == "" || len(s) > MaxDockerV2NanoLen {
		return false
	}
	if s == "0" {
		return true
	}
	if s[0] < '1' || s[0] > '9' {
		return false
	}
	for i := 1; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

func validateDockerV2NanoString(value string) error {
	if !isCanonicalNanoDecimal(value) {
		return fmt.Errorf("non-canonical nanosecond value")
	}
	return nil
}

// cmpCanonicalNano compares two canonical decimal strings: -1/0/+1.
func cmpCanonicalNano(a, b string) int {
	if len(a) != len(b) {
		if len(a) < len(b) {
			return -1
		}
		return 1
	}
	return strings.Compare(a, b)
}

// validateDockerV2Identity validates agentInstanceId/snapshotId/batchId
// shape (safe charset, bounded). Agent emission length is exactly
// MaxAgentInstanceIDLen for instance IDs; the API accepts the wider
// safeId(128), so validation here is fail-closed on charset/bounds.
func validateDockerV2Identity(value string, max int) error {
	return validateSafeID(value, max)
}

func validateDockerV2AgentInstanceID(value string) error {
	return validateDockerV2Identity(value, MaxAgentInstanceIDLen)
}

func validateDockerV2ContainerKey(value string) error {
	return validateDockerV2Identity(value, MaxContainerKeyLen)
}

func validateDockerV2Digest(value string) error {
	return validateSafeID(value, MaxDockerV2DigestLen)
}

func validateDockerV2EventID(value string) error {
	return validateSafeID(value, MaxEventIDLen)
}

func validateDockerV2Action(value string) error {
	if !dockerV2ActionAllowlist[value] {
		return fmt.Errorf("unapproved event action")
	}
	return nil
}

func validateDockerV2Health(value string) error {
	if value == "" {
		return nil
	}
	if !dockerV2HealthAllowlist[value] {
		return fmt.Errorf("unapproved health value")
	}
	return nil
}

func validateDockerV2GapReason(value string) error {
	if value == "" {
		return nil
	}
	if !dockerV2GapReasonAllowlist[value] {
		return fmt.Errorf("unapproved gap reason")
	}
	return nil
}

func validateDockerV2ContextReason(value string) error {
	if value == "" {
		return nil
	}
	if !dockerV2ContextReasonAllowlist[value] {
		return fmt.Errorf("unapproved context reason")
	}
	return nil
}

func validateDockerV2ContextVersion(value int) error {
	if value != DockerEventContextVersionV1 {
		return fmt.Errorf("unsupported event context version")
	}
	return nil
}

func validateDockerV2ExitCode(v *int) error {
	if v == nil {
		return nil
	}
	if *v < 0 || *v > 255 {
		return fmt.Errorf("exit code out of range")
	}
	return nil
}

func validateDockerV2Signal(v *int) error {
	if v == nil {
		return nil
	}
	if *v < 0 || *v > 255 {
		return fmt.Errorf("signal out of range")
	}
	return nil
}

func validateDockerV2SkippedCount(v *int) error {
	if v == nil {
		return nil
	}
	if *v < 0 || *v > 10000 {
		return fmt.Errorf("skipped count out of range")
	}
	return nil
}

func validateDockerV2ErrorCode(value string) error {
	if value == "" {
		return nil
	}
	switch value {
	case DockerErrorSocketMissing,
		DockerErrorPermissionDenied,
		DockerErrorTimeout,
		DockerErrorDaemonUnreachable,
		DockerErrorUnsupported,
		DockerErrorBadResponse:
		return nil
	}
	return fmt.Errorf("unapproved error code")
}

func validateDockerV2Coverage(c DockerCoverageV2) error {
	if c.DetailsSampled < 0 || c.DetailsSampled > MaxContainers {
		return fmt.Errorf("details sampled out of range")
	}
	if c.DetailsTotalEligible < 0 || c.DetailsTotalEligible > 10000 {
		return fmt.Errorf("details total eligible out of range")
	}
	if c.CohortDigest != "" {
		if err := validateDockerV2Digest(c.CohortDigest); err != nil {
			return err
		}
	}
	return nil
}

func validateDockerV2Watermark(w *DockerEventWatermarkV2) error {
	if w == nil {
		return nil
	}
	if err := validateDockerV2NanoString(w.TimeNano); err != nil {
		return err
	}
	if len(w.BoundaryDigests) > MaxDockerV2BoundaryDigests {
		return fmt.Errorf("boundary digest overflow")
	}
	for _, d := range w.BoundaryDigests {
		if err := validateDockerV2Digest(d); err != nil {
			return err
		}
	}
	return nil
}

func validateDockerV2Window(win *DockerEventWindowV2) error {
	if win == nil {
		return nil
	}
	if err := validateDockerV2NanoString(win.Since); err != nil {
		return err
	}
	if err := validateDockerV2NanoString(win.Until); err != nil {
		return err
	}
	if cmpCanonicalNano(win.Since, win.Until) >= 0 {
		return fmt.Errorf("invalid event window")
	}
	// Canonical lossy/gapReason consistency (API: lossy === (gapReason !== undefined)).
	if win.Lossy && win.GapReason == "" {
		return fmt.Errorf("lossy window requires gap reason")
	}
	if !win.Lossy && win.GapReason != "" {
		return fmt.Errorf("non-lossy window must not carry gap reason")
	}
	return validateDockerV2GapReason(win.GapReason)
}

func validateDockerV2Event(e DockerEventV2) error {
	if err := validateDockerV2EventID(e.EventID); err != nil {
		return err
	}
	if e.EventOccurredAt == "" {
		return fmt.Errorf("missing event time")
	}
	if err := validateDockerV2Action(e.Action); err != nil {
		return err
	}
	// Host-scope events (daemon_restarted, stream_gap) omit containerKey;
	// container-scope events require a valid opaque key.
	switch e.Action {
	case DockerV2ActionDaemonRestart, DockerV2ActionStreamGap:
		if e.ContainerKey != "" {
			if err := validateDockerV2ContainerKey(e.ContainerKey); err != nil {
				return err
			}
		}
	default:
		if err := validateDockerV2ContainerKey(e.ContainerKey); err != nil {
			return err
		}
	}
	if err := validateDockerV2ContextVersion(e.Context.Version); err != nil {
		return err
	}
	if err := validateDockerV2Health(e.Context.HealthStatus); err != nil {
		return err
	}
	if err := validateDockerV2ExitCode(e.Context.ExitCode); err != nil {
		return err
	}
	if err := validateDockerV2Signal(e.Context.Signal); err != nil {
		return err
	}
	if err := validateDockerV2ContextReason(e.Context.Reason); err != nil {
		return err
	}
	if e.Context.SkippedFromNano != "" {
		if err := validateDockerV2NanoString(e.Context.SkippedFromNano); err != nil {
			return err
		}
	}
	if e.Context.SkippedThroughNano != "" {
		if err := validateDockerV2NanoString(e.Context.SkippedThroughNano); err != nil {
			return err
		}
	}
	if err := validateDockerV2SkippedCount(e.Context.SkippedCount); err != nil {
		return err
	}
	return nil
}

// validateDockerV2Batch enforces the all-or-none event protocol:
// batchId/events/eventWindow/fromWatermark/proposedWatermark travel
// together. The batch is either fully absent (minimal snapshot, no event
// branch, no batchId) or fully present. Watermark binding retains
// from==since and enforces from <= proposed <= until (canonical decimal
// ordering): capped windows may report partial progress
// (since < proposed < until); uncapped complete windows and explicit lossy
// abandonment through U (boundary_overrun_abandoned, response_oversize,
// collection_deadline) must advance proposed exactly to until.
// boundary_overflow stays partial-tolerant: lossy overflow with
// proposed < until is accepted.
func validateDockerV2Batch(m DockerMetricsV2) error {
	hasBatch := m.BatchID != ""
	hasEvents := m.Events != nil
	hasWindow := m.EventWindow != nil
	hasFrom := m.FromWatermark != nil
	hasProposed := m.ProposedWatermark != nil
	present := 0
	for _, p := range []bool{hasBatch, hasEvents, hasWindow, hasFrom, hasProposed} {
		if p {
			present++
		}
	}
	if present != 0 && present != 5 {
		return fmt.Errorf("event batch must include batchId+events+eventWindow+fromWatermark+proposedWatermark together")
	}
	if present == 5 {
		if m.FromWatermark.TimeNano != m.EventWindow.Since {
			return fmt.Errorf("fromWatermark.timeNano must equal eventWindow.since")
		}
		// Range: from <= proposed <= until.
		if cmpCanonicalNano(m.FromWatermark.TimeNano, m.ProposedWatermark.TimeNano) > 0 {
			return fmt.Errorf("proposedWatermark.timeNano must not precede fromWatermark.timeNano")
		}
		if cmpCanonicalNano(m.ProposedWatermark.TimeNano, m.EventWindow.Until) > 0 {
			return fmt.Errorf("proposedWatermark.timeNano must not exceed eventWindow.until")
		}
		// Uncapped complete windows must advance exactly to until.
		if !m.EventWindow.Capped && !m.EventWindow.Lossy {
			if m.ProposedWatermark.TimeNano != m.EventWindow.Until {
				return fmt.Errorf("proposedWatermark.timeNano must equal eventWindow.until for uncapped complete windows")
			}
		}
		// Explicit lossy abandonment through U must advance exactly to until.
		// Applies to every abandonment-through-U gap reason:
		// boundary_overrun_abandoned, response_oversize, collection_deadline.
		// boundary_overflow remains partial-tolerant.
		switch {
		case m.EventWindow.Lossy && m.EventWindow.GapReason == DockerV2GapBoundaryOverrun,
			m.EventWindow.Lossy && m.EventWindow.GapReason == DockerV2GapResponseOversize,
			m.EventWindow.Lossy && m.EventWindow.GapReason == DockerV2GapCollectionDeadline:
			if m.ProposedWatermark.TimeNano != m.EventWindow.Until {
				return fmt.Errorf("proposedWatermark.timeNano must equal eventWindow.until for abandoned windows")
			}
		}
	}
	return nil
}

// validateDockerV2Metrics validates a full flat v2 wire payload against the
// canonical API contract: IDs/digests/enums, caps, window/watermark
// relations, event scoping, and storage shape.
func validateDockerV2MonitoringMetadata(m *DockerMonitoringMetadataV2) error {
	if m == nil { return nil }
	if m.EffectiveCadenceSeconds <= 0 || m.EffectiveCadenceSeconds > 86400 { return fmt.Errorf("effective cadence out of range") }
	if m.Availability != "available" && m.Availability != "unavailable" && m.Availability != "unknown" { return fmt.Errorf("invalid availability") }
	if m.State != "enabled" && m.State != "disabled" && m.State != "unknown" { return fmt.Errorf("invalid monitoring state") }
	return nil
}

func validateDockerV2Metrics(m DockerMetricsV2) error {
	if m.SchemaVersion != DockerSchemaVersionV2 {
		return fmt.Errorf("unsupported schema version")
	}
	if err := validateDockerV2AgentInstanceID(m.AgentInstanceID); err != nil {
		return err
	}
	if err := validateDockerV2Identity(m.SnapshotID, MaxSnapshotIDLen); err != nil {
		return err
	}
	if m.BatchID != "" {
		if err := validateDockerV2Identity(m.BatchID, MaxBatchIDLen); err != nil {
			return err
		}
	}
	if err := validateDockerV2ErrorCode(m.ErrorCode); err != nil {
		return err
	}
	if len(m.Containers) > MaxContainers {
		return fmt.Errorf("container overflow")
	}
	for _, c := range m.Containers {
		if err := validateDockerV2ContainerKey(c.ContainerKey); err != nil {
			return err
		}
		if err := validateDockerV2Health(c.Health); err != nil {
			return err
		}
	}
	if m.SampledContainerAggregate != nil {
		if err := validateDockerV2Coverage(m.SampledContainerAggregate.Coverage); err != nil {
			return err
		}
	}
	if len(m.Events) > MaxDockerV2Events {
		return fmt.Errorf("event overflow")
	}
	for _, e := range m.Events {
		if err := validateDockerV2Event(e); err != nil {
			return err
		}
	}
	if err := validateDockerV2Window(m.EventWindow); err != nil {
		return err
	}
	if err := validateDockerV2Watermark(m.FromWatermark); err != nil {
		return err
	}
	if err := validateDockerV2Watermark(m.ProposedWatermark); err != nil {
		return err
	}
	if err := validateDockerV2Batch(m); err != nil {
		return err
	}
	if m.Storage != nil && m.Storage.FormulaVersion != DockerStorageFormulaVersionV1 {
		return fmt.Errorf("unsupported storage formula version")
	}
	if err := validateDockerV2MonitoringMetadata(m.Monitoring); err != nil {
		return err
	}
	return nil
}

// sanitizeDockerV2Display truncates display-only strings. Identity, digest,
// action, and context-version fields are never truncated: they validate
// fail-closed via the validators above.
func sanitizeDockerV2Display(c DockerContainerV2) DockerContainerV2 {
	c.Name = cappedString(c.Name, MaxNameLen)
	c.Image = cappedString(c.Image, MaxImageLen)
	c.State = cappedString(c.State, MaxStateLen)
	c.Status = cappedString(c.Status, MaxStatusLen)
	c.CreatedAt = cappedString(c.CreatedAt, MaxCreatedAtLen)
	c.CPUPercent = cappedDockerPercent(c.CPUPercent)
	c.MemoryUsageBytes = cappedDockerFloat(c.MemoryUsageBytes)
	c.MemoryLimitBytes = cappedDockerFloat(c.MemoryLimitBytes)
	c.NetworkRxBytes = cappedDockerFloat(c.NetworkRxBytes)
	c.NetworkTxBytes = cappedDockerFloat(c.NetworkTxBytes)
	c.BlockReadBytes = cappedDockerFloat(c.BlockReadBytes)
	c.BlockWriteBytes = cappedDockerFloat(c.BlockWriteBytes)
	if c.PIDs < 0 {
		c.PIDs = 0
	}
	return c
}
