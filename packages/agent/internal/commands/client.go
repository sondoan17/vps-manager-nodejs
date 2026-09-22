package commands

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/vps-manager/agent/internal/config"
)

// Explicit endpoint contract: POST {backendURL}/api/agent/commands/claim and
// POST {backendURL}/api/agent/commands/result, bearer auth, JSON bodies.
// See package doc. Compile dependency: internal/config only (same as push).

const (
	commandClaimPath  = "/api/agent/commands/claim"
	commandResultPath = "/api/agent/commands/result"
)

// ErrAuth indicates fatal 401/403. Body is sanitized and bounded.
type ErrAuth struct {
	StatusCode int
	Body       string
}

func (e *ErrAuth) Error() string {
	return fmt.Sprintf("command auth failed (HTTP %d)", e.StatusCode)
}

// ErrFatal indicates non-retryable 400/404.
type ErrFatal struct {
	StatusCode int
	Body       string
}

func (e *ErrFatal) Error() string {
	return fmt.Sprintf("command fatal error (HTTP %d)", e.StatusCode)
}

// ErrConflict indicates 409: another claimant holds the command or a
// same-key different-body conflict. Non-fatal, never blindly retried.
type ErrConflict struct {
	StatusCode int
	Body       string
}

func (e *ErrConflict) Error() string {
	return fmt.Sprintf("command conflict (HTTP %d)", e.StatusCode)
}

// ErrRetryable indicates transient 5xx/network failure.
type ErrRetryable struct {
	StatusCode int
	Err        error
}

func (e *ErrRetryable) Error() string {
	return fmt.Sprintf("command retryable error (HTTP %d): %v", e.StatusCode, e.Err)
}

func (e *ErrRetryable) Unwrap() error { return e.Err }

// IsFatal reports non-retryable auth/fatal errors.
func IsFatal(err error) bool {
	var a *ErrAuth
	if errors.As(err, &a) {
		return true
	}
	var f *ErrFatal
	return errors.As(err, &f)
}

// IsConflict reports 409 conflicts.
func IsConflict(err error) bool {
	var c *ErrConflict
	return errors.As(err, &c)
}

func isRetryable(err error) bool {
	var r *ErrRetryable
	return errors.As(err, &r)
}

var tokenPattern = regexp.MustCompile(`vma_[a-zA-Z0-9_-]+`)

func sanitizeBody(body string) string {
	body = tokenPattern.ReplaceAllString(body, "[redacted]")
	if len(body) > 200 {
		return body[:200] + "..."
	}
	return body
}

// Client performs authenticated claim/result transport. It never logs
// tokens or payloads; error bodies are sanitized and bounded.
type Client struct {
	backendURL string
	token      string
	httpClient *http.Client
}

// NewClient builds a command client from agent config.
func NewClient(cfg *config.Config) *Client {
	return &Client{
		backendURL: cfg.BackendUrl,
		token:      cfg.Token,
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.RequestTimeoutSeconds) * time.Second,
		},
	}
}

// NewClientWithHTTP builds a client with an injected transport (tests).
func NewClientWithHTTP(backendURL, token string, hc *http.Client) *Client {
	return &Client{backendURL: backendURL, token: token, httpClient: hc}
}

func (c *Client) endpoint(path string) (string, error) {
	return url.JoinPath(c.backendURL, path)
}

// postJSON sends body as JSON and returns status + bounded raw response.
func (c *Client) postJSON(ctx context.Context, path string, body any) (int, []byte, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return 0, nil, fmt.Errorf("marshal command payload: %w", err)
	}
	target, err := c.endpoint(path)
	if err != nil {
		return 0, nil, fmt.Errorf("invalid backend URL: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target, bytes.NewReader(raw))
	if err != nil {
		return 0, nil, fmt.Errorf("create command request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, nil, &ErrRetryable{StatusCode: 0, Err: fmt.Errorf("request failed: %w", err)}
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, MaxCommandRespBytes+1))
	return resp.StatusCode, respBody, nil
}

func mapStatus(status int, body []byte) error {
	sanitized := sanitizeBody(string(body))
	switch {
	case status >= 200 && status < 300:
		return nil
	case status == 401 || status == 403:
		return &ErrAuth{StatusCode: status, Body: sanitized}
	case status == 409:
		return &ErrConflict{StatusCode: status, Body: sanitized}
	case status == 400 || status == 404:
		return &ErrFatal{StatusCode: status, Body: sanitized}
	default:
		return &ErrRetryable{StatusCode: status, Err: fmt.Errorf("unexpected status: %s", sanitized)}
	}
}

// Claim requests one queued command for agentInstanceID. It returns
// (nil, nil) when none is queued (200 null/absent command, or 204).
// A claimed command is validated fail-closed; invalid shape is an error
// and must never be acted on.
func (c *Client) Claim(ctx context.Context, agentInstanceID string) (*Command, error) {
	if !validSafeID(agentInstanceID, MaxInstanceIDLen) {
		return nil, fmt.Errorf("bad agentInstanceId")
	}
	status, body, err := c.postJSON(ctx, commandClaimPath, map[string]string{
		"agentInstanceId": agentInstanceID,
	})
	if err != nil {
		return nil, err
	}
	if status == 204 {
		return nil, nil
	}
	if err := mapStatus(status, body); err != nil {
		return nil, err
	}
	if len(body) == 0 || len(body) > MaxCommandRespBytes {
		return nil, fmt.Errorf("claim response oversize or empty")
	}
	var outer struct {
		Data *struct {
			Command *Command `json:"command"`
		} `json:"data"`
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	if err := dec.Decode(&outer); err != nil {
		return nil, fmt.Errorf("claim response malformed: %w", err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		return nil, fmt.Errorf("claim response trailing data: fail closed")
	}
	if outer.Data == nil || outer.Data.Command == nil {
		return nil, nil
	}
	cmd := outer.Data.Command
	if err := ValidateCommand(cmd); err != nil {
		return nil, fmt.Errorf("claim shape invalid: %w", err)
	}
	if cmd.AgentInstanceID != agentInstanceID {
		return nil, fmt.Errorf("claim instance mismatch: fail closed")
	}
	return cmd, nil
}

// Report posts a terminal result. The server echo must match the reported
// IDs exactly; mismatch is an error and the caller must preserve pending.
func (c *Client) Report(ctx context.Context, r *Result) error {
	if err := ValidateResult(r); err != nil {
		return fmt.Errorf("result invalid: %w", err)
	}
	status, body, err := c.postJSON(ctx, commandResultPath, r)
	if err != nil {
		return err
	}
	if err := mapStatus(status, body); err != nil {
		return err
	}
	if len(body) == 0 || len(body) > MaxCommandRespBytes {
		return fmt.Errorf("result response oversize or empty")
	}
	var outer struct {
		Data *struct {
			OK              bool   `json:"ok"`
			CommandID       string `json:"commandId"`
			AgentInstanceID string `json:"agentInstanceId"`
		} `json:"data"`
	}
	dec := json.NewDecoder(bytes.NewReader(body))
	if err := dec.Decode(&outer); err != nil {
		return fmt.Errorf("result response malformed: %w", err)
	}
	var trailing any
	if err := dec.Decode(&trailing); err != io.EOF {
		return fmt.Errorf("result response trailing data: fail closed")
	}
	if outer.Data == nil || !outer.Data.OK {
		return fmt.Errorf("result not acknowledged")
	}
	if outer.Data.CommandID != r.CommandID || outer.Data.AgentInstanceID != r.AgentInstanceID {
		return fmt.Errorf("result echo mismatch: pending preserved")
	}
	return nil
}
