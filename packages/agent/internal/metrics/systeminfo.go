package metrics

import (
	"strings"
)

// SystemInfo holds optional system information collected best-effort.
type SystemInfo struct {
	OS       *OSInfo       `json:"os,omitempty"`
	Kernel   *KernelInfo   `json:"kernel,omitempty"`
	CPU      *CPUInfo      `json:"cpu,omitempty"`
	Memory   *MemoryInfo   `json:"memory,omitempty"`
	RootDisk *RootDiskInfo `json:"rootDisk,omitempty"`
}

// OSInfo holds operating-system identification fields.
type OSInfo struct {
	Family     string `json:"family,omitempty"`
	Name       string `json:"name,omitempty"`
	Version    string `json:"version,omitempty"`
	PrettyName string `json:"prettyName,omitempty"`
}

// KernelInfo identifies the running kernel.
type KernelInfo struct {
	Release string `json:"release,omitempty"`
	Version string `json:"version,omitempty"`
	Arch    string `json:"arch,omitempty"`
}

// CPUInfo describes the host CPU(s).
type CPUInfo struct {
	Cores int    `json:"cores,omitempty"`
	Model string `json:"model,omitempty"`
}

// MemoryInfo carries total and available physical memory in bytes.
type MemoryInfo struct {
	TotalBytes     int64 `json:"totalBytes,omitempty"`
	AvailableBytes int64 `json:"availableBytes,omitempty"`
}

// RootDiskInfo describes the root filesystem.
type RootDiskInfo struct {
	MountPoint string `json:"mountPoint"`
	FsType     string `json:"fsType,omitempty"`
	TotalBytes int64  `json:"totalBytes,omitempty"`
	UsedBytes  int64  `json:"usedBytes,omitempty"`
	FreeBytes  int64  `json:"freeBytes,omitempty"`
}

// ParseOSRelease parses /etc/os-release (key=value) content.
// Returns nil when no useful fields are found.
func ParseOSRelease(data string) *OSInfo {
	info := &OSInfo{}
	lines := strings.Split(data, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		val = strings.Trim(val, `"'`)

		switch key {
		case "ID":
			info.Family = val
		case "NAME":
			info.Name = val
		case "VERSION_ID":
			info.Version = val
		case "VERSION":
			if info.Version == "" {
				info.Version = val
			}
		case "PRETTY_NAME":
			info.PrettyName = val
		}
	}
	if info.Family == "" && info.Name == "" && info.Version == "" && info.PrettyName == "" {
		return nil
	}
	return info
}

// ParseCPUInfo parses /proc/cpuinfo content.
// Returns nil when no relevant fields are found.
func ParseCPUInfo(data string) *CPUInfo {
	info := &CPUInfo{}
	cores := 0
	lines := strings.Split(data, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "processor") {
			cores++
		}
		if strings.HasPrefix(line, "model name") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				info.Model = strings.TrimSpace(parts[1])
			}
		}
	}
	if cores > 0 {
		info.Cores = cores
	}
	if info.Model == "" && cores == 0 {
		return nil
	}
	return info
}

// ReadMountInfo parses /proc/mounts content and returns the filesystem type
// for the root ("/") mount point, or empty string if not found.
func ReadMountInfo(data string) string {
	lines := strings.Split(data, "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 3 && fields[1] == "/" {
			return fields[2]
		}
	}
	return ""
}
