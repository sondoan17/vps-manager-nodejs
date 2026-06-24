import { Activity, TerminalSquare } from "lucide-react";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { DashboardOverview, VpsRecord } from "../../lib/api";

const sections = ["Overview", "Servers", "Jobs", "Metrics", "Terminal", "Audit Log", "Settings"] as const;

function statusLabel(status: VpsRecord["status"]) {
  if (status === "healthy") return "Healthy";
  if (status === "warning") return "Warning";
  if (status === "unreachable") return "Down";
  return "Unknown";
}

type DemoDashboardProps = {
  overview: DashboardOverview;
};

export function DemoDashboard({ overview }: DemoDashboardProps) {
  return (
    <>
      {overview.banner ? <Alert className="mb-6 border-l-[6px] border-l-accent">{overview.banner}</Alert> : null}

      <nav aria-label="Dashboard sections" className="mb-6 flex flex-wrap gap-2 rounded-lg border border-border bg-card/80 p-3 shadow-panel">
        {sections.map((section) => (
          <a key={section} href={`#${section.toLowerCase().replace(/ /g, "-")}`} className="rounded-sm px-3 py-2 text-sm font-black text-primary hover:bg-secondary">
            {section}
          </a>
        ))}
      </nav>

      <section id="overview" className="mb-6 grid gap-4 md:grid-cols-4" aria-label="Operations overview">
        <Card><CardHeader><CardDescription>Total servers</CardDescription><CardTitle>{overview.summary.totalServers}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Healthy</CardDescription><CardTitle>{overview.summary.healthyServers}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Warning</CardDescription><CardTitle>{overview.summary.warningServers}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Running jobs</CardDescription><CardTitle>{overview.summary.runningJobs}</CardTitle></CardHeader></Card>
      </section>

      <Card id="servers" className="mb-6">
        <CardHeader>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent">Demo operations</p>
          <CardTitle>Servers</CardTitle>
          <CardDescription>Recruiter-safe simulated inventory with health states.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {overview.servers.map((server) => (
            <article key={server.id} className="rounded-lg border border-border bg-card/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black tracking-tight">{server.name}</h3>
                  <p className="text-sm text-muted-foreground">{server.region || "Demo region"} · {server.host}</p>
                </div>
                <Badge variant={server.status === "healthy" ? "ready" : "pending"}>{statusLabel(server.status)}</Badge>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card id="jobs">
          <CardHeader><CardTitle>Jobs</CardTitle><CardDescription>Simulated command lifecycle with bounded output previews.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {overview.jobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-border bg-secondary/50 p-4">
                <div className="flex items-center justify-between gap-3"><strong>{job.type}</strong><Badge variant={job.status === "succeeded" ? "ready" : "pending"}>{job.status}</Badge></div>
                <p className="mt-2 text-sm text-muted-foreground">{job.progress}% progress</p>
                {job.outputPreview ? <p className="mt-2 text-sm text-muted-foreground">{job.outputPreview}</p> : null}
              </article>
            ))}
          </CardContent>
        </Card>

        <Card id="metrics">
          <CardHeader><CardTitle>Metrics</CardTitle><CardDescription>Fresh and intentionally stale telemetry states.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {overview.metrics.map((metric) => (
              <article key={metric.vpsId} className="rounded-lg border border-border bg-secondary/50 p-4">
                <div className="flex items-center justify-between gap-3"><strong>{metric.vpsId}</strong><Badge variant={metric.freshness === "fresh" ? "ready" : "pending"}>{metric.freshness}</Badge></div>
                <p className="mt-2 text-sm text-muted-foreground">CPU {metric.cpu}% · Memory {metric.memory}% · Disk {metric.disk}%</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card id="terminal" className="min-w-0">
          <CardHeader><CardTitle>{overview.terminal.label}</CardTitle><CardDescription>No real SSH connections. Canned output only.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 font-black"><TerminalSquare size={18} />No real SSH connections</div>
            <p className="text-sm text-muted-foreground">Commands: {overview.terminal.commands.join(", ")}</p>
            {overview.terminal.sessions.map((session) => <pre key={session.command} className="max-w-full whitespace-pre-wrap break-words rounded-md bg-primary p-3 text-sm text-primary-foreground">$ {session.command}{"\n"}{session.output}</pre>)}
          </CardContent>
        </Card>

        <Card id="audit-log" className="min-w-0">
          <CardHeader><CardTitle>Audit Log</CardTitle><CardDescription>Timeline of safe demo actions.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {overview.auditEvents.map((event) => <div key={event.id} className="rounded-lg border border-border bg-secondary/50 p-3"><div className="flex items-center gap-2 font-black"><Activity size={16} />{event.action}</div><p className="text-sm text-muted-foreground">{event.result} · {event.timestamp}</p></div>)}
          </CardContent>
        </Card>
      </section>

      <Card id="settings" className="mb-6">
        <CardHeader><CardTitle>Settings</CardTitle><CardDescription>Read-only safety posture for portfolio review.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Badge variant="outline">APP_MODE={overview.settings.appMode}</Badge>
          <Badge variant="outline">web terminal {overview.settings.webTerminalEnabled ? "enabled" : "disabled"}</Badge>
          <Badge variant="outline">real SSH {overview.settings.realSshEnabled ? "enabled" : "disabled"}</Badge>
          <Badge variant="outline">local auth required</Badge>
        </CardContent>
      </Card>
    </>
  );
}
