package push

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/metrics"
)

func TestPush_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify auth header
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-token" {
			t.Errorf("Authorization = %q, want %q", auth, "Bearer test-token")
		}

		// Verify content type
		ct := r.Header.Get("Content-Type")
		if ct != "application/json" {
			t.Errorf("Content-Type = %q, want %q", ct, "application/json")
		}

		// Verify payload shape
		var p payload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			t.Errorf("decode payload: %v", err)
		}
		if p.AgentVersion == "" {
			t.Error("agentVersion is required")
		}
		if p.CollectedAt == "" {
			t.Error("collectedAt is required")
		}
		if p.CPU != 50.5 {
			t.Errorf("CPU = %f, want %f", p.CPU, 50.5)
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU:         50.5,
		Memory:      60.0,
		Disk:        70.0,
		LoadAverage: 0.5,
		NetworkRx:   1000,
		NetworkTx:   500,
		Uptime:      12345,
	}

	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil {
		t.Fatal("expected non-nil result")
	}
	if res.Docker != nil {
		t.Errorf("expected nil Docker ack for old response, got %+v", res.Docker)
	}
}

func TestPush_UnauthorizedFatal(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"invalid token"}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !isAuthErr(err) {
		t.Fatalf("expected ErrAuth, got %T: %v", err, err)
	}
	if e, ok := err.(*ErrAuth); ok {
		if e.StatusCode != 401 {
			t.Errorf("StatusCode = %d, want 401", e.StatusCode)
		}
		if strings.Contains(e.Body, "vma_") {
			t.Error("error body should not contain token-like text, but got:", e.Body)
		}
	}
}

func TestPush_ForbiddenFatal(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":"forbidden"}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !isAuthErr(err) {
		t.Fatalf("expected ErrAuth, got %T: %v", err, err)
	}
}

func TestPush_RetryableServerError(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !isRetryableErr(err) {
		t.Fatalf("expected ErrRetryable, got %T: %v", err, err)
	}
}

func TestPushWithRetry_SuccessAfterRetries(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	ctx := context.Background()

	// This should succeed after retries, but set a timeout
	ctxWithTimeout, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	res, err := client.PushWithRetry(ctxWithTimeout, m)
	if err != nil {
		t.Fatalf("expected success after retries, got: %v", err)
	}
	if res == nil {
		t.Fatal("expected non-nil result")
	}
	if callCount < 3 {
		t.Errorf("expected at least 3 calls, got %d", callCount)
	}
}

func TestPushWithRetry_AuthFatalNoRetry(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.PushWithRetry(context.Background(), m)

	if !isAuthErr(err) {
		t.Fatalf("expected ErrAuth, got %T: %v", err, err)
	}
	if callCount != 1 {
		t.Errorf("expected exactly 1 call (no retry on auth), got %d", callCount)
	}

	// Verify IsFatal returns true for auth errors
	if !IsFatal(err) {
		t.Error("IsFatal should return true for ErrAuth")
	}
}

func TestPush_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	// Create a client with very short timeout
	client := &Client{
		backendURL: srv.URL,
		token:      "test-token",
		httpClient: &http.Client{
			Timeout: 100 * time.Millisecond,
		},
	}

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if err == nil {
		t.Fatal("expected timeout error")
	}
	if !isRetryableErr(err) {
		t.Fatalf("expected ErrRetryable for timeout, got %T: %v", err, err)
	}
}

func TestPush_PayloadShape(t *testing.T) {
	var capturedPayload payload
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedPayload); err != nil {
			t.Errorf("decode: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU:         45.2,
		Memory:      62.1,
		Disk:        78.3,
		LoadAverage: 1.25,
		NetworkRx:   1024,
		NetworkTx:   512,
		Uptime:      3600,
	}

	_, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if capturedPayload.CPU != 45.2 {
		t.Errorf("CPU = %f, want 45.2", capturedPayload.CPU)
	}
	if capturedPayload.Memory != 62.1 {
		t.Errorf("Memory = %f, want 62.1", capturedPayload.Memory)
	}
	if capturedPayload.Disk != 78.3 {
		t.Errorf("Disk = %f, want 78.3", capturedPayload.Disk)
	}
	if capturedPayload.LoadAverage != 1.25 {
		t.Errorf("LoadAverage = %f, want 1.25", capturedPayload.LoadAverage)
	}
	if capturedPayload.NetworkRx != 1024 {
		t.Errorf("NetworkRx = %f, want 1024", capturedPayload.NetworkRx)
	}
	if capturedPayload.NetworkTx != 512 {
		t.Errorf("NetworkTx = %f, want 512", capturedPayload.NetworkTx)
	}
	if capturedPayload.Uptime != 3600 {
		t.Errorf("Uptime = %f, want 3600", capturedPayload.Uptime)
	}
	if capturedPayload.AgentVersion == "" {
		t.Error("AgentVersion should not be empty")
	}
	if capturedPayload.CollectedAt == "" {
		t.Error("CollectedAt should not be empty")
	}

	// Verify collectedAt is RFC3339
	_, err = time.Parse(time.RFC3339, capturedPayload.CollectedAt)
	if err != nil {
		t.Errorf("CollectedAt is not RFC3339: %v", err)
	}
}

func TestPush_TokenNotInError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`internal error`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)
	if err == nil {
		t.Fatal("expected error")
	}
	errStr := err.Error()
	if strings.Contains(errStr, "vma_") {
		t.Error("error message should not contain token-like strings")
	}
	if strings.Contains(errStr, "test-token") {
		t.Error("error message should not contain token")
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func createTestConfig(backendURL string) *config.Config {
	return &config.Config{
		BackendUrl:            backendURL,
		VpsId:                 "test-vps",
		Token:                 "test-token",
		IntervalSeconds:       5,
		RequestTimeoutSeconds: 5,
	}
}

// TestBackoffDuration checks that backoff is reasonable.
func TestBackoffDuration(t *testing.T) {
	for i := 0; i < 10; i++ {
		d := backoffDuration(i)
		if d <= 0 {
			t.Errorf("backoffDuration(%d) = %v, want > 0", i, d)
		}
		if i >= 1 && d < time.Second {
			t.Errorf("backoffDuration(%d) = %v, want >= 1s", i, d)
		}
	}
}

// TestPushWithRetry_ExhaustRetries checks that after all retries fail, the error is returned.
func TestPushWithRetry_ExhaustRetries(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := client.PushWithRetry(ctx, m)
	if err == nil {
		t.Fatal("expected error after exhausting retries")
	}
	// Should get either the retry-exhausted message or a context deadline exceeded
	if !strings.Contains(err.Error(), "after 5 retries") && !strings.Contains(err.Error(), "context deadline exceeded") {
		t.Errorf("error should mention retry count or context deadline: %v", err)
	}
}

func TestSanitizeBody(t *testing.T) {
	short := sanitizeBody("hello")
	if short != "hello" {
		t.Errorf("expected 'hello', got %q", short)
	}

	long := sanitizeBody(strings.Repeat("a", 300))
	if len(long) > 210 {
		t.Errorf("expected truncated body, got length %d", len(long))
	}
}

func TestNewClient(t *testing.T) {
	cfg := createTestConfig("http://test:8080")
	client := NewClient(cfg)
	if client.backendURL != "http://test:8080" {
		t.Errorf("backendURL = %q", client.backendURL)
	}
	if client.token != "test-token" {
		t.Errorf("token = %q", client.token)
	}
}

func TestPush_BadRequestFatal(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"bad request"}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !IsFatal(err) {
		t.Fatalf("expected IsFatal, got %T: %v", err, err)
	}
	var fatalErr *ErrFatal
	if !isErrType(err, &fatalErr) {
		t.Fatalf("expected ErrFatal, got %T", err)
	}
	if fatalErr.StatusCode != 400 {
		t.Errorf("StatusCode = %d, want 400", fatalErr.StatusCode)
	}
}

func TestPush_NotFoundFatal(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !IsFatal(err) {
		t.Fatalf("expected IsFatal, got %T: %v", err, err)
	}
}

func TestPush_RetryOn429(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !isRetryableErr(err) {
		t.Fatalf("expected ErrRetryable, got %T: %v", err, err)
	}
}

func TestPush_RetryOn408(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusRequestTimeout)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)

	if !isRetryableErr(err) {
		t.Fatalf("expected ErrRetryable, got %T: %v", err, err)
	}
}

func TestSanitizeBody_RedactsToken(t *testing.T) {
	body := `{"error":"invalid token: vma_abc123_def456"}`
	sanitized := sanitizeBody(body)
	if strings.Contains(sanitized, "vma_abc123_def456") {
		t.Errorf("token should be redacted, got: %s", sanitized)
	}
	if !strings.Contains(sanitized, "[redacted]") {
		t.Errorf("expected [redacted] in output, got: %s", sanitized)
	}
}

func TestSanitizeBody_NoToken(t *testing.T) {
	body := `{"error":"internal server error"}`
	sanitized := sanitizeBody(body)
	if sanitized != body {
		t.Errorf("expected unchanged, got: %s", sanitized)
	}
}

// ---------------------------------------------------------------------------
// Additional edge case: vpsId is empty in payload (backend derives from token)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// System info serialisation
// ---------------------------------------------------------------------------

func TestPush_SystemInfoSerialized(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU:    50.0,
		Memory: 60.0,
		Disk:   70.0,
		System: &metrics.SystemInfo{
			OS:     &metrics.OSInfo{Family: "ubuntu", Name: "Ubuntu", Version: "24.04"},
			Kernel: &metrics.KernelInfo{Release: "6.8.0", Arch: "amd64"},
			CPU:    &metrics.CPUInfo{Cores: 4, Model: "Intel Core"},
		},
	}

	_, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var p payload
	if err := json.Unmarshal(capturedBody, &p); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if p.System == nil {
		t.Fatal("expected System field to be present in payload")
	}
	if p.System.OS == nil {
		t.Fatal("expected System.OS to be present")
	}
	if p.System.OS.Family != "ubuntu" {
		t.Errorf("System.OS.Family = %q, want %q", p.System.OS.Family, "ubuntu")
	}
	if p.System.Kernel == nil {
		t.Fatal("expected System.Kernel to be present")
	}
	if p.System.Kernel.Arch != "amd64" {
		t.Errorf("System.Kernel.Arch = %q, want %q", p.System.Kernel.Arch, "amd64")
	}
	if p.System.CPU == nil {
		t.Fatal("expected System.CPU to be present")
	}
	if p.System.CPU.Cores != 4 {
		t.Errorf("System.CPU.Cores = %d, want %d", p.System.CPU.Cores, 4)
	}
}

func TestPush_SystemInfoOmittedWhenNil(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU:    50.0,
		Memory: 60.0,
		Disk:   70.0,
		// System is nil — should be omitted from JSON
	}

	_, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(capturedBody, &raw); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if _, ok := raw["system"]; ok {
		t.Error("expected 'system' field to be omitted when nil")
	}
}

func TestPush_EmptyVpsId(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var p payload
		json.NewDecoder(r.Body).Decode(&p)
		if p.VpsId != "" {
			t.Errorf("VpsId should be empty (backend derives from token), got %q", p.VpsId)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	_, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Token not printed test: verify error chains don't leak token
// ---------------------------------------------------------------------------

func TestPush_TokenNotInAnyErrorPath(t *testing.T) {
	// Test with a server that always returns 500
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	token := "vma_secret_test_token_12345"
	client := &Client{
		backendURL: srv.URL,
		token:      token,
		httpClient: &http.Client{Timeout: time.Second},
	}

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)
	errStr := fmt.Sprintf("%v", err)
	if strings.Contains(errStr, token) {
		t.Errorf("token leaked in error: %s", errStr)
	}
	if strings.Contains(errStr, "vma_") {
		t.Errorf("token-like string leaked in error: %s", errStr)
	}
}

// ---------------------------------------------------------------------------
// Config callback tests
// ---------------------------------------------------------------------------

func TestPush_ConfigCallbackEnabled(t *testing.T) {
	var received *ConfigResponse
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"config":{"dockerMetricsEnabled":true}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetConfigHandler(func(cr *ConfigResponse) {
		received = cr
	})

	m := &metrics.SystemMetrics{CPU: 10}
	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if !received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=true")
	}
	if res == nil || res.Config == nil || !res.Config.DockerMetricsEnabled {
		t.Error("expected result config DockerMetricsEnabled=true")
	}
}

func TestPush_ConfigCallbackDisabled(t *testing.T) {
	var received *ConfigResponse
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"config":{"dockerMetricsEnabled":false}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetConfigHandler(func(cr *ConfigResponse) {
		received = cr
	})

	m := &metrics.SystemMetrics{CPU: 10}
	_, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=false")
	}
}

func TestPush_ConfigCallbackMissingConfig_FailsClosed(t *testing.T) {
	// Old server response without data.config — must fail closed to false.
	var received *ConfigResponse
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetConfigHandler(func(cr *ConfigResponse) {
		received = cr
	})

	m := &metrics.SystemMetrics{CPU: 10}
	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=false when config is missing")
	}
	if res == nil || res.Docker != nil {
		t.Errorf("expected nil Docker ack for old response, got %+v", res)
	}
}

func TestPush_ConfigCallbackMalformedJSON_FailsClosed(t *testing.T) {
	var received *ConfigResponse
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetConfigHandler(func(cr *ConfigResponse) {
		received = cr
	})

	m := &metrics.SystemMetrics{CPU: 10}
	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=false on malformed response")
	}
	if res == nil || res.Docker != nil {
		t.Errorf("expected nil Docker ack on malformed response, got %+v", res)
	}
}

func TestPush_ConfigCallbackNotSet(t *testing.T) {
	// When no handler is set, the push should still succeed without panic.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"config":{"dockerMetricsEnabled":true}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	// No handler set — must not panic.

	m := &metrics.SystemMetrics{CPU: 10}
	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil {
		t.Fatal("expected non-nil result")
	}
}

// ---------------------------------------------------------------------------
// Docker payload serialisation
// ---------------------------------------------------------------------------

func TestPush_DockerPayloadSerialised(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU:    50.0,
		Memory: 60.0,
		Docker: &metrics.DockerMetrics{
			SchemaVersion:  1,
			Available:      true,
			ContainerTotal: 2,
			CPUPercent:     75.0,
		},
	}

	_, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(capturedBody, &raw); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	dockerRaw, ok := raw["docker"]
	if !ok {
		t.Fatal("expected Docker field to be present in payload")
	}
	var v1 metrics.DockerMetrics
	if err := json.Unmarshal(dockerRaw, &v1); err != nil {
		t.Fatalf("unmarshal docker branch: %v", err)
	}
	if !v1.Available {
		t.Error("expected Docker.Available=true")
	}
	if v1.ContainerTotal != 2 {
		t.Errorf("Docker.ContainerTotal = %d, want 2", v1.ContainerTotal)
	}
	if v1.CPUPercent != 75.0 {
		t.Errorf("Docker.CPUPercent = %f, want 75.0", v1.CPUPercent)
	}
	if v1.SchemaVersion != 1 {
		t.Errorf("Docker.SchemaVersion = %d, want 1", v1.SchemaVersion)
	}
}

func TestPush_DockerOmittedWhenNil(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU:    50.0,
		Memory: 60.0,
	}

	_, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(capturedBody, &raw); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if _, ok := raw["docker"]; ok {
		t.Error("expected 'docker' field to be omitted when nil")
	}
}

// ---------------------------------------------------------------------------
// I2 typed push response
// ---------------------------------------------------------------------------

func TestPush_TrailingJSONFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true}}}{"unexpected":true}`))
	}))
	defer srv.Close()

	client := NewClient(createTestConfig(srv.URL))
	res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil || res.Docker != nil || res.Config == nil || res.Config.DockerMetricsEnabled {
		t.Fatalf("trailing JSON must fail closed, got %+v", res)
	}
}

func TestPush_TypedAckSuccess(t *testing.T) {
	var received *ConfigResponse
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"vpsId":"vps-1","receivedAt":"2026-01-01T00:00:00Z","config":{"dockerMetricsEnabled":true,"maxSchemaVersion":2,"history":true,"containerHistory":true,"events":true,"storage":true},"docker":{"ingestStatus":"committed","batchId":"batch-1","snapshotId":"snap-1","agentInstanceId":"instance-1","committedWatermark":{"timeNano":"123456789","boundaryDigests":["abc123"]}}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetConfigHandler(func(cr *ConfigResponse) {
		received = cr
	})

	res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil {
		t.Fatal("expected non-nil result")
	}
	if res.VpsId != "vps-1" {
		t.Errorf("VpsId = %q, want vps-1", res.VpsId)
	}
	if res.ReceivedAt != "2026-01-01T00:00:00Z" {
		t.Errorf("ReceivedAt = %q", res.ReceivedAt)
	}
	if res.Config == nil || !res.Config.DockerMetricsEnabled {
		t.Error("expected config enabled")
	}
	if res.Config.MaxSchemaVersion == nil || *res.Config.MaxSchemaVersion != 2 {
		t.Errorf("expected maxSchemaVersion=2, got %+v", res.Config)
	}
	if res.Docker == nil {
		t.Fatal("expected non-nil Docker ack")
	}
	if res.Docker.IngestStatus != "committed" {
		t.Errorf("IngestStatus = %q", res.Docker.IngestStatus)
	}
	if res.Docker.BatchId != "batch-1" || res.Docker.SnapshotId != "snap-1" || res.Docker.AgentInstanceId != "instance-1" {
		t.Errorf("ack IDs mismatch: %+v", res.Docker)
	}
	if res.Docker.CommittedWatermark.TimeNano != "123456789" {
		t.Errorf("watermark = %q", res.Docker.CommittedWatermark.TimeNano)
	}
	if len(res.Docker.CommittedWatermark.BoundaryDigests) != 1 {
		t.Errorf("digests = %v", res.Docker.CommittedWatermark.BoundaryDigests)
	}
	if received == nil || !received.DockerMetricsEnabled {
		t.Error("config handler should receive enabled")
	}
}

func TestPush_TypedAckAlreadyCommitted(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"vpsId":"vps-1","receivedAt":"2026-01-01T00:00:00Z","config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"already_committed","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"0","boundaryDigests":[]}}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil || res.Docker == nil {
		t.Fatal("expected non-nil Docker ack")
	}
	if res.Docker.IngestStatus != "already_committed" {
		t.Errorf("IngestStatus = %q", res.Docker.IngestStatus)
	}
}

func TestPush_TypedAckReplayIgnored(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"vpsId":"vps-1","receivedAt":"2026-01-01T00:00:00Z","config":{"dockerMetricsEnabled":false},"docker":{"ingestStatus":"replay_ignored","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"42","boundaryDigests":[]}}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil || res.Docker == nil || res.Docker.IngestStatus != "replay_ignored" {
		t.Fatalf("expected replay_ignored ack, got %+v", res)
	}
}

func TestPush_OldResponseNilAck(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"vpsId":"vps-1","receivedAt":"2026-01-01T00:00:00Z","config":{"dockerMetricsEnabled":false}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil {
		t.Fatal("expected non-nil result")
	}
	if res.Docker != nil {
		t.Errorf("expected nil Docker ack, got %+v", res.Docker)
	}
}

func TestPush_InvalidAckFailsClosed(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"bad enum", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"bogus","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"1","boundaryDigests":[]}}}}`},
		{"empty batch", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed","batchId":"","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"1","boundaryDigests":[]}}}}`},
		{"bad id chars", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed","batchId":"bad id!","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"1","boundaryDigests":[]}}}}`},
		{"bad watermark", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"-5","boundaryDigests":[]}}}}`},
		{"bad digest", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"1","boundaryDigests":["bad digest!"]}}}}`},
		{"missing watermark", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1"}}}`},
		{"too many digests", ""}, // filled below
	}
	tooMany := `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"1","boundaryDigests":[`
	digests := make([]string, 0, 257)
	for i := 0; i < 257; i++ {
		digests = append(digests, fmt.Sprintf(`"d%d"`, i))
	}
	tooMany += strings.Join(digests, ",") + `]}}}}`
	cases[6].body = tooMany

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var received *ConfigResponse
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer srv.Close()

			cfg := createTestConfig(srv.URL)
			client := NewClient(cfg)
			client.SetConfigHandler(func(cr *ConfigResponse) {
				received = cr
			})
			res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
			if err != nil {
				t.Fatalf("invalid ack must still succeed: %v", err)
			}
			if res == nil {
				t.Fatal("expected non-nil result")
			}
			if res.Docker != nil {
				t.Errorf("expected nil Docker ack (fail closed), got %+v", res.Docker)
			}
			if received == nil || !received.DockerMetricsEnabled {
				t.Error("config callback must still fire with enabled=true")
			}
		})
	}
}

func TestPush_MismatchDockerShapeFailsClosed(t *testing.T) {
	shapes := []string{
		`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":[]}}`,
		`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":"ack"}}`,
		`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":42}}`,
		`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true},"docker":{"ingestStatus":"committed"}}}`,
	}
	for i, body := range shapes {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(body))
		}))
		func() {
			defer srv.Close()
			cfg := createTestConfig(srv.URL)
			client := NewClient(cfg)
			res, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
			if err != nil {
				t.Fatalf("shape %d: unexpected error: %v", i, err)
			}
			if res == nil || res.Docker != nil {
				t.Errorf("shape %d: expected nil Docker ack, got %+v", i, res)
			}
		}()
	}
}

func TestPush_Conflict(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`conflict for vma_secret_token_xyz and more text ` + strings.Repeat("x", 500)))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	_, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err == nil {
		t.Fatal("expected conflict error")
	}
	var conflictErr *ErrConflict
	if !isErrType(err, &conflictErr) {
		t.Fatalf("expected ErrConflict, got %T: %v", err, err)
	}
	if conflictErr.StatusCode != 409 {
		t.Errorf("StatusCode = %d, want 409", conflictErr.StatusCode)
	}
	if strings.Contains(conflictErr.Body, "vma_secret_token_xyz") {
		t.Errorf("conflict body must be sanitized, got: %s", conflictErr.Body)
	}
	if len(conflictErr.Body) > 210 {
		t.Errorf("conflict body must be bounded, got length %d", len(conflictErr.Body))
	}
	if IsFatal(err) {
		t.Error("ErrConflict must not be fatal")
	}
	if isRetryableErr(err) {
		t.Error("ErrConflict must not be retryable")
	}
}

func TestPushWithRetry_ConflictNoRetry(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`conflict`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	_, err := client.PushWithRetry(context.Background(), &metrics.SystemMetrics{CPU: 10})
	if err == nil {
		t.Fatal("expected conflict error")
	}
	var conflictErr *ErrConflict
	if !isErrType(err, &conflictErr) {
		t.Fatalf("expected ErrConflict, got %T", err)
	}
	if callCount != 1 {
		t.Errorf("expected exactly 1 call (no blind retry on 409), got %d", callCount)
	}
}

func TestPush_DockerStripRetryNilAck(t *testing.T) {
	callCount := 0
	var secondHasDocker bool
	var secondChecked bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		var raw map[string]json.RawMessage
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &raw)
		_, hasDocker := raw["docker"]
		if callCount == 1 {
			if !hasDocker {
				t.Error("first request should include docker")
			}
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"bad docker"}`))
			return
		}
		secondHasDocker = hasDocker
		secondChecked = true
		w.WriteHeader(http.StatusOK)
		// Even though the server returns a docker ack, the stripped retry
		// result must have nil Docker ack.
		_, _ = w.Write([]byte(`{"data":{"ok":true,"vpsId":"vps-1","receivedAt":"2026-01-01T00:00:00Z","config":{"dockerMetricsEnabled":false},"docker":{"ingestStatus":"committed","batchId":"b1","snapshotId":"s1","agentInstanceId":"i1","committedWatermark":{"timeNano":"1","boundaryDigests":[]}}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	var configs []*ConfigResponse
	client.SetConfigHandler(func(cr *ConfigResponse) {
		configs = append(configs, cr)
	})

	m := &metrics.SystemMetrics{
		CPU:    10,
		Docker: &metrics.DockerMetrics{SchemaVersion: 1, Available: true},
	}
	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if callCount != 2 {
		t.Errorf("expected 2 calls (strip+retry once), got %d", callCount)
	}
	if !secondChecked || secondHasDocker {
		t.Error("second (stripped) request must not include docker")
	}
	if res == nil {
		t.Fatal("expected non-nil result")
	}
	if res.Docker != nil {
		t.Errorf("stripped retry result must have nil Docker ack, got %+v", res.Docker)
	}
	if len(configs) == 0 || configs[0].DockerMetricsEnabled {
		t.Error("first config callback should disable Docker (fail closed)")
	}
}

func TestPushWithRetry_StrippedRetryResult(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount == 1 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":false}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	m := &metrics.SystemMetrics{
		CPU:    10,
		Docker: &metrics.DockerMetrics{SchemaVersion: 1, Available: true},
	}
	res, err := client.PushWithRetry(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil || res.Docker != nil {
		t.Errorf("expected nil Docker ack, got %+v", res)
	}
}

// ---------------------------------------------------------------------------
// Docker v2 serialization + capability gate
// ---------------------------------------------------------------------------

func boolPtr(b bool) *bool { return &b }
func intPtr(i int) *int    { return &i }

func advertisedConfig() *ConfigResponse {
	return &ConfigResponse{
		DockerMetricsEnabled: true,
		MaxSchemaVersion:     intPtr(2),
		History:              boolPtr(true),
		ContainerHistory:     boolPtr(true),
		Events:               boolPtr(true),
		Storage:              boolPtr(true),
	}
}

func testV2Batch() *metrics.DockerMetricsV2 {
	return &metrics.DockerMetricsV2{
		CollectedAt:      "2026-01-01T00:00:30Z",
		SchemaVersion:    metrics.DockerSchemaVersionV2,
		AgentInstanceID:  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		SnapshotID:       "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		BatchID:          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
		Available:        true,
		ContainerTotal:   1,
		ContainerRunning: 1,
		Containers: []metrics.DockerContainerV2{
			{
				ContainerKey:     "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
				ID:               "abc123def456",
				Name:             "/web",
				Image:            "nginx:1.25",
				State:            "running",
				CPUPercent:       1.5,
				MemoryUsageBytes: 1024,
				NetworkRxBytes:   10,
				NetworkTxBytes:   10,
				BlockReadBytes:   10,
				BlockWriteBytes:  10,
				PIDs:             2,
			},
		},
		Events: []metrics.DockerEventV2{
			{
				EventID:         "evt-1",
				EventOccurredAt: "2026-01-01T00:00:10Z",
				ContainerKey:    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
				Action:          metrics.DockerV2ActionDie,
				Context:         metrics.DockerEventContextV2{Version: metrics.DockerEventContextVersionV1},
			},
		},
		EventWindow: &metrics.DockerEventWindowV2{
			Since: "1",
			Until: "2",
		},
		FromWatermark: &metrics.DockerEventWatermarkV2{
			TimeNano:        "1",
			BoundaryDigests: []string{},
		},
		ProposedWatermark: &metrics.DockerEventWatermarkV2{
			TimeNano:        "2",
			BoundaryDigests: []string{},
		},
	}
}

func TestPush_PayloadContainsV2WhenGateEnabled(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true,"maxSchemaVersion":2,"history":true,"containerHistory":true,"events":true,"storage":true}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	if client.IsDockerV2Enabled() {
		t.Fatal("v2 gate must default to false")
	}
	client.SetDockerV2FromConfig(advertisedConfig())
	if !client.IsDockerV2Enabled() {
		t.Fatal("v2 gate should be enabled after advertised config")
	}

	m := &metrics.SystemMetrics{
		CPU: 10,
		Docker: &metrics.DockerMetrics{
			SchemaVersion:  1,
			Available:      true,
			ContainerTotal: 1,
		},
		DockerV2: testV2Batch(),
	}
	if _, err := client.Push(context.Background(), m); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(capturedBody, &raw); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	dockerRaw, ok := raw["docker"]
	if !ok {
		t.Fatal("expected 'docker' branch in payload")
	}
	var branch map[string]json.RawMessage
	if err := json.Unmarshal(dockerRaw, &branch); err != nil {
		t.Fatalf("unmarshal docker branch: %v", err)
	}
	var schemaVersion int
	if err := json.Unmarshal(branch["schemaVersion"], &schemaVersion); err != nil {
		t.Fatalf("unmarshal schemaVersion: %v", err)
	}
	if schemaVersion != 2 {
		t.Errorf("docker.schemaVersion = %d, want 2 (canonical flat v2 under `docker`)", schemaVersion)
	}
	var v2 metrics.DockerMetricsV2
	if err := json.Unmarshal(dockerRaw, &v2); err != nil {
		t.Fatalf("unmarshal v2 branch: %v", err)
	}
	if v2.BatchID == "" || v2.AgentInstanceID == "" {
		t.Errorf("v2 branch missing canonical identity fields: %+v", v2)
	}
	if _, ok := raw["dockerV2"]; ok {
		t.Error("must not invent a separate `dockerV2` wire field; v2 rides on `docker`")
	}
}

func TestPush_V1PreservedWhenGateDisabled(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)

	m := &metrics.SystemMetrics{
		CPU: 10,
		Docker: &metrics.DockerMetrics{
			SchemaVersion:  1,
			Available:      true,
			ContainerTotal: 3,
		},
		DockerV2: testV2Batch(),
	}
	if _, err := client.Push(context.Background(), m); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(capturedBody, &raw); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	dockerRaw, ok := raw["docker"]
	if !ok {
		t.Fatal("expected legacy v1 'docker' branch")
	}
	var v1 metrics.DockerMetrics
	if err := json.Unmarshal(dockerRaw, &v1); err != nil {
		t.Fatalf("unmarshal v1 branch: %v", err)
	}
	if v1.SchemaVersion != 1 || v1.ContainerTotal != 3 {
		t.Errorf("expected legacy v1 branch preserved, got %+v", v1)
	}
}

func TestPush_OldResponseLeavesGateFalse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	if _, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client.IsDockerV2Enabled() {
		t.Error("old response without capability flags must leave v2 gate false")
	}
}

func TestPush_MalformedResponseLeavesGateFalse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetDockerV2Enabled(true) // prove fail-closed resets on malformed
	if _, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client.IsDockerV2Enabled() {
		t.Error("malformed response must fail closed to v2 gate false")
	}
}

func TestPush_AdvertisedResponseEnablesGate(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":true,"maxSchemaVersion":2,"history":true,"containerHistory":true,"events":true,"storage":true}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	if _, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !client.IsDockerV2Enabled() {
		t.Error("advertised maxSchemaVersion>=2 with all capability flags must enable v2 gate")
	}
}

func TestPush_PartialAdvertisementLeavesGateFalse(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"schema 1", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true,"maxSchemaVersion":1,"history":true,"containerHistory":true,"events":true,"storage":true}}}`},
		{"missing flags", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true,"maxSchemaVersion":2}}}`},
		{"one flag false", `{"data":{"ok":true,"config":{"dockerMetricsEnabled":true,"maxSchemaVersion":2,"history":true,"containerHistory":true,"events":false,"storage":true}}}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer srv.Close()
			cfg := createTestConfig(srv.URL)
			client := NewClient(cfg)
			if _, err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10}); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if client.IsDockerV2Enabled() {
				t.Errorf("partial advertisement must leave gate false: %s", tc.body)
			}
		})
	}
}

func TestPush_DowngradeStripsV2(t *testing.T) {
	callCount := 0
	var secondHasDocker bool
	var secondChecked bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		var raw map[string]json.RawMessage
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &raw)
		_, hasDocker := raw["docker"]
		if callCount == 1 {
			if !hasDocker {
				t.Error("first request should include docker (v2 branch)")
			} else {
				var branch map[string]json.RawMessage
				if err := json.Unmarshal(raw["docker"], &branch); err == nil {
					var sv int
					if err := json.Unmarshal(branch["schemaVersion"], &sv); err == nil && sv != 2 {
						t.Errorf("first request docker.schemaVersion = %d, want 2", sv)
					}
				}
			}
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"bad docker"}`))
			return
		}
		secondHasDocker = hasDocker
		secondChecked = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data":{"ok":true,"config":{"dockerMetricsEnabled":false}}}`))
	}))
	defer srv.Close()

	cfg := createTestConfig(srv.URL)
	client := NewClient(cfg)
	client.SetDockerV2FromConfig(advertisedConfig())
	if !client.IsDockerV2Enabled() {
		t.Fatal("gate must be enabled before downgrade test")
	}
	m := &metrics.SystemMetrics{
		CPU:      10,
		Docker:   &metrics.DockerMetrics{SchemaVersion: 1, Available: true},
		DockerV2: testV2Batch(),
	}
	res, err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if callCount != 2 {
		t.Errorf("expected 2 calls (strip+retry once), got %d", callCount)
	}
	if !secondChecked || secondHasDocker {
		t.Error("second (stripped) request must not include docker (neither v1 nor v2)")
	}
	if client.IsDockerV2Enabled() {
		t.Error("400 downgrade must disable the v2 gate (fail closed)")
	}
	if res == nil || res.Docker != nil {
		t.Errorf("stripped retry result must have nil Docker ack, got %+v", res)
	}
}
