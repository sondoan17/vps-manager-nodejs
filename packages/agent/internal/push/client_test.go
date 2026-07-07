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

	err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
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
	err := client.Push(context.Background(), m)

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
	err := client.Push(context.Background(), m)

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
	err := client.Push(context.Background(), m)

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

	err := client.PushWithRetry(ctxWithTimeout, m)
	if err != nil {
		t.Fatalf("expected success after retries, got: %v", err)
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
	err := client.PushWithRetry(context.Background(), m)

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
	err := client.Push(context.Background(), m)

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

	err := client.Push(context.Background(), m)
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
	err := client.Push(context.Background(), m)
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

	err := client.PushWithRetry(ctx, m)
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
	err := client.Push(context.Background(), m)

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
	err := client.Push(context.Background(), m)

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
	err := client.Push(context.Background(), m)

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
	err := client.Push(context.Background(), m)

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

	err := client.Push(context.Background(), m)
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

	err := client.Push(context.Background(), m)
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
	err := client.Push(context.Background(), &metrics.SystemMetrics{CPU: 10})
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
	err := client.Push(context.Background(), m)
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
	err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if !received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=true")
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
	err := client.Push(context.Background(), m)
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
	err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=false when config is missing")
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
	err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if received == nil {
		t.Fatal("config handler was not called")
	}
	if received.DockerMetricsEnabled {
		t.Error("expected DockerMetricsEnabled=false on malformed response")
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
	err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
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
		CPU: 50.0,
		Memory: 60.0,
		Docker: &metrics.DockerMetrics{
			SchemaVersion:  1,
			Available:      true,
			ContainerTotal: 2,
			CPUPercent:     75.0,
		},
	}

	err := client.Push(context.Background(), m)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var p payload
	if err := json.Unmarshal(capturedBody, &p); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if p.Docker == nil {
		t.Fatal("expected Docker field to be present in payload")
	}
	if !p.Docker.Available {
		t.Error("expected Docker.Available=true")
	}
	if p.Docker.ContainerTotal != 2 {
		t.Errorf("Docker.ContainerTotal = %d, want 2", p.Docker.ContainerTotal)
	}
	if p.Docker.CPUPercent != 75.0 {
		t.Errorf("Docker.CPUPercent = %f, want 75.0", p.Docker.CPUPercent)
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

	err := client.Push(context.Background(), m)
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
