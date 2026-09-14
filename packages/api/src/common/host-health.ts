export const HOST_FRESHNESS_THRESHOLD_MS = 120_000;

export function deriveHostStatus(
  status: "unknown" | "healthy" | "warning" | "unreachable" | undefined,
  lastSeenAt: string | undefined,
  now = Date.now(),
): "unknown" | "healthy" | "warning" | "unreachable" {
  const storedStatus = status ?? "unknown";
  if (storedStatus === "warning") return storedStatus;
  if (!lastSeenAt) return storedStatus;
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return storedStatus;
  return now - seen >= HOST_FRESHNESS_THRESHOLD_MS ? "unreachable" : storedStatus;
}
