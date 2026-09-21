package metrics

import (
	"context"
	"strings"
	"testing"
)

func fixtureV1(n int) *DockerMetrics {
	v1 := &DockerMetrics{
		CollectedAt:      "2026-01-01T00:00:30Z",
		EngineVersion:    "25.0.3",
		APIVersion:       "1.44",
		OS:               "linux",
		Architecture:     "amd64",
		Available:        true,
		ContainerTotal:   n,
		ContainerRunning: n,
		CPUPercent:       float64(n),
		MemoryUsageBytes: float64(100 * n),
		Containers:       make([]DockerContainerMetric, 0, n),
	}
	for i := 0; i < n; i++ {
		v1.Containers = append(v1.Containers, DockerContainerMetric{
			ID:               strings.Repeat("a", 16) + strings.Repeat("0", 0) + string(rune('a'+i%26)) + string(rune('0'+i%10)),
			Name:             "c",
			Image:            "img:test",
			State:            "running",
			CPUPercent:       1,
			MemoryUsageBytes: 100,
			PIDs:             1,
		})
	}
	return v1
}

func TestDockerGateOnBoundedOutput(t *testing.T) {
	c := NewCollector()
	v1 := fixtureV1(2)
	// Authoritative totals must match v1 even when sampling.
	got := c.collectDockerSnapshot(context.Background(), v1)
	if got == nil {
		t.Fatal("gate-on must produce a snapshot")
	}
	if got.ContainerTotal != v1.ContainerTotal || got.ContainerRunning != v1.ContainerRunning {
		t.Fatalf("counts not authoritative: %+v vs %+v", got, v1)
	}
	if got.CPUPercent != v1.CPUPercent || got.MemoryUsageBytes != v1.MemoryUsageBytes {
		t.Fatalf("host aggregates must mirror v1: %+v", got)
	}
	if len(got.Containers) != 2 {
		t.Fatalf("containers=%d want 2", len(got.Containers))
	}
	seen := map[string]bool{}
	for _, ctr := range got.Containers {
		if err := validateDockerContainerKey(ctr.ContainerKey); err != nil {
			t.Fatalf("bad containerKey %q: %v", ctr.ContainerKey, err)
		}
		if seen[ctr.ContainerKey] {
			t.Fatalf("duplicate containerKey %q", ctr.ContainerKey)
		}
		seen[ctr.ContainerKey] = true
	}
	if got.SampledContainerAggregate == nil {
		t.Fatal("sampled aggregate must be present")
	}
	if !got.SampledContainerAggregate.Coverage.Complete {
		t.Fatalf("2/2 must be complete: %+v", got.SampledContainerAggregate.Coverage)
	}
	// Deterministic key derivation: same input maps to same key.
	again := c.collectDockerSnapshot(context.Background(), v1)
	for i := range got.Containers {
		if got.Containers[i].ContainerKey != again.Containers[i].ContainerKey {
			t.Fatal("containerKey derivation must be stable")
		}
	}
	// Without optional durable/API inputs, no batch/watermark/storage branch.
	if got.BatchID != "" || got.Events != nil || got.EventWindow != nil || got.FromWatermark != nil || got.ProposedWatermark != nil || got.Storage != nil {
		t.Fatalf("collector must not synthesize batch/watermark/storage: %+v", got)
	}
	// With durable IDs attached via the narrow hook, the minimal snapshot validates.
	c.SetDockerFinalizeHook(func(m *DockerMetricsV2) {
		m.AgentInstanceID = strings.Repeat("a", 32)
		m.SnapshotID = strings.Repeat("b", 64)
	})
	hooked := c.collectDockerSnapshot(context.Background(), v1)
	if err := validateDockerMetrics(*hooked); err != nil {
		t.Fatalf("hooked minimal snapshot must validate: %v", err)
	}
}

func TestDockerPartialCoverage(t *testing.T) {
	v1 := fixtureV1(MaxContainers + 5)
	v1.ContainerTotal = MaxContainers + 5
	v1.ContainerRunning = MaxContainers + 5
	got := dockerFromV1(v1, nil)
	if got == nil {
		t.Fatal("expected snapshot")
	}
	if got.ContainerTotal != MaxContainers+5 {
		t.Fatalf("total must stay authoritative, got %d", got.ContainerTotal)
	}
	if len(got.Containers) != MaxContainers {
		t.Fatalf("samples capped at %d, got %d", MaxContainers, len(got.Containers))
	}
	cov := got.SampledContainerAggregate.Coverage
	if cov.DetailsSampled != MaxContainers || cov.DetailsTotalEligible != MaxContainers+5 || cov.Complete {
		t.Fatalf("coverage must be explicit partial: %+v", cov)
	}
	if cov.CohortDigest == "" {
		t.Fatal("cohort digest must be set")
	}
}

func TestDockerPreservesV1(t *testing.T) {
	c := NewCollector()
	v1 := fixtureV1(1)
	before := *v1
	beforeContainers := append([]DockerContainerMetric(nil), v1.Containers...)
	_ = c.collectDockerSnapshot(context.Background(), v1)
	if v1.ContainerTotal != before.ContainerTotal || v1.CPUPercent != before.CPUPercent || len(v1.Containers) != len(beforeContainers) {
		t.Fatal("v1 input must not be mutated")
	}
	// V1 output object identity is untouched by the collector link: the link
	// only reads v1 and returns a separate v2 pointer.
}

func TestDockerDisableClears(t *testing.T) {
	c := NewCollector()
	c.SetDockerContainerKeyFunc(func(string) string { return strings.Repeat("k", 32) })
	c.SetDockerFinalizeHook(func(*DockerMetricsV2) {})
}

func TestDockerFailurePreservesV1(t *testing.T) {
	c := NewCollector()
	// Panicking hook must not propagate; v2 is dropped (nil).
	c.SetDockerFinalizeHook(func(*DockerMetricsV2) { panic("hook boom") })
	if got := c.collectDockerSnapshot(context.Background(), fixtureV1(1)); got != nil {
		t.Fatal("hook panic must yield nil v2")
	}
	// Invalid injected key func skips containers but still yields a snapshot.
	c.SetDockerFinalizeHook(nil)
	c.SetDockerContainerKeyFunc(func(string) string { return "bad key!!" })
	got := c.collectDockerSnapshot(context.Background(), fixtureV1(1))
	if got == nil {
		t.Fatal("all-skipped keys must still yield an (empty-sample) snapshot")
	}
	if len(got.Containers) != 0 {
		t.Fatalf("invalid keys must be skipped, got %d", len(got.Containers))
	}
}
