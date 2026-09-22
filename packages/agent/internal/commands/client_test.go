package commands

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testClient(srv *httptest.Server) *Client {
	return NewClientWithHTTP(srv.URL, "test-token", srv.Client())
}

func writeClaim(t *testing.T, w http.ResponseWriter, cmd *Command) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	var raw json.RawMessage
	if cmd != nil {
		b, err := json.Marshal(cmd)
		if err != nil {
			t.Fatal(err)
		}
		raw = b
	} else {
		raw = json.RawMessage(`null`)
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"command": raw}})
}

func TestClaim_SendsAuthAndParsesCommand(t *testing.T) {
	want := &Command{
		CommandID: "cmd_abc123", AgentInstanceID: "testinstance000000000000000001",
		Action: ActionStart, ContainerKey: "containerkey000000000000000001",
		DeadlineNano: futureNano(time.Hour), TimeoutSeconds: 10,
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != commandClaimPath {
			t.Errorf("path = %q, want %q", r.URL.Path, commandClaimPath)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Errorf("Authorization = %q, want Bearer test-token", got)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", ct)
		}
		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode claim body: %v", err)
		}
		if body["agentInstanceId"] != want.AgentInstanceID {
			t.Errorf("agentInstanceId = %q", body["agentInstanceId"])
		}
		writeClaim(t, w, want)
	}))
	defer srv.Close()

	got, err := testClient(srv).Claim(context.Background(), want.AgentInstanceID)
	if err != nil {
		t.Fatalf("Claim: %v", err)
	}
	if got == nil || got.CommandID != want.CommandID || got.Action != want.Action {
		t.Fatalf("Claim = %+v, want %+v", got, want)
	}
}

func TestClaim_NullMeansNoneQueued(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeClaim(t, w, nil)
	}))
	defer srv.Close()
	got, err := testClient(srv).Claim(context.Background(), "testinstance000000000000000001")
	if err != nil {
		t.Fatalf("Claim: %v", err)
	}
	if got != nil {
		t.Fatalf("Claim = %+v, want nil", got)
	}
}

func TestClaim_Empty204MeansNoneQueued(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()
	got, err := testClient(srv).Claim(context.Background(), "testinstance000000000000000001")
	if err != nil {
		t.Fatalf("Claim: %v", err)
	}
	if got != nil {
		t.Fatalf("Claim = %+v, want nil", got)
	}
}

func TestClaim_InvalidShapeFailsClosed(t *testing.T) {
	bad := &Command{CommandID: "cmd/bad!!", AgentInstanceID: "testinstance000000000000000001", Action: "pause"}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeClaim(t, w, bad)
	}))
	defer srv.Close()
	if _, err := testClient(srv).Claim(context.Background(), bad.AgentInstanceID); err == nil {
		t.Fatal("Claim(invalid shape) = nil, want error")
	}
}

func TestClaim_InstanceMismatchFailsClosed(t *testing.T) {
	other := &Command{
		CommandID: "cmd_1", AgentInstanceID: "otherinstance000000000000000002",
		Action: ActionStart, ContainerKey: "containerkey000000000000000001",
		DeadlineNano: futureNano(time.Hour), TimeoutSeconds: 10,
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeClaim(t, w, other)
	}))
	defer srv.Close()
	if _, err := testClient(srv).Claim(context.Background(), "testinstance000000000000000001"); err == nil {
		t.Fatal("Claim(instance mismatch) = nil, want error")
	}
}

func TestClaim_StatusMapping(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		check   func(error) bool
		wantErr string
	}{
		{"auth 401", 401, IsFatal, "fatal"},
		{"auth 403", 403, IsFatal, "fatal"},
		{"conflict 409", 409, IsConflict, "conflict"},
		{"fatal 400", 400, IsFatal, "fatal"},
		{"retryable 500", 500, isRetryable, "retryable"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(`{"error":"x vma_secret-token here"}`))
			}))
			defer srv.Close()
			_, err := testClient(srv).Claim(context.Background(), "testinstance000000000000000001")
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tc.check(err) {
				t.Errorf("error type wrong: %T: %v", err, err)
			}
			if strings.Contains(err.Error(), "vma_") {
				t.Errorf("error leaks token-like text: %v", err)
			}
		})
	}
}

func TestClaim_TrailingJSONFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"command":null}}{"evil":true}`))
	}))
	defer srv.Close()
	if _, err := testClient(srv).Claim(context.Background(), "testinstance000000000000000001"); err == nil {
		t.Fatal("Claim(trailing JSON) = nil, want error")
	}
}

func TestReport_EchoMismatchPreserves(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"ok":true,"commandId":"other","agentInstanceId":"testinstance000000000000000001"}}`))
	}))
	defer srv.Close()
	res := &Result{CommandID: "cmd_1", AgentInstanceID: "testinstance000000000000000001", Status: StatusSucceeded, Executed: true}
	if err := testClient(srv).Report(context.Background(), res); err == nil {
		t.Fatal("Report(echo mismatch) = nil, want error")
	}
}

func TestReport_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var res Result
		if err := json.NewDecoder(r.Body).Decode(&res); err != nil {
			t.Errorf("decode result: %v", err)
		}
		if res.CommandID != "cmd_1" || res.Status != StatusSucceeded || !res.Executed {
			t.Errorf("result = %+v", res)
		}
		_, _ = w.Write([]byte(`{"data":{"ok":true,"commandId":"cmd_1","agentInstanceId":"testinstance000000000000000001"}}`))
	}))
	defer srv.Close()
	res := &Result{CommandID: "cmd_1", AgentInstanceID: "testinstance000000000000000001", Status: StatusSucceeded, Executed: true}
	if err := testClient(srv).Report(context.Background(), res); err != nil {
		t.Fatalf("Report: %v", err)
	}
}
