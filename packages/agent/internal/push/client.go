package push

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/metrics"
)

const agentVersion = "0.1.0"

// ErrAuth indicates a fatal authentication failure (401/403).
type ErrAuth struct {
	StatusCode int
	Body       string
}

func (e *ErrAuth) Error() string {
	return fmt.Sprintf("authentication failed (HTTP %d)", e.StatusCode)
}

// ErrFatal indicates a non-retryable fatal error (400, 404, etc.).
type ErrFatal struct {
	StatusCode int
	Body       string
}

func (e *ErrFatal) Error() string {
	return fmt.Sprintf("fatal error (HTTP %d)", e.StatusCode)
}

// ErrRetryable indicates a transient failure that may be retried.
type ErrRetryable struct {
	StatusCode int
	Err        error
}

func (e *ErrRetryable) Error() string {
	return fmt.Sprintf("retryable error (HTTP %d): %v", e.StatusCode, e.Err)
}

func (e *ErrRetryable) Unwrap() error { return e.Err }

// ConfigResponse carries runtime configuration returned by the server
// after a successful metrics push.
type ConfigResponse struct {
	DockerMetricsEnabled bool `json:"dockerMetricsEnabled"`
}

// Client pushes metrics to the backend.
type Client struct {
	backendURL    string
	token         string
	httpClient    *http.Client
	configHandler func(*ConfigResponse)
}

// SetConfigHandler registers a callback that receives runtime configuration
// from the server on every successful push response. Missing or malformed
// config (including old server responses) produces a ConfigResponse with
// DockerMetricsEnabled=false (fail closed).
func (c *Client) SetConfigHandler(handler func(*ConfigResponse)) {
	c.configHandler = handler
}

// NewClient creates a new push client from config.
func NewClient(cfg *config.Config) *Client {
	return &Client{
		backendURL: cfg.BackendUrl,
		token:      cfg.Token,
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.RequestTimeoutSeconds) * time.Second,
		},
	}
}

// payload is the JSON body sent to the backend.
type payload struct {
	VpsId        string                 `json:"vpsId,omitempty"`
	CollectedAt  string                 `json:"collectedAt"`
	CPU          float64                `json:"cpu"`
	Memory       float64                `json:"memory"`
	Disk         float64                `json:"disk"`
	LoadAverage  float64                `json:"loadAverage"`
	NetworkRx    float64                `json:"networkRx"`
	NetworkTx    float64                `json:"networkTx"`
	Uptime       float64                `json:"uptime"`
	AgentVersion string                 `json:"agentVersion"`
	System       *metrics.SystemInfo    `json:"system,omitempty"`
	Docker       *metrics.DockerMetrics `json:"docker,omitempty"`
}

// Push sends metrics to the backend. It distinguishes between fatal auth
// errors (ErrAuth), fatal request errors (ErrFatal), and retryable errors (ErrRetryable).
func (c *Client) Push(ctx context.Context, m *metrics.SystemMetrics) error {
	p := payload{
		VpsId:        "", // backend derives from token
		CollectedAt:  time.Now().UTC().Format(time.RFC3339),
		CPU:          m.CPU,
		Memory:       m.Memory,
		Disk:         m.Disk,
		LoadAverage:  m.LoadAverage,
		NetworkRx:    m.NetworkRx,
		NetworkTx:    m.NetworkTx,
		Uptime:       m.Uptime,
		AgentVersion: agentVersion,
		System:       m.System,
		Docker:       m.Docker,
	}

	body, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	endpoint, err := url.JoinPath(c.backendURL, "/api/agent/metrics")
	if err != nil {
		return fmt.Errorf("invalid backend URL: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &ErrRetryable{StatusCode: 0, Err: fmt.Errorf("request failed: %w", err)}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	sanitizedBody := sanitizeBody(string(respBody))

	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		// Parse runtime config from response; fail closed on any error.
		c.handleConfigResponse(respBody)
		return nil
	case resp.StatusCode == 401 || resp.StatusCode == 403:
		return &ErrAuth{StatusCode: resp.StatusCode, Body: sanitizedBody}
	case resp.StatusCode == 400 && m.Docker != nil:
		// Fail closed for downgraded/old servers or schema mismatches: disable
		// Docker collection and retry once without the optional Docker payload so
		// core host metrics do not become fragile.
		c.disableDockerConfig()
		stripped := *m
		stripped.Docker = nil
		return c.Push(ctx, &stripped)
	case resp.StatusCode == 400 || resp.StatusCode == 404:
		return &ErrFatal{StatusCode: resp.StatusCode, Body: sanitizedBody}
	default:
		return &ErrRetryable{StatusCode: resp.StatusCode, Err: fmt.Errorf("unexpected status: %s", sanitizedBody)}
	}
}

func (c *Client) disableDockerConfig() {
	if c.configHandler != nil {
		c.configHandler(&ConfigResponse{DockerMetricsEnabled: false})
	}
}

// handleConfigResponse attempts to extract runtime config from the server
// response body. Missing or malformed config defaults to disabled (false).
func (c *Client) handleConfigResponse(body []byte) {
	if c.configHandler == nil {
		return
	}

	var response struct {
		Data *struct {
			Config *struct {
				DockerMetricsEnabled bool `json:"dockerMetricsEnabled"`
			} `json:"config"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &response); err != nil || response.Data == nil {
		// Fail closed: malformed response or no data — disable Docker.
		c.disableDockerConfig()
		return
	}

	enabled := false
	if response.Data.Config != nil {
		enabled = response.Data.Config.DockerMetricsEnabled
	}
	c.configHandler(&ConfigResponse{DockerMetricsEnabled: enabled})
}

// MaxRetries is the maximum number of retry attempts for retryable errors.
const MaxRetries = 5

// retryPush attempts to push with exponential backoff and jitter.
func (c *Client) retryPush(ctx context.Context, m *metrics.SystemMetrics) error {
	var lastErr error
	for attempt := 0; attempt <= MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := backoffDuration(attempt)
			timer := time.NewTimer(backoff)
			select {
			case <-ctx.Done():
				timer.Stop()
				return ctx.Err()
			case <-timer.C:
			}
		}

		err := c.Push(ctx, m)
		if err == nil {
			return nil
		}

		// Auth and fatal errors are not retried
		if IsFatal(err) {
			return err
		}

		lastErr = err

		// For retryable errors, continue loop
		if isRetryableErr(err) {
			continue
		}

		// Unexpected error type, treat as fatal
		return err
	}
	return fmt.Errorf("push failed after %d retries: %w", MaxRetries, lastErr)
}

// IsFatal returns true if the error is a non-retryable fatal error
// (auth failure or bad request / not found).
func IsFatal(err error) bool {
	var authErr *ErrAuth
	if isErrType(err, &authErr) {
		return true
	}
	var fatalErr *ErrFatal
	return isErrType(err, &fatalErr)
}

func isAuthErr(err error) bool {
	var authErr *ErrAuth
	return isErrType(err, &authErr)
}

func isRetryableErr(err error) bool {
	var retryErr *ErrRetryable
	return isErrType(err, &retryErr)
}

func isErrType[T error](err error, target *T) bool {
	return errors.As(err, target)
}

func backoffDuration(attempt int) time.Duration {
	if attempt <= 0 {
		attempt = 1
	}
	base := time.Duration(math.Pow(2, float64(attempt))) * time.Second
	if base > 30*time.Second {
		base = 30 * time.Second
	}
	// Add jitter: up to 50% of base
	jitter := time.Duration(rand.Int63n(int64(base / 2)))
	return base + jitter
}

// PushWithRetry is the public method that retries on retryable errors.
func (c *Client) PushWithRetry(ctx context.Context, m *metrics.SystemMetrics) error {
	return c.retryPush(ctx, m)
}

// tokenPattern matches vma_ prefixed agent tokens in error body text.
var tokenPattern = regexp.MustCompile(`vma_[a-zA-Z0-9_-]+`)

// sanitizeBody redacts token-like strings and limits length.
func sanitizeBody(body string) string {
	body = tokenPattern.ReplaceAllString(body, "[redacted]")
	if len(body) > 200 {
		return body[:200] + "..."
	}
	return body
}
