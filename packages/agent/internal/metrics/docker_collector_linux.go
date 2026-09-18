//go:build linux

package metrics

import (
	"context"
	"net"
	"net/http"
	"net/url"
	"os"
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
	// Persist production defaults so v2 event/storage calls reuse the exact
	// client and base URL initialized for v1.
	c.dockerBaseURL = baseURL
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

	return collectDockerFromAPI(ctx, client, baseURL)
}
