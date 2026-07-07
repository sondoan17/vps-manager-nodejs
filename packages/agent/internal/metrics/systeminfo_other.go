//go:build !linux

package metrics

// collectSystemInfo is not supported on non-Linux platforms.
// Returns nil so that the JSON field is omitted.
func collectSystemInfo() *SystemInfo {
	return nil
}
