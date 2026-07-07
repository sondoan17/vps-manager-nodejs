package metrics

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Sentinel errors.
var (
	ErrUnsupported = fmt.Errorf("metrics collection not supported on this platform")
)

// SystemMetrics represents a single snapshot of system metrics.
type SystemMetrics struct {
	CPU         float64        `json:"cpu"`
	Memory      float64        `json:"memory"`
	Disk        float64        `json:"disk"`
	LoadAverage float64        `json:"loadAverage"`
	NetworkRx   float64        `json:"networkRx"`
	NetworkTx   float64        `json:"networkTx"`
	Uptime      float64        `json:"uptime"`
	System      *SystemInfo    `json:"system,omitempty"`
	Docker      *DockerMetrics `json:"docker,omitempty"`
}

// CPUStats holds raw CPU time values from /proc/stat.
type CPUStats struct {
	User    uint64
	Nice    uint64
	System  uint64
	Idle    uint64
	IOWait  uint64
	IRQ     uint64
	SoftIRQ uint64
	Steal   uint64
}

// NetStats holds raw network byte counters.
type NetStats struct {
	RxBytes uint64
	TxBytes uint64
}

// Collector gathers system metrics using /proc (Linux) or returns clear errors.
type Collector struct {
	prevCPU     *CPUStats
	prevNetRx   float64
	prevNetTx   float64
	prevNetTime time.Time

	// Docker metrics collection (thread-safe, off by default).
	dockerEnabled    bool
	dockerMu         sync.RWMutex
	dockerHTTPClient *http.Client
	dockerBaseURL    string
	dockerSocketPath string
}

// NewCollector creates a new Collector.
func NewCollector() *Collector {
	return &Collector{}
}

// Collect gathers a full SystemMetrics snapshot.
func (c *Collector) Collect(ctx context.Context) (*SystemMetrics, error) {
	if runtime.GOOS != "linux" {
		if _, err := os.Stat("/proc/stat"); os.IsNotExist(err) {
			return nil, ErrUnsupported
		}
	}

	metrics := &SystemMetrics{}

	cpu, err := c.collectCPU()
	if err != nil {
		return nil, fmt.Errorf("cpu: %w", err)
	}
	metrics.CPU = cpu

	mem, err := collectMemory()
	if err != nil {
		return nil, fmt.Errorf("memory: %w", err)
	}
	metrics.Memory = mem

	load, err := collectLoad()
	if err != nil {
		return nil, fmt.Errorf("load: %w", err)
	}
	metrics.LoadAverage = load

	uptime, err := collectUptime()
	if err != nil {
		return nil, fmt.Errorf("uptime: %w", err)
	}
	metrics.Uptime = uptime

	netRx, netTx, err := c.collectNetwork()
	if err != nil {
		return nil, fmt.Errorf("network: %w", err)
	}
	metrics.NetworkRx = netRx
	metrics.NetworkTx = netTx

	disk, err := collectDisk()
	if err != nil {
		return nil, fmt.Errorf("disk: %w", err)
	}
	metrics.Disk = disk

	// System info is best-effort — do not fail the whole collection.
	metrics.System = collectSystemInfo()

	// Docker metrics are best-effort; never fail host metrics collection.
	if c.isDockerEnabled() {
		metrics.Docker = c.collectDocker(ctx)
	}

	return metrics, nil
}

// ---------------------------------------------------------------------------
// CPU
// ---------------------------------------------------------------------------

// ReadCPUStats parses the first "cpu " line from /proc/stat content.
func ReadCPUStats(data string) (*CPUStats, error) {
	lines := strings.Split(data, "\n")
	for _, line := range lines {
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 8 {
			return nil, fmt.Errorf("unexpected cpu line: %q", line)
		}
		vals := make([]uint64, 8)
		for i := 1; i <= 8; i++ {
			v, err := strconv.ParseUint(fields[i], 10, 64)
			if err != nil {
				return nil, fmt.Errorf("parsing cpu field %d: %w", i, err)
			}
			vals[i-1] = v
		}
		return &CPUStats{
			User:    vals[0],
			Nice:    vals[1],
			System:  vals[2],
			Idle:    vals[3],
			IOWait:  vals[4],
			IRQ:     vals[5],
			SoftIRQ: vals[6],
			Steal:   vals[7],
		}, nil
	}
	return nil, fmt.Errorf("no cpu line found")
}

// CPUPercent calculates CPU usage percentage from two consecutive snapshots.
func CPUPercent(prev, curr *CPUStats) float64 {
	prevTotal := prev.User + prev.Nice + prev.System + prev.Idle + prev.IOWait + prev.IRQ + prev.SoftIRQ + prev.Steal
	currTotal := curr.User + curr.Nice + curr.System + curr.Idle + curr.IOWait + curr.IRQ + curr.SoftIRQ + curr.Steal
	totalDelta := currTotal - prevTotal
	if totalDelta == 0 {
		return 0
	}
	idleDelta := curr.Idle - prev.Idle
	return math.Round((1-float64(idleDelta)/float64(totalDelta))*10000) / 100
}

func (c *Collector) collectCPU() (float64, error) {
	data, err := readProcFile("/proc/stat")
	if err != nil {
		return 0, err
	}
	curr, err := ReadCPUStats(data)
	if err != nil {
		return 0, err
	}
	if c.prevCPU == nil {
		c.prevCPU = curr
		return 0, nil
	}
	pct := CPUPercent(c.prevCPU, curr)
	c.prevCPU = curr
	return pct, nil
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

// ReadMemInfo parses MemTotal and MemAvailable from /proc/meminfo content.
// Values are in kB.
func ReadMemInfo(data string) (total, available uint64, err error) {
	lines := strings.Split(data, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "MemTotal:") {
			fields := strings.Fields(line)
			if len(fields) < 2 {
				return 0, 0, fmt.Errorf("unexpected MemTotal line: %q", line)
			}
			total, err = strconv.ParseUint(fields[1], 10, 64)
			if err != nil {
				return 0, 0, fmt.Errorf("parsing MemTotal: %w", err)
			}
		}
		if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			if len(fields) < 2 {
				return 0, 0, fmt.Errorf("unexpected MemAvailable line: %q", line)
			}
			available, err = strconv.ParseUint(fields[1], 10, 64)
			if err != nil {
				return 0, 0, fmt.Errorf("parsing MemAvailable: %w", err)
			}
		}
	}
	if total == 0 {
		return 0, 0, fmt.Errorf("MemTotal not found")
	}
	return total, available, nil
}

// MemoryPercent calculates used memory percentage.
func MemoryPercent(total, available uint64) float64 {
	if total == 0 {
		return 0
	}
	used := total - available
	return math.Round(float64(used)/float64(total)*10000) / 100
}

func collectMemory() (float64, error) {
	data, err := readProcFile("/proc/meminfo")
	if err != nil {
		return 0, err
	}
	total, avail, err := ReadMemInfo(data)
	if err != nil {
		return 0, err
	}
	return MemoryPercent(total, avail), nil
}

// ---------------------------------------------------------------------------
// Load Average
// ---------------------------------------------------------------------------

// ReadLoadAvg parses the 1-minute load average from /proc/loadavg content.
func ReadLoadAvg(data string) (float64, error) {
	fields := strings.Fields(data)
	if len(fields) < 3 {
		return 0, fmt.Errorf("unexpected loadavg format: %q", data)
	}
	load, err := strconv.ParseFloat(fields[0], 64)
	if err != nil {
		return 0, fmt.Errorf("parsing loadavg 1min: %w", err)
	}
	return load, nil
}

func collectLoad() (float64, error) {
	data, err := readProcFile("/proc/loadavg")
	if err != nil {
		return 0, err
	}
	return ReadLoadAvg(data)
}

// ---------------------------------------------------------------------------
// Uptime
// ---------------------------------------------------------------------------

// ReadUptime parses the system uptime in seconds from /proc/uptime content.
func ReadUptime(data string) (float64, error) {
	fields := strings.Fields(data)
	if len(fields) < 1 {
		return 0, fmt.Errorf("unexpected uptime format: %q", data)
	}
	uptime, err := strconv.ParseFloat(fields[0], 64)
	if err != nil {
		return 0, fmt.Errorf("parsing uptime: %w", err)
	}
	return uptime, nil
}

func collectUptime() (float64, error) {
	data, err := readProcFile("/proc/uptime")
	if err != nil {
		return 0, err
	}
	return ReadUptime(data)
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

// ReadNetDev parses /proc/net/dev content and returns per-interface stats.
func ReadNetDev(data string) (map[string]NetStats, error) {
	lines := strings.Split(data, "\n")
	stats := make(map[string]NetStats)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Inter-") || strings.HasPrefix(line, " face") {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		iface := strings.TrimSpace(parts[0])
		fields := strings.Fields(parts[1])
		if len(fields) < 9 {
			continue
		}
		rx, err := strconv.ParseUint(fields[0], 10, 64)
		if err != nil {
			continue
		}
		tx, err := strconv.ParseUint(fields[8], 10, 64)
		if err != nil {
			continue
		}
		stats[iface] = NetStats{RxBytes: rx, TxBytes: tx}
	}
	return stats, nil
}

func (c *Collector) collectNetwork() (rxRate, txRate float64, err error) {
	data, err := readProcFile("/proc/net/dev")
	if err != nil {
		return 0, 0, err
	}
	curr, err := ReadNetDev(data)
	if err != nil {
		return 0, 0, err
	}

	var currRx, currTx uint64
	for name, s := range curr {
		if name == "lo" {
			continue
		}
		currRx += s.RxBytes
		currTx += s.TxBytes
	}

	now := timeNow()

	if c.prevNetTime.IsZero() {
		c.prevNetRx = float64(currRx)
		c.prevNetTx = float64(currTx)
		c.prevNetTime = now
		return 0, 0, nil
	}

	elapsed := now.Sub(c.prevNetTime).Seconds()
	if elapsed <= 0 {
		return 0, 0, nil
	}

	rxDelta := float64(currRx) - c.prevNetRx
	txDelta := float64(currTx) - c.prevNetTx

	// Handle counter reset (e.g., interface restart): return 0 until next sample
	if rxDelta < 0 {
		rxDelta = 0
	}
	if txDelta < 0 {
		txDelta = 0
	}

	// Bytes per second
	rxRate = rxDelta / elapsed
	txRate = txDelta / elapsed

	c.prevNetRx = float64(currRx)
	c.prevNetTx = float64(currTx)
	c.prevNetTime = now

	return rxRate, txRate, nil
}

// ---------------------------------------------------------------------------
// Disk (collectDisk defined in platform-specific files)
// ---------------------------------------------------------------------------

// readProcFile is overridable in tests.
var readProcFile = func(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("reading %s: %w", path, err)
	}
	return string(data), nil
}

// timeNow is overridable in tests.
var timeNow = func() time.Time { return time.Now() }
