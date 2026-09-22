//go:build linux

package commands

import (
	"context"
	"net"
	"net/http"
	"time"
)

// dockerSocketPath is the only Docker socket the agent may open. The API
// and web must never dial it; command transport reaches the daemon only
// through the allowlisted POST builders in docker_control.go.
const dockerSocketPath = "/var/run/docker.sock"

// newDefaultDockerControlHTTPClient dials the Docker Engine Unix socket.
func newDefaultDockerControlHTTPClient(socketPath string, timeout time.Duration) *http.Client {
	if socketPath == "" {
		socketPath = dockerSocketPath
	}
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{Timeout: timeout}).DialContext(ctx, "unix", socketPath)
			},
		},
	}
}

// DefaultDockerControl builds control over the Unix socket. Base URL stays
// the bare http://localhost sentinel validated by dockerControlBase; the
// transport dials the socket, never TCP.
func DefaultDockerControl(socketPath string, timeout time.Duration) (*DockerControl, error) {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return NewDockerControl(newDefaultDockerControlHTTPClient(socketPath, timeout), "http://localhost")
}

