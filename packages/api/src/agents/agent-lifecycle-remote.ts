/**
 * Shared remote primitives for agent lifecycle operations (upgrade, restart).
 *
 * Both operations contend on the SAME remote lock directory so they are
 * mutually exclusive on the host. The lock is acquired with an atomic
 * `mkdir` and released with `rmdir` only by the holder.
 *
 * Phase-1 stale-lock policy (conservative): a conflicting lock is NEVER
 * auto-removed. `mkdir` conflict maps to a safe conflict failure and the
 * operator must manually verify no lifecycle operation is running and then
 * `rmdir` the lock. Auto-reclaiming based on mtime/PID is intentionally not
 * implemented: clocks can skew and PIDs can be reused, so heuristic removal
 * could kill a live operation's critical section.
 *
 * Current limitation: if the API process crashes after acquiring the remote
 * lock but before releasing it, the lock remains and all future lifecycle
 * operations conflict until manual cleanup. There is no TTL or fencing
 * token in phase one.
 */

export const AGENT_LIFECYCLE_LOCK = "lifecycle.lock";

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function buildLifecycleLockAcquireCommand(lockPath: string): string {
  const l = shellQuote(lockPath);
  return `umask 077; mkdir -- ${l} 2>/dev/null && printf acquired || printf conflict`;
}

export function buildLifecycleLockReleaseCommand(lockPath: string): string {
  const l = shellQuote(lockPath);
  return `rmdir -- ${l}`;
}

/** Shell helper that prints /proc PID starttime (field 22, robust to spaces in comm). */
export const REMOTE_ST_HELPER = `st(){ sed 's/^.*) //' "/proc/$1/stat" 2>/dev/null | awk '{print $20}'; };`;

const EXACT_ARGV = `test "$(tr '\\0' '\\n' < /proc/$_pid/cmdline 2>/dev/null | awk -v b="$_bin" -v c="$_cfg" 'NR==1{ok=($0==b)} NR==2{ok=ok&&($0=="-config")} NR==3{ok=ok&&($0==c)} NR>3{ok=0} END{print ok&&NR==3?1:0}')" = 1`;

/**
 * Pure mirror of the tail classification in {@link buildManagedProcessInspectCommand}.
 * Exists so the stale-PID policy is unit-testable without a live /proc.
 * Shell remains the source of truth on hosts; this must stay in sync with it.
 */
export function classifyManagedProcessInspection(
  matches: number,
  owned: { pid: string; starttime: string } | null,
  pidFile: { exists: boolean; content?: string },
  pidAlive: (pid: string) => boolean,
): string {
  if (matches > 1) return "ambiguous";
  if (!pidFile.exists) return matches === 0 ? "none" : "ambiguous";
  const pid = pidFile.content ?? "";
  if (pid === "" || /[^0-9]/.test(pid)) return "invalid";
  if (matches === 0) return pidAlive(pid) ? "mismatch" : "none";
  if (owned && pid === owned.pid) return `owned:${pid}:${owned.starttime}`;
  return "mismatch";
}

export function buildManagedProcessInspectCommand(
  binary: string,
  config: string,
  pidFile: string,
): string {
  const b = shellQuote(binary),
    c = shellQuote(config),
    p = shellQuote(pidFile);
  return [
    `_pf=${p}; _bin=${b}; _cfg=${c}; _matches=0; _owned=''; _ost=''; ${REMOTE_ST_HELPER}`,
    `for _d in /proc/[0-9]*; do _pid=\${_d##*/}; test "$(readlink -f /proc/$_pid/exe 2>/dev/null)" = "$_bin" || continue; ${EXACT_ARGV} || continue; _st=$(st "$_pid"); test -n "$_st" || continue; _matches=$((_matches+1)); _owned=$_pid; _ost=$_st; done;`,
    `test "$_matches" -le 1 || { echo ambiguous; exit 0; }; test -f "$_pf" || { test "$_matches" = 0 && echo none || echo ambiguous; exit 0; }; _pid=$(cat "$_pf" 2>/dev/null); case "$_pid" in (''|*[!0-9]*) echo invalid; exit 0;; esac; if test "$_matches" = 0; then test -d "/proc/$_pid" && echo mismatch || echo none; exit 0; fi; test "$_pid" = "$_owned" || { echo mismatch; exit 0; }; printf 'owned:%s:%s\n' "$_pid" "$_ost"`,
  ].join(" ");
}

/** Revalidates identity before every signal; a check-to-kill syscall race remains. */
export function buildManagedProcessStopCommand(
  binary: string,
  config: string,
  pid: string,
  starttime: string,
): string {
  const b = shellQuote(binary),
    c = shellQuote(config),
    p = shellQuote(pid),
    s = shellQuote(starttime);
  const owns = `owns(){ test "$(st "$_pid")" = "$_start" && test "$(readlink -f /proc/$_pid/exe 2>/dev/null)" = "$_bin" && ${EXACT_ARGV}; };`;
  return [
    `_pid=${p}; _start=${s}; _bin=${b}; _cfg=${c}; ${REMOTE_ST_HELPER} ${owns}`,
    `owns || exit 1; owns && kill -TERM "$_pid";`,
    `_i=0; while owns && [ $_i -lt 50 ]; do sleep .1; _i=$((_i+1)); done;`,
    `if owns; then owns && kill -KILL "$_pid"; fi;`,
    `_i=0; while owns && [ $_i -lt 20 ]; do sleep .1; _i=$((_i+1)); done; ! owns`,
  ].join(" ");
}

/**
 * Docker identity/runtime-state provisioning for a managed install or
 * upgrade. Runs as one remote shell script and MUST execute before any
 * `-once` preflight or service start:
 *
 * Privileged (root or passwordless sudo):
 * 1. Fails closed when either file exists without the other: a partial pair
 *    is never completed, and runtime keys without an identity are refused
 *    rather than silently rotating a fresh identity.
 * 2. Runs `-provision-docker-state` idempotently: a valid existing pair is
 *    preserved byte-for-byte (no rotation on upgrade), then ownership/mode
 *    are enforced (identity root:root 0600,
 *    runtime keys <login-user>:<login-group> 0600).
 * 3. Re-runs provisioning with the login user's uid as the runtime owner so
 *    the final state passes exactly the validation the agent performs before
 *    it starts.
 *
 * Unprivileged (non-root without passwordless sudo):
 * 1. Clean install (neither file exists) provisions a user-owned 0600 pair
 *    directly, with no privilege escalation attempt (runtime owner uid must
 *    equal the invoking euid, which the agent CLI enforces).
 * 2. An existing intact user-owned pair is re-provisioned as the login user:
 *    the agent validates content and the runtime↔identity match and preserves
 *    both files byte-for-byte (no rotation on upgrade).
 * 3. An existing root-owned identity with user-owned runtime keys is left
 *    completely untouched (no provision, no chown/chmod): stat checks confirm
 *    regular files, 0600 modes, non-empty content, and the split owners, then
 *    the script exits 0 so the caller's subsequent `-once` preflight runs. That
 *    preflight validates the runtime keys standalone (strict JSON, 32-byte
 *    keys, 0600 + owner, delivery-state MAC) — it never reads the identity
 *    file, so the runtime↔identity cryptographic match is unverifiable as the
 *    SSH user and is revalidated by the next privileged provision. An absent
 *    identity fails closed at the shell guard above rather than being accepted.
 * 4. Anything else fails closed: a partial pair, non-regular files, insecure
 *    modes, unexpected owners, or empty files exit non-zero without touching
 *    state.
 *
 * Every failure path exits non-zero; the SSH layer rejects the command, the
 * install/upgrade job fails, and no service is started or restarted.
 */
export function buildDockerStateProvisionCommand(
  binary: string,
  remoteDir: string,
): string {
  const b = shellQuote(binary);
  const d = shellQuote(remoteDir);
  return [
    "set -eu",
    `_d=${d}; _b=${b}; _id="$_d/docker-identity.json"; _rk="$_d/runtime-keys.json"; _u=$(id -u)`,
    `# Privilege: root, else passwordless sudo (verified with sudo -n), else unprivileged user-owned state only.`,
    `if [ "$_u" -eq 0 ]; then _s=''; elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then _s='sudo -n'; else _s='_nosudo'; fi`,
    `if [ -e "$_rk" ] && [ ! -e "$_id" ]; then echo "Docker runtime keys exist without the installation identity ($_id); refusing to rotate the installation identity" >&2; exit 1; fi`,
    `if [ -e "$_id" ] && [ ! -e "$_rk" ]; then echo "Docker installation identity exists without runtime keys ($_rk); refusing to provision a partial pair" >&2; exit 1; fi`,
    `_p=0; if [ -e "$_rk" ]; then _o=$(stat -c %u "$_rk"); case "$_o" in 0|"$_u") _p="$_o";; *) echo "Unexpected owner uid $_o for $_rk; refusing to touch Docker runtime keys" >&2; exit 1;; esac; fi`,
    `if [ "$_s" != '_nosudo' ]; then $_s "$_b" -provision-docker-state -docker-identity-path "$_id" -docker-runtime-keys-path "$_rk" -docker-runtime-owner-uid "$_p"; $_s chown root:root "$_id"; $_s chown "$_u:$(id -gn)" "$_rk"; $_s chmod 0600 "$_id" "$_rk"; $_s "$_b" -provision-docker-state -docker-identity-path "$_id" -docker-runtime-keys-path "$_rk" -docker-runtime-owner-uid "$_u"; exit 0; fi`,
    `if [ ! -e "$_id" ] && [ ! -e "$_rk" ]; then "$_b" -provision-docker-state -docker-identity-path "$_id" -docker-runtime-keys-path "$_rk" -docker-runtime-owner-uid "$_u"; exit 0; fi`,
    `if [ ! -f "$_id" ] || [ ! -f "$_rk" ]; then echo "Docker state files must be regular files; refusing to provision without privilege" >&2; exit 1; fi`,
    `_im=$(stat -c %a "$_id"); _io=$(stat -c %u "$_id"); _rm=$(stat -c %a "$_rk"); _ro=$(stat -c %u "$_rk")`,
    `case "$_im" in 600) ;; *) echo "Insecure mode $_im for $_id; refusing to provision without privilege" >&2; exit 1;; esac`,
    `case "$_rm" in 600) ;; *) echo "Insecure mode $_rm for $_rk; refusing to provision without privilege" >&2; exit 1;; esac`,
    `if [ "$_io" = "$_u" ] && [ "$_ro" = "$_u" ]; then "$_b" -provision-docker-state -docker-identity-path "$_id" -docker-runtime-keys-path "$_rk" -docker-runtime-owner-uid "$_u"; exit 0; fi`,
    `if [ "$_io" = 0 ] && [ "$_ro" = "$_u" ] && [ -s "$_id" ] && [ -s "$_rk" ]; then exit 0; fi`,
    `echo "Unexpected Docker state owners (identity uid $_io, runtime uid $_ro); refusing to touch Docker state without privilege" >&2; exit 1`,
  ].join("\n");
}

/**
 * Transactional launch: the canonical pid file is published with `mv`
 * ONLY after the newly spawned process passes exact ownership checks (PID,
 * starttime, executable, and exact argv). The cleanup trap is armed before
 * spawn. Once PID and starttime are captured, cleanup can terminate that exact
 * process even while it is still pre-exec; normal verification remains stricter.
 *
 * Temporary and canonical files are removed only when owned by this invocation.
 */
export function buildTransactionalStartCommand(
  binary: string,
  config: string,
  pidFile: string,
): string {
  const b = shellQuote(binary);
  const c = shellQuote(config);
  const p = shellQuote(pidFile);
  return [
    `umask 077; _pf=${p}; _bin=${b}; _cfg=${c}; _pid=''; _start=''; _tmp=''; _published=0; ${REMOTE_ST_HELPER}`,
    `same_spawn(){ test -n "$_pid" && test -n "$_start" && test "$(st "$_pid")" = "$_start"; };`,
    `owns_new(){ test -n "$_start" && test "$(st "$_pid")" = "$_start" && test "$(readlink -f /proc/$_pid/exe 2>/dev/null)" = "$_bin" && ${EXACT_ARGV}; };`,
    `cleanup(){ _rc=$?; trap - EXIT HUP INT TERM; if same_spawn; then kill -TERM "$_pid" 2>/dev/null || true; _i=0; while same_spawn && [ $_i -lt 20 ]; do sleep .1; _i=$((_i+1)); done; if same_spawn; then kill -KILL "$_pid" 2>/dev/null || true; fi; _i=0; while same_spawn && [ $_i -lt 20 ]; do sleep .1; _i=$((_i+1)); done; fi; test -n "$_tmp" && rm -f -- "$_tmp"; if [ "$_published" = 1 ] && test -n "$_pid" && [ "$(cat "$_pf" 2>/dev/null)" = "$_pid" ]; then rm -f -- "$_pf"; fi; exit "$_rc"; };`,
    `trap 'cleanup' EXIT; trap 'exit 1' HUP INT TERM;`,
    `nohup "$_bin" -config "$_cfg" >/dev/null 2>&1 & _pid=$!;`,
    `case "$_pid" in (''|*[!0-9]*) exit 1;; esac; _start=$(st "$_pid"); test -n "$_start" || exit 1;`,
    `_tmp="$_pf.tmp.$_pid.$_start"; test ! -e "$_tmp" || exit 1;`,
    `printf '%s\\n' "$_pid" > "$_tmp" || exit 1;`,
    `sleep .2; kill -0 "$_pid" 2>/dev/null && owns_new || exit 1;`,
    `mv -- "$_tmp" "$_pf" || exit 1; _tmp=''; _published=1;`,
    `kill -0 "$_pid" 2>/dev/null && owns_new || exit 1;`,
    `_published=0; trap - EXIT HUP INT TERM; exit 0`,
  ].join(" ");
}
