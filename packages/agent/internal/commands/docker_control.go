package commands

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"unicode/utf8"
)

// Docker control allowlist: explicit POST builders only. No generic request
// helper may accept a path from API input. Paths are hardcoded; the only
// variable is the full 64-char lowercase hex daemon ID, validated fail-closed
// so truncated display IDs, names, keys, or crafted segments never reach the
// daemon. Mirrors metrics isDockerRawContainerID/dockerBase.

const (
	dockerControlStartSuffix   = "/start"
	dockerControlStopSuffix    = "/stop"
	dockerControlRestartSuffix = "/restart"
	dockerContainersPrefix     = "/containers/"
	dockerMaxRawIDLen          = 64

	// MaxDaemonBodyBytes bounds daemon POST response reads.
	MaxDaemonBodyBytes = 8 * 1024
)

// isRawContainerID reports whether id is a full 64-char lowercase hex ID.
func isRawContainerID(id string) bool {
	if len(id) != dockerMaxRawIDLen {
		return false
	}
	for i := 0; i < len(id); i++ {
		c := id[i]
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') {
			return false
		}
	}
	return true
}

func dockerControlBase(baseURL string) (string, error) {
	trimmed := strings.TrimRight(baseURL, "/")
	u, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("invalid docker base url")
	}
	if u.Scheme != "http" {
		return "", fmt.Errorf("invalid docker base url scheme")
	}
	if u.Host == "" || u.User != nil {
		return "", fmt.Errorf("invalid docker base url host")
	}
	if u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.Opaque != "" {
		return "", fmt.Errorf("invalid docker base url")
	}
	return "http://" + u.Host, nil
}

func dockerControlPOST(ctx context.Context, base, id, suffix string) (*http.Request, error) {
	if !isRawContainerID(id) {
		return nil, fmt.Errorf("invalid container id")
	}
	base, err := dockerControlBase(base)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+dockerContainersPrefix+id+suffix, nil)
	if err != nil {
		return nil, err
	}
	return req, nil
}

// dockerStartRequest is POST /containers/{fullID}/start.
func dockerStartRequest(ctx context.Context, baseURL, id string) (*http.Request, error) {
	return dockerControlPOST(ctx, baseURL, id, dockerControlStartSuffix)
}

// dockerStopRequest is POST /containers/{fullID}/stop.
func dockerStopRequest(ctx context.Context, baseURL, id string) (*http.Request, error) {
	return dockerControlPOST(ctx, baseURL, id, dockerControlStopSuffix)
}

// dockerRestartRequest is POST /containers/{fullID}/restart.
func dockerRestartRequest(ctx context.Context, baseURL, id string) (*http.Request, error) {
	return dockerControlPOST(ctx, baseURL, id, dockerControlRestartSuffix)
}

// buildControlRequest selects the allowlisted builder for action. Unknown
// actions fail closed with no request.
func buildControlRequest(ctx context.Context, baseURL, action, fullID string) (*http.Request, error) {
	switch action {
	case ActionStart:
		return dockerStartRequest(ctx, baseURL, fullID)
	case ActionStop:
		return dockerStopRequest(ctx, baseURL, fullID)
	case ActionRestart:
		return dockerRestartRequest(ctx, baseURL, fullID)
	default:
		return nil, fmt.Errorf("unsupported action")
	}
}

// DockerControl executes allowlisted POSTs against the daemon. Tests inject
// an httptest client + base URL; production uses the unix-socket client
// from docker_control_socket.go (linux) via DefaultDockerControl.
type DockerControl struct {
	client  *http.Client
	baseURL string
}

// NewDockerControl builds control with an explicit client/base (tests,
// custom socket paths). Base must be bare http://host.
func NewDockerControl(client *http.Client, baseURL string) (*DockerControl, error) {
	if client == nil {
		return nil, fmt.Errorf("nil docker client")
	}
	if _, err := dockerControlBase(baseURL); err != nil {
		return nil, err
	}
	return &DockerControl{client: client, baseURL: baseURL}, nil
}

// ActResult is the certain outcome of one daemon POST.
type ActResult struct {
	// Executed is true once the request reached the transport: the daemon
	// may have acted. Uncertain transport failures set Executed=true.
	Executed bool
	// Uncertain means the outcome is unknown (timeout/transport after send).
	Uncertain bool
	ErrorCode string
	Preview   string
}

// Act performs exactly one allowlisted POST. HTTP statuses are certain
// outcomes (including 404 container_not_found and 304 already-started idempotent
// success); transport/deadline errors are uncertain and must never re-execute.
func (d *DockerControl) Act(ctx context.Context, action, fullID string, tty bool) ActResult {
	req, err := buildControlRequest(ctx, d.baseURL, action, fullID)
	if err != nil {
		return ActResult{Executed: false, ErrorCode: ErrCodeUnsupportedAction}
	}
	resp, err := d.client.Do(req)
	if err != nil {
		// Request may have reached the daemon: uncertain, executed.
		code := ErrCodeDaemonUnreach
		if ctx.Err() == context.DeadlineExceeded {
			code = ErrCodeTimeout
		}
		return ActResult{Executed: true, Uncertain: true, ErrorCode: code}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, MaxDaemonBodyBytes+1))
	preview := decodeDockerOutput(body, tty)
	switch {
	case resp.StatusCode == 204 || resp.StatusCode == 304 || (resp.StatusCode >= 200 && resp.StatusCode < 300):
		return ActResult{Executed: true, Preview: preview}
	case resp.StatusCode == 404:
		return ActResult{Executed: true, ErrorCode: ErrCodeContainerNotFound, Preview: preview}
	case resp.StatusCode == 408 || resp.StatusCode == 504:
		return ActResult{Executed: true, Uncertain: true, ErrorCode: ErrCodeTimeout, Preview: preview}
	default:
		if ctx.Err() == context.DeadlineExceeded {
			return ActResult{Executed: true, Uncertain: true, ErrorCode: ErrCodeTimeout, Preview: preview}
		}
		return ActResult{Executed: true, ErrorCode: ErrCodeActionFailed, Preview: preview}
	}
}

// decodeDockerOutput bounds daemon output to MaxPreviewBytes with UTF-8
// safety. When tty is false the stream may carry Docker multiplex framing
// (8-byte header: [stream,0,0,0,size(4 BE)] per frame); payloads are
// extracted and headers dropped. When tty is true the stream is raw.
// Truncation cuts at a UTF-8 boundary; invalid bytes become U+FFFD.
// Never allocates beyond the cap plus one frame header.
func decodeDockerOutput(data []byte, tty bool) string {
	if len(data) == 0 {
		return ""
	}
	var payload []byte
	if tty {
		payload = data
	} else {
		payload = demuxDockerStream(data)
	}
	if len(payload) > MaxPreviewBytes {
		payload = payload[:MaxPreviewBytes]
	}
	// Cut trailing partial rune, then coerce any remaining invalid bytes.
	for len(payload) > 0 && !utf8.Valid(payload) {
		// Trim one byte off the end until valid or empty; bounded by rune
		// length (<=4 iterations of consequence, loop capped by MaxPreview).
		// Faster path below replaces interior invalids; this handles the
		// truncation edge only.
		last := len(payload) - 1
		// If last byte is a continuation, drop it.
		if payload[last]>>6 == 0x2 {
			payload = payload[:last]
			continue
		}
		break
	}
	if utf8.Valid(payload) {
		// Trimming may have sufficed; still need interior safety.
		if bytes.IndexByte(payload, 0xFF) == -1 && validStringFast(payload) {
			return string(payload)
		}
	}
	return strings.ToValidUTF8(string(payload), "\uFFFD")
}

func validStringFast(p []byte) bool {
	// ASCII fast path: all bytes < 0x80 are valid.
	for i := 0; i < len(p); i++ {
		if p[i] >= 0x80 {
			return utf8.Valid(p)
		}
	}
	return true
}

// demuxDockerStream extracts payloads from Docker multiplexed frames.
// Malformed/truncated headers stop extraction (fail closed, keep parsed).
func demuxDockerStream(data []byte) []byte {
	// Fast path: does not look like multiplexed framing — treat as raw but
	// still bounded by the caller. Heuristic: need at least one full header
	// with sane stream type and length. Otherwise return as-is.
	if len(data) < 8 {
		return append([]byte(nil), data...)
	}
	out := make([]byte, 0, minLen(len(data), MaxPreviewBytes))
	i := 0
	framed := false
	for i+8 <= len(data) {
		stream := data[i]
		if stream > 2 {
			break
		}
		if data[i+1] != 0 || data[i+2] != 0 || data[i+3] != 0 {
			break
		}
		n := int(data[i+4])<<24 | int(data[i+5])<<16 | int(data[i+6])<<8 | int(data[i+7])
		if n < 0 || n > MaxPreviewBytes+1 {
			break
		}
		i += 8
		if n == 0 {
			framed = true
			continue
		}
		if i+n > len(data) {
			// Truncated frame: keep parsed so far, drop the tail.
			framed = true
			break
		}
		if len(out)+n > MaxPreviewBytes {
			need := MaxPreviewBytes - len(out)
			out = append(out, data[i:i+need]...)
			framed = true
			break
		}
		out = append(out, data[i:i+n]...)
		i += n
		framed = true
	}
	if !framed {
		// No valid frame seen: raw passthrough (bounded by caller).
		return append([]byte(nil), data...)
	}
	return out
}

func minLen(a, b int) int {
	if a < b {
		return a
	}
	return b
}
