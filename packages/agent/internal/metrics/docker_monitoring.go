package metrics

// Canonical Docker monitoring payload types and validation helpers.
// The payload is unversioned on the wire; storage and event sub-formulas
// retain their own compatibility versions where required.
const (
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
	MaxDockerEvents           = 100
	MaxDockerEventBranchBytes = 64 * 1024

	// Event watermark boundary digest cap (plan section 3).
	MaxDockerBoundaryDigests = 256
	MaxDockerDigestLen       = 64

	// Storage overview response read cap (plan section 3).
	MaxDockerSystemDFBytes = 256 * 1024

	// Canonical decimal-string bounds for exact nanosecond fields.
	MaxDockerNanoLen = 32
)

// Typed allowlisted container health values (API enum).
const (
	DockerHealthHealthy   = "healthy"
	DockerHealthUnhealthy = "unhealthy"
	DockerHealthStarting  = "starting"
	DockerHealthNone      = "none"
)

// Typed allowlisted event actions (API enum).
const (
	DockerActionCreate        = "create"
	DockerActionStart         = "start"
	DockerActionRestart       = "restart"
	DockerActionDie           = "die"
	DockerActionStop          = "stop"
	DockerActionKill          = "kill"
	DockerActionDestroy       = "destroy"
	DockerActionRemove        = "remove"
	DockerActionHealthStatus  = "health_status"
	DockerActionStreamGap     = "stream_gap"
	DockerActionDaemonRestart = "daemon_restarted"
)

// Typed allowlisted gap reasons (API enum).
const (
	DockerGapBoundaryOverflow   = "boundary_overflow"
	DockerGapBoundaryOverrun    = "boundary_overrun_abandoned"
	DockerGapResponseOversize   = "response_oversize"
	DockerGapCollectionDeadline = "collection_deadline"
	DockerReasonDaemonRestarted = "daemon_restarted"
)

var dockerHealthAllowlist = map[string]bool{
	DockerHealthHealthy:   true,
	DockerHealthUnhealthy: true,
	DockerHealthStarting:  true,
	DockerHealthNone:      true,
}

var dockerActionAllowlist = map[string]bool{
	DockerActionCreate:        true,
	DockerActionStart:         true,
	DockerActionRestart:       true,
	DockerActionDie:           true,
	DockerActionStop:          true,
	DockerActionKill:          true,
	DockerActionDestroy:       true,
	DockerActionRemove:        true,
	DockerActionHealthStatus:  true,
	DockerActionStreamGap:     true,
	DockerActionDaemonRestart: true,
}

var dockerGapReasonAllowlist = map[string]bool{
	DockerGapBoundaryOverflow:   true,
	DockerGapBoundaryOverrun:    true,
	DockerGapResponseOversize:   true,
	DockerGapCollectionDeadline: true,
}

var dockerContextReasonAllowlist = map[string]bool{
	DockerGapBoundaryOverflow:   true,
	DockerGapBoundaryOverrun:    true,
	DockerGapResponseOversize:   true,
	DockerGapCollectionDeadline: true,
	DockerReasonDaemonRestarted: true,
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
	ContainerKey string `json:"containerKey"`
	// ID is retained only for the v1 DTO. V2 identifies containers solely by
	// the opaque containerKey and must never transmit a daemon ID prefix.
	ID               string  `json:"-"`
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

// DockerMonitoringMetadataV2 is optional cadence and lifecycle metadata.
type DockerMonitoringMetadataV2 struct {
	EffectiveCadenceSeconds int    `json:"effectiveCadenceSeconds"`
	Availability            string `json:"availability"`
	State                   string `json:"state"`
}

// DockerMetrics is the canonical flat API wire contract.
// Top-level host aggregate fields remain required; event batch fields are
// flat (batchId/snapshotId/agentInstanceId/fromWatermark/proposedWatermark/
// events/eventWindow). It is the sole Docker payload on SystemMetrics.
type DockerMetricsV2 struct {
	CollectedAt               string                             `json:"collectedAt"`
	AgentVersion              string                             `json:"agentVersion,omitempty"`
	EngineVersion             string                             `json:"engineVersion,omitempty"`
	APIVersion                string                             `json:"apiVersion,omitempty"`
	OS                        string                             `json:"os,omitempty"`
	Architecture              string                             `json:"architecture,omitempty"`
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
	Monitoring                *DockerMonitoringMetadataV2        `json:"monitoring,omitempty"`
}
