//go:build linux

package metrics

import (
	"fmt"
	"math"
	"syscall"
)

func collectDisk() (float64, error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		return 0, fmt.Errorf("statfs: %w", err)
	}
	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	used := total - free
	if total == 0 {
		return 0, nil
	}
	return math.Round(float64(used)/float64(total)*10000) / 100, nil
}
