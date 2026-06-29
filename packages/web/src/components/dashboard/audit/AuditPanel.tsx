import { useState } from "react";
import { Activity, AlertTriangle, Copy, X } from "lucide-react";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../../ui/drawer";
import { ScrollArea } from "../../ui/scroll-area";
import { formatDate } from "../../../lib/dashboard-formatters";
import type { DashboardOverview } from "../../../lib/api";
import { EmptyState } from "../shared/EmptyState";

export function AuditPanel({
  events,
  compact = false,
}: {
  events: DashboardOverview["auditEvents"];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [serverFilter, setServerFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<
    DashboardOverview["auditEvents"][number] | null
  >(null);
  const actors = Array.from(
    new Set(events.map((event) => event.actor || "system")),
  );
  const servers = Array.from(
    new Set(
      events
        .map((event) => event.serverLabel || event.resourceId)
        .filter(Boolean) as string[],
    ),
  );
  const visibleEvents = events.filter((event) => {
    const severity =
      event.severity || (event.result === "success" ? "info" : "warning");
    const target =
      event.serverLabel ||
      event.resourceId ||
      event.resourceType ||
      "dashboard";
    const text = [
      event.actionLabel,
      event.eventCode,
      event.action,
      event.actor,
      target,
      event.result,
      event.sourceIp,
      event.requestId,
      event.reason,
      event.jobId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuick =
      quickFilter === "all" ||
      (quickFilter === "critical" && severity === "critical") ||
      (quickFilter === "failures" && event.result === "failure") ||
      (quickFilter === "security" &&
        (event.action.includes("ssh") ||
          event.resourceType === "vps" ||
          event.authMethod)) ||
      (quickFilter === "terminal" && event.resourceType === "terminal");
    return (
      text.includes(query.trim().toLowerCase()) &&
      (severityFilter === "all" || severity === severityFilter) &&
      (statusFilter === "all" || event.result === statusFilter) &&
      (actorFilter === "all" || (event.actor || "system") === actorFilter) &&
      (serverFilter === "all" || target === serverFilter) &&
      matchesQuick
    );
  });
  const summary = {
    total: events.length,
    critical: events.filter((event) => event.severity === "critical").length,
    blocked: events.filter((event) => event.result === "blocked").length,
    failures: events.filter(
      (event) =>
        event.result === "failure" || event.action.includes("job.failed"),
    ).length,
    terminal: events.filter((event) => event.resourceType === "terminal")
      .length,
  };
  const displayedEvents = compact ? events.slice(0, 5) : visibleEvents;
  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="truncate text-xl font-black">
              {compact ? "Recent audit" : "Audit"}
            </CardTitle>
            <CardDescription>
              {compact
                ? "Latest security and operations events."
                : "Review security, SSH access, jobs, and terminal activity."}
            </CardDescription>
          </div>
          {!compact ? (
            <Badge variant={summary.critical ? "destructive" : "secondary"}>
              {summary.critical} critical
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 max-w-full space-y-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">
        {!compact ? (
          <>
            <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[minmax(0,1fr)_155px_145px_145px_165px_130px]">
              <Input
                aria-label="Search audit events"
                placeholder="Search events..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                aria-label="Filter severity"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <select
                aria-label="Filter status"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="blocked">Blocked</option>
              </select>
              <select
                aria-label="Filter actor"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={actorFilter}
                onChange={(event) => setActorFilter(event.target.value)}
              >
                <option value="all">All actors</option>
                {actors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter server"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={serverFilter}
                onChange={(event) => setServerFilter(event.target.value)}
              >
                <option value="all">All servers</option>
                {servers.map((server) => (
                  <option key={server} value={server}>
                    {server}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter time range"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                defaultValue="24h"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7d</option>
              </select>
            </section>
            <section className="flex flex-wrap gap-2">
              {[
                ["all", "All events"],
                ["critical", "Critical only"],
                ["failures", "Failures"],
                ["security", "SSH/security"],
                ["terminal", "Terminal sessions"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={quickFilter === value ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl text-xs font-black ${quickFilter === value ? "bg-slate-950 text-white shadow-sm hover:bg-slate-800" : "bg-white"}`}
                  onClick={() => setQuickFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AuditSummary label="Total events" value={summary.total} />
              <AuditSummary
                label="Critical"
                value={summary.critical}
                tone="red"
              />
              <AuditSummary
                label="Failures"
                value={summary.failures}
                tone="amber"
              />
              <AuditSummary
                label="Blocked"
                value={summary.blocked}
                tone="red"
              />
              <AuditSummary
                label="Terminal sessions"
                value={summary.terminal}
              />
            </section>
          </>
        ) : null}
        {displayedEvents.length ? (
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
            <div className="hidden grid-cols-[1fr_1.55fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.8fr] gap-3 bg-slate-100 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500 lg:grid">
              <span>Time</span>
              <span>Event</span>
              <span>Actor</span>
              <span>Server</span>
              <span>Severity</span>
              <span>Status</span>
              <span>Source/IP</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-slate-200">
              {displayedEvents.map((event, index) => {
                const target =
                  event.serverLabel ||
                  [event.resourceType, event.resourceId]
                    .filter(Boolean)
                    .join("/") ||
                  "dashboard";
                const severity =
                  event.severity ||
                  (event.result === "success" ? "info" : "warning");
                const isCritical = severity === "critical";
                const detail =
                  event.reason ||
                  event.jobId ||
                  event.requestId ||
                  event.authMethod ||
                  event.client;
                return (
                  <article
                    key={event.id}
                    className={`grid min-w-0 gap-2 border-l-4 px-3 py-4 text-sm font-semibold leading-6 text-slate-600 transition hover:bg-cyan-50/60 lg:grid-cols-[1fr_1.55fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.8fr] lg:items-center ${isCritical ? "border-l-red-500 bg-red-50/70" : index % 2 ? "border-l-transparent bg-slate-50/60" : "border-l-transparent bg-white"}`}
                  >
                    <span className="font-bold text-slate-600">
                      {formatDate(event.timestamp)}
                    </span>
                    <span className="flex min-w-0 items-start gap-2 text-slate-950">
                      <span
                        className={`mt-1 shrink-0 ${isCritical ? "text-red-600" : "text-slate-500"}`}
                      >
                        {isCritical ? (
                          <AlertTriangle size={16} />
                        ) : (
                          <Activity size={16} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-black">
                          {event.actionLabel || event.action}
                        </span>
                        <span className="block truncate font-mono text-[11px] font-bold text-slate-400">
                          {event.actionLabel
                            ? event.eventCode || event.action
                            : ""}
                        </span>
                        {detail ? (
                          <span className="block truncate text-xs font-semibold text-slate-400">
                            {event.reason
                              ? `Reason: ${event.reason}`
                              : String(detail)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="truncate">{event.actor || "system"}</span>
                    <span className="w-fit max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">
                      {target}
                    </span>
                    <Badge
                      className="w-fit uppercase"
                      variant={
                        severity === "warning"
                          ? "warning"
                          : severity === "critical"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {severity}
                    </Badge>
                    <Badge
                      className="w-fit uppercase"
                      variant={
                        event.result === "success" ? "ready" : "destructive"
                      }
                    >
                      {event.result}
                    </Badge>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-slate-700">
                        {event.sourceIp || event.client || "n/a"}
                      </span>
                      {event.requestId ? (
                        <span className="block truncate font-mono text-[10px] text-slate-400">
                          {event.requestId}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 w-fit rounded-lg border-slate-300 bg-white px-2 text-xs font-black shadow-sm ${isCritical ? "border-red-300 text-red-700 hover:bg-red-50" : "text-slate-700"}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      Details
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState>No audit events match these filters.</EmptyState>
        )}
        {selectedEvent ? (
          <AuditDetailsDrawer
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function AuditSummary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "amber";
}) {
  const colors =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
        {label}
      </p>
      <strong className="mt-1 block text-3xl font-black leading-none">
        {value}
      </strong>
    </div>
  );
}

function AuditDetailsDrawer({
  event,
  onClose,
}: {
  event: DashboardOverview["auditEvents"][number];
  onClose: () => void;
}) {
  const severity =
    event.severity || (event.result === "success" ? "info" : "warning");
  const target =
    event.serverLabel ||
    [event.resourceType, event.resourceId].filter(Boolean).join("/") ||
    "dashboard";
  const payload = JSON.stringify(event, null, 2);
  const copyText = (value: string) => navigator.clipboard?.writeText(value).catch(() => undefined);
  return (
    <Drawer
      open
      handleOnly
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="right"
    >
      <DrawerContent showHandle={false} className="inset-y-0 bottom-auto left-auto right-0 mt-0 h-full w-full max-w-2xl select-text rounded-none border-l border-slate-200 bg-white shadow-2xl after:hidden">
        <DrawerHeader className="border-b border-slate-200 p-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Audit event details</p>
              <DrawerTitle className="mt-2 break-words text-2xl font-black text-slate-950">{event.actionLabel || event.action}</DrawerTitle>
              <DrawerDescription className="font-mono text-sm font-bold text-slate-500">{event.eventCode || event.action}</DrawerDescription>
            </div>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 border-slate-300 bg-white text-slate-800 shadow-sm" aria-label="Close audit details" onClick={onClose}><X size={16} /></Button>
          </div>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" onClick={() => copyText(payload)}><Copy size={14} />Copy payload</Button>
              {event.requestId ? <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" onClick={() => copyText(event.requestId || "")}><Copy size={14} />Copy request ID</Button> : null}
              {event.serverLabel || event.resourceId ? <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" disabled title="Coming soon">Open server</Button> : null}
              {event.jobId ? <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" disabled title="Coming soon">View related job</Button> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AuditDetail label="Actor" value={event.actor || "system"} />
              <AuditDetail label="Server" value={target} />
              <AuditDetail label="Severity" value={severity} />
              <AuditDetail label="Status" value={event.result} />
              <AuditDetail label="Time" value={formatDate(event.timestamp)} />
              <AuditDetail
                label="Source/IP"
                value={event.sourceIp || event.client || "n/a"}
              />
              <AuditDetail
                label="Request ID"
                value={event.requestId || "n/a"}
              />
              <AuditDetail label="Related job" value={event.jobId || "n/a"} />
              <AuditDetail
                label="Auth method"
                value={event.authMethod || "n/a"}
              />
              <AuditDetail
                label="Duration"
                value={
                  event.durationMs
                    ? `${Math.round(event.durationMs / 1000)}s`
                    : "n/a"
                }
              />
            </div>
            {event.reason ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                <span className="block text-xs font-black uppercase tracking-[0.12em] text-red-500">
                  Reason
                </span>
                {event.reason}
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Raw payload
              </p>
              <ScrollArea className="mt-3 h-96 rounded-lg">
                <pre className="whitespace-pre-wrap break-words pr-4 text-xs font-semibold leading-5 text-slate-100">
                  {payload}
                </pre>
              </ScrollArea>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
