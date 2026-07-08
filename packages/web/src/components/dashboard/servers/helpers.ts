/** Format bytes as human-readable string (B/KB/MB/GB/TB). */
export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "n/a";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let next = value;
  let index = 0;
  while (next >= 1024 && index < units.length - 1) {
    next /= 1024;
    index += 1;
  }
  return `${next >= 10 || index === 0 ? next.toFixed(0) : next.toFixed(1)} ${units[index]}`;
}

/** Map Docker error codes to human-readable messages. */
export function formatDockerError(errorCode?: string): string {
  const labels: Record<string, string> = {
    socket_missing: "Docker socket missing",
    permission_denied: "Permission denied",
    timeout: "Docker timed out",
    daemon_unreachable: "Docker daemon unreachable",
    unsupported_os: "Unsupported OS",
    bad_response: "Bad Docker response",
  };
  return labels[errorCode || ""] || "Docker unavailable";
}
