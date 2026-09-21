import type { DockerStorageLatest } from "../../../lib/api";
import { formatBytes } from "../servers/helpers";
import { EmptyState } from "../shared/EmptyState";

/** Docker-managed storage overview (never host free space). Read-only. */
export function DockerStorageOverview({
  storage,
  loading,
  error,
}: {
  storage: DockerStorageLatest | null;
  loading: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <section aria-label="Docker storage" aria-busy="true" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/50">Loading Docker-managed storage…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="Docker storage" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/70">Docker-managed storage is unavailable right now.</p>
        <p className="mt-1 text-[11px] text-white/40">{error}</p>
      </section>
    );
  }
  if (!storage) {
    return (
      <section aria-label="Docker storage" className="rounded-none border border-white/10 bg-black/10 p-4">
        <h3 className="text-xs font-medium text-white/75">Docker-managed storage</h3>
        <div className="mt-2">
          <EmptyState>
            No Docker-managed storage reported yet. This section covers Docker-managed images, containers, volumes, and build cache — never host free space.
          </EmptyState>
        </div>
      </section>
    );
  }

  const rows = [
    { label: "Images", value: storage.images },
    { label: "Containers", value: storage.containers },
    { label: "Local volumes", value: storage.localVolumes },
    { label: "Build cache", value: storage.buildCache },
  ];

  return (
    <section aria-label="Docker storage" className="rounded-none border border-white/10 bg-black/10 p-4">
      <h3 className="text-xs font-medium text-white/75">Docker-managed storage</h3>
      <p className="mt-1 text-[11px] text-white/40">
        Docker-managed usage only — never host free space. Reported {new Date(storage.collectedAt).toLocaleString()}.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="rounded-none border border-white/10 bg-black/20 px-3 py-2 text-[12px]">
            <dt className="text-white/50">{label}</dt>
            <dd className="mt-0.5 text-white/85">
              {value.supported ? `${value.count} · ${formatBytes(value.totalBytes)}` : "Not reported by this agent"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
