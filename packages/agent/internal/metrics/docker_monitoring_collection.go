package metrics

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Docker monitoring Phase 1 increment I2 — bounded collection helpers.
//
// Scope: packages/agent/internal/metrics/** only. No state/push/run/main/API
// edits. Helpers are callable and tested; top-level wiring stays minimal/dark.
// One global 5s context (DefaultDockerTimeoutSeconds) and v1 behavior preserved.

const (
	dockerDecodeMaxEvents = 10000
	dockerDecodeMaxBytes  = 2 * 1024 * 1024

	dockerBoundaryMaxEvents = 1000
	dockerBoundaryMaxBytes  = 512 * 1024

	// DockerStorageCadence is the slower /system/df cadence from the plan.
	DockerStorageCadence = 5 * time.Minute
)

// DockerSelection is the minimal transient input for deterministic selection.
type DockerSelection struct {
	ContainerKey string
	Running      bool
	Unhealthy    bool
	StateChanged bool
}

// selectDockerContainers is deterministic by containerKey: unhealthy or
// state-changed first, then running, then remainder rotated by key.
// Input is never mutated. Limit is capped at MaxContainers.
func selectDockerContainers(in []DockerSelection, limit int, rotation uint64) []DockerSelection {
	if limit <= 0 {
		return nil
	}
	if limit > MaxContainers {
		limit = MaxContainers
	}
	v := append([]DockerSelection(nil), in...)
	sort.SliceStable(v, func(i, j int) bool {
		ri := selectionRank(v[i])
		rj := selectionRank(v[j])
		if ri != rj {
			return ri < rj
		}
		return v[i].ContainerKey < v[j].ContainerKey
	})
	if len(v) <= limit {
		return v
	}
	cut := 0
	for cut < len(v) && selectionRank(v[cut]) < 2 {
		cut++
	}
	if cut >= limit {
		return v[:limit]
	}
	out := append([]DockerSelection(nil), v[:cut]...)
	tail := v[cut:]
	start := int(rotation % uint64(len(tail)))
	for len(out) < limit && len(out)-cut < len(tail) {
		out = append(out, tail[(start+len(out)-cut)%len(tail)])
	}
	return out
}

func selectionRank(x DockerSelection) int {
	if x.Unhealthy || x.StateChanged {
		return 0
	}
	if x.Running {
		return 1
	}
	return 2
}

// dockerCohortDigest is SHA-256 over sorted sampled keys, hex encoded.
func dockerCohortDigest(keys []string) string {
	cp := append([]string(nil), keys...)
	sort.Strings(cp)
	h := sha256.Sum256([]byte(strings.Join(cp, "\x00")))
	return hex.EncodeToString(h[:])
}

// dockerCoverage builds explicit coverage metadata.
func dockerCoverage(sampled int, total int, keys []string) DockerCoverageV2 {
	complete := sampled == total
	c := DockerCoverageV2{
		DetailsSampled:       sampled,
		DetailsTotalEligible: total,
		Complete:             complete,
	}
	if sampled > 0 && sampled == total {
		c.CohortDigest = dockerCohortDigest(keys)
	} else if sampled > 0 {
		c.CohortDigest = dockerCohortDigest(keys)
	}
	return c
}

// dockerSampledAggregate sums only successfully sampled containers.
// Host totals remain authoritative elsewhere; this aggregate never claims them.
func dockerSampledAggregate(containers []DockerContainerV2, total int) DockerSampledContainerAggregateV2 {
	keys := make([]string, 0, len(containers))
	agg := DockerSampledContainerAggregateV2{}
	for _, c := range containers {
		keys = append(keys, c.ContainerKey)
		agg.CPUPercent += c.CPUPercent
		agg.MemoryUsageBytes += c.MemoryUsageBytes
		agg.NetworkRxBytes += c.NetworkRxBytes
		agg.NetworkTxBytes += c.NetworkTxBytes
		agg.BlockReadBytes += c.BlockReadBytes
		agg.BlockWriteBytes += c.BlockWriteBytes
		agg.PIDs += c.PIDs
	}
	agg.CPUPercent = cappedDockerPercent(agg.CPUPercent)
	agg.MemoryUsageBytes = cappedDockerFloat(agg.MemoryUsageBytes)
	agg.NetworkRxBytes = cappedDockerFloat(agg.NetworkRxBytes)
	agg.NetworkTxBytes = cappedDockerFloat(agg.NetworkTxBytes)
	agg.BlockReadBytes = cappedDockerFloat(agg.BlockReadBytes)
	agg.BlockWriteBytes = cappedDockerFloat(agg.BlockWriteBytes)
	agg.Coverage = dockerCoverage(len(containers), total, keys)
	return agg
}

// dockerRemainingBudget reports whether a bounded sub-operation may start
// without consuming the required collection budget.
func dockerRemainingBudget(start time.Time, budget, reserve time.Duration) bool {
	return time.Since(start)+reserve < budget
}

// dockerStorageDue reports the 5-minute storage cadence (or first cycle).
func dockerStorageDue(last, now time.Time) bool {
	if last.IsZero() {
		return true
	}
	return !now.Before(last.Add(DockerStorageCadence))
}

// ---------------------------------------------------------------------------
// /events fixed-window streaming decoder.
// ---------------------------------------------------------------------------

// DockerRawEvent is the allowlisted subset of a daemon event object.
// Only Type/Action/Actor/Time fields are read; Attributes are allowlisted
// downstream and never persisted wholesale.
type DockerRawEvent struct {
	Type   string `json:"Type"`
	Action string `json:"Action"`
	Actor  struct {
		ID         string            `json:"ID"`
		Attributes map[string]string `json:"Attributes"`
	} `json:"Actor"`
	Time     *int64 `json:"time"`
	TimeNano *int64 `json:"timeNano"`
}

type countingReader struct {
	r io.Reader
	n int64
}

func (c *countingReader) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.n += int64(n)
	return n, err
}

// dockerEventDigest is the safe identity over
// (agentInstanceId, eventTimeNano, action, containerKey, contextVersion, context).
func dockerEventDigest(instance, nano, action, key string, ctx DockerEventContextV2) string {
	b, _ := json.Marshal(ctx)
	parts := strings.Join([]string{instance, nano, action, key, strconv.Itoa(ctx.Version), string(b)}, "\x00")
	h := sha256.Sum256([]byte(parts))
	return hex.EncodeToString(h[:])
}

// dockerSafeContext builds the minimal typed safe context for a daemon event.
// Only allowlisted scalar fields are admitted; Attributes are never copied.
func dockerSafeContext(raw DockerRawEvent) DockerEventContextV2 {
	ctx := DockerEventContextV2{Version: DockerEventContextVersionV1}
	if raw.Action == DockerActionHealthStatus {
		if v, ok := raw.Actor.Attributes["health_status"]; ok {
			switch v {
			case DockerHealthHealthy, DockerHealthUnhealthy, DockerHealthStarting, DockerHealthNone:
				ctx.HealthStatus = v
			}
		}
	}
	if raw.Action == DockerActionDie {
		if v, ok := raw.Actor.Attributes["exitCode"]; ok {
			if n, err := strconv.Atoi(v); err == nil && n >= 0 && n <= 255 {
				cp := n
				ctx.ExitCode = &cp
			}
		}
		if v, ok := raw.Actor.Attributes["signal"]; ok {
			if n, err := strconv.Atoi(v); err == nil && n >= 0 && n <= 255 {
				cp := n
				ctx.Signal = &cp
			}
		}
	}
	return ctx
}

func dockerNormalizeNano(e DockerRawEvent) (string, bool, bool) {
	if e.TimeNano != nil && *e.TimeNano != 0 {
		if *e.TimeNano < 0 {
			return "", false, false
		}
		nano := strconv.FormatInt(*e.TimeNano, 10)
		if !isCanonicalNanoDecimal(nano) {
			return "", false, false
		}
		return nano, false, true
	}
	if e.Time == nil || *e.Time < 0 {
		return "", false, false
	}
	nano := strconv.FormatInt(*e.Time, 10) + "000000000"
	if !isCanonicalNanoDecimal(nano) {
		return "", false, false
	}
	return nano, true, true
}

func dockerEventOccurredAt(nano string) string {
	for _, r := range nano {
		if r < '0' || r > '9' {
			return time.Now().UTC().Format(time.RFC3339Nano)
		}
	}
	sec, frac := nano[:max(len(nano)-9, 0)], nano[max(len(nano)-9, 0):]
	if sec == "" {
		sec = "0"
	}
	for len(frac) < 9 {
		frac += "0"
	}
	s, serr := strconv.ParseInt(sec, 10, 64)
	f, ferr := strconv.ParseInt(frac, 10, 64)
	if serr != nil || ferr != nil || s < 0 || f < 0 {
		return time.Now().UTC().Format(time.RFC3339Nano)
	}
	return time.Unix(s, f).UTC().Format(time.RFC3339Nano)
}

type dockerSafeEvent struct {
	nano string
	key  string
	ev   DockerEventV2
	size int
}

// errDockerEventObjectOversize signals a single event object that exceeds
// the decode byte budget. Callers map it to oversize (lossy gap), never to a
// hard error, so a hostile object cannot grow framing memory.
var errDockerEventObjectOversize = errors.New("docker monitoring: event object oversize")

// dockerMaxObjectDepth bounds JSON nesting inside one event object.
// Daemon events are flat; deeper nesting is hostile or corrupt.
const dockerMaxObjectDepth = 64

// dockerRawEventAttrCap bounds the daemon Attributes map decoded from one
// event object before any accumulation. Only allowlisted scalar entries are
// ever copied downstream; the raw map itself is never persisted.
const dockerRawEventAttrCap = 256

// dockerRawEventAttrBytesCap bounds the total key+value bytes of one
// event's Attributes map before accumulation.
const dockerRawEventAttrBytesCap = 8 * 1024

// dockerRawFieldCap bounds Type/Action/Actor.ID rune lengths decoded from
// one event object before key derivation or accumulation.
const dockerRawFieldCap = 256

// dockerRawEventBounded reports whether a decoded raw event is within the
// pre-accumulation object bounds (attributes count/bytes and short fields).
func dockerRawEventBounded(e DockerRawEvent) bool {
	if len(e.Type) > dockerRawFieldCap || len(e.Action) > dockerRawFieldCap || len(e.Actor.ID) > dockerRawFieldCap {
		return false
	}
	if len(e.Actor.Attributes) > dockerRawEventAttrCap {
		return false
	}
	var total int
	for k, v := range e.Actor.Attributes {
		total += len(k) + len(v)
		if total > dockerRawEventAttrBytesCap {
			return false
		}
	}
	return true
}

// decodeDockerEventStream decodes a finite /events response with
// io.LimitReader(max+1) sentinel semantics. It returns raw events and
// oversize=true when the source exceeds max events or max bytes.
// No open stream is ever used; callers pass the fixed-window response body.
// nextDockerJSONValue frames one complete top-level JSON object without decoder read-ahead.
func nextDockerJSONValue(br *bufio.Reader, maxObjectBytes int64) ([]byte, error) {
	if maxObjectBytes <= 0 {
		maxObjectBytes = dockerDecodeMaxBytes + 1
	}
	var read int64
	for {
		c, err := br.ReadByte()
		if err != nil {
			if err == io.EOF {
				return nil, io.EOF
			}
			return nil, err
		}
		read++
		if read > maxObjectBytes {
			return nil, errDockerEventObjectOversize
		}
		if c == ' ' || c == '\t' || c == '\r' || c == '\n' {
			continue
		}
		if c != '{' {
			return nil, fmt.Errorf("docker monitoring: event stream must contain objects")
		}
		b := []byte{c}
		depth := 1
		inString, escaped := false, false
		for {
			c, err := br.ReadByte()
			if err != nil {
				if err == io.EOF {
					return nil, io.ErrUnexpectedEOF
				}
				return nil, err
			}
			read++
			if read > maxObjectBytes {
				return nil, errDockerEventObjectOversize
			}
			b = append(b, c)
			if int64(len(b)) > maxObjectBytes {
				return nil, errDockerEventObjectOversize
			}
			if inString {
				if escaped {
					escaped = false
				} else if c == '\\' {
					escaped = true
				} else if c == '"' {
					inString = false
				}
				continue
			}
			if c == '"' {
				inString = true
				continue
			}
			if c == '{' {
				depth++
				if depth > dockerMaxObjectDepth {
					return nil, fmt.Errorf("docker monitoring: event object too deep")
				}
			}
			if c == '}' {
				depth--
				if depth == 0 {
					return b, nil
				}
			}
		}
	}
}

func decodeDockerEventStream(r io.Reader, maxEvents int, maxBytes int64) ([]DockerRawEvent, bool, error) {
	br := bufio.NewReader(r)
	var consumed int64
	if maxEvents <= 0 {
		maxEvents = dockerDecodeMaxEvents
	}
	if maxBytes <= 0 {
		maxBytes = dockerDecodeMaxBytes
	}
	perObject := maxBytes + 1
	out := make([]DockerRawEvent, 0, 64)
	for {
		raw, err := nextDockerJSONValue(br, perObject)
		consumed += int64(len(raw))
		if err == io.EOF {
			return out, false, nil
		}
		if errors.Is(err, errDockerEventObjectOversize) || consumed > maxBytes {
			return out, true, nil
		}
		if err != nil {
			return out, false, err
		}
		if consumed > maxBytes {
			return out, true, nil
		}
		var e DockerRawEvent
		if err := json.Unmarshal(raw, &e); err != nil {
			return out, false, err
		}
		if !dockerRawEventBounded(e) {
			return out, false, fmt.Errorf("docker monitoring: event object unbounded")
		}
		out = append(out, e)
		if len(out) == maxEvents {
			raw, err = nextDockerJSONValue(br, perObject)
			consumed += int64(len(raw))
			if err == nil || consumed > maxBytes {
				return out, true, nil
			}
			if errors.Is(err, errDockerEventObjectOversize) {
				return out, true, nil
			}
			if err != io.EOF {
				return out, false, err
			}
			return out, false, nil
		}
	}
}

func isDockerWantedAction(a string) bool {
	for _, w := range dockerEventActionAllowlist {
		if a == w {
			return true
		}
	}
	return false
}

// collectDockerEventWindow applies transmit caps, timestamp-boundary overrun,
// digest dedupe, gap synthesis, and proposed-watermark semantics.
//
// sinceNano/untilNano are canonical decimal strings with since < until.
// fromDigests is the durable boundary set at since (inclusive replay).
// keyForID maps a full daemon actor ID to an opaque containerKey.
// Transmit caps: 100 events / 64KiB encoded. Decode caps: 10k / 2MiB.
// Boundary overrun: 1000 events / 512KiB, limit+1 sentinel.
func collectDockerEventWindow(ctx context.Context, r io.Reader, sinceNano, untilNano, agentInstanceID string, fromDigests []string, keyForID func(string) string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	if !isCanonicalNanoDecimal(sinceNano) || !isCanonicalNanoDecimal(untilNano) || cmpCanonicalNano(sinceNano, untilNano) >= 0 {
		return nil, nil, nil, fmt.Errorf("invalid event window")
	}
	if err := validateDockerAgentInstanceID(agentInstanceID); err != nil {
		return nil, nil, nil, err
	}
	if keyForID == nil {
		return nil, nil, nil, fmt.Errorf("missing key function")
	}
	br := bufio.NewReader(r)
	var sourceBytes int64
	dup := map[string]bool{}
	for _, d := range fromDigests {
		dup[d] = true
	}
	out := make([]dockerSafeEvent, 0, MaxDockerEvents)
	boundary := false
	var bt string
	var sourceN int
	var boundaryDecoded int
	var boundaryStart int64
	boundaryOverrun := false
	var acc int
	gap := func(reason string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
		tr, a := truncateDockerTransmit(out, true)
		g := dockerGapEvent(sinceNano, untilNano, len(out)-len(tr), agentInstanceID, untilNano)
		g.Context.Reason = reason
		tr = appendDockerGapFitting(tr, a, g)
		return tr, &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true, Lossy: true, GapReason: reason}, &DockerEventWatermarkV2{TimeNano: untilNano}, nil
	}
	for {
		select {
		case <-ctx.Done():
			return gap(DockerGapCollectionDeadline)
		default:
		}
		before := sourceBytes
		raw, err := nextDockerJSONValue(br, dockerDecodeMaxBytes+1)
		sourceBytes += int64(len(raw))
		if errors.Is(err, errDockerEventObjectOversize) {
			return gap(DockerGapResponseOversize)
		}
		var e DockerRawEvent
		if err == nil {
			err = json.Unmarshal(raw, &e)
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			if ctx.Err() != nil {
				return gap(DockerGapCollectionDeadline)
			}
			if sourceBytes > dockerDecodeMaxBytes {
				return gap(DockerGapResponseOversize)
			}
			return nil, nil, nil, err
		}
		sourceN++
		after := sourceBytes
		if boundary {
			boundaryDecoded++
		}
		if sourceN > dockerDecodeMaxEvents || after > dockerDecodeMaxBytes {
			return gap(DockerGapResponseOversize)
		}
		// Bounded object decoding before any timestamp, key, digest, or
		// accumulation work: oversized fields/attributes are skipped without
		// deriving keys or appending to the batch.
		if !dockerRawEventBounded(e) {
			if boundary && after-boundaryStart > dockerBoundaryMaxBytes {
				return gap(DockerGapBoundaryOverrun)
			}
			continue
		}
		nano, reduced, ok := dockerNormalizeNano(e)
		if ok && boundary && nano != bt {
			if boundaryOverrun {
				return gap(DockerGapBoundaryOverrun)
			}
			dig := boundaryDigestsFor(out, bt, agentInstanceID)
			return appendEventsBoundary(out, sinceNano, untilNano, bt, dig, agentInstanceID)
		}
		if !ok || e.Type != dockerEventsType || !isDockerWantedAction(e.Action) {
			if boundary && after-boundaryStart > dockerBoundaryMaxBytes {
				return gap(DockerGapBoundaryOverrun)
			}
			continue
		}
		if cmpCanonicalNano(nano, sinceNano) < 0 || cmpCanonicalNano(nano, untilNano) > 0 {
			continue
		}
		if boundary && nano != bt {
			if sourceBytes > dockerDecodeMaxBytes {
				return gap(DockerGapResponseOversize)
			}
			if boundaryOverrun {
				return gap(DockerGapBoundaryOverrun)
			}
			dig := boundaryDigestsFor(out, bt, agentInstanceID)
			return appendEventsBoundary(out, sinceNano, untilNano, bt, dig, agentInstanceID)
		}
		if boundary && (boundaryDecoded > dockerBoundaryMaxEvents || after-boundaryStart > dockerBoundaryMaxBytes) {
			boundaryOverrun = true
		}
		key := keyForID(e.Actor.ID)
		if validateDockerContainerKey(key) != nil {
			continue
		}
		sc := dockerSafeContext(e)
		if reduced {
			sc.ReducedPrecision = true
		}
		d := dockerEventDigest(agentInstanceID, nano, e.Action, key, sc)
		if nano == sinceNano && dup[d] {
			continue
		}
		ev := DockerEventV2{EventID: d[:32], EventOccurredAt: dockerEventOccurredAt(nano), ContainerKey: key, Action: e.Action, Context: sc}
		if validateDockerEvent(ev) != nil {
			continue
		}
		b, _ := json.Marshal(ev)
		s := dockerSafeEvent{nano: nano, ev: ev, size: len(b)}
		if !boundary && (len(out)+1 > MaxDockerEvents || acc+s.size+1 > MaxDockerEventBranchBytes) {
			boundary = true
			bt = nano
			boundaryStart = before
			boundaryDecoded = 1
			if boundaryDecoded > dockerBoundaryMaxEvents || after-before > dockerBoundaryMaxBytes {
				return gap(DockerGapBoundaryOverrun)
			}
		}
		out = append(out, s)
		acc += s.size + 1
	}
	if sourceBytes > dockerDecodeMaxBytes {
		return gap(DockerGapResponseOversize)
	}
	if boundaryOverrun {
		return gap(DockerGapBoundaryOverrun)
	}
	if boundary {
		dig := boundaryDigestsFor(out, bt, agentInstanceID)
		return appendEventsBoundary(out, sinceNano, untilNano, bt, dig, agentInstanceID)
	}
	return finalizeDockerComplete(out, sinceNano, untilNano)
}

func appendEventsBoundary(out []dockerSafeEvent, since, until, bt string, dig []string, instance string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	tr, a := truncateDockerTransmit(out, true)
	g := dockerGapEvent(since, bt, len(out)-len(tr), instance, bt)
	g.Context.Reason = DockerGapBoundaryOverflow
	tr = appendDockerGapFitting(tr, a, g)
	return tr, &DockerEventWindowV2{Since: since, Until: until, Capped: true, Lossy: true, GapReason: DockerGapBoundaryOverflow}, &DockerEventWatermarkV2{TimeNano: bt, BoundaryDigests: dig}, nil
}

func finalizeDockerComplete(safe []dockerSafeEvent, sinceNano, untilNano string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	evs := make([]DockerEventV2, 0, len(safe))
	for _, s := range safe {
		evs = append(evs, s.ev)
	}
	win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano}
	prop := &DockerEventWatermarkV2{TimeNano: untilNano, BoundaryDigests: []string{}}
	return evs, win, prop, nil
}

func boundaryDigestsFor(safe []dockerSafeEvent, nano, instance string) []string {
	set := map[string]bool{}
	for _, s := range safe {
		if s.nano != nano {
			continue
		}
		d := dockerEventDigest(instance, s.nano, s.ev.Action, s.ev.ContainerKey, s.ev.Context)
		set[d] = true
	}
	out := make([]string, 0, len(set))
	for d := range set {
		out = append(out, d)
	}
	sort.Strings(out)
	return out
}

func finalizeDockerCapped(ctx context.Context, safe []dockerSafeEvent, capIdx int, sinceNano, untilNano, instance string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	capNano := safe[capIdx].nano
	// Find the full boundary run containing capIdx.
	lo := capIdx
	for lo > 0 && safe[lo-1].nano == capNano {
		lo--
	}
	hi := capIdx
	for hi+1 < len(safe) && safe[hi+1].nano == capNano {
		hi++
	}
	// Between-boundary case: cap starts exactly at a new timestamp and the
	// prior boundary already fits. Advance to the last fully decoded boundary.
	if lo == capIdx {
		prevNano := safe[capIdx-1].nano
		trans := make([]DockerEventV2, 0, capIdx)
		for _, s := range safe[:capIdx] {
			trans = append(trans, s.ev)
		}
		digests := boundaryDigestsFor(safe[:capIdx], prevNano, instance)
		if len(digests) > MaxDockerBoundaryDigests {
			digests = digests[:MaxDockerBoundaryDigests]
		}
		win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true}
		prop := &DockerEventWatermarkV2{TimeNano: prevNano, BoundaryDigests: digests}
		return trans, win, prop, nil
	}
	// Mid-boundary cap: bounded overrun through the current timestamp.
	// Overrun budget is 1000 additional decoded events / 512KiB source bytes
	// past the transmit cap, limit+1 sentinel. Here over decoded safe events
	// past capIdx plus ctx-deadline and digest-overflow checks.
	overEvents := (hi - capIdx) + 1
	if overEvents > dockerBoundaryMaxEvents {
		return abandonDockerThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerGapBoundaryOverrun)
	}
	var overBytes int
	for _, s := range safe[capIdx : hi+1] {
		overBytes += s.size + 1
	}
	if overBytes > dockerBoundaryMaxBytes {
		return abandonDockerThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerGapBoundaryOverrun)
	}
	select {
	case <-ctx.Done():
		return abandonDockerThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerGapCollectionDeadline)
	default:
	}
	digests := boundaryDigestsFor(safe, capNano, instance)
	if len(digests) > MaxDockerBoundaryDigests {
		return abandonDockerThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerGapBoundaryOverrun)
	}
	// Boundary completes within overrun: transmit as many events through the
	// completed boundary as fit (reserving one slot for the gap) plus one
	// boundary_overflow gap covering the omitted remainder at capNano.
	// safe[:lo] fits by construction (lo <= capIdx, the first exceed index).
	candidate := safe[:hi+1]
	trans, acc := truncateDockerTransmit(candidate, true)
	keptAtBoundary := 0
	for _, s := range candidate[:len(trans)] {
		if s.nano == capNano {
			keptAtBoundary++
		}
	}
	totalAt := hi - lo + 1
	skipped := totalAt - keptAtBoundary
	if skipped < 0 {
		skipped = 0
	}
	gap := dockerGapEvent(sinceNano, capNano, skipped, instance, capNano)
	gap.Context.Reason = DockerGapBoundaryOverflow
	trans = appendDockerGapFitting(trans, acc, gap)
	win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true, Lossy: true, GapReason: DockerGapBoundaryOverflow}
	prop := &DockerEventWatermarkV2{TimeNano: capNano, BoundaryDigests: digests}
	return trans, win, prop, nil
}

func appendDockerGapFitting(trans []DockerEventV2, acc int, gap DockerEventV2) []DockerEventV2 {
	gb, _ := json.Marshal(gap)
	need := len(gb) + 1
	for len(trans) > 0 && (len(trans)+1 > MaxDockerEvents || acc+need > MaxDockerEventBranchBytes) {
		b, _ := json.Marshal(trans[len(trans)-1])
		acc -= len(b) + 1
		trans = trans[:len(trans)-1]
	}
	if len(trans)+1 > MaxDockerEvents || acc+need > MaxDockerEventBranchBytes {
		// Gap alone must still validate; it is small by construction.
		return []DockerEventV2{gap}
	}
	return append(trans, gap)
}

func truncateDockerTransmit(safe []dockerSafeEvent, reserveGap bool) ([]DockerEventV2, int) {
	limit := MaxDockerEvents
	if reserveGap {
		limit = MaxDockerEvents - 1
	}
	out := make([]DockerEventV2, 0, len(safe))
	acc := 0
	for _, s := range safe {
		if len(out)+1 > limit {
			break
		}
		if acc+s.size+1 > MaxDockerEventBranchBytes {
			break
		}
		out = append(out, s.ev)
		acc += s.size + 1
	}
	return out, acc
}

func abandonDockerThroughU(safe []dockerSafeEvent, capIdx int, sinceNano, untilNano, instance, reason string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	trans, acc := truncateDockerTransmit(safe[:capIdx], true)
	skipped := len(safe) - len(trans)
	gap := dockerGapEvent(sinceNano, untilNano, skipped, instance, untilNano)
	gap.Context.Reason = reason
	trans = appendDockerGapFitting(trans, acc, gap)
	win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true, Lossy: true, GapReason: reason}
	prop := &DockerEventWatermarkV2{TimeNano: untilNano, BoundaryDigests: []string{}}
	return trans, win, prop, nil
}

func dockerGapEvent(fromNano, throughNano string, skipped int, instance, occurredNano string) DockerEventV2 {
	occurred := dockerGapOccurredAt(occurredNano)
	if skipped < 0 {
		skipped = 0
	}
	if skipped > 10000 {
		skipped = 10000
	}
	sc := skipped
	gapCtx := DockerEventContextV2{
		Version:            DockerEventContextVersionV1,
		Reason:             DockerGapBoundaryOverflow,
		SkippedFromNano:    fromNano,
		SkippedThroughNano: throughNano,
		SkippedCount:       &sc,
	}
	h := sha256.Sum256([]byte("gap\x00" + fromNano + "\x00" + throughNano + "\x00" + strconv.Itoa(skipped) + "\x00" + instance))
	id := hex.EncodeToString(h[:])
	if len(id) > 32 {
		id = id[:32]
	}
	return DockerEventV2{
		EventID:         "gap-" + id,
		EventOccurredAt: occurred,
		Action:          DockerActionStreamGap,
		Context:         gapCtx,
	}
}

func dockerGapOccurredAt(occurredNano string) string {
	if n, err := strconv.ParseInt(occurredNano, 10, 64); err == nil && n >= 0 {
		return time.Unix(0, n).UTC().Format(time.RFC3339Nano)
	}
	return time.Now().UTC().Format(time.RFC3339Nano)
}

// ---------------------------------------------------------------------------
// /system/df sanitized aggregate decoder.
// ---------------------------------------------------------------------------

// decodeDockerSystemDF reads through io.LimitReader(256KiB+1) and rejects
// when the sentinel byte exists. Only aggregate numeric/bool fields are used;
// names, paths, IDs, and object arrays are never persisted. Images use
// top-level LayersSize (never summed Sizes, which share layers). Missing
// categories become supported=false. A malformed category marks only itself
// unsupported.
func decodeDockerSystemDF(r io.Reader) (*DockerStorageAggregateV2, error) {
	b, err := io.ReadAll(io.LimitReader(r, int64(MaxDockerSystemDFBytes)+1))
	if err != nil {
		return nil, err
	}
	if len(b) > MaxDockerSystemDFBytes {
		return nil, fmt.Errorf("system df response oversize")
	}
	var raw struct {
		LayersSize *int64 `json:"LayersSize"`
		Images     []struct {
			Size       *int64 `json:"Size"`
			SharedSize *int64 `json:"SharedSize"`
		} `json:"Images"`
		Containers []struct {
			State  *string `json:"State"`
			SizeRw *int64  `json:"SizeRw"`
		} `json:"Containers"`
		Volumes []struct {
			UsageData *struct {
				Size     *int64 `json:"Size"`
				RefCount *int64 `json:"RefCount"`
			} `json:"UsageData"`
		} `json:"Volumes"`
		BuildCache []struct {
			Size  *int64 `json:"Size"`
			InUse *bool  `json:"InUse"`
		} `json:"BuildCache"`
	}
	// Presence tracking: missing top-level keys decode as nil slices.
	var presence map[string]json.RawMessage
	if err := json.Unmarshal(b, &presence); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(b, &raw); err != nil {
		return nil, err
	}
	agg := &DockerStorageAggregateV2{FormulaVersion: DockerStorageFormulaVersionV1}
	// Images: LayersSize authoritative; per-image Sizes never summed.
	_, imagesPresent := presence["Images"]
	if ls, ok := presence["LayersSize"]; ok && ls != nil && string(ls) != "null" {
		if raw.LayersSize != nil && *raw.LayersSize >= 0 && *raw.LayersSize <= int64(MaxSafeJSONNumberUint64) {
			agg.Images.Supported = true
			agg.Images.TotalBytes = float64(*raw.LayersSize)
			if imagesPresent && raw.Images != nil {
				agg.Images.Count = len(raw.Images)
			}
			est, okEst := dockerImageEstimate(raw.Images)
			if okEst {
				agg.Images.EstimatedReclaimableBytes = est
			}
			agg.Images.ReclaimableSupported = false
		} else {
			agg.Images.Supported = false
			if raw.Images != nil {
				agg.Images.Count = len(raw.Images)
			}
		}
	} else {
		agg.Images.Supported = false
		if raw.Images != nil {
			agg.Images.Count = len(raw.Images)
		}
	}
	// Containers.
	if _, ok := presence["Containers"]; ok && raw.Containers != nil {
		total, reclaim, okCat := dockerContainerTotals(raw.Containers)
		agg.Containers.Supported = okCat
		agg.Containers.Count = len(raw.Containers)
		if okCat {
			agg.Containers.TotalBytes = total
			agg.Containers.ReclaimableBytes = reclaim
		}
	} else {
		agg.Containers.Supported = false
	}
	// Volumes.
	if _, ok := presence["Volumes"]; ok && raw.Volumes != nil {
		total, reclaim, okCat := dockerVolumeTotals(raw.Volumes)
		agg.LocalVolumes.Supported = okCat
		agg.LocalVolumes.Count = len(raw.Volumes)
		if okCat {
			agg.LocalVolumes.TotalBytes = total
			agg.LocalVolumes.ReclaimableBytes = reclaim
		}
	} else {
		agg.LocalVolumes.Supported = false
	}
	// BuildCache.
	if _, ok := presence["BuildCache"]; ok && raw.BuildCache != nil {
		total, reclaim, okCat := dockerBuildCacheTotals(raw.BuildCache)
		agg.BuildCache.Supported = okCat
		agg.BuildCache.Count = len(raw.BuildCache)
		if okCat {
			agg.BuildCache.TotalBytes = total
			agg.BuildCache.ReclaimableBytes = reclaim
			agg.BuildCache.ReclaimableSupported = true
		}
	} else {
		agg.BuildCache.Supported = false
	}
	return agg, nil
}

func dockerImageEstimate(images []struct {
	Size       *int64 `json:"Size"`
	SharedSize *int64 `json:"SharedSize"`
}) (float64, bool) {
	var est uint64
	for _, im := range images {
		if im.Size == nil || im.SharedSize == nil {
			continue
		}
		if *im.Size < 0 || *im.SharedSize < 0 {
			continue
		}
		if *im.SharedSize > *im.Size {
			continue
		}
		if uint64(*im.Size) > MaxSafeJSONNumberUint64 {
			continue
		}
		est += uint64(*im.Size - *im.SharedSize)
		if est > MaxSafeJSONNumberUint64 {
			return float64(MaxSafeJSONNumberUint64), true
		}
	}
	return float64(est), true
}

func dockerContainerTotals(containers []struct {
	State  *string `json:"State"`
	SizeRw *int64  `json:"SizeRw"`
}) (float64, float64, bool) {
	var total, reclaim uint64
	for _, c := range containers {
		if c.SizeRw == nil || *c.SizeRw < 0 || uint64(*c.SizeRw) > MaxSafeJSONNumberUint64 {
			return 0, 0, false
		}
		total += uint64(*c.SizeRw)
		if total > MaxSafeJSONNumberUint64 {
			return 0, 0, false
		}
		st := ""
		if c.State != nil {
			st = *c.State
		}
		if st != "running" {
			reclaim += uint64(*c.SizeRw)
		}
	}
	return float64(total), float64(reclaim), true
}

func dockerVolumeTotals(volumes []struct {
	UsageData *struct {
		Size     *int64 `json:"Size"`
		RefCount *int64 `json:"RefCount"`
	} `json:"UsageData"`
}) (float64, float64, bool) {
	var total, reclaim uint64
	for _, v := range volumes {
		if v.UsageData == nil || v.UsageData.Size == nil || v.UsageData.RefCount == nil {
			return 0, 0, false
		}
		if *v.UsageData.Size < 0 || *v.UsageData.RefCount < 0 || uint64(*v.UsageData.Size) > MaxSafeJSONNumberUint64 {
			return 0, 0, false
		}
		total += uint64(*v.UsageData.Size)
		if total > MaxSafeJSONNumberUint64 {
			return 0, 0, false
		}
		if *v.UsageData.RefCount == 0 {
			reclaim += uint64(*v.UsageData.Size)
		}
	}
	return float64(total), float64(reclaim), true
}

func dockerBuildCacheTotals(entries []struct {
	Size  *int64 `json:"Size"`
	InUse *bool  `json:"InUse"`
}) (float64, float64, bool) {
	var total, reclaim uint64
	for _, e := range entries {
		if e.Size == nil || e.InUse == nil || *e.Size < 0 || uint64(*e.Size) > MaxSafeJSONNumberUint64 {
			return 0, 0, false
		}
		total += uint64(*e.Size)
		if total > MaxSafeJSONNumberUint64 {
			return 0, 0, false
		}
		if !*e.InUse {
			reclaim += uint64(*e.Size)
		}
	}
	return float64(total), float64(reclaim), true
}
