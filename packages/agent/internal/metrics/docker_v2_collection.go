package metrics

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
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
	dockerV2DecodeMaxEvents = 10000
	dockerV2DecodeMaxBytes  = 2 * 1024 * 1024

	dockerV2BoundaryMaxEvents = 1000
	dockerV2BoundaryMaxBytes  = 512 * 1024

	// DockerV2StorageCadence is the slower /system/df cadence from the plan.
	DockerV2StorageCadence = 5 * time.Minute
)

// DockerV2Selection is the minimal transient input for deterministic selection.
type DockerV2Selection struct {
	ContainerKey string
	Running      bool
	Unhealthy    bool
	StateChanged bool
}

// selectDockerV2Containers is deterministic by containerKey: unhealthy or
// state-changed first, then running, then remainder rotated by key.
// Input is never mutated. Limit is capped at MaxContainers.
func selectDockerV2Containers(in []DockerV2Selection, limit int, rotation uint64) []DockerV2Selection {
	if limit <= 0 {
		return nil
	}
	if limit > MaxContainers {
		limit = MaxContainers
	}
	v := append([]DockerV2Selection(nil), in...)
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
	out := append([]DockerV2Selection(nil), v[:cut]...)
	tail := v[cut:]
	start := int(rotation % uint64(len(tail)))
	for len(out) < limit && len(out)-cut < len(tail) {
		out = append(out, tail[(start+len(out)-cut)%len(tail)])
	}
	return out
}

func selectionRank(x DockerV2Selection) int {
	if x.Unhealthy || x.StateChanged {
		return 0
	}
	if x.Running {
		return 1
	}
	return 2
}

// dockerV2CohortDigest is SHA-256 over sorted sampled keys, hex encoded.
func dockerV2CohortDigest(keys []string) string {
	cp := append([]string(nil), keys...)
	sort.Strings(cp)
	h := sha256.Sum256([]byte(strings.Join(cp, "\x00")))
	return hex.EncodeToString(h[:])
}

// dockerV2Coverage builds explicit coverage metadata.
func dockerV2Coverage(sampled int, total int, keys []string) DockerCoverageV2 {
	complete := sampled == total
	c := DockerCoverageV2{
		DetailsSampled:       sampled,
		DetailsTotalEligible: total,
		Complete:             complete,
	}
	if sampled > 0 && sampled == total {
		c.CohortDigest = dockerV2CohortDigest(keys)
	} else if sampled > 0 {
		c.CohortDigest = dockerV2CohortDigest(keys)
	}
	return c
}

// dockerV2SampledAggregate sums only successfully sampled containers.
// Host totals remain authoritative elsewhere; this aggregate never claims them.
func dockerV2SampledAggregate(containers []DockerContainerV2, total int) DockerSampledContainerAggregateV2 {
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
	agg.Coverage = dockerV2Coverage(len(containers), total, keys)
	return agg
}

// dockerV2RemainingBudget reports whether a bounded sub-operation may start
// without consuming the required collection budget.
func dockerV2RemainingBudget(start time.Time, budget, reserve time.Duration) bool {
	return time.Since(start)+reserve < budget
}

// dockerV2StorageDue reports the 5-minute storage cadence (or first cycle).
func dockerV2StorageDue(last, now time.Time) bool {
	if last.IsZero() {
		return true
	}
	return !now.Before(last.Add(DockerV2StorageCadence))
}

// ---------------------------------------------------------------------------
// /events fixed-window streaming decoder.
// ---------------------------------------------------------------------------

// DockerV2RawEvent is the allowlisted subset of a daemon event object.
// Only Type/Action/Actor/Time fields are read; Attributes are allowlisted
// downstream and never persisted wholesale.
type DockerV2RawEvent struct {
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

// dockerV2EventDigest is the safe identity over
// (agentInstanceId, eventTimeNano, action, containerKey, contextVersion, context).
func dockerV2EventDigest(instance, nano, action, key string, ctx DockerEventContextV2) string {
	b, _ := json.Marshal(ctx)
	parts := strings.Join([]string{instance, nano, action, key, strconv.Itoa(ctx.Version), string(b)}, "\x00")
	h := sha256.Sum256([]byte(parts))
	return hex.EncodeToString(h[:])
}

// dockerV2SafeContext builds the minimal typed safe context for a daemon event.
// Only allowlisted scalar fields are admitted; Attributes are never copied.
func dockerV2SafeContext(raw DockerV2RawEvent) DockerEventContextV2 {
	ctx := DockerEventContextV2{Version: DockerEventContextVersionV1}
	if raw.Action == DockerV2ActionHealthStatus {
		if v, ok := raw.Actor.Attributes["health_status"]; ok {
			switch v {
			case DockerV2HealthHealthy, DockerV2HealthUnhealthy, DockerV2HealthStarting, DockerV2HealthNone:
				ctx.HealthStatus = v
			}
		}
	}
	if raw.Action == DockerV2ActionDie {
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

func dockerV2NormalizeNano(e DockerV2RawEvent) (string, bool, bool) {
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

func dockerV2EventOccurredAt(nano string) string {
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

type dockerV2SafeEvent struct {
	nano string
	key  string
	ev   DockerEventV2
	size int
}

// decodeDockerV2EventStream decodes a finite /events response with
// io.LimitReader(max+1) sentinel semantics. It returns raw events and
// oversize=true when the source exceeds max events or max bytes.
// No open stream is ever used; callers pass the fixed-window response body.
// nextDockerV2JSONValue frames one complete top-level JSON object without decoder read-ahead.
func nextDockerV2JSONValue(br *bufio.Reader) ([]byte, error) {
	var b []byte
	depth := 0
	started := false
	inString, escaped := false, false
	for {
		c, err := br.ReadByte()
		if err != nil {
			if err == io.EOF && !started { return nil, io.EOF }
			return nil, err
		}
		if !started {
			if c == ' ' || c == '\t' || c == '\r' || c == '\n' { continue }
			started = true
		}
		b = append(b, c)
		if inString {
			if escaped { escaped = false } else if c == '\\' { escaped = true } else if c == '"' { inString = false }
			continue
		}
		if c == '"' { inString = true; continue }
		if c == '{' { depth++ }
		if c == '}' { depth--; if depth == 0 { return b, nil } }
	}
}

func decodeDockerV2EventStream(r io.Reader, maxEvents int, maxBytes int64) ([]DockerV2RawEvent, bool, error) {
	br := bufio.NewReader(r)
	var consumed int64
	if maxEvents <= 0 {
		maxEvents = dockerV2DecodeMaxEvents
	}
	if maxBytes <= 0 {
		maxBytes = dockerV2DecodeMaxBytes
	}
	out := make([]DockerV2RawEvent, 0, 64)
	for {
		raw, err := nextDockerV2JSONValue(br)
		consumed += int64(len(raw))
		if err == io.EOF { return out, false, nil }
		if err != nil { if consumed > maxBytes { return out, true, nil }; return out, false, err }
		if consumed > maxBytes { return out, true, nil }
		var e DockerV2RawEvent
		if err := json.Unmarshal(raw, &e); err != nil { return out, false, err }
		out = append(out, e)
		if len(out) == maxEvents { raw, err = nextDockerV2JSONValue(br); consumed += int64(len(raw)); if err == nil || consumed > maxBytes { return out, true, nil }; if err != io.EOF { return out, false, err }; return out, false, nil }
	}
}

func isDockerV2WantedAction(a string) bool {
	for _, w := range dockerV2EventActionAllowlist {
		if a == w {
			return true
		}
	}
	return false
}

// collectDockerV2EventWindow applies transmit caps, timestamp-boundary overrun,
// digest dedupe, gap synthesis, and proposed-watermark semantics.
//
// sinceNano/untilNano are canonical decimal strings with since < until.
// fromDigests is the durable boundary set at since (inclusive replay).
// keyForID maps a full daemon actor ID to an opaque containerKey.
// Transmit caps: 100 events / 64KiB encoded. Decode caps: 10k / 2MiB.
// Boundary overrun: 1000 events / 512KiB, limit+1 sentinel.
func collectDockerV2EventWindow(ctx context.Context, r io.Reader, sinceNano, untilNano, agentInstanceID string, fromDigests []string, keyForID func(string) string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	if !isCanonicalNanoDecimal(sinceNano) || !isCanonicalNanoDecimal(untilNano) || cmpCanonicalNano(sinceNano, untilNano) >= 0 {
		return nil, nil, nil, fmt.Errorf("invalid event window")
	}
	if err := validateDockerV2AgentInstanceID(agentInstanceID); err != nil {
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
	out := make([]dockerV2SafeEvent, 0, MaxDockerV2Events)
	boundary := false
	var bt string
	var sourceN int
	var boundaryDecoded int
	var boundaryStart int64
	boundaryOverrun := false
	var acc int
	gap := func(reason string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
		tr, a := truncateDockerV2Transmit(out, true)
		g := dockerV2GapEvent(sinceNano, untilNano, len(out)-len(tr), agentInstanceID, untilNano)
		g.Context.Reason = reason
		tr = appendDockerV2GapFitting(tr, a, g)
		return tr, &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true, Lossy: true, GapReason: reason}, &DockerEventWatermarkV2{TimeNano: untilNano}, nil
	}
	for {
		select {
		case <-ctx.Done():
			return gap(DockerV2GapCollectionDeadline)
		default:
		}
		before := sourceBytes
		raw, err := nextDockerV2JSONValue(br)
		sourceBytes += int64(len(raw))
		var e DockerV2RawEvent
		if err == nil { err = json.Unmarshal(raw, &e) }
		if err == io.EOF {
			break
		}
		if err != nil {
			if ctx.Err() != nil { return gap(DockerV2GapCollectionDeadline) }
			if sourceBytes > dockerV2DecodeMaxBytes { return gap(DockerV2GapResponseOversize) }
			return nil, nil, nil, err
		}
		sourceN++
		after := sourceBytes
		if boundary {
			boundaryDecoded++
		}
		if sourceN > dockerV2DecodeMaxEvents || after > dockerV2DecodeMaxBytes {
			return gap(DockerV2GapResponseOversize)
		}
		nano, reduced, ok := dockerV2NormalizeNano(e)
		if ok && boundary && nano != bt {
			if boundaryOverrun { return gap(DockerV2GapBoundaryOverrun) }
			dig := boundaryDigestsFor(out, bt, agentInstanceID)
			return appendEventsBoundary(out, sinceNano, untilNano, bt, dig, agentInstanceID)
		}
		if !ok || e.Type != dockerV2EventsType || !isDockerV2WantedAction(e.Action) {
			if boundary && after-boundaryStart > dockerV2BoundaryMaxBytes {
				return gap(DockerV2GapBoundaryOverrun)
			}
			continue
		}
		if cmpCanonicalNano(nano, sinceNano) < 0 || cmpCanonicalNano(nano, untilNano) > 0 {
			continue
		}
		if boundary && nano != bt {
			if sourceBytes > dockerV2DecodeMaxBytes {
				return gap(DockerV2GapResponseOversize)
			}
			if boundaryOverrun {
				return gap(DockerV2GapBoundaryOverrun)
			}
			dig := boundaryDigestsFor(out, bt, agentInstanceID)
			return appendEventsBoundary(out, sinceNano, untilNano, bt, dig, agentInstanceID)
		}
		if boundary && (boundaryDecoded > dockerV2BoundaryMaxEvents || after-boundaryStart > dockerV2BoundaryMaxBytes) {
			boundaryOverrun = true
		}
		key := keyForID(e.Actor.ID)
		if validateDockerV2ContainerKey(key) != nil {
			continue
		}
		sc := dockerV2SafeContext(e)
		if reduced {
			sc.ReducedPrecision = true
		}
		d := dockerV2EventDigest(agentInstanceID, nano, e.Action, key, sc)
		if nano == sinceNano && dup[d] {
			continue
		}
		ev := DockerEventV2{EventID: d[:32], EventOccurredAt: dockerV2EventOccurredAt(nano), ContainerKey: key, Action: e.Action, Context: sc}
		if validateDockerV2Event(ev) != nil {
			continue
		}
		b, _ := json.Marshal(ev)
		s := dockerV2SafeEvent{nano: nano, ev: ev, size: len(b)}
		if !boundary && (len(out)+1 > MaxDockerV2Events || acc+s.size+1 > MaxDockerV2EventBranchBytes) {
			boundary = true
			bt = nano
			boundaryStart = before
			boundaryDecoded = 1
			if boundaryDecoded > dockerV2BoundaryMaxEvents || after-before > dockerV2BoundaryMaxBytes {
				return gap(DockerV2GapBoundaryOverrun)
			}
		}
		out = append(out, s)
		acc += s.size + 1
	}
	if sourceBytes > dockerV2DecodeMaxBytes {
		return gap(DockerV2GapResponseOversize)
	}
	if boundaryOverrun {
		return gap(DockerV2GapBoundaryOverrun)
	}
	if boundary {
		dig := boundaryDigestsFor(out, bt, agentInstanceID)
		return appendEventsBoundary(out, sinceNano, untilNano, bt, dig, agentInstanceID)
	}
	return finalizeDockerV2Complete(out, sinceNano, untilNano)
}

func appendEventsBoundary(out []dockerV2SafeEvent, since, until, bt string, dig []string, instance string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	tr, a := truncateDockerV2Transmit(out, true)
	g := dockerV2GapEvent(since, bt, len(out)-len(tr), instance, bt)
	g.Context.Reason = DockerV2GapBoundaryOverflow
	tr = appendDockerV2GapFitting(tr, a, g)
	return tr, &DockerEventWindowV2{Since: since, Until: until, Capped: true, Lossy: true, GapReason: DockerV2GapBoundaryOverflow}, &DockerEventWatermarkV2{TimeNano: bt, BoundaryDigests: dig}, nil
}

func finalizeDockerV2Complete(safe []dockerV2SafeEvent, sinceNano, untilNano string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	evs := make([]DockerEventV2, 0, len(safe))
	for _, s := range safe {
		evs = append(evs, s.ev)
	}
	win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano}
	prop := &DockerEventWatermarkV2{TimeNano: untilNano, BoundaryDigests: []string{}}
	return evs, win, prop, nil
}

func boundaryDigestsFor(safe []dockerV2SafeEvent, nano, instance string) []string {
	set := map[string]bool{}
	for _, s := range safe {
		if s.nano != nano {
			continue
		}
		d := dockerV2EventDigest(instance, s.nano, s.ev.Action, s.ev.ContainerKey, s.ev.Context)
		set[d] = true
	}
	out := make([]string, 0, len(set))
	for d := range set {
		out = append(out, d)
	}
	sort.Strings(out)
	return out
}

func finalizeDockerV2Capped(ctx context.Context, safe []dockerV2SafeEvent, capIdx int, sinceNano, untilNano, instance string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
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
		if len(digests) > MaxDockerV2BoundaryDigests {
			digests = digests[:MaxDockerV2BoundaryDigests]
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
	if overEvents > dockerV2BoundaryMaxEvents {
		return abandonDockerV2ThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerV2GapBoundaryOverrun)
	}
	var overBytes int
	for _, s := range safe[capIdx : hi+1] {
		overBytes += s.size + 1
	}
	if overBytes > dockerV2BoundaryMaxBytes {
		return abandonDockerV2ThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerV2GapBoundaryOverrun)
	}
	select {
	case <-ctx.Done():
		return abandonDockerV2ThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerV2GapCollectionDeadline)
	default:
	}
	digests := boundaryDigestsFor(safe, capNano, instance)
	if len(digests) > MaxDockerV2BoundaryDigests {
		return abandonDockerV2ThroughU(safe, capIdx, sinceNano, untilNano, instance, DockerV2GapBoundaryOverrun)
	}
	// Boundary completes within overrun: transmit as many events through the
	// completed boundary as fit (reserving one slot for the gap) plus one
	// boundary_overflow gap covering the omitted remainder at capNano.
	// safe[:lo] fits by construction (lo <= capIdx, the first exceed index).
	candidate := safe[:hi+1]
	trans, acc := truncateDockerV2Transmit(candidate, true)
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
	gap := dockerV2GapEvent(sinceNano, capNano, skipped, instance, capNano)
	gap.Context.Reason = DockerV2GapBoundaryOverflow
	trans = appendDockerV2GapFitting(trans, acc, gap)
	win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true, Lossy: true, GapReason: DockerV2GapBoundaryOverflow}
	prop := &DockerEventWatermarkV2{TimeNano: capNano, BoundaryDigests: digests}
	return trans, win, prop, nil
}

func appendDockerV2GapFitting(trans []DockerEventV2, acc int, gap DockerEventV2) []DockerEventV2 {
	gb, _ := json.Marshal(gap)
	need := len(gb) + 1
	for len(trans) > 0 && (len(trans)+1 > MaxDockerV2Events || acc+need > MaxDockerV2EventBranchBytes) {
		b, _ := json.Marshal(trans[len(trans)-1])
		acc -= len(b) + 1
		trans = trans[:len(trans)-1]
	}
	if len(trans)+1 > MaxDockerV2Events || acc+need > MaxDockerV2EventBranchBytes {
		// Gap alone must still validate; it is small by construction.
		return []DockerEventV2{gap}
	}
	return append(trans, gap)
}

func truncateDockerV2Transmit(safe []dockerV2SafeEvent, reserveGap bool) ([]DockerEventV2, int) {
	limit := MaxDockerV2Events
	if reserveGap {
		limit = MaxDockerV2Events - 1
	}
	out := make([]DockerEventV2, 0, len(safe))
	acc := 0
	for _, s := range safe {
		if len(out)+1 > limit {
			break
		}
		if acc+s.size+1 > MaxDockerV2EventBranchBytes {
			break
		}
		out = append(out, s.ev)
		acc += s.size + 1
	}
	return out, acc
}

func abandonDockerV2ThroughU(safe []dockerV2SafeEvent, capIdx int, sinceNano, untilNano, instance, reason string) ([]DockerEventV2, *DockerEventWindowV2, *DockerEventWatermarkV2, error) {
	trans, acc := truncateDockerV2Transmit(safe[:capIdx], true)
	skipped := len(safe) - len(trans)
	gap := dockerV2GapEvent(sinceNano, untilNano, skipped, instance, untilNano)
	gap.Context.Reason = reason
	trans = appendDockerV2GapFitting(trans, acc, gap)
	win := &DockerEventWindowV2{Since: sinceNano, Until: untilNano, Capped: true, Lossy: true, GapReason: reason}
	prop := &DockerEventWatermarkV2{TimeNano: untilNano, BoundaryDigests: []string{}}
	return trans, win, prop, nil
}

func dockerV2GapEvent(fromNano, throughNano string, skipped int, instance, occurredNano string) DockerEventV2 {
	occurred := dockerV2GapOccurredAt(occurredNano)
	if skipped < 0 {
		skipped = 0
	}
	if skipped > 10000 {
		skipped = 10000
	}
	sc := skipped
	gapCtx := DockerEventContextV2{
		Version:            DockerEventContextVersionV1,
		Reason:             DockerV2GapBoundaryOverflow,
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
		Action:          DockerV2ActionStreamGap,
		Context:         gapCtx,
	}
}

func dockerV2GapOccurredAt(occurredNano string) string {
	if n, err := strconv.ParseInt(occurredNano, 10, 64); err == nil && n >= 0 {
		return time.Unix(0, n).UTC().Format(time.RFC3339Nano)
	}
	return time.Now().UTC().Format(time.RFC3339Nano)
}

// ---------------------------------------------------------------------------
// /system/df sanitized aggregate decoder.
// ---------------------------------------------------------------------------

// decodeDockerV2SystemDF reads through io.LimitReader(256KiB+1) and rejects
// when the sentinel byte exists. Only aggregate numeric/bool fields are used;
// names, paths, IDs, and object arrays are never persisted. Images use
// top-level LayersSize (never summed Sizes, which share layers). Missing
// categories become supported=false. A malformed category marks only itself
// unsupported.
func decodeDockerV2SystemDF(r io.Reader) (*DockerStorageAggregateV2, error) {
	b, err := io.ReadAll(io.LimitReader(r, int64(MaxDockerV2SystemDFBytes)+1))
	if err != nil {
		return nil, err
	}
	if len(b) > MaxDockerV2SystemDFBytes {
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
			est, okEst := dockerV2ImageEstimate(raw.Images)
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
		total, reclaim, okCat := dockerV2ContainerTotals(raw.Containers)
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
		total, reclaim, okCat := dockerV2VolumeTotals(raw.Volumes)
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
		total, reclaim, okCat := dockerV2BuildCacheTotals(raw.BuildCache)
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

func dockerV2ImageEstimate(images []struct {
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

func dockerV2ContainerTotals(containers []struct {
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

func dockerV2VolumeTotals(volumes []struct {
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

func dockerV2BuildCacheTotals(entries []struct {
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
