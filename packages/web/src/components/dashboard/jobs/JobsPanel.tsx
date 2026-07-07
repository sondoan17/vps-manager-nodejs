import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Input } from "../../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  chipVariant,
  freshnessLabel,
} from "../../../lib/dashboard-formatters";
import type { DashboardOverview } from "../../../lib/api";
import { EmptyState } from "../shared/EmptyState";
import { SummaryPill } from "../shared/SummaryPill";

export function JobsPanel({
  jobs,
  compact = false,
}: {
  jobs: DashboardOverview["jobs"];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const running = jobs.filter((job) => job.status === "running").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const queued = jobs.filter((job) => job.status === "queued").length;
  const workers = new Set(jobs.map((job) => job.workerId).filter(Boolean)).size;
  const completed = jobs.filter(
    (job) => job.status === "succeeded" || job.status === "failed",
  ).length;
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;
  const successRate = completed ? Math.round((succeeded / completed) * 100) : 0;
  const jobTypes = Array.from(new Set(jobs.map((job) => job.type))).sort();
  const visibleJobs = jobs.filter((job) => {
    const haystack = [
      job.type,
      job.id,
      job.vpsId,
      job.workerId,
      job.status,
      job.errorMessage,
      job.outputPreview,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      haystack.includes(query.trim().toLowerCase()) &&
      (statusFilter === "all" || job.status === statusFilter) &&
      (typeFilter === "all" || job.type === typeFilter)
    );
  });

  if (compact) {
    return (
      <Card className="min-w-0 max-w-full overflow-hidden border-white/10">
        <CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="truncate text-xl font-normal">
              Recent jobs
            </CardTitle>
            <Badge
              variant={failed ? "destructive" : running ? "pending" : "outline"}
            >
              {running} running
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid min-w-0 max-w-full gap-3 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">
          {jobs.length ? (
            jobs
              .slice(0, 5)
              .map((job) => <CompactJobRow key={job.id} job={job} />)
          ) : (
            <EmptyState>No jobs yet.</EmptyState>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-white/10 bg-white/[0.03] shadow-none">
      <CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-xl font-normal">Jobs</CardTitle>
            <CardDescription>
              Background work across provisioning, metrics, and key checks.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] p-1 shadow-none">
              <Button
                type="button"
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                className="h-9 rounded-none px-3 text-xs font-normal"
                onClick={() => setViewMode("compact")}
              >
                Compact view
              </Button>
              <Button
                type="button"
                variant={viewMode === "detailed" ? "secondary" : "ghost"}
                size="sm"
                className="h-9 rounded-none px-3 text-xs font-normal"
                onClick={() => setViewMode("detailed")}
              >
                Detailed view
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-1 rounded-none border-white/10 bg-white/[0.03] text-sm font-normal shadow-none"
            >
              Logs
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 max-w-full gap-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">
        <section
          className="grid gap-3 rounded-none border-0 bg-white/[0.03] shadow-none p-3 md:grid-cols-[minmax(0,1fr)_170px_190px]"
          aria-label="Jobs filters"
        >
          <Input
            aria-label="Search jobs"
            placeholder="Search jobs..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter job status"
            className="h-10 rounded-none border-0 bg-white/[0.03] shadow-none px-3 text-sm font-normal text-white/70 outline-none focus:ring-4 focus:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
          <select
            aria-label="Filter job type"
            className="h-10 rounded-none border-0 bg-white/[0.03] shadow-none px-3 text-sm font-normal text-white/70 outline-none focus:ring-4 focus:ring-ring"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </section>
        {visibleJobs.length ? (
          <div className="grid gap-2">
            {visibleJobs.map((job) =>
              viewMode === "compact" ? (
                <JobCompactListRow key={job.id} job={job} />
              ) : (
                <JobCard key={job.id} job={job} />
              ),
            )}
          </div>
        ) : (
          <EmptyState>No jobs match these filters.</EmptyState>
        )}
        <section
          className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 xl:grid-cols-5"
          aria-label="Jobs summary"
        >
          <SummaryPill label="Workers" value={`${workers || 0}`} />
          <SummaryPill label="Running" value={`${running}`} />
          <SummaryPill label="Queued" value={`${queued}`} />
          <SummaryPill
            label="Failed"
            value={`${failed}`}
            tone={failed ? "red" : "default"}
          />
          <SummaryPill
            label="Success rate"
            value={completed ? `${successRate}%` : "n/a"}
          />
        </section>
      </CardContent>
    </Card>
  );
}

function CompactJobRow({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  return (
    <article className="grid min-w-0 gap-2 rounded-none border-0 bg-white/[0.03] shadow-none p-3 shadow-none">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <strong
            className="block truncate text-[17px] font-normal leading-6 text-[#ffffff]"
            title={job.type}
          >
            {job.type}
          </strong>
          <p
            className="mt-1 truncate text-[15px] font-normal leading-6 text-white/50"
            title={`${job.vpsId} \u00b7 ${progress}% progress`}
          >
            {job.vpsId} · {job.workerId || "Worker n/a"} · {progress}% progress
          </p>
        </div>
        <Badge className="shrink-0 uppercase" variant={chipVariant(job.status)}>
          {job.status}
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-none bg-white/[0.03]">
        <div
          className="h-full rounded-none bg-white/[0.03]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}

function JobCompactListRow({
  job,
}: {
  job: DashboardOverview["jobs"][number];
}) {
  const progress = Math.min(100, Math.max(0, job.progress));
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const durationText =
    job.durationMs != null
      ? `${(job.durationMs / 1000).toFixed(0)}s`
      : "duration n/a";
  const meta = [
    job.vpsId,
    job.workerId || "worker n/a",
    durationText,
    `${job.retryCount ?? 0} retries`,
    job.startedAt ? `started ${freshnessLabel(job.startedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
  return (
    <article
      className={`grid min-w-0 gap-2 rounded-none border px-3 py-2.5 shadow-none md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${isFailed ? "border-white/10 bg-white/[0.03]" : isRunning ? "border-white/10 bg-white/[0.03]/40 ring-1 ring-white/10" : "border-white/10 bg-white/[0.03]"}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong
            className="truncate text-[15px] font-normal text-[#ffffff]"
            title={job.type}
          >
            {job.type}
          </strong>
          <JobStatusBadge status={job.status} />
          <span className="truncate font-mono text-[11px] font-normal text-white/30">
            {job.id}
          </span>
        </div>
        <p
          className="mt-1 truncate text-xs font-normal text-white/50"
          title={meta}
        >
          {meta}
        </p>
        {isQueued ? (
          <p className="mt-1 text-xs font-normal text-white/50">
            Queued / {job.outputPreview || "Waiting for an available worker."}
          </p>
        ) : null}
        {isFailed && job.errorMessage ? (
          <p className="mt-1 line-clamp-2 text-xs font-normal text-white/70">
            {job.errorMessage}
          </p>
        ) : null}
        {!isQueued ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-none bg-white/[0.03]">
            <div
              className={`h-full rounded-none ${isFailed ? "bg-[#1f2228]" : isRunning ? "bg-[#1f2228]" : "bg-neutral-400"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {!isQueued ? (
          <span className="min-w-12 text-right text-xs font-normal text-white/50">
            {progress}%
          </span>
        ) : null}
        {job.errorLogUrl ? (
          <Button
            type="button"
            asChild
            variant={
              isFailed ? "destructive" : isRunning ? "secondary" : "outline"
            }
            size="sm"
            className={`h-8 rounded-none text-xs font-normal ${isRunning ? "border-0 bg-white/[0.03] shadow-none text-[#ffffff] hover:bg-white/[0.03]" : ""}`}
          >
            <a href={job.errorLogUrl} target="_blank" rel="noopener noreferrer">
              View log
            </a>
          </Button>
        ) : null}
        {isRunning ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none text-xs font-normal"
            disabled
          >
            Cancel
          </Button>
        ) : null}
        {isFailed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none border-white/10 text-xs font-normal text-white/70"
            disabled
          >
            Retry
          </Button>
        ) : null}
        <JobOverflow job={job} />
      </div>
    </article>
  );
}

function JobCard({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  const durationText =
    job.durationMs != null
      ? `${(job.durationMs / 1000).toFixed(0)}s`
      : "Duration n/a";
  const retryText = `${job.retryCount ?? 0} retries`;
  const timeBits = [
    job.startedAt ? `Started ${freshnessLabel(job.startedAt)}` : null,
    job.finishedAt ? `Finished ${freshnessLabel(job.finishedAt)}` : null,
  ].filter(Boolean);
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const inlineMeta = [
    job.vpsId,
    job.workerId || "Worker n/a",
    durationText,
    retryText,
    ...timeBits,
  ].join(" \u00b7 ");
  return (
    <article
      className={`grid min-w-0 gap-3 rounded-none border p-4 shadow-none ${isFailed ? "border-white/10 bg-white/[0.03]/60 ring-1 ring-white/10" : "border-white/10 bg-white/[0.03]"}`}
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong
              className="truncate text-lg font-normal leading-6 text-[#ffffff]"
              title={job.type}
            >
              {job.type}
            </strong>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 break-all font-mono text-xs font-normal text-white/50">
            {job.id}
          </p>
          <p className="mt-2 text-sm font-normal leading-5 text-white/50">
            {inlineMeta}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {job.errorLogUrl ? (
            <Button
              type="button"
              asChild
              variant={
                isFailed ? "destructive" : isRunning ? "secondary" : "outline"
              }
              size="sm"
              className={`rounded-none ${isRunning ? "border-0 bg-white/[0.03] shadow-none text-[#ffffff] hover:bg-white/[0.03]" : ""}`}
            >
              <a
                href={job.errorLogUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View log
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none"
              disabled
            >
              View log
            </Button>
          )}
          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none"
              disabled
              title="Cancel is not wired to an API yet"
            >
              Cancel
            </Button>
          ) : null}
          {isFailed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none border-white/10 text-white/70 hover:bg-white/[0.03]"
              disabled
              title="Retry is not wired to an API yet"
            >
              Retry
            </Button>
          ) : null}
          <JobOverflow job={job} />
        </div>
      </div>
      {isQueued ? (
        <p className="rounded-none border-0 bg-white/[0.03] shadow-none px-3 py-2 text-sm font-normal leading-5 text-white/50">
          Queued / {job.outputPreview || "Waiting for an available worker."}
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 text-xs font-normal uppercase tracking-[0.08em] text-white/50">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-none bg-white/[0.03]">
            <div
              className={`h-full rounded-none ${isFailed ? "bg-[#1f2228]" : isRunning ? "bg-[#1f2228]" : "bg-white/[0.03]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {job.errorMessage ? (
        <p className="rounded-none border-0 bg-white/[0.03] shadow-none px-3 py-2 text-sm font-normal leading-5 text-white/70">
          {job.errorMessage}
        </p>
      ) : job.outputPreview && !isQueued ? (
        <p className="rounded-none border-0 bg-white/[0.03] shadow-none px-3 py-2 text-sm font-normal leading-5 text-white/50">
          {job.outputPreview}
        </p>
      ) : null}
    </article>
  );
}

function JobStatusBadge({
  status,
}: {
  status: DashboardOverview["jobs"][number]["status"];
}) {
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-normal uppercase text-white/70">
        <span className="h-1.5 w-1.5 animate-pulse rounded-none bg-white/[0.03]" />
        Running
      </span>
    );
  return (
    <Badge className="uppercase" variant={chipVariant(status)}>
      {status}
    </Badge>
  );
}

function JobOverflow({ job }: { job: DashboardOverview["jobs"][number] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-none px-2"
          aria-label={`More actions for ${job.id}`}
        >
          <MoreHorizontal size={15} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[80] w-44 rounded-none border-0 bg-white/[0.03] shadow-none shadow-none shadow-black/20"
      >
        <DropdownMenuItem disabled className="opacity-45">
          Restart worker
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-45">
          Open server
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigator.clipboard?.writeText(job.id)}
        >
          Copy job id
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
