//go:build !linux

package commands

import (
 "fmt"
 "net/http"
 "time"
)

func newDefaultDockerControlHTTPClient(socketPath string, timeout time.Duration) *http.Client {
 return &http.Client{Timeout: timeout, Transport: failingTransport{}}
}
type failingTransport struct{}
func (failingTransport) RoundTrip(*http.Request) (*http.Response, error) { return nil, fmt.Errorf("docker control unsupported on this platform") }

func DefaultDockerControl(socketPath string, timeout time.Duration) (*DockerControl, error) {
 return nil, fmt.Errorf("commands: docker control not supported on this platform")
}
