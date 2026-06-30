package run

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
)

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

type mockCollector struct {
	metrics *metrics.SystemMetrics
	err     error
}

func (m *mockCollector) Collect(ctx context.Context) (*metrics.SystemMetrics, error) {
	return m.metrics, m.err
}

type mockPusher struct {
	pushCount      atomic.Int64
	pushRetryCount atomic.Int64
	failCount      int32 // fail for first N calls
	err            error
}

func (m *mockPusher) Push(ctx context.Context, metrics *metrics.SystemMetrics) error {
	m.pushCount.Add(1)
	if m.failCount > 0 && m.pushCount.Load() <= int64(m.failCount) {
		return m.err
	}
	return nil
}

func (m *mockPusher) PushWithRetry(ctx context.Context, metrics *metrics.SystemMetrics) error {
	m.pushRetryCount.Add(1)
	if m.failCount > 0 && m.pushRetryCount.Load() <= int64(m.failCount) {
		return m.err
	}
	return nil
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestRunOnce_Success(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{
			CPU: 50, Memory: 60, Disk: 70, LoadAverage: 0.5,
		},
	}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	runner := New(cfg, collector, pusher)

	err := runner.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if pusher.pushRetryCount.Load() != 1 {
		t.Errorf("expected 1 push, got %d", pusher.pushRetryCount.Load())
	}
}

func TestRunOnce_CollectError(t *testing.T) {
	collector := &mockCollector{err: errors.New("collect failed")}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	runner := New(cfg, collector, pusher)

	err := runner.RunOnce(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	if pusher.pushRetryCount.Load() != 0 {
		t.Errorf("expected 0 pushes on collect error, got %d", pusher.pushRetryCount.Load())
	}
}

func TestRunOnce_PushError(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{
		failCount: 1,
		err:       errors.New("push failed"),
	}

	cfg := createTestConfig()
	runner := New(cfg, collector, pusher)

	err := runner.RunOnce(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestRunLoop_Cancellation(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	cfg.IntervalSeconds = 1

	runner := New(cfg, collector, pusher)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := runner.RunLoop(ctx)
	if err != nil && err != context.DeadlineExceeded && err != context.Canceled {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have collected at least once (initial collection)
	if pusher.pushRetryCount.Load() < 1 {
		t.Errorf("expected at least 1 push, got %d", pusher.pushRetryCount.Load())
	}
}

func TestRunLoop_StopsOnContextCancel(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{}

	cfg := createTestConfig()
	cfg.IntervalSeconds = 1

	runner := New(cfg, collector, pusher)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	err := runner.RunLoop(ctx)
	if err != context.Canceled {
		t.Fatalf("expected context.Canceled, got: %v", err)
	}
}

func TestRunLoop_StopsOnFatalPushError(t *testing.T) {
	collector := &mockCollector{
		metrics: &metrics.SystemMetrics{CPU: 50},
	}
	pusher := &mockPusher{
		failCount: 1,
		err:       &push.ErrAuth{StatusCode: 401},
	}

	cfg := createTestConfig()
	cfg.IntervalSeconds = 1

	runner := New(cfg, collector, pusher)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := runner.RunLoop(ctx)
	if err == nil {
		t.Fatal("expected fatal error from loop")
	}
	if !push.IsFatal(err) {
		t.Fatalf("expected IsFatal error, got: %T %v", err, err)
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func createTestConfig() *config.Config {
	return &config.Config{
		BackendUrl:            "http://localhost:3000",
		VpsId:                 "test-vps",
		Token:                 "test-token",
		IntervalSeconds:       5,
		RequestTimeoutSeconds: 5,
	}
}
