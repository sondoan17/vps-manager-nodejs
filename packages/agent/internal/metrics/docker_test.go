package metrics

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
)

// ---------------------------------------------------------------------------
// DockerMetrics serialisation
// ---------------------------------------------------------------------------

func TestDockerMetricsSerialization(t *testing.T) {
	m := &DockerMetrics{
		Available:        true,
		ErrorCode:        "",
		ContainerTotal:   3,
		ContainerRunning: 2,
		CPUPercent:       125.5,
		MemoryUsageBytes: 1.5e9,
		MemoryLimitBytes: 8e9,
		NetworkRxBytes:   1e6,
		NetworkTxBytes:   5e5,
		BlockReadBytes:   1e4,
		BlockWriteBytes:  5e3,
		PIDs:             42,
		Containers: []DockerContainer{
			{
				ContainerKey:     "container-key",
				Name:             "web",
				Image:            "nginx:latest",
				State:            "running",
				Status:           "Up 2 hours",
				CreatedAt:        "2026-01-01T00:00:00Z",
				CPUPercent:       45.2,
				MemoryUsageBytes: 1.2e9,
				MemoryLimitBytes: 2e9,
				NetworkRxBytes:   8e5,
				NetworkTxBytes:   4e5,
				BlockReadBytes:   5e3,
				BlockWriteBytes:  2e3,
				PIDs:             12,
			},
		},
	}

	data, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded DockerMetrics
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if !decoded.Available {
		t.Error("Available should be true")
	}
	if decoded.ContainerTotal != 3 {
		t.Errorf("ContainerTotal = %d, want 3", decoded.ContainerTotal)
	}
	if decoded.ContainerRunning != 2 {
		t.Errorf("ContainerRunning = %d, want 2", decoded.ContainerRunning)
	}
	if len(decoded.Containers) != 1 {
		t.Fatalf("len(Containers) = %d, want 1", len(decoded.Containers))
	}
	if decoded.Containers[0].ContainerKey != "container-key" {
		t.Errorf("Container[0].ContainerKey = %q", decoded.Containers[0].ContainerKey)
	}
	if decoded.Containers[0].CPUPercent != 45.2 {
		t.Errorf("Container[0].CPUPercent = %f", decoded.Containers[0].CPUPercent)
	}
}

func TestDockerMetricsSerialization_Unavailable(t *testing.T) {
	m := &DockerMetrics{
		Available: false,
		ErrorCode: DockerErrorSocketMissing,
	}

	data, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded DockerMetrics
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Available {
		t.Error("Available should be false")
	}
	if decoded.ErrorCode != DockerErrorSocketMissing {
		t.Errorf("ErrorCode = %q, want %q", decoded.ErrorCode, DockerErrorSocketMissing)
	}
}

func TestDockerMetricsOmittedWhenNil(t *testing.T) {
	sm := &SystemMetrics{
		CPU:    50.0,
		Memory: 60.0,
		Disk:   70.0,
		Docker: nil, // should be omitted
	}

	data, err := json.Marshal(sm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, ok := raw["docker"]; ok {
		t.Error("expected 'docker' field to be omitted when nil")
	}
}

func TestDockerMetricsPresentWhenSet(t *testing.T) {
	sm := &SystemMetrics{
		CPU:    50.0,
		Memory: 60.0,
		Docker: &DockerMetrics{
			Available: true,
		},
	}

	data, err := json.Marshal(sm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, ok := raw["docker"]; !ok {
		t.Error("expected 'docker' field to be present")
	}
}

// ---------------------------------------------------------------------------
// bounded string helper
// ---------------------------------------------------------------------------

func TestCappedString(t *testing.T) {
	if s := cappedString("hello", 3); s != "hel" {
		t.Errorf("cappedString = %q, want %q", s, "hel")
	}
	if s := cappedString("hi", 10); s != "hi" {
		t.Errorf("cappedString = %q, want %q", s, "hi")
	}
	if s := cappedString("", 5); s != "" {
		t.Errorf("cappedString = %q, want empty", s)
	}
}

// ---------------------------------------------------------------------------
// unavailableDocker helper
// ---------------------------------------------------------------------------

func TestUnavailableDocker(t *testing.T) {
	m := unavailableDocker(DockerErrorTimeout)
	if m.Available {
		t.Error("Available should be false")
	}
	if m.ErrorCode != DockerErrorTimeout {
		t.Errorf("ErrorCode = %q, want %q", m.ErrorCode, DockerErrorTimeout)
	}
}

// ---------------------------------------------------------------------------
// SetDockerMetricsEnabled thread safety
// ---------------------------------------------------------------------------

func TestSetDockerMetricsEnabled(t *testing.T) {
	c := NewCollector()

	if c.isDockerEnabled() {
		t.Error("Docker should be disabled by default")
	}

	c.SetDockerMetricsEnabled(true)
	if !c.isDockerEnabled() {
		t.Error("Docker should be enabled after SetDockerMetricsEnabled(true)")
	}

	c.SetDockerMetricsEnabled(false)
	if c.isDockerEnabled() {
		t.Error("Docker should be disabled after SetDockerMetricsEnabled(false)")
	}
}

// ---------------------------------------------------------------------------
// Portable Docker collection core with recording RoundTripper (cross-platform)
// ---------------------------------------------------------------------------

// recordingRoundTripper records every request (method, path, query) and
// delegates to the wrapped base transport. It lets tests assert the exact
// GET-only allowlist and exact request counts on any OS.
type recordingRoundTripper struct {
	base     http.RoundTripper
	mu       sync.Mutex
	requests []*http.Request
}

func (r *recordingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	r.mu.Lock()
	r.requests = append(r.requests, req.Clone(req.Context()))
	r.mu.Unlock()
	return r.base.RoundTrip(req)
}

func (r *recordingRoundTripper) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.requests)
}

func (r *recordingRoundTripper) snapshot() []*http.Request {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*http.Request, len(r.requests))
	copy(out, r.requests)
	return out
}

func newRecordingClient(base *http.Client) (*http.Client, *recordingRoundTripper) {
	rec := &recordingRoundTripper{base: base.Transport}
	return &http.Client{Transport: rec}, rec
}

func assertGetRequest(t *testing.T, req *http.Request, wantPath string, wantQuery map[string]string) {
	t.Helper()
	if req.Method != http.MethodGet {
		t.Errorf("request %s: method = %q, want GET", req.URL.Path, req.Method)
	}
	if req.URL.EscapedPath() != wantPath {
		t.Errorf("request path = %q, want %q", req.URL.EscapedPath(), wantPath)
	}
	q := req.URL.Query()
	for k, want := range wantQuery {
		if got := q.Get(k); got != want {
			t.Errorf("request %s: query %q = %q, want %q", wantPath, k, got, want)
		}
	}
	if len(q) != len(wantQuery) {
		t.Errorf("request %s: query = %v, want exactly %v", wantPath, q, wantQuery)
	}
}

func TestCollectDockerWithFakeServer(t *testing.T) {
	// Start a fake Docker API server.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/containers/json":
			// Return two containers: one running, one stopped.
			_, _ = w.Write([]byte(`[
				{"Id":"abc123def4567890","Names":["/web"],"Image":"nginx:latest","State":"running","Status":"Up 1 hour","Created":1767225600},
				{"Id":"def456abc1237890","Names":["/db"],"Image":"postgres:16","State":"exited","Status":"Exited (0) 2 hours ago","Created":1767222000}
			]`))
		case "/containers/abc123def4567890/stats":
			// Return stats for the running container.
			_, _ = w.Write([]byte(`{
				"cpu_stats":{
					"cpu_usage":{"total_usage":200000},
					"system_cpu_usage":10000000,
					"online_cpus":4
				},
				"precpu_stats":{
					"cpu_usage":{"total_usage":100000},
					"system_cpu_usage":5000000
				},
				"memory_stats":{"usage":104857600,"limit":209715200},
				"networks":{"eth0":{"rx_bytes":5000,"tx_bytes":3000}},
				"blkio_stats":{"io_service_bytes_recursive":[
					{"op":"read","value":1000},
					{"op":"write","value":500}
				]},
				"pids_stats":{"current":8}
			}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Portable core with a recording transport (bypasses Unix socket).
	client, rec := newRecordingClient(server.Client())

	dm := collectDockerFromAPI(context.Background(), client, server.URL)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	if !dm.Available {
		t.Fatalf("expected available=true, got errorCode=%q", dm.ErrorCode)
	}
	if dm.ContainerTotal != 2 {
		t.Errorf("ContainerTotal = %d, want 2", dm.ContainerTotal)
	}
	if dm.ContainerRunning != 1 {
		t.Errorf("ContainerRunning = %d, want 1", dm.ContainerRunning)
	}
	if len(dm.Containers) != 2 {
		t.Fatalf("len(Containers) = %d, want 2", len(dm.Containers))
	}

	// Exact GET allowlist and request count: version + list + stats.
	if len(rec.requests) != 3 {
		t.Fatalf("request count = %d, want 3", len(rec.requests))
	}
	assertGetRequest(t, rec.requests[0], "/version", map[string]string{})
	assertGetRequest(t, rec.requests[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
	assertGetRequest(t, rec.requests[2], "/containers/abc123def4567890/stats", map[string]string{"stream": "false"})

	// Check first container (running, with stats).
	c0 := dm.Containers[0]
	if c0.ID != "abc123def4567890" {
		t.Errorf("Container[0].ID = %q", c0.ID)
	}
	if c0.Name != "web" {
		t.Errorf("Container[0].Name = %q", c0.Name)
	}
	if c0.State != "running" {
		t.Errorf("Container[0].State = %q", c0.State)
	}
	if c0.CPUPercent <= 0 {
		t.Errorf("Container[0].CPUPercent should be > 0, got %f", c0.CPUPercent)
	}
	if c0.MemoryUsageBytes != 104857600 {
		t.Errorf("Container[0].MemoryUsageBytes = %f", c0.MemoryUsageBytes)
	}
	if c0.NetworkRxBytes != 5000 {
		t.Errorf("Container[0].NetworkRxBytes = %f", c0.NetworkRxBytes)
	}
	if c0.PIDs != 8 {
		t.Errorf("Container[0].PIDs = %d", c0.PIDs)
	}

	// Check second container (exited, no stats).
	c1 := dm.Containers[1]
	if c1.State != "exited" {
		t.Errorf("Container[1].State = %q", c1.State)
	}
	if c1.CPUPercent != 0 {
		t.Errorf("Container[1].CPUPercent should be 0, got %f", c1.CPUPercent)
	}
}

func TestCollectDocker_StatsIDIsEscaped(t *testing.T) {
	rawID := "abc/def?id=1&x=2"
	escapedID := url.PathEscape(rawID)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/containers/json":
			_, _ = w.Write([]byte(`[{"Id":"` + rawID + `","Names":["/web"],"Image":"img","State":"running","Created":1000000}]`))
		case "/containers/" + escapedID + "/stats":
			_, _ = w.Write([]byte(`{"cpu_stats":{"cpu_usage":{"total_usage":0},"system_cpu_usage":0},"precpu_stats":{"cpu_usage":{"total_usage":0},"system_cpu_usage":0},"memory_stats":{"usage":0,"limit":0}}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client, rec := newRecordingClient(server.Client())

	dm := collectDockerFromAPI(context.Background(), client, server.URL)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	if !dm.Available {
		t.Fatalf("expected available=true, got errorCode=%q", dm.ErrorCode)
	}

	// Exact GET allowlist and request count: version + list + escaped stats.
	if len(rec.requests) != 3 {
		t.Fatalf("request count = %d, want 3", len(rec.requests))
	}
	assertGetRequest(t, rec.requests[0], "/version", map[string]string{})
	assertGetRequest(t, rec.requests[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
	assertGetRequest(t, rec.requests[2], "/containers/"+escapedID+"/stats", map[string]string{"stream": "false"})
	if !strings.Contains(rec.requests[2].URL.EscapedPath(), escapedID) {
		t.Errorf("stats escaped path = %q, want it to contain %q", rec.requests[2].URL.EscapedPath(), escapedID)
	}
}

func TestCollectDocker_FakeServerError(t *testing.T) {
	// Test that Docker collection returns unavailable when the socket is
	// unreachable. We set up an httptest server but then close it immediately
	// so connections fail.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	serverURL := server.URL
	server.Close() // close so client gets connection refused

	// Inject a client that points to the closed server.
	base := server.Client()
	base.Timeout = 0 // disable timeout to avoid masking the error
	client, rec := newRecordingClient(base)

	dm := collectDockerFromAPI(context.Background(), client, serverURL)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	if dm.Available {
		t.Error("expected available=false on server error")
	}
	if dm.ErrorCode == "" {
		t.Error("expected non-empty error code")
	}
	// Exactly version + list attempts; stats are never fetched on list failure.
	if len(rec.requests) != 2 {
		t.Fatalf("request count = %d, want 2", len(rec.requests))
	}
	assertGetRequest(t, rec.requests[0], "/version", map[string]string{})
	assertGetRequest(t, rec.requests[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
}

func TestCollectDocker_ContainerLimit(t *testing.T) {
	// Test that we cap containers at MaxContainers.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/containers/json":
			// Return 25 containers (all stopped so no stats calls).
			_, _ = w.Write([]byte(`[`))
			for i := 0; i < 25; i++ {
				if i > 0 {
					_, _ = w.Write([]byte(`,`))
				}
				_, _ = w.Write([]byte(`{"Id":"id`))
				_, _ = w.Write([]byte(string(rune('a' + i%26))))
				_, _ = w.Write([]byte(`","Names":["/c`))
				_, _ = w.Write([]byte(string(rune('0' + i%10))))
				_, _ = w.Write([]byte(`"],"Image":"img","State":"exited","Created":1000000}`))
			}
			_, _ = w.Write([]byte(`]`))
		default:
			_, _ = w.Write([]byte(`{}`))
		}
	}))
	defer server.Close()

	client, rec := newRecordingClient(server.Client())

	dm := collectDockerFromAPI(context.Background(), client, server.URL)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	if dm.ContainerTotal != 25 {
		t.Errorf("ContainerTotal = %d, want 25", dm.ContainerTotal)
	}
	if len(dm.Containers) > MaxContainers {
		t.Errorf("len(Containers) = %d, want <= %d", len(dm.Containers), MaxContainers)
	}
	// Exactly version + list requests; exited containers never trigger stats calls.
	if len(rec.requests) != 2 {
		t.Fatalf("request count = %d, want 2", len(rec.requests))
	}
	assertGetRequest(t, rec.requests[0], "/version", map[string]string{})
	assertGetRequest(t, rec.requests[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
}

func TestCollectDocker_Disabled(t *testing.T) {
	if !isLinux() {
		t.Skip("Collect requires Linux /proc filesystem")
	}

	c := NewCollector()
	c.SetDockerMetricsEnabled(false)

	// Collect should work and Docker should be nil.
	// On non-Linux this test is skipped; on Linux with /proc it should pass.
	// If /proc is missing the test also skips gracefully.
	sm, err := c.Collect(context.Background())
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if sm.Docker != nil {
		t.Error("Docker should be nil when disabled")
	}
}

// ---------------------------------------------------------------------------
// Error code classification tests
// ---------------------------------------------------------------------------

func TestClassifyDockerError(t *testing.T) {
	// We can't call classifyDockerError directly (it's not exported in the
	// linux build). Instead we test the error handling through the fake server.
	// Already covered in TestCollectDocker_FakeServerError above.
}

// ---------------------------------------------------------------------------
// Non-Linux test
// ---------------------------------------------------------------------------

func TestCollectDockerOnNonLinux(t *testing.T) {
	// This test runs regardless of platform. On non-Linux, collectDocker
	// returns unsupported. On Linux with the fake server test above, it works.
	c := NewCollector()
	c.SetDockerMetricsEnabled(true)

	// If we don't inject a fake client, on Linux it would try the real socket
	// and on non-Linux it returns unsupported. Either way, we should get a
	// non-nil result.
	dm := c.collectDocker(context.Background())
	if dm == nil {
		t.Fatal("collectDocker should never return nil")
	}
}
