export function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(0, Math.floor(seconds / 60))}m`;
}
