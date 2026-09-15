package geo

import (
	"context"
	"encoding/json"

	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Location struct {
	City       string `json:"city,omitempty"`
	Country    string `json:"country,omitempty"`
	DetectedAt string `json:"detectedAt,omitempty"`
}
type state struct {
	Schema    int       `json:"schema"`
	Attempted bool      `json:"attempted"`
	Location  *Location `json:"location,omitempty"`
}
type response struct {
	Success bool   `json:"success"`
	City    string `json:"city"`
	Country string `json:"country"`
}

type Detector struct {
	path     string
	client   *http.Client
	mu       sync.Mutex
	started  bool
	location *Location
}

func New(path string) *Detector {
	return &Detector{path: path, client: &http.Client{Timeout: 3 * time.Second}}
}
func NewWithClient(path string, c *http.Client) *Detector { return &Detector{path: path, client: c} }
func (d *Detector) Location() *Location {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.location == nil {
		return nil
	}
	x := *d.location
	return &x
}
func (d *Detector) Start() *Location {
	d.mu.Lock()
	if d.location == nil {
		if s, err := readState(d.path); err == nil {
			d.location = s.Location
			if s.Attempted {
				d.started = true
			}
		}
	}
	if d.started {
		x := d.location
		d.mu.Unlock()
		return x
	}
	d.started = true
	d.mu.Unlock()
	go d.detect()
	return d.Location()
}
func (d *Detector) detect() {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://ipwho.is/?fields=success,city,country", nil)
	if err == nil {
		var resp *http.Response
		resp, err = d.client.Do(req)
		if err == nil {
			defer resp.Body.Close()
			var r response
			err = json.NewDecoder(io.LimitReader(resp.Body, 4096)).Decode(&r)
			if err == nil && resp.StatusCode >= 200 && resp.StatusCode < 300 && r.Success && r.City != "" && r.Country != "" {
				d.mu.Lock()
				d.location = &Location{City: r.City, Country: r.Country, DetectedAt: time.Now().UTC().Format(time.RFC3339)}
				d.mu.Unlock()
			}
		}
	}
	d.mu.Lock()
	loc := d.location
	d.mu.Unlock()
	_ = writeState(d.path, state{Schema: 1, Attempted: true, Location: loc})
	_ = err
}
func readState(path string) (state, error) {
	var s state
	b, e := os.ReadFile(path)
	if e != nil {
		return s, e
	}
	e = json.Unmarshal(b, &s)
	return s, e
}
func writeState(path string, s state) error {
	b, e := json.Marshal(s)
	if e != nil {
		return e
	}
	if e = os.MkdirAll(filepath.Dir(path), 0750); e != nil {
		return e
	}
	f, e := os.CreateTemp(filepath.Dir(path), ".state-")
	if e != nil {
		return e
	}
	name := f.Name()
	defer os.Remove(name)
	if _, e = f.Write(b); e == nil {
		e = f.Sync()
	}
	if ce := f.Close(); e == nil {
		e = ce
	}
	if e != nil {
		return e
	}
	if e = os.Chmod(name, 0600); e != nil {
		return e
	}
	return os.Rename(name, path)
}
