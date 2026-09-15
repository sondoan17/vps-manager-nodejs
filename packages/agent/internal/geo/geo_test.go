package geo

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func testClient(count *int32, body string, status int, err error) *http.Client {
	return &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		atomic.AddInt32(count, 1)
		if err != nil {
			return nil, err
		}
		return &http.Response{StatusCode: status, Body: ioNopCloser{strings.NewReader(body)}, Header: make(http.Header), Request: r}, nil
	})}
}

type ioNopCloser struct{ *strings.Reader }

func (ioNopCloser) Close() error { return nil }

func waitDetect(t *testing.T, d *Detector) *Location {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if s, err := readState(d.path); err == nil && s.Attempted {
			return d.Location()
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("detection did not persist")
	return nil
}

func TestDetectorOneLookupAndPersistedSuccess(t *testing.T) {
	path := filepath.Join(t.TempDir(), "geo.json")
	var calls int32
	d := NewWithClient(path, testClient(&calls, `{"success":true,"city":"Paris","country":"FR","ignored":"secret"}`, 200, nil))
	d.Start()
	loc := waitDetect(t, d)
	if atomic.LoadInt32(&calls) != 1 || loc == nil || loc.City != "Paris" || loc.Country != "FR" {
		t.Fatalf("calls=%d location=%+v", calls, loc)
	}
	var persisted map[string]any
	b, _ := os.ReadFile(path)
	if err := json.Unmarshal(b, &persisted); err != nil {
		t.Fatal(err)
	}
	if len(persisted) != 4 {
		t.Fatalf("state fields=%v", persisted)
	}
	if _, ok := persisted["location"]; !ok {
		t.Fatal("missing location")
	}
	d2 := NewWithClient(path, testClient(&calls, `{"success":true}`, 200, nil))
	if got := d2.Start(); got == nil || got.City != "Paris" {
		t.Fatalf("reload location=%+v", got)
	}
	time.Sleep(20 * time.Millisecond)
	if atomic.LoadInt32(&calls) != 1 {
		t.Fatalf("reload performed lookup: %d", calls)
	}
}

func TestDetectorPersistedFailureIsTerminalAcrossReload(t *testing.T) {
	cases := []struct {
		name, body string
		status     int
		err        error
	}{
		{"timeout", "", 0, errors.New("timeout")}, {"network", "", 0, errors.New("network")},
		{"non2xx", `{"success":true}`, 500, nil}, {"malformed", `{`, 200, nil}, {"application", `{"success":false,"city":"raw","country":"raw"}`, 200, nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "state.json")
			var calls int32
			d := NewWithClient(path, testClient(&calls, tc.body, tc.status, tc.err))
			d.Start()
			if got := waitDetect(t, d); got != nil {
				t.Fatalf("failure exposed location: %+v", got)
			}
			d2 := NewWithClient(path, testClient(&calls, tc.body, tc.status, tc.err))
			if got := d2.Start(); got != nil {
				t.Fatalf("reload exposed location: %+v", got)
			}
			time.Sleep(20 * time.Millisecond)
			if calls != 1 {
				t.Fatalf("calls=%d", calls)
			}
		})
	}
}

func TestWriteStateAtomic(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "state.json")
	if err := writeState(path, state{Schema: 1, Attempted: true}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(filepath.Dir(path))
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != "state.json" {
		t.Fatalf("temporary file left behind: %v", entries)
	}
}
