import type { VpsRecord } from "./api";

export type ChipVariant = "ready" | "pending" | "destructive" | "outline";

export function serverStatusLabel(status?: VpsRecord["status"]) {
  if (status === "healthy") return "Healthy";
  if (status === "warning") return "Warning";
  if (status === "unreachable") return "Down";
  return "Unknown";
}

export function chipVariant(status?: string): ChipVariant {
  if (
    ["healthy", "fresh", "succeeded", "success", "ready"].includes(status || "")
  )
    return "ready";
  if (
    ["unreachable", "failed", "failure", "blocked", "destructive"].includes(
      status || "",
    )
  )
    return "destructive";
  if (!status || status === "unknown") return "outline";
  return "pending";
}

export function formatDate(value?: string) {
  if (!value) return "Not reported";
  return new Date(value).toLocaleString();
}

export function freshnessLabel(value?: string) {
  if (!value) return "No timestamp";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
