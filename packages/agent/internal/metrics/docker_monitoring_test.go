package metrics

import (
	"encoding/json"
	"strings"
	"testing"
)

func validMonitoringV2() DockerMetricsV2 {
	return DockerMetricsV2{
		CollectedAt:      "2026-01-01T00:00:30Z",
		AgentInstanceID:  strings.Repeat("a", 32),
		SnapshotID:       strings.Repeat("b", 64),
		SourceSequence:   "1",
		Available:        true,
		ContainerTotal:   1,
		ContainerRunning: 1,
		Containers:       []DockerContainerV2{},
		Monitoring: &DockerMonitoringMetadataV2{
			EffectiveCadenceSeconds: 60,
			Availability:            "available",
			State:                   "enabled",
		},
	}
}

func TestDockerMonitoringSerialization(t *testing.T) {
	m := validMonitoringV2()
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
	var roundtrip DockerMetricsV2
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
	m := validMonitoringV2()
	m.Monitoring = nil
	if err := validateDockerMetrics(m); err != nil {
		t.Fatalf("payload without monitoring must validate: %v", err)
	}
	raw, _ := json.Marshal(m)
	if strings.Contains(string(raw), "monitoring") {
		t.Fatalf("absent monitoring must be omitted, got %s", raw)
	}
	var decoded DockerMetricsV2
	if err := json.Unmarshal([]byte(`{}`), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Monitoring != nil {
		t.Fatalf("missing monitoring must decode to nil")
	}
	// Explicit JSON without monitoring decodes to nil and still validates shape-wise.
	legacy := validMonitoringV2()
	legacy.Monitoring = nil
	rawLegacy, _ := json.Marshal(legacy)
	var back DockerMetricsV2
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
		mut  func(*DockerMonitoringMetadataV2)
	}{
		{"zeroCadence", func(m *DockerMonitoringMetadataV2) { m.EffectiveCadenceSeconds = 0 }},
		{"negativeCadence", func(m *DockerMonitoringMetadataV2) { m.EffectiveCadenceSeconds = -5 }},
		{"cadenceOverflow", func(m *DockerMonitoringMetadataV2) { m.EffectiveCadenceSeconds = 86401 }},
		{"badAvailability", func(m *DockerMonitoringMetadataV2) { m.Availability = "sometimes" }},
		{"emptyAvailability", func(m *DockerMonitoringMetadataV2) { m.Availability = "" }},
		{"badState", func(m *DockerMonitoringMetadataV2) { m.State = "running" }},
		{"emptyState", func(m *DockerMonitoringMetadataV2) { m.State = "" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			meta := &DockerMonitoringMetadataV2{EffectiveCadenceSeconds: 60, Availability: "available", State: "enabled"}
			tc.mut(meta)
			if err := validateDockerMonitoringMetadata(meta); err == nil {
				t.Fatalf("%s must be rejected", tc.name)
			}
			full := validMonitoringV2()
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
		meta := &DockerMonitoringMetadataV2{EffectiveCadenceSeconds: cadence, Availability: "unknown", State: "unknown"}
		if err := validateDockerMonitoringMetadata(meta); err != nil {
			t.Fatalf("cadence %d must validate: %v", cadence, err)
		}
	}
	for _, av := range []string{"available", "unavailable", "unknown"} {
		meta := &DockerMonitoringMetadataV2{EffectiveCadenceSeconds: 30, Availability: av, State: "enabled"}
		if err := validateDockerMonitoringMetadata(meta); err != nil {
			t.Fatalf("availability %q must validate: %v", av, err)
		}
	}
	for _, st := range []string{"enabled", "disabled", "unknown"} {
		meta := &DockerMonitoringMetadataV2{EffectiveCadenceSeconds: 30, Availability: "available", State: st}
		if err := validateDockerMonitoringMetadata(meta); err != nil {
			t.Fatalf("state %q must validate: %v", st, err)
		}
	}
}
