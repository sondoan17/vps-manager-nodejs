package metrics

import "time"

// DockerMetrics is a bounded sanitized snapshot of Docker container metrics
// sent from the Go agent to the backend.
type DockerMetrics struct {
	VpsId            string                  `json:"vpsId,omitempty"`
	CollectedAt      string                  `json:"collectedAt,omitempty"`
	ReceivedAt       string                  `json:"receivedAt,omitempty"`
	AgentVersion     string                  `json:"agentVersion,omitempty"`
	SchemaVersion    int                     `json:"schemaVersion"`
	Available        bool                    `json:"available"`
	ErrorCode        string                  `json:"errorCode,omitempty"`
	ContainerTotal   int                     `json:"containerTotal"`
	ContainerRunning int                     `json:"containerRunning"`
	CPUPercent       float64                 `json:"cpuPercent"`
	MemoryUsageBytes float64                 `json:"memoryUsageBytes"`
	MemoryLimitBytes float64                 `json:"memoryLimitBytes,omitempty"`
	NetworkRxBytes   float64                 `json:"networkRxBytes"`
	NetworkTxBytes   float64                 `json:"networkTxBytes"`
	BlockReadBytes   float64                 `json:"blockReadBytes"`
	BlockWriteBytes  float64                 `json:"blockWriteBytes"`
	PIDs             int                     `json:"pids"`
	Containers       []DockerContainerMetric `json:"containers"`
}

// DockerContainerMetric is a bounded sanitized per-container metric snapshot.
type DockerContainerMetric struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Image            string  `json:"image"`
	State            string  `json:"state"`
	Status           string  `json:"status,omitempty"`
	CreatedAt        string  `json:"createdAt,omitempty"`
	CPUPercent       float64 `json:"cpuPercent"`
	MemoryUsageBytes float64 `json:"memoryUsageBytes"`
	MemoryLimitBytes float64 `json:"memoryLimitBytes,omitempty"`
	NetworkRxBytes   float64 `json:"networkRxBytes"`
	NetworkTxBytes   float64 `json:"networkTxBytes"`
	BlockReadBytes   float64 `json:"blockReadBytes"`
	BlockWriteBytes  float64 `json:"blockWriteBytes"`
	PIDs             int     `json:"pids"`
}

// Docker schema version and bounded field limits.
const (
	DockerSchemaVersion         = 1
	MaxContainers               = 20
	MaxDockerCPUPercent         = 100000
	MaxSafeJSONNumberUint64     = uint64(9007199254740991)
	MaxSafeJSONNumberFloat      = float64(MaxSafeJSONNumberUint64)
	MaxIDLen                    = 16
	MaxNameLen                  = 255
	MaxImageLen                 = 255
	MaxStateLen                 = 255
	MaxStatusLen                = 255
	MaxCreatedAtLen             = 255
	MaxErrorLen                 = 255
	DefaultDockerTimeoutSeconds = 5
)

// Sanitized Docker error codes exposed to the control plane.
const (
	DockerErrorUnsupported       = "unsupported_os"
	DockerErrorSocketMissing     = "socket_missing"
	DockerErrorPermissionDenied  = "permission_denied"
	DockerErrorTimeout           = "timeout"
	DockerErrorDaemonUnreachable = "daemon_unreachable"
	DockerErrorBadResponse       = "bad_response"
)

// cappedString returns s truncated to at most max bytes.
func cappedString(s string, max int) string {
	if len(s) > max {
		s = s[:max]
	}
	return s
}

func cappedDockerPercent(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > MaxDockerCPUPercent {
		return MaxDockerCPUPercent
	}
	return value
}

func cappedDockerFloat(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > MaxSafeJSONNumberFloat {
		return MaxSafeJSONNumberFloat
	}
	return value
}

func dockerUintToFloat(value uint64) float64 {
	if value > MaxSafeJSONNumberUint64 {
		return float64(MaxSafeJSONNumberUint64)
	}
	return float64(value)
}

func dockerUintToInt(value uint64) int {
	const maxInt32 = uint64(2147483647)
	if value > maxInt32 {
		return int(maxInt32)
	}
	return int(value)
}

// unavailableDocker returns a sanitized DockerMetrics with the given error code
// and Available=false.
func unavailableDocker(errorCode string) *DockerMetrics {
	return &DockerMetrics{
		SchemaVersion: DockerSchemaVersion,
		Available:     false,
		ErrorCode:     errorCode,
		CollectedAt:   time.Now().UTC().Format(time.RFC3339),
		Containers:    []DockerContainerMetric{},
	}
}
