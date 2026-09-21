package metrics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

const phase3StatsBody = `{
	"cpu_stats": {"cpu_usage": {"total_usage": 200000}, "system_cpu_usage": 10000000, "online_cpus": 4},
	"precpu_stats": {"cpu_usage": {"total_usage": 100000}, "system_cpu_usage": 5000000},
	"memory_stats": {"usage": 100, "limit": 200},
	"networks": {"eth0": {"rx_bytes": 10, "tx_bytes": 20}},
	"blkio_stats": {"io_service_bytes_recursive": [{"op": "read", "value": 30}, {"op": "write", "value": 40}]},
	"pids_stats": {"current": 3}
}`

const phase3VersionBody = `{
	"Version": "25.0.3",
	"ApiVersion": "1.44",
	"Os": "linux",
	"Arch": "amd64",
	"KernelVersion": "6.8.0-test",
	"Experimental": false,
	"MinAPIVersion": "1.24",
	"GitCommit": "abcdef123456",
	"GoVersion": "go1.22.0",
	"Components": [{"Name": "Engine", "Version": "25.0.3"}]
}`

func phase3ContainersJSON(n int, state string) string {
	var sb strings.Builder
	sb.WriteString("[")
	for i := 0; i < n; i++ {
		if i > 0 {
			sb.WriteString(",")
		}
		fmt.Fprintf(&sb, `{"Id":"phase3id%04d","Names":["/phase3-%d"],"Image":"img:test","State":%q,"Status":"Up","Created":1767225600}`, i, i, state)
	}
	sb.WriteString("]")
	return sb.String()
}

func phase3Server(t *testing.T, versionBody, containersBody string, stats func(id string) (int, string)) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/version":
			if versionBody == "" {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			_, _ = w.Write([]byte(versionBody))
		case r.URL.Path == "/containers/json":
			_, _ = w.Write([]byte(containersBody))
		case strings.HasPrefix(r.URL.Path, "/containers/") && strings.HasSuffix(r.URL.Path, "/stats"):
			id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/containers/"), "/stats")
			status, body := stats(id)
			if status == 0 {
				status = http.StatusOK
			}
			if status != http.StatusOK {
				w.WriteHeader(status)
				return
			}
			_, _ = w.Write([]byte(body))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

func phase3Collect(t *testing.T, server *httptest.Server) (*DockerMetrics, []*http.Request) {
	t.Helper()
	client, rec := newRecordingClient(server.Client())
	dm := collectDockerFromAPI(context.Background(), client, server.URL)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	return dm, rec.snapshot()
}

func TestCollectDocker_VersionWhitelist(t *testing.T) {
	server := phase3Server(t, phase3VersionBody, phase3ContainersJSON(1, "exited"), func(string) (int, string) {
		return http.StatusOK, phase3StatsBody
	})
	defer server.Close()

	dm, reqs := phase3Collect(t, server)
	if !dm.Available {
		t.Fatalf("available=false, errorCode=%q", dm.ErrorCode)
	}
	if dm.EngineVersion != "25.0.3" {
		t.Errorf("EngineVersion=%q want %q", dm.EngineVersion, "25.0.3")
	}
	if dm.APIVersion != "1.44" {
		t.Errorf("APIVersion=%q want %q", dm.APIVersion, "1.44")
	}
	if dm.OS != "linux" {
		t.Errorf("OS=%q want %q", dm.OS, "linux")
	}
	if dm.Architecture != "amd64" {
		t.Errorf("Architecture=%q want %q", dm.Architecture, "amd64")
	}
	if len(reqs) != 2 {
		t.Fatalf("request count=%d want 2", len(reqs))
	}
	assertGetRequest(t, reqs[0], "/version", map[string]string{})
	assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})

	raw, err := json.Marshal(dm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	for _, want := range []string{`"engineVersion":"25.0.3"`, `"apiVersion":"1.44"`, `"architecture":"amd64"`} {
		if !strings.Contains(string(raw), want) {
			t.Errorf("serialized docker metrics missing %s: %s", want, raw)
		}
	}
	for _, banned := range []string{"KernelVersion", "Experimental", "MinAPIVersion", "GitCommit", "GoVersion", "Components"} {
		if strings.Contains(string(raw), banned) {
			t.Errorf("serialized docker metrics leaks /version field %q: %s", banned, raw)
		}
	}
}

func TestCollectDocker_VersionBestEffort(t *testing.T) {
	cases := map[string]string{
		"http500":       "",
		"malformedJSON": "not json",
		"emptyObject":   "{}",
	}
	for name, versionBody := range cases {
		t.Run(name, func(t *testing.T) {
			server := phase3Server(t, versionBody, phase3ContainersJSON(1, "exited"), func(string) (int, string) {
				return http.StatusOK, phase3StatsBody
			})
			defer server.Close()

			dm, reqs := phase3Collect(t, server)
			if !dm.Available {
				t.Fatalf("version failure must not fail collection: errorCode=%q", dm.ErrorCode)
			}
			if dm.ContainerTotal != 1 || len(dm.Containers) != 1 {
				t.Fatalf("ContainerTotal=%d containers=%d want 1", dm.ContainerTotal, len(dm.Containers))
			}
			if name != "emptyObject" && (dm.EngineVersion != "" || dm.APIVersion != "" || dm.OS != "" || dm.Architecture != "") {
				t.Errorf("failed version must leave whitelist empty: %+v", dm)
			}
			if len(reqs) != 2 {
				t.Fatalf("request count=%d want 2", len(reqs))
			}
			assertGetRequest(t, reqs[0], "/version", map[string]string{})
			assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
		})
	}
}

func TestCollectDocker_VersionTruncation(t *testing.T) {
	body := fmt.Sprintf(`{"Version":%q,"ApiVersion":%q,"Os":%q,"Arch":%q}`,
		strings.Repeat("v", MaxEngineVersionLen+20),
		strings.Repeat("a", MaxAPIVersionLen+20),
		strings.Repeat("o", MaxDockerOSLen+10),
		strings.Repeat("r", MaxDockerArchLen+10))
	server := phase3Server(t, body, phase3ContainersJSON(0, "exited"), func(string) (int, string) {
		return http.StatusOK, phase3StatsBody
	})
	defer server.Close()

	dm, _ := phase3Collect(t, server)
	if len(dm.EngineVersion) != MaxEngineVersionLen {
		t.Errorf("EngineVersion len=%d want %d", len(dm.EngineVersion), MaxEngineVersionLen)
	}
	if len(dm.APIVersion) != MaxAPIVersionLen {
		t.Errorf("APIVersion len=%d want %d", len(dm.APIVersion), MaxAPIVersionLen)
	}
	if len(dm.OS) != MaxDockerOSLen {
		t.Errorf("OS len=%d want %d", len(dm.OS), MaxDockerOSLen)
	}
	if len(dm.Architecture) != MaxDockerArchLen {
		t.Errorf("Architecture len=%d want %d", len(dm.Architecture), MaxDockerArchLen)
	}
}

func TestCollectDocker_PartialStatsFailure(t *testing.T) {
	containers := `[
		{"Id":"phase3fail0001","Names":["/fails"],"Image":"img:test","State":"running","Status":"Up","Created":1767225600},
		{"Id":"phase3ok000002","Names":["/works"],"Image":"img:test","State":"running","Status":"Up","Created":1767225600}
	]`
	server := phase3Server(t, phase3VersionBody, containers, func(id string) (int, string) {
		if id == "phase3fail0001" {
			return http.StatusInternalServerError, ""
		}
		return http.StatusOK, phase3StatsBody
	})
	defer server.Close()

	dm, reqs := phase3Collect(t, server)
	if !dm.Available {
		t.Fatalf("partial stats failure must stay available: errorCode=%q", dm.ErrorCode)
	}
	if dm.ContainerTotal != 2 || dm.ContainerRunning != 2 || len(dm.Containers) != 2 {
		t.Fatalf("totals=%d running=%d containers=%d want 2", dm.ContainerTotal, dm.ContainerRunning, len(dm.Containers))
	}
	if dm.Containers[0].CPUPercent != 0 || dm.Containers[0].MemoryUsageBytes != 0 {
		t.Errorf("failed container should have no stats: %+v", dm.Containers[0])
	}
	if dm.Containers[1].CPUPercent != 8 || dm.Containers[1].MemoryUsageBytes != 100 || dm.Containers[1].PIDs != 3 {
		t.Errorf("healthy container stats wrong: %+v", dm.Containers[1])
	}
	if dm.CPUPercent != 8 || dm.MemoryUsageBytes != 100 || dm.PIDs != 3 {
		t.Errorf("aggregates should reflect only healthy container: cpu=%v mem=%v pids=%d", dm.CPUPercent, dm.MemoryUsageBytes, dm.PIDs)
	}
	if len(reqs) != 4 {
		t.Fatalf("request count=%d want 4", len(reqs))
	}
	assertGetRequest(t, reqs[0], "/version", map[string]string{})
	assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
	assertGetRequest(t, reqs[2], "/containers/phase3fail0001/stats", map[string]string{"stream": "false"})
	assertGetRequest(t, reqs[3], "/containers/phase3ok000002/stats", map[string]string{"stream": "false"})
}

func TestCollectDocker_BadListResponse(t *testing.T) {
	t.Run("http500", func(t *testing.T) {
		server := phase3Server(t, phase3VersionBody, "", func(string) (int, string) {
			return http.StatusOK, phase3StatsBody
		})
		// Override list path with 500.
		closed := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/version" {
				_, _ = w.Write([]byte(phase3VersionBody))
				return
			}
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer closed.Close()
		_ = server
		dm, reqs := phase3Collect(t, closed)
		if dm.Available || dm.ErrorCode != DockerErrorBadResponse {
			t.Fatalf("available=%v errorCode=%q want bad_response", dm.Available, dm.ErrorCode)
		}
		if dm.Containers == nil || len(dm.Containers) != 0 {
			t.Fatalf("failed list must return empty containers, got %+v", dm.Containers)
		}
		if len(reqs) != 2 {
			t.Fatalf("request count=%d want 2", len(reqs))
		}
		assertGetRequest(t, reqs[0], "/version", map[string]string{})
		assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
	})

	t.Run("malformedJSON", func(t *testing.T) {
		server := phase3Server(t, phase3VersionBody, "not json", func(string) (int, string) {
			return http.StatusOK, phase3StatsBody
		})
		defer server.Close()
		dm, reqs := phase3Collect(t, server)
		if dm.Available || dm.ErrorCode != DockerErrorBadResponse {
			t.Fatalf("available=%v errorCode=%q want bad_response", dm.Available, dm.ErrorCode)
		}
		if len(reqs) != 2 {
			t.Fatalf("request count=%d want 2", len(reqs))
		}
	})
}

func TestClassifyDockerError_Table(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want string
	}{
		{"socketMissing", errors.New("dial unix /var/run/docker.sock: connect: no such file or directory"), DockerErrorSocketMissing},
		{"permissionDenied", errors.New("dial unix /var/run/docker.sock: connect: permission denied"), DockerErrorPermissionDenied},
		{"deadlineExceeded", context.DeadlineExceeded, DockerErrorTimeout},
		{"clientTimeout", errors.New(`Client.Timeout exceeded while awaiting headers`), DockerErrorTimeout},
		{"daemonUnreachable", errors.New("dial tcp 127.0.0.1:1: connect: connection refused"), DockerErrorDaemonUnreachable},
		{"badResponse", errors.New("list containers: HTTP 500"), DockerErrorBadResponse},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dm := classifyDockerError(tc.err)
			if dm == nil {
				t.Fatal("classifyDockerError returned nil")
			}
			if dm.Available {
				t.Error("failed collection must be unavailable")
			}
			if dm.ErrorCode != tc.want {
				t.Errorf("ErrorCode=%q want %q", dm.ErrorCode, tc.want)
			}
			if dm.Containers == nil {
				t.Error("Containers must never be nil")
			}
		})
	}
}

func TestCollectDocker_DeadlineLimited(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(2 * time.Second):
			_, _ = w.Write([]byte(`[]`))
		case <-r.Context().Done():
		}
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 150*time.Millisecond)
	defer cancel()
	client, rec := newRecordingClient(server.Client())
	start := time.Now()
	dm := collectDockerFromAPI(ctx, client, server.URL)
	elapsed := time.Since(start)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	if dm.Available || dm.ErrorCode != DockerErrorTimeout {
		t.Fatalf("available=%v errorCode=%q want timeout", dm.Available, dm.ErrorCode)
	}
	if elapsed >= 1500*time.Millisecond {
		t.Fatalf("collection was not deadline-limited: elapsed=%s", elapsed)
	}
	reqs := rec.snapshot()
	if len(reqs) != 2 {
		t.Fatalf("request count=%d want 2", len(reqs))
	}
	assertGetRequest(t, reqs[0], "/version", map[string]string{})
	assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
}

func TestCollectDocker_PrivacyFixturesOmitted(t *testing.T) {
	containers := `[{
		"Id":"phase3privacy01","Names":["/private"],"Image":"img:test","State":"running","Status":"Up","Created":1767225600,
		"Command":"/bin/secret --password=hunter2","Args":["--password=hunter2"],"Env":["SECRET=hunter2"],
		"Labels":{"secret":"hunter2"},"Mounts":[{"Source":"/secret","Destination":"/secret"}],"LogPath":"/secret/container.log"
	}]`
	server := phase3Server(t, phase3VersionBody, containers, func(string) (int, string) {
		return http.StatusOK, phase3StatsBody
	})
	defer server.Close()

	dm, _ := phase3Collect(t, server)
	if !dm.Available || len(dm.Containers) != 1 {
		t.Fatalf("available=%v containers=%d", dm.Available, len(dm.Containers))
	}
	raw, err := json.Marshal(dm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	assertJSONHasNoForbiddenKeys(t, raw, "Env", "Labels", "Mounts", "Command", "Args", "LogPath", "KernelVersion", "GitCommit", "Components")
	assertJSONOmitsValues(t, raw, "hunter2")
}

func TestCollectDocker_ContainerLimitRunning(t *testing.T) {
	const total = MaxContainers + 5
	server := phase3Server(t, phase3VersionBody, phase3ContainersJSON(total, "running"), func(string) (int, string) {
		return http.StatusOK, phase3StatsBody
	})
	defer server.Close()

	dm, reqs := phase3Collect(t, server)
	if dm.ContainerTotal != total {
		t.Errorf("ContainerTotal=%d want %d", dm.ContainerTotal, total)
	}
	if dm.ContainerRunning != total {
		t.Errorf("ContainerRunning=%d want %d", dm.ContainerRunning, total)
	}
	if len(dm.Containers) != MaxContainers {
		t.Fatalf("len(Containers)=%d want %d", len(dm.Containers), MaxContainers)
	}
	if want := 2 + MaxContainers; len(reqs) != want {
		t.Fatalf("request count=%d want %d", len(reqs), want)
	}
	assertGetRequest(t, reqs[0], "/version", map[string]string{})
	assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
	for _, req := range reqs[2:] {
		if req.Method != http.MethodGet {
			t.Fatalf("stats method=%q want GET", req.Method)
		}
		if !strings.HasPrefix(req.URL.EscapedPath(), "/containers/") || !strings.HasSuffix(req.URL.EscapedPath(), "/stats") {
			t.Fatalf("unexpected stats path %q", req.URL.EscapedPath())
		}
		if got := req.URL.Query().Get("stream"); got != "false" {
			t.Fatalf("stats stream=%q want false", got)
		}
		if len(req.URL.Query()) != 1 {
			t.Fatalf("stats query=%v want exactly stream=false", req.URL.Query())
		}
	}
}

func TestCollectDocker_StalledVersionLeavesRequiredCollectionHealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/version":
			select {
			case <-time.After(2 * time.Second):
				_, _ = w.Write([]byte(phase3VersionBody))
			case <-r.Context().Done():
			}
		case "/containers/json":
			_, _ = w.Write([]byte(phase3ContainersJSON(1, "running")))
		case "/containers/phase3id0000/stats":
			_, _ = w.Write([]byte(phase3StatsBody))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client, rec := newRecordingClient(server.Client())
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	start := time.Now()
	dm := collectDockerFromAPI(ctx, client, server.URL)
	elapsed := time.Since(start)
	if dm == nil {
		t.Fatal("collectDockerFromAPI returned nil")
	}
	if !dm.Available {
		t.Fatalf("stalled optional /version must not fail required collection: errorCode=%q", dm.ErrorCode)
	}
	if dm.ContainerTotal != 1 || len(dm.Containers) != 1 {
		t.Fatalf("ContainerTotal=%d containers=%d want 1", dm.ContainerTotal, len(dm.Containers))
	}
	if dm.EngineVersion != "" || dm.APIVersion != "" || dm.OS != "" || dm.Architecture != "" {
		t.Errorf("stalled version must leave whitelist empty: %+v", dm)
	}
	if elapsed >= 2*time.Second {
		t.Fatalf("optional /version consumed required budget: elapsed=%s", elapsed)
	}

	reqs := rec.snapshot()
	if len(reqs) != 3 {
		t.Fatalf("request count=%d want 3", len(reqs))
	}
	assertGetRequest(t, reqs[0], "/version", map[string]string{})
	assertGetRequest(t, reqs[1], "/containers/json", map[string]string{"all": "1", "size": "false"})
	assertGetRequest(t, reqs[2], "/containers/phase3id0000/stats", map[string]string{"stream": "false"})
}

func TestCollectDocker_TimingTable(t *testing.T) {
	for _, n := range []int{0, 1, MaxContainers, MaxContainers + 5} {
		t.Run(fmt.Sprintf("%dContainers", n), func(t *testing.T) {
			server := phase3Server(t, phase3VersionBody, phase3ContainersJSON(n, "running"), func(string) (int, string) {
				return http.StatusOK, phase3StatsBody
			})
			defer server.Close()

			start := time.Now()
			dm := collectDockerFromAPI(context.Background(), server.Client(), server.URL)
			elapsed := time.Since(start)
			t.Logf("containers=%d elapsed=%s (regression coverage only; not production performance)", n, elapsed)
			if dm == nil || !dm.Available {
				t.Fatalf("available=%v errorCode=%q", dm.Available, dm.ErrorCode)
			}
			if dm.ContainerTotal != n {
				t.Errorf("ContainerTotal=%d want %d", dm.ContainerTotal, n)
			}
			if elapsed >= 5*time.Second {
				t.Fatalf("collection exceeded 5s deadline: %s", elapsed)
			}
		})
	}
}

func BenchmarkCollectDockerFromAPI(b *testing.B) {
	for _, n := range []int{0, 1, MaxContainers, MaxContainers + 5} {
		b.Run(fmt.Sprintf("%dContainers", n), func(b *testing.B) {
			containers := phase3ContainersJSON(n, "running")
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch {
				case r.URL.Path == "/version":
					_, _ = w.Write([]byte(phase3VersionBody))
				case r.URL.Path == "/containers/json":
					_, _ = w.Write([]byte(containers))
				default:
					_, _ = w.Write([]byte(phase3StatsBody))
				}
			}))
			defer server.Close()
			client := server.Client()
			b.ReportAllocs()
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				if dm := collectDockerFromAPI(context.Background(), client, server.URL); dm == nil || !dm.Available {
					b.Fatalf("available=%v errorCode=%q", dm.Available, dm.ErrorCode)
				}
			}
		})
	}
}

type countingRoundTripper struct {
	calls atomic.Int32
}

func (c *countingRoundTripper) RoundTrip(*http.Request) (*http.Response, error) {
	c.calls.Add(1)
	return nil, errors.New("docker disabled: unexpected request")
}

func TestCollector_DockerDisabledByDefault(t *testing.T) {
	c := NewCollector()
	if c.isDockerEnabled() {
		t.Fatal("docker must be disabled by default")
	}
}

func TestCollector_DockerDisabledMakesZeroRequests(t *testing.T) {
	c := NewCollector()
	c.SetDockerMetricsEnabled(false)
	counting := &countingRoundTripper{}
	c.dockerHTTPClient = &http.Client{Transport: counting}
	c.dockerBaseURL = "http://example.invalid"
	_, _ = c.Collect(context.Background())
	if got := counting.calls.Load(); got != 0 {
		t.Fatalf("disabled collection made %d docker requests, want 0", got)
	}
	// Explicit guard: disabled must mean no docker attachment path is taken.
	if c.isDockerEnabled() {
		t.Fatal("docker must stay disabled")
	}
}

type errRoundTripper struct{ err error }

func (e *errRoundTripper) RoundTrip(*http.Request) (*http.Response, error) { return nil, e.err }

func TestCollectDocker_TransportErrorsPortable(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want string
	}{
		{"socketMissing", errors.New("dial unix /var/run/docker.sock: connect: no such file or directory"), DockerErrorSocketMissing},
		{"permissionDenied", errors.New("dial unix /var/run/docker.sock: connect: permission denied"), DockerErrorPermissionDenied},
		{"daemonUnreachable", errors.New("dial tcp 127.0.0.1:1: connect: connection refused"), DockerErrorDaemonUnreachable},
		{"timeout", context.DeadlineExceeded, DockerErrorTimeout},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			client := &http.Client{Transport: &errRoundTripper{err: tc.err}}
			dm := collectDockerFromAPI(context.Background(), client, "http://localhost")
			if dm == nil {
				t.Fatal("collectDockerFromAPI returned nil")
			}
			if dm.Available || dm.ErrorCode != tc.want {
				t.Fatalf("available=%v errorCode=%q want %q", dm.Available, dm.ErrorCode, tc.want)
			}
		})
	}
}

func TestCollector_DockerFailureLeavesHostMetricsUnaffected(t *testing.T) {
	if !isLinux() {
		t.Skip("host/docker integration needs Linux /proc")
	}
	c := NewCollector()
	c.dockerHTTPClient = &http.Client{Transport: &errRoundTripper{err: errors.New("connect: connection refused")}}
	c.dockerBaseURL = "http://localhost"
	c.SetDockerMetricsEnabled(true)
	sm, err := c.Collect(context.Background())
	if err != nil {
		t.Fatalf("docker failure must not fail host collection: %v", err)
	}
	if sm.Docker == nil {
		t.Fatal("docker result must be attached even on failure")
	}
	if sm.Docker.Available || sm.Docker.ErrorCode != DockerErrorDaemonUnreachable {
		t.Errorf("available=%v errorCode=%q want daemon_unreachable", sm.Docker.Available, sm.Docker.ErrorCode)
	}
}

func TestCollectDocker_SocketMissingDirect(t *testing.T) {
	client := &http.Client{Transport: &errRoundTripper{err: errors.New("dial unix /var/run/docker.sock: connect: no such file or directory")}}
	dm := collectDockerFromAPI(context.Background(), client, "http://localhost")
	if dm == nil || dm.Available || dm.ErrorCode != DockerErrorSocketMissing {
		t.Fatalf("available=%v errorCode=%q want socket_missing", dm.Available, dm.ErrorCode)
	}
}

func TestCollectDocker_PermissionDeniedDirect(t *testing.T) {
	client := &http.Client{Transport: &errRoundTripper{err: errors.New("dial unix /var/run/docker.sock: connect: permission denied")}}
	dm := collectDockerFromAPI(context.Background(), client, "http://localhost")
	if dm == nil || dm.Available || dm.ErrorCode != DockerErrorPermissionDenied {
		t.Fatalf("available=%v errorCode=%q want permission_denied", dm.Available, dm.ErrorCode)
	}
}

func TestCollector_DockerEnableDisableRace(t *testing.T) {
	c := NewCollector()
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				c.SetDockerMetricsEnabled((i+j)%2 == 0)
				_ = c.isDockerEnabled()
			}
		}(i)
	}
	wg.Wait()
	c.SetDockerMetricsEnabled(false)
	if c.isDockerEnabled() {
		t.Fatal("final docker state must be disabled")
	}
}

func TestCollectDockerFromAPI_ConcurrentRace(t *testing.T) {
	server := phase3Server(t, phase3VersionBody, phase3ContainersJSON(1, "exited"), func(string) (int, string) {
		return http.StatusOK, phase3StatsBody
	})
	defer server.Close()

	var wg sync.WaitGroup
	errs := make([]error, 4)
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 5; j++ {
				client, _ := newRecordingClient(server.Client())
				if dm := collectDockerFromAPI(context.Background(), client, server.URL); dm == nil || !dm.Available {
					errs[i] = errors.New("concurrent collection failed")
					return
				}
			}
		}(i)
	}
	wg.Wait()
	for _, err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
}
