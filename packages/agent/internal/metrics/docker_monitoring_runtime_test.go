package metrics

import (
	"context"
	"strings"
	"testing"
)

func collectionFixture(n int) *DockerCollectionSnapshot {
	collection := &DockerCollectionSnapshot{
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
		collection.Containers = append(collection.Containers, DockerContainerMetric{
			ID:               strings.Repeat("a", 16) + strings.Repeat("0", 0) + string(rune('a'+i%26)) + string(rune('0'+i%10)),
			Name:             "c",
			Image:            "img:test",
			State:            "running",
			CPUPercent:       1,
			MemoryUsageBytes: 100,
			PIDs:             1,
		})
	}
	return collection
}

func TestDockerGateOnBoundedOutput(t *testing.T) {
	c := NewCollector()
	collection := collectionFixture(2)
	// Authoritative totals must match the collection even when sampling.
	got := c.collectDockerSnapshot(context.Background(), collection)
	if got == nil {
		t.Fatal("gate-on must produce a snapshot")
	}
	if got.ContainerTotal != collection.ContainerTotal || got.ContainerRunning != collection.ContainerRunning {
		t.Fatalf("counts not authoritative: %+v vs %+v", got, collection)
	}
	if got.CPUPercent != collection.CPUPercent || got.MemoryUsageBytes != collection.MemoryUsageBytes {
		t.Fatalf("host aggregates must mirror the collection: %+v", got)
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
	again := c.collectDockerSnapshot(context.Background(), collection)
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
	c.SetDockerFinalizeHook(func(m *DockerMetrics) {
		m.AgentInstanceID = strings.Repeat("a", 32)
		m.SnapshotID = strings.Repeat("b", 64)
	})
	hooked := c.collectDockerSnapshot(context.Background(), collection)
	if err := validateDockerMetrics(*hooked); err != nil {
		t.Fatalf("hooked minimal snapshot must validate: %v", err)
	}
}

func TestDockerPartialCoverage(t *testing.T) {
	collection := collectionFixture(MaxContainers + 5)
	collection.ContainerTotal = MaxContainers + 5
	collection.ContainerRunning = MaxContainers + 5
	got := dockerSnapshotFromCollection(collection, nil)
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

func TestDockerSnapshotDoesNotMutateLegacyInput(t *testing.T) {
	c := NewCollector()
	collection := collectionFixture(1)
	before := *collection
	beforeContainers := append([]DockerContainerMetric(nil), collection.Containers...)
	_ = c.collectDockerSnapshot(context.Background(), collection)
	if collection.ContainerTotal != before.ContainerTotal || collection.CPUPercent != before.CPUPercent || len(collection.Containers) != len(beforeContainers) {
		t.Fatal("legacy input must not be mutated")
	}
	// Legacy output object identity is untouched by the collector link: the
	// link only reads the legacy input and returns a separate snapshot pointer.
}

func TestDockerDisableClears(t *testing.T) {
	c := NewCollector()
	c.SetDockerContainerKeyFunc(func(string) string { return strings.Repeat("k", 32) })
	c.SetDockerFinalizeHook(func(*DockerMetrics) {})
}

func TestDockerDerivationFailureDoesNotBreakLegacyCollection(t *testing.T) {
	c := NewCollector()
	// Panicking hook must not propagate; the snapshot is dropped (nil) while the
	// legacy collection path keeps working.
	c.SetDockerFinalizeHook(func(*DockerMetrics) { panic("hook boom") })
	if got := c.collectDockerSnapshot(context.Background(), collectionFixture(1)); got != nil {
		t.Fatal("hook panic must yield nil snapshot")
	}
	// Invalid injected key func skips containers but still yields a snapshot.
	c.SetDockerFinalizeHook(nil)
	c.SetDockerContainerKeyFunc(func(string) string { return "bad key!!" })
	got := c.collectDockerSnapshot(context.Background(), collectionFixture(1))
	if got == nil {
		t.Fatal("all-skipped keys must still yield an (empty-sample) snapshot")
	}
	if len(got.Containers) != 0 {
		t.Fatalf("invalid keys must be skipped, got %d", len(got.Containers))
	}
}
