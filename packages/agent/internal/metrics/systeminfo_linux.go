//go:build linux

package metrics

import (
	"runtime"
	"strings"
	"syscall"
)

// collectSystemInfo gathers system information from /proc and /etc on Linux.
// Errors are silently skipped — this is best-effort; the returned struct may be
// partially populated.
func collectSystemInfo() *SystemInfo {
	si := &SystemInfo{}

	// --- OS info ---
	if data, err := readProcFile("/etc/os-release"); err == nil {
		si.OS = ParseOSRelease(data)
	}

	// --- Kernel info ---
	kernel := &KernelInfo{Arch: runtime.GOARCH}
	if data, err := readProcFile("/proc/sys/kernel/osrelease"); err == nil {
		kernel.Release = strings.TrimSpace(data)
	}
	if data, err := readProcFile("/proc/version"); err == nil {
		kernel.Version = strings.TrimSpace(data)
	}
	si.Kernel = kernel

	// --- CPU info ---
	if data, err := readProcFile("/proc/cpuinfo"); err == nil {
		si.CPU = ParseCPUInfo(data)
	}
	if si.CPU == nil {
		si.CPU = &CPUInfo{}
	}
	if si.CPU.Cores == 0 {
		si.CPU.Cores = runtime.NumCPU()
	}

	// --- Memory info (reuse existing meminfo parser, convert kB→bytes) ---
	if data, err := readProcFile("/proc/meminfo"); err == nil {
		if total, avail, err := ReadMemInfo(data); err == nil {
			si.Memory = &MemoryInfo{
				TotalBytes:     int64(total) * 1024,
				AvailableBytes: int64(avail) * 1024,
			}
		}
	}

	// --- Root disk info ---
	di := &RootDiskInfo{MountPoint: "/"}
	if data, err := readProcFile("/proc/mounts"); err == nil {
		if fsType := ReadMountInfo(data); fsType != "" {
			di.FsType = fsType
		}
	}
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err == nil {
		total := int64(stat.Blocks) * int64(stat.Bsize)
		free := int64(stat.Bfree) * int64(stat.Bsize)
		used := total - free
		di.TotalBytes = total
		di.UsedBytes = used
		di.FreeBytes = free
	}
	si.RootDisk = di

	return si
}
