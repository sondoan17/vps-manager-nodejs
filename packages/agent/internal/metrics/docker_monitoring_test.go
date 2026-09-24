package metrics

import (
	"encoding/json"
	"strings"
	"testing"
)

func validMonitoring() DockerMetrics {
	return DockerMetrics{
		CollectedAt:      "2026-01-01T00:00:30Z",
		SchemaVersion:    DockerMetricsSchemaVersion,
		AgentInstanceID:  strings.Repeat("a", 32),
		SnapshotID:       strings.Repeat("b", 64),
		SourceSequence:   "1",
		Available:        true,
		ContainerTotal:   1,
		ContainerRunning: 1,
		Containers:       []DockerContainer{},
		Monitoring: &DockerMonitoringMetadata{
			EffectiveCadenceSeconds: 60,
			Availability:            "available",
			State:                   "enabled",
		},
	}
}

// Wire-shape contract: schemaVersion=2 on every docker branch; a complete
// zero-event window marshals an explicit empty "events" array (API
// all-or-none protocol), while a minimal snapshot omits the key entirely
// (pointer semantics: nil = absent, non-nil empty = []).
func TestDockerWire_EventsOmissionVsEmptyArray(t *testing.T) {
	min := validMonitoring()
	if err := validateDockerMetrics(min); err != nil {
		t.Fatalf("minimal snapshot must validate: %v", err)
	}
	raw, _ := json.Marshal(min)
	if strings.Contains(string(raw), `"events"`) {
		t.Fatalf("minimal snapshot must omit events: %s", raw)
	}
	if !strings.Contains(string(raw), `"schemaVersion":2`) {
		t.Fatalf("schemaVersion=2 must be present on every branch: %s", raw)
	}

	batch := validMonitoring()
	batch.BatchID = strings.Repeat("c", 64)
	batch.Events = &[]DockerEvent{}
	batch.EventWindow = &DockerEventWindow{Since: "1", Until: "2"}
	batch.FromWatermark = &DockerEventWatermark{TimeNano: "1", BoundaryDigests: []string{}}
	batch.ProposedWatermark = &DockerEventWatermark{TimeNano: "2", BoundaryDigests: []string{}}
	if err := validateDockerBatch(batch); err != nil {
		t.Fatalf("empty-window batch must validate: %v", err)
	}
	if err := validateDockerMetrics(batch); err != nil {
		t.Fatalf("empty-window metrics must validate: %v", err)
	}
	raw, _ = json.Marshal(batch)
	if !strings.Contains(string(raw), `"events":[]`) {
		t.Fatalf("zero-event window must marshal an explicit events array: %s", raw)
	}
	if !strings.Contains(string(raw), `"schemaVersion":2`) {
		t.Fatalf("schemaVersion=2 must be present on every branch: %s", raw)
	}
}

func TestDockerMonitoringSerialization(t *testing.T) {
	m := validMonitoring()
	raw, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	mon, ok := decoded["monitoring"].(map[string]any)
	if !ok {
		t.Fatalf("monitoring must serialize as nested object, got %v", decoded["monitoring"])
	}
	if mon["effectiveCadenceSeconds"] != float64(60) || mon["availability"] != "available" || mon["state"] != "enabled" {
		t.Fatalf("nested monitoring fields wrong: %v", mon)
	}
	var roundtrip DockerMetrics
	if err := json.Unmarshal(raw, &roundtrip); err != nil {
		t.Fatal(err)
	}
	if roundtrip.Monitoring == nil || roundtrip.Monitoring.EffectiveCadenceSeconds != 60 {
		t.Fatalf("roundtrip monitoring lost: %+v", roundtrip.Monitoring)
	}
	if err := validateDockerMetrics(roundtrip); err != nil {
		t.Fatalf("roundtrip must validate: %v", err)
	}
}

func TestDockerMonitoringBackwardCompatibility(t *testing.T) {
	// Old payload without metadata remains valid and omits the key.
	m := validMonitoring()
	m.Monitoring = nil
	if err := validateDockerMetrics(m); err != nil {
		t.Fatalf("payload without monitoring must validate: %v", err)
	}
	raw, _ := json.Marshal(m)
	if strings.Contains(string(raw), "monitoring") {
		t.Fatalf("absent monitoring must be omitted, got %s", raw)
	}
	var decoded DockerMetrics
	if err := json.Unmarshal([]byte(`{}`), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Monitoring != nil {
		t.Fatalf("missing monitoring must decode to nil")
	}
	// Explicit JSON without monitoring decodes to nil and still validates shape-wise.
	legacy := validMonitoring()
	legacy.Monitoring = nil
	rawLegacy, _ := json.Marshal(legacy)
	var back DockerMetrics
	if err := json.Unmarshal(rawLegacy, &back); err != nil {
		t.Fatal(err)
	}
	if back.Monitoring != nil {
		t.Fatalf("legacy roundtrip must keep monitoring nil")
	}
}

func TestDockerMonitoringInvalidValues(t *testing.T) {
	cases := []struct {
		name string
		mut  func(*DockerMonitoringMetadata)
	}{
		{"zeroCadence", func(m *DockerMonitoringMetadata) { m.EffectiveCadenceSeconds = 0 }},
		{"negativeCadence", func(m *DockerMonitoringMetadata) { m.EffectiveCadenceSeconds = -5 }},
		{"cadenceOverflow", func(m *DockerMonitoringMetadata) { m.EffectiveCadenceSeconds = 86401 }},
		{"badAvailability", func(m *DockerMonitoringMetadata) { m.Availability = "sometimes" }},
		{"emptyAvailability", func(m *DockerMonitoringMetadata) { m.Availability = "" }},
		{"badState", func(m *DockerMonitoringMetadata) { m.State = "running" }},
		{"emptyState", func(m *DockerMonitoringMetadata) { m.State = "" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			meta := &DockerMonitoringMetadata{EffectiveCadenceSeconds: 60, Availability: "available", State: "enabled"}
			tc.mut(meta)
			if err := validateDockerMonitoringMetadata(meta); err == nil {
				t.Fatalf("%s must be rejected", tc.name)
			}
			full := validMonitoring()
			full.Monitoring = meta
			if err := validateDockerMetrics(full); err == nil {
				t.Fatalf("%s must fail full metrics validation", tc.name)
			}
		})
	}
	// Nil metadata is valid.
	if err := validateDockerMonitoringMetadata(nil); err != nil {
		t.Fatalf("nil monitoring must validate: %v", err)
	}
	// Boundary values accepted.
	for _, cadence := range []int{1, 86400} {
		meta := &DockerMonitoringMetadata{EffectiveCadenceSeconds: cadence, Availability: "unknown", State: "unknown"}
		if err := validateDockerMonitoringMetadata(meta); err != nil {
			t.Fatalf("cadence %d must validate: %v", cadence, err)
		}
	}
	for _, av := range []string{"available", "unavailable", "unknown"} {
		meta := &DockerMonitoringMetadata{EffectiveCadenceSeconds: 30, Availability: av, State: "enabled"}
		if err := validateDockerMonitoringMetadata(meta); err != nil {
			t.Fatalf("availability %q must validate: %v", av, err)
		}
	}
	for _, st := range []string{"enabled", "disabled", "unknown"} {
		meta := &DockerMonitoringMetadata{EffectiveCadenceSeconds: 30, Availability: "available", State: st}
		if err := validateDockerMonitoringMetadata(meta); err != nil {
			t.Fatalf("state %q must validate: %v", st, err)
		}
	}
}
