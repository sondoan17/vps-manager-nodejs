package metrics

// SetDockerMetricsEnabled enables or disables Docker metrics collection
// in a thread-safe manner. Default is disabled.
func (c *Collector) SetDockerMetricsEnabled(enabled bool) {
	c.dockerMu.Lock()
	defer c.dockerMu.Unlock()
	c.dockerEnabled = enabled
	// Reset client so next collect re-initializes with fresh state
	if !enabled {
		c.dockerHTTPClient = nil
	}
}

// isDockerEnabled returns true if Docker metrics collection is currently enabled.
func (c *Collector) isDockerEnabled() bool {
	c.dockerMu.RLock()
	defer c.dockerMu.RUnlock()
	return c.dockerEnabled
}
