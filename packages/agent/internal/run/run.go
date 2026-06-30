package run

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
)

// MetricsCollector is the interface for collecting system metrics.
type MetricsCollector interface {
	Collect(ctx context.Context) (*metrics.SystemMetrics, error)
}

// MetricsPusher is the interface for pushing metrics to the backend.
type MetricsPusher interface {
	PushWithRetry(ctx context.Context, m *metrics.SystemMetrics) error
	Push(ctx context.Context, m *metrics.SystemMetrics) error
}

// Runner orchestrates metric collection and push in once or loop mode.
type Runner struct {
	cfg       *config.Config
	collector MetricsCollector
	pusher    MetricsPusher
}

// New creates a new Runner.
func New(cfg *config.Config, collector MetricsCollector, pusher MetricsPusher) *Runner {
	return &Runner{
		cfg:       cfg,
		collector: collector,
		pusher:    pusher,
	}
}

// RunOnce collects metrics once and pushes them. Returns the error if any.
func (r *Runner) RunOnce(ctx context.Context) error {
	log.Println("collecting metrics...")
	m, err := r.collector.Collect(ctx)
	if err != nil {
		return fmt.Errorf("collect: %w", err)
	}
	log.Printf("metrics collected: cpu=%.1f%% mem=%.1f%% disk=%.1f%% load=%.2f",
		m.CPU, m.Memory, m.Disk, m.LoadAverage)

	log.Println("pushing metrics...")
	if err := r.pusher.PushWithRetry(ctx, m); err != nil {
		return fmt.Errorf("push: %w", err)
	}
	log.Println("metrics pushed successfully")
	return nil
}

// RunLoop collects and pushes metrics on the configured interval.
// It uses retry/backoff on push failures. Returns when context is cancelled.
func (r *Runner) RunLoop(ctx context.Context) error {
	interval := time.Duration(r.cfg.IntervalSeconds) * time.Second
	log.Printf("starting loop mode (interval=%v)", interval)

	// Initial collection immediately
	if err := r.collectAndPush(ctx); err != nil {
		if push.IsFatal(err) {
			return fmt.Errorf("fatal push error, stopping: %w", err)
		}
		log.Printf("initial push failed: %v", err)
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("loop stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := r.collectAndPush(ctx); err != nil {
				// Fatal errors (auth, bad request) stop the loop immediately
				if push.IsFatal(err) {
					return fmt.Errorf("fatal push error, stopping: %w", err)
				}
				log.Printf("push failed: %v", err)
				// Add some backoff to avoid busy-looping on persistent errors
				backoff := time.Duration(rand.Int63n(int64(interval) / 2))
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(backoff):
				}
			}
		}
	}
}

func (r *Runner) collectAndPush(ctx context.Context) error {
	m, err := r.collector.Collect(ctx)
	if err != nil {
		return fmt.Errorf("collect: %w", err)
	}

	if err := r.pusher.PushWithRetry(ctx, m); err != nil {
		return fmt.Errorf("push: %w", err)
	}

	return nil
}
