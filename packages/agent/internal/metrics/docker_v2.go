package metrics

// Docker monitoring Phase 1 increment I0 — additive schema-v2 contract.
//
// Canonical wire contract: flat API shape (packages/api/src/agents/
// agent.models.ts + agent.schemas.ts). V1 (DockerMetrics,
// DockerContainerMetric, DockerSchemaVersion = 1) is preserved exactly.
// Nothing here is wired into collection, push, durable state, or storage.
// Display strings may truncate; identity/digest/action/context-version
// fields validate fail-closed and are never truncated or coerced.

const (
	// DockerSchemaVersionV2 is the additive discriminated schema version.
	DockerSchemaVersionV2 = 2

	// Storage formula version persisted with every storage observation.
	DockerStorageFormulaVersionV1 = 1

	// Typed safe event-context version.
	DockerEventContextVersionV1 = 1
)

const (
	// Identity lengths: base64url(HMAC-SHA-256(...))[0:32] per plan.
	// API safeId allows up to 128; agent emits exactly the 32-char form.
	MaxAgentInstanceIDLen = 32
	MaxContainerKeyLen    = 32

	// Opaque push/dedupe IDs: bounded random opaque strings.
	MaxSnapshotIDLen = 64
	MaxBatchIDLen    = 64
	MaxEventIDLen    = 128

	// Event batch transmit/storage caps (plan section 3).
	MaxDockerV2Events           = 100
	MaxDockerV2EventBranchBytes = 64 * 1024

	// Event watermark boundary digest cap (plan section 3).
	MaxDockerV2BoundaryDigests = 256
	MaxDockerV2DigestLen       = 64

	// Storage overview response read cap (plan section 3).
	MaxDockerV2SystemDFBytes = 256 * 1024

	// Canonical decimal-string bounds for exact nanosecond fields.
	MaxDockerV2NanoLen = 32
)

// Typed allowlisted container health values (API enum).
const (
	DockerV2HealthHealthy   = "healthy"
	DockerV2HealthUnhealthy = "unhealthy"
	DockerV2HealthStarting  = "starting"
	DockerV2HealthNone      = "none"
)

// Typed allowlisted event actions (API enum).
const (
	DockerV2ActionCreate        = "create"
	DockerV2ActionStart         = "start"
	DockerV2ActionRestart       = "restart"
	DockerV2ActionDie           = "die"
	DockerV2ActionStop          = "stop"
	DockerV2ActionKill          = "kill"
	DockerV2ActionDestroy       = "destroy"
	DockerV2ActionRemove        = "remove"
	DockerV2ActionHealthStatus  = "health_status"
	DockerV2ActionStreamGap     = "stream_gap"
	DockerV2ActionDaemonRestart = "daemon_restarted"
)

// Typed allowlisted gap reasons (API enum).
const (
	DockerV2GapBoundaryOverflow   = "boundary_overflow"
	DockerV2GapBoundaryOverrun    = "boundary_overrun_abandoned"
	DockerV2GapResponseOversize   = "response_oversize"
	DockerV2GapCollectionDeadline = "collection_deadline"
	DockerV2ReasonDaemonRestarted = "daemon_restarted"
)

var dockerV2HealthAllowlist = map[string]bool{
	DockerV2HealthHealthy:   true,
	DockerV2HealthUnhealthy: true,
	DockerV2HealthStarting:  true,
	DockerV2HealthNone:      true,
}

var dockerV2ActionAllowlist = map[string]bool{
	DockerV2ActionCreate:        true,
	DockerV2ActionStart:         true,
	DockerV2ActionRestart:       true,
	DockerV2ActionDie:           true,
	DockerV2ActionStop:          true,
	DockerV2ActionKill:          true,
	DockerV2ActionDestroy:       true,
	DockerV2ActionRemove:        true,
	DockerV2ActionHealthStatus:  true,
	DockerV2ActionStreamGap:     true,
	DockerV2ActionDaemonRestart: true,
}

var dockerV2GapReasonAllowlist = map[string]bool{
	DockerV2GapBoundaryOverflow:   true,
	DockerV2GapBoundaryOverrun:    true,
	DockerV2GapResponseOversize:   true,
	DockerV2GapCollectionDeadline: true,
}

var dockerV2ContextReasonAllowlist = map[string]bool{
	DockerV2GapBoundaryOverflow:   true,
	DockerV2GapBoundaryOverrun:    true,
	DockerV2GapResponseOversize:   true,
	DockerV2GapCollectionDeadline: true,
	DockerV2ReasonDaemonRestarted: true,
}

// DockerCoverageV2 mirrors API DockerCoverage.
type DockerCoverageV2 struct {
	DetailsSampled       int    `json:"detailsSampled"`
	DetailsTotalEligible int    `json:"detailsTotalEligible"`
	Complete             bool   `json:"complete"`
	CohortDigest         string `json:"cohortDigest,omitempty"`
}

// DockerSampledContainerAggregateV2 mirrors API DockerSampledContainerAggregate.
type DockerSampledContainerAggregateV2 struct {
	Coverage         DockerCoverageV2 `json:"coverage"`
	CPUPercent       float64          `json:"cpuPercent"`
	MemoryUsageBytes float64          `json:"memoryUsageBytes"`
	NetworkRxBytes   float64          `json:"networkRxBytes"`
	NetworkTxBytes   float64          `json:"networkTxBytes"`
	BlockReadBytes   float64          `json:"blockReadBytes"`
	BlockWriteBytes  float64          `json:"blockWriteBytes"`
	PIDs             int              `json:"pids"`
}

// DockerContainerV2 mirrors API AgentDockerContainerMetricV2.
type DockerContainerV2 struct {
	ContainerKey     string  `json:"containerKey"`
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Image            string  `json:"image"`
	State            string  `json:"state"`
	Status           string  `json:"status,omitempty"`
	CreatedAt        string  `json:"createdAt,omitempty"`
	Health           string  `json:"health,omitempty"`
	CPUPercent       float64 `json:"cpuPercent"`
	MemoryUsageBytes float64 `json:"memoryUsageBytes"`
	MemoryLimitBytes float64 `json:"memoryLimitBytes,omitempty"`
	NetworkRxBytes   float64 `json:"networkRxBytes"`
	NetworkTxBytes   float64 `json:"networkTxBytes"`
	BlockReadBytes   float64 `json:"blockReadBytes"`
	BlockWriteBytes  float64 `json:"blockWriteBytes"`
	PIDs             int     `json:"pids"`
}

// DockerEventWatermarkV2 mirrors API DockerEventWatermark: canonical
// non-negative decimal string nanoseconds plus bounded digest set.
type DockerEventWatermarkV2 struct {
	TimeNano        string   `json:"timeNano"`
	BoundaryDigests []string `json:"boundaryDigests"`
}

// DockerEventContextV2 mirrors API DockerEventContext.
type DockerEventContextV2 struct {
	Version            int    `json:"version"`
	HealthStatus       string `json:"healthStatus,omitempty"`
	ExitCode           *int   `json:"exitCode,omitempty"`
	Signal             *int   `json:"signal,omitempty"`
	OOMKilled          *bool  `json:"oomKilled,omitempty"`
	Reason             string `json:"reason,omitempty"`
	SkippedFromNano    string `json:"skippedFromNano,omitempty"`
	SkippedThroughNano string `json:"skippedThroughNano,omitempty"`
	SkippedCount       *int   `json:"skippedCount,omitempty"`
	// ReducedPrecision marks seconds-only source events normalized from
	// `time` when `timeNano` is absent (nano = time*1e9). Typed safe
	// context only; never carries raw daemon payload.
	ReducedPrecision bool `json:"reducedPrecision,omitempty"`
}

// DockerEventV2 mirrors API AgentDockerEvent. ContainerKey is
// nullable/omitted for host-scope events (daemon_restarted, stream_gap).
type DockerEventV2 struct {
	EventID         string               `json:"eventId"`
	EventOccurredAt string               `json:"eventOccurredAt"`
	ContainerKey    string               `json:"containerKey,omitempty"`
	Action          string               `json:"action"`
	Context         DockerEventContextV2 `json:"context"`
}

// DockerEventWindowV2 mirrors API DockerEventWindow: canonical
// non-negative decimal string since/until plus typed gap reason.
type DockerEventWindowV2 struct {
	Since     string `json:"since"`
	Until     string `json:"until"`
	Capped    bool   `json:"capped"`
	Lossy     bool   `json:"lossy"`
	GapReason string `json:"gapReason,omitempty"`
}

// DockerStorageCategoryV2 mirrors API DockerStorageCategory.
type DockerStorageCategoryV2 struct {
	Supported                 bool    `json:"supported"`
	Count                     int     `json:"count"`
	TotalBytes                float64 `json:"totalBytes"`
	ReclaimableBytes          float64 `json:"reclaimableBytes,omitempty"`
	ReclaimableSupported      bool    `json:"reclaimableSupported,omitempty"`
	EstimatedReclaimableBytes float64 `json:"estimatedReclaimableBytes,omitempty"`
}

// DockerStorageAggregateV2 mirrors API AgentDockerStorageAggregate.
type DockerStorageAggregateV2 struct {
	FormulaVersion int                     `json:"formulaVersion"`
	Images         DockerStorageCategoryV2 `json:"images"`
	Containers     DockerStorageCategoryV2 `json:"containers"`
	LocalVolumes   DockerStorageCategoryV2 `json:"localVolumes"`
	BuildCache     DockerStorageCategoryV2 `json:"buildCache"`
}

// DockerMetricsV2 is the canonical flat API wire contract (schemaVersion 2).
// Top-level host aggregate fields remain required as API v2 expects; event
// batch fields are flat (batchId/snapshotId/agentInstanceId/fromWatermark/
// proposedWatermark/events/eventWindow). Not attached to SystemMetrics or
// any collection path in I0.
type DockerMetricsV2 struct {
	CollectedAt               string                             `json:"collectedAt"`
	AgentVersion              string                             `json:"agentVersion,omitempty"`
	EngineVersion             string                             `json:"engineVersion,omitempty"`
	APIVersion                string                             `json:"apiVersion,omitempty"`
	OS                        string                             `json:"os,omitempty"`
	Architecture              string                             `json:"architecture,omitempty"`
	SchemaVersion             int                                `json:"schemaVersion"`
	AgentInstanceID           string                             `json:"agentInstanceId"`
	SnapshotID                string                             `json:"snapshotId"`
	SourceSequence            string                             `json:"sourceSequence"`
	BatchID                   string                             `json:"batchId,omitempty"`
	Available                 bool                               `json:"available"`
	ErrorCode                 string                             `json:"errorCode,omitempty"`
	ContainerTotal            int                                `json:"containerTotal"`
	ContainerRunning          int                                `json:"containerRunning"`
	CPUPercent                float64                            `json:"cpuPercent"`
	MemoryUsageBytes          float64                            `json:"memoryUsageBytes"`
	MemoryLimitBytes          float64                            `json:"memoryLimitBytes,omitempty"`
	NetworkRxBytes            float64                            `json:"networkRxBytes"`
	NetworkTxBytes            float64                            `json:"networkTxBytes"`
	BlockReadBytes            float64                            `json:"blockReadBytes"`
	BlockWriteBytes           float64                            `json:"blockWriteBytes"`
	PIDs                      int                                `json:"pids"`
	Containers                []DockerContainerV2                `json:"containers"`
	SampledContainerAggregate *DockerSampledContainerAggregateV2 `json:"sampledContainerAggregate,omitempty"`
	Events                    []DockerEventV2                    `json:"events,omitempty"`
	EventWindow               *DockerEventWindowV2               `json:"eventWindow,omitempty"`
	FromWatermark             *DockerEventWatermarkV2            `json:"fromWatermark,omitempty"`
	ProposedWatermark         *DockerEventWatermarkV2            `json:"proposedWatermark,omitempty"`
	Storage                   *DockerStorageAggregateV2          `json:"storage,omitempty"`
}
