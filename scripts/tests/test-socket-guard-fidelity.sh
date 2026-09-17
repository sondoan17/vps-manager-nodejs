#!/usr/bin/env bash
#
# test-socket-guard-fidelity.sh — Fidelity fixtures for the Gate-5 socket guard.
#
# Uses the same normalization rule as check-no-docker-socket.sh (full-line
# comments plus inline comments outside quotes are stripped; quoted values
# such as healthcheck commands are preserved):
#   - detects real short-form docker.sock volumes, long-form bind
#     source/target mounts, and group_add grants;
#   - ignores full-line comments, inline YAML comments, raw Compose comments,
#     commented source/target lines, and comment-only group_add mentions;
#   - keeps clean Compose content passing.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=/dev/null
source "${REPO_ROOT}/scripts/tests/socket-pattern.sh"

PASS=0
FAIL=0
pass() { PASS=$((PASS + 1)); echo "PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL: $1" >&2; }

normalize_content() {
  awk '
  {
    line = $0
    out = ""
    sq = 0
    dq = 0
    for (i = 1; i <= length(line); i++) {
      c = substr(line, i, 1)
      prev = (i > 1 ? substr(line, i - 1, 1) : "")
      if (c == "\x27" && !dq) { sq = !sq; out = out c; continue }
      if (c == "\"" && !sq) { dq = !dq; out = out c; continue }
      if (c == "#" && !sq && !dq && (i == 1 || prev == " " || prev == "\t")) break
      out = out c
    }
    print out
  }'
}

normalized_match() { # $1=file $2=pattern
  normalize_content < "$1" | grep -nEi "$2" >/dev/null 2>&1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ── Positive fixtures (must be detected) ──────────────────────────────────
cat > "$WORK/evil-short-syntax.yml" <<'EOF'
services:
  api:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
EOF

cat > "$WORK/evil-short-quoted.yml" <<'EOF'
services:
  api:
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
EOF

cat > "$WORK/evil-long-syntax.yml" <<'EOF'
services:
  x:
    volumes:
      - type: bind
        source: /run/docker.sock
        target: /var/run/docker.sock
EOF

cat > "$WORK/evil-group-add.yml" <<'EOF'
services:
  x:
    group_add:
      - docker
EOF

# A quoted '#' is part of the value, not a comment: normalization must keep
# quoted healthcheck commands intact so no detection path is silently lost.
cat > "$WORK/quoted-hash-kept.yml" <<'EOF'
services:
  api:
    healthcheck:
      test: ["CMD", "node", "-e", "x('#y')"]
EOF

# ── Negative fixtures (must be ignored) ───────────────────────────────────
cat > "$WORK/comment-only.yml" <<'EOF'
# /var/run/docker.sock is dangerous, do not mount it
services:
  api:
    image: demo
EOF

cat > "$WORK/inline-comment.yml" <<'EOF'
services:
  api:
    image: demo # previously considered /var/run/docker.sock here
    volumes:
      - vps-manager-data:/app/data # not docker.sock
EOF

cat > "$WORK/raw-compose-comments.yml" <<'EOF'
# Loopback-only host access for local development.
# Never mount /var/run/docker.sock into this stack.
services:
  api:
    # Production traffic enters through the reverse proxy.
    image: demo # keep /run/docker.sock out of this service
    volumes:
      - vps-manager-data:/app/data
EOF

cat > "$WORK/source-target-comments.yml" <<'EOF'
services:
  x:
    volumes:
      # source: /var/run/docker.sock
      # target: /var/run/docker.sock
      - vps-manager-data:/app/data
EOF

cat > "$WORK/comment-only-group-add.yml" <<'EOF'
# group_add is forbidden for this stack
services:
  x:
    image: demo # group_add: docker would be a violation
EOF

cat > "$WORK/clean.yml" <<'EOF'
services:
  api:
    image: demo
    volumes:
      - vps-manager-data:/app/data
EOF

# Evil fixtures must be detected after the shared normalization.
for f in evil-short-syntax evil-short-quoted evil-long-syntax; do
  if normalized_match "$WORK/$f.yml" "$SOCKET_PATTERN"; then
    pass "fidelity: $f detected"
  else
    fail "fidelity: $f missed"
  fi
done
if normalize_content < "$WORK/evil-group-add.yml" | grep -nE 'group_add' >/dev/null 2>&1; then
  pass "fidelity: evil-group-add detected"
else
  fail "fidelity: evil-group-add missed"
fi

# Quoted '#' must survive normalization (guard does not blank quoted values).
if normalize_content < "$WORK/quoted-hash-kept.yml" | grep -q "x('#y')"; then
  pass "fidelity: quoted hash preserved"
else
  fail "fidelity: quoted hash must survive normalization"
fi

# Comment fixtures must NOT match after the shared normalization.
for f in comment-only inline-comment raw-compose-comments source-target-comments clean; do
  if normalized_match "$WORK/$f.yml" "$SOCKET_PATTERN"; then
    fail "fidelity: $f flagged"
  else
    pass "fidelity: $f ignored"
  fi
done
if normalize_content < "$WORK/comment-only-group-add.yml" | grep -nE 'group_add' >/dev/null 2>&1; then
  fail "fidelity: comment-only group_add flagged"
else
  pass "fidelity: comment-only group_add ignored"
fi

# Guard and fidelity test must share one pattern source.
if grep -q 'socket-pattern.sh' "${REPO_ROOT}/scripts/tests/check-no-docker-socket.sh"; then
  pass "fidelity: guard sources shared socket-pattern.sh"
else
  fail "fidelity: guard must source shared socket-pattern.sh"
fi

echo "RESULT: ${PASS} passed, ${FAIL} failed"
[[ "$FAIL" -eq 0 ]]
