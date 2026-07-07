//go:build linux

package metrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const dockerSocketPath = "/var/run/docker.sock"

// newDefaultDockerHTTPClient creates an HTTP client that dials the Docker
// Engine Unix socket directly.
func newDefaultDockerHTTPClient(socketPath string, timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{Timeout: timeout}).DialContext(ctx, "unix", socketPath)
			},
		},
	}
}

// collectDocker performs Docker metrics collection via the Docker Engine API
// over the Unix socket. Returns a fully populated DockerMetrics on success or
// a sanitized unavailable object on any error. Never returns nil so the caller
// can always attach the result.
func (c *Collector) collectDocker(ctx context.Context) *DockerMetrics {
	// Lazy-init the HTTP client.
	c.dockerMu.Lock()
	client := c.dockerHTTPClient
	baseURL := c.dockerBaseURL
	socketPath := c.dockerSocketPath
	usingDefaultSocket := false
	if socketPath == "" {
		socketPath = dockerSocketPath
	}
	if baseURL == "" {
		baseURL = "http://localhost"
	}
	if client == nil {
		client = newDefaultDockerHTTPClient(socketPath, DefaultDockerTimeoutSeconds*time.Second)
		c.dockerHTTPClient = client
		usingDefaultSocket = true
	}
	c.dockerMu.Unlock()

	// Check the real socket before attempting to dial. Tests can inject a client
	// and base URL, which intentionally skips this real-host check.
	if usingDefaultSocket {
		if _, err := os.Stat(socketPath); os.IsNotExist(err) {
			return unavailableDocker(DockerErrorSocketMissing)
		}
	}
	parsedBaseURL, err := url.Parse(baseURL)
	if err != nil || parsedBaseURL.Scheme == "" || parsedBaseURL.Host == "" {
		return unavailableDocker(DockerErrorSocketMissing)
	}

	// Use a sub-context with timeout for the entire Docker collection.
	collectCtx, cancel := context.WithTimeout(ctx, DefaultDockerTimeoutSeconds*time.Second)
	defer cancel()

	// 1. List all containers.
	containers, err := listContainers(collectCtx, client, baseURL)
	if err != nil {
		return classifyDockerError(err)
	}

	containerTotal := len(containers)
	containerRunningTotal := 0
	for _, raw := range containers {
		if raw.State == "running" {
			containerRunningTotal++
		}
	}

	// Cap containers stored/statted at MaxContainers.
	if len(containers) > MaxContainers {
		containers = containers[:MaxContainers]
	}

	now := time.Now().UTC().Format(time.RFC3339)

	result := &DockerMetrics{
		SchemaVersion:  DockerSchemaVersion,
		Available:      true,
		CollectedAt:    now,
		ContainerTotal: containerTotal,
		Containers:     make([]DockerContainerMetric, 0, len(containers)),
	}

	var (
		totalCPU, totalMem, totalMemLimit float64
		totalRx, totalTx                  float64
		totalBlkRead, totalBlkWrite       float64
		totalPIDs                         int
	)

	for _, raw := range containers {
		ctr := dockerRawToContainer(raw)

		if raw.State == "running" {
			// Fetch per-container stats for running containers.
			stats, err := getContainerStats(collectCtx, client, baseURL, raw.ID)
			if err != nil {
				// Include the container without stats rather than failing entirely.
				result.Containers = append(result.Containers, ctr)
				continue
			}

			// Populate stats.
			ctr.CPUPercent = cappedDockerPercent(stats.cpuPercent)
			ctr.MemoryUsageBytes = dockerUintToFloat(stats.memoryUsage)
			if stats.memoryLimit > 0 {
				ctr.MemoryLimitBytes = dockerUintToFloat(stats.memoryLimit)
			}
			ctr.NetworkRxBytes = dockerUintToFloat(stats.netRxBytes)
			ctr.NetworkTxBytes = dockerUintToFloat(stats.netTxBytes)
			ctr.BlockReadBytes = dockerUintToFloat(stats.blkReadBytes)
			ctr.BlockWriteBytes = dockerUintToFloat(stats.blkWriteBytes)
			ctr.PIDs = dockerUintToInt(stats.pidsCurrent)

			// Accumulate aggregates.
			totalCPU += ctr.CPUPercent
			totalMem += ctr.MemoryUsageBytes
			if ctr.MemoryLimitBytes > 0 {
				totalMemLimit += ctr.MemoryLimitBytes
			}
			totalRx += ctr.NetworkRxBytes
			totalTx += ctr.NetworkTxBytes
			totalBlkRead += ctr.BlockReadBytes
			totalBlkWrite += ctr.BlockWriteBytes
			totalPIDs += ctr.PIDs
		}

		result.Containers = append(result.Containers, ctr)
	}

	result.ContainerRunning = containerRunningTotal
	result.CPUPercent = cappedDockerPercent(totalCPU)
	result.MemoryUsageBytes = cappedDockerFloat(totalMem)
	if totalMemLimit > 0 {
		result.MemoryLimitBytes = cappedDockerFloat(totalMemLimit)
	}
	result.NetworkRxBytes = cappedDockerFloat(totalRx)
	result.NetworkTxBytes = cappedDockerFloat(totalTx)
	result.BlockReadBytes = cappedDockerFloat(totalBlkRead)
	result.BlockWriteBytes = cappedDockerFloat(totalBlkWrite)
	result.PIDs = totalPIDs

	return result
}

// ---------------------------------------------------------------------------
// Raw Docker API types (only the fields we need)
// ---------------------------------------------------------------------------

type dockerContainerRaw struct {
	ID      string   `json:"Id"`
	Names   []string `json:"Names"`
	Image   string   `json:"Image"`
	State   string   `json:"State"`
	Status  string   `json:"Status"`
	Created int64    `json:"Created"`
}

type dockerStatsRaw struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     uint32 `json:"online_cpus"`
	} `json:"cpu_stats"`
	PrecpuStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
	} `json:"memory_stats"`
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
	BlkioStats struct {
		IoSvcBytesRecursive []struct {
			Op    string `json:"op"`
			Value uint64 `json:"value"`
		} `json:"io_service_bytes_recursive"`
	} `json:"blkio_stats"`
	PidsStats struct {
		Current uint64 `json:"current"`
	} `json:"pids_stats"`
}

// ---------------------------------------------------------------------------
// Intermediate stats carrier (avoids coupling to raw types outside this file)
// ---------------------------------------------------------------------------

type containerStats struct {
	cpuPercent    float64
	memoryUsage   uint64
	memoryLimit   uint64
	netRxBytes    uint64
	netTxBytes    uint64
	blkReadBytes  uint64
	blkWriteBytes uint64
	pidsCurrent   uint64
}

// ---------------------------------------------------------------------------
// Docker API calls
// ---------------------------------------------------------------------------

func listContainers(ctx context.Context, client *http.Client, baseURL string) ([]dockerContainerRaw, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		dockerAPIURL(baseURL, "/containers/json?all=1&size=false"), nil)
	if err != nil {
		return nil, fmt.Errorf("list containers request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("list containers: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*64))
	if err != nil {
		return nil, fmt.Errorf("list containers read body: %w", err)
	}

	var containers []dockerContainerRaw
	if err := json.Unmarshal(body, &containers); err != nil {
		return nil, fmt.Errorf("list containers parse: %w", err)
	}
	return containers, nil
}

func getContainerStats(ctx context.Context, client *http.Client, baseURL string, id string) (*containerStats, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		dockerAPIURL(baseURL, "/containers/"+url.PathEscape(id)+"/stats?stream=false"), nil)
	if err != nil {
		return nil, fmt.Errorf("stats request for %s: %w", id, err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("stats for %s: HTTP %d", id, resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*64))
	if err != nil {
		return nil, fmt.Errorf("stats read body for %s: %w", id, err)
	}

	var raw dockerStatsRaw
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("stats parse for %s: %w", id, err)
	}

	return parseStats(&raw), nil
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

func parseStats(raw *dockerStatsRaw) *containerStats {
	s := &containerStats{
		memoryUsage: raw.MemoryStats.Usage,
		memoryLimit: raw.MemoryStats.Limit,
	}

	// CPU: compare precpu_stats and cpu_stats.
	var cpuDelta, sysDelta uint64
	if raw.CPUStats.CPUUsage.TotalUsage >= raw.PrecpuStats.CPUUsage.TotalUsage {
		cpuDelta = raw.CPUStats.CPUUsage.TotalUsage - raw.PrecpuStats.CPUUsage.TotalUsage
	}
	if raw.CPUStats.SystemCPUUsage >= raw.PrecpuStats.SystemCPUUsage {
		sysDelta = raw.CPUStats.SystemCPUUsage - raw.PrecpuStats.SystemCPUUsage
	}
	onlineCPUs := raw.CPUStats.OnlineCPUs
	if onlineCPUs == 0 {
		onlineCPUs = 1
	}
	if sysDelta > 0 && cpuDelta > 0 {
		s.cpuPercent = cappedDockerPercent((float64(cpuDelta) / float64(sysDelta)) * float64(onlineCPUs) * 100.0)
	}

	// Network: sum all non-loopback interfaces.
	for name, iface := range raw.Networks {
		if name == "lo" {
			continue
		}
		s.netRxBytes += iface.RxBytes
		s.netTxBytes += iface.TxBytes
	}

	// Block I/O: sum read/write.
	for _, entry := range raw.BlkioStats.IoSvcBytesRecursive {
		switch strings.ToLower(entry.Op) {
		case "read":
			s.blkReadBytes += entry.Value
		case "write":
			s.blkWriteBytes += entry.Value
		}
	}

	s.pidsCurrent = raw.PidsStats.Current
	return s
}

func dockerAPIURL(baseURL string, pathAndQuery string) string {
	return strings.TrimRight(baseURL, "/") + pathAndQuery
}

func dockerRawToContainer(raw dockerContainerRaw) DockerContainerMetric {
	name := ""
	if len(raw.Names) > 0 {
		name = strings.TrimPrefix(raw.Names[0], "/")
	}

	createdAt := ""
	if raw.Created > 0 {
		createdAt = time.Unix(raw.Created, 0).UTC().Format(time.RFC3339)
	}

	return DockerContainerMetric{
		ID:        cappedString(raw.ID, MaxIDLen),
		Name:      cappedString(name, MaxNameLen),
		Image:     cappedString(raw.Image, MaxImageLen),
		State:     cappedString(raw.State, MaxStateLen),
		Status:    cappedString(raw.Status, MaxStatusLen),
		CreatedAt: cappedString(createdAt, MaxCreatedAtLen),
	}
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

func classifyDockerError(err error) *DockerMetrics {
	errStr := err.Error()

	if strings.Contains(errStr, "no such file or directory") ||
		strings.Contains(errStr, "connect: no such file") {
		return unavailableDocker(DockerErrorSocketMissing)
	}
	if strings.Contains(errStr, "permission denied") {
		return unavailableDocker(DockerErrorPermissionDenied)
	}
	if os.IsTimeout(err) || strings.Contains(errStr, "deadline exceeded") ||
		strings.Contains(errStr, "timeout") {
		return unavailableDocker(DockerErrorTimeout)
	}
	if strings.Contains(errStr, "connection refused") {
		return unavailableDocker(DockerErrorDaemonUnreachable)
	}

	return unavailableDocker(DockerErrorBadResponse)
}
