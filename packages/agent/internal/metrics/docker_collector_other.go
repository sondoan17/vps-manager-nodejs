//go:build !linux

package metrics

import "context"

// collectDocker is not supported on non-Linux platforms.
// Returns a sanitized unavailable DockerMetrics with unsupported_os error code.
func (c *Collector) collectDocker(_ context.Context) *DockerMetrics {
	return unavailableDocker(DockerErrorUnsupported)
}
