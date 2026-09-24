//go:build !linux

package metrics

import "context"

// collectDocker is not supported on non-Linux platforms.
// Returns a sanitized unavailable DockerCollectionSnapshot with unsupported_os error code.
func (c *Collector) collectDocker(_ context.Context) *DockerCollectionSnapshot {
	return unavailableDocker(DockerErrorUnsupported)
}
