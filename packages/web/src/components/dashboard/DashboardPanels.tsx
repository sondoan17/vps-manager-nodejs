import { useState, type FormEvent, type ReactNode } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Clock3, Cpu, Edit3, HardDrive, KeyRound, MapPin, MemoryStick, MoreHorizontal, Network, RotateCw, Server, ServerCog, ShieldCheck, TerminalSquare, Trash2, type LucideIcon } from "lucide-react";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { chipVariant, formatDate, freshnessLabel, serverStatusLabel } from "../../lib/dashboard-formatters";
import type { DashboardOverview, VpsRecord } from "../../lib/api";

export function DemoBanner({ overview }: { overview: DashboardOverview }) {
  if (!overview.banner) return null;
  return <Alert className="mb-4 rounded-2xl border-0 bg-white/75 text-primary shadow-sm ring-1 ring-primary/10">{overview.banner}</Alert>;
}

export function OverviewPanel({ overview }: { overview: DashboardOverview }) {
  const avg = (key: "cpu" | "memory" | "disk") => overview.metrics.length ? Math.round(overview.metrics.reduce((sum, metric) => sum + metric[key], 0) / overview.metrics.length) : 0;
  const warningTotal = overview.summary.warningServers + overview.summary.unreachableServers;

  function findTrend(unit?: string) {
    const metric = overview.metrics.find((m) => m.trend?.unit === unit);
    if (metric?.trend) return metric.trend;
    const anyTrend = overview.metrics.find((m) => m.trend);
    return anyTrend?.trend ?? null;
  }

  const cpuTrend = findTrend("cpu");
  const memTrend = findTrend("memory");
  const diskTrend = findTrend("disk");
  const netTrend = findTrend("network") || findTrend();

  return <div className="min-w-0 space-y-4 overflow-visible"><section className="grid min-w-0 gap-3 xl:grid-cols-3" aria-label="Operations overview"><HeroStat tone="healthy" label="Fleet health" title={`${overview.summary.healthyServers} healthy`} detail={`${overview.summary.totalServers} total · ${warningTotal} need attention`} icon={Server} /><HeroStat tone="work" label="Key & job status" title={`${overview.summary.runningJobs} running`} detail="Provisioning and verification queue" icon={KeyRound} /><HeroStat tone="load" label="Resource balance" title={`${avg("cpu")}% CPU`} detail={`${avg("memory")}% RAM · ${avg("disk")}% disk`} icon={Activity} /></section><DemoBanner overview={overview} /><section className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4"><TrendCard label="CPU load" value={`${avg("cpu")}%`} detail={cpuTrend ? `${cpuTrend.range} · min ${cpuTrend.min}% max ${cpuTrend.max}%` : `${overview.metrics.length} samples`} icon={Cpu} tone="cyan" trend={cpuTrend} /><TrendCard label="Memory pressure" value={`${avg("memory")}%`} detail={memTrend ? `${memTrend.range} · min ${memTrend.min}% max ${memTrend.max}%` : `${Math.max(0, 100 - avg("memory"))}% headroom`} icon={MemoryStick} tone="violet" trend={memTrend} /><TrendCard label="Disk usage" value={`${avg("disk")}%`} detail={diskTrend ? `${diskTrend.range} · min ${diskTrend.min}% max ${diskTrend.max}%` : `across ${overview.metrics.length} servers`} icon={HardDrive} tone="amber" trend={diskTrend} /><TrendCard label="Network in/out" value={`${Math.max(12, avg("cpu") * 3)} Mbps`} detail={`${Math.max(4, avg("memory"))} Mbps out`} icon={Network} tone="slate" trend={netTrend} /></section><div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"><AuditPanel events={overview.auditEvents.slice(0, 5)} compact /><JobsPanel jobs={overview.jobs.slice(0, 5)} compact /></div></div>;
}

function HeroStat({ tone, label, title, detail, icon: Icon }: { tone: "healthy" | "work" | "load"; label: string; title: string; detail: string; icon: LucideIcon }) {
  const tones = { healthy: "border-emerald-500/30 bg-slate-950 text-white before:bg-emerald-400 text-emerald-200", work: "border-amber-500/30 bg-slate-900 text-white before:bg-amber-400 text-amber-200", load: "border-indigo-500/30 bg-slate-900 text-white before:bg-indigo-400 text-indigo-200" };
  return <article className={`${tones[tone]} before:absolute before:inset-x-0 before:top-0 before:h-1 relative min-h-28 min-w-0 overflow-hidden rounded-[1.15rem] border p-4 pt-5 shadow-sm shadow-slate-950/10 sm:min-h-32`}><div className="absolute -right-10 -top-12 h-24 w-24 rounded-full bg-current/10 blur-2xl" /><div className="relative flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><h2 className="mt-1 truncate font-display text-2xl text-white sm:text-[1.7rem]">{title}</h2><p className="mt-1 truncate text-[15px] font-semibold leading-6 text-slate-300">{detail}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-current"><Icon size={20} /></span></div></article>;
}

function TrendCard({ label, value, detail, icon: Icon, trend, tone }: { label: string; value: string; detail: string; icon: LucideIcon; trend?: { points: number[]; min: number; max: number; threshold: number; range?: string; unit?: string } | null; tone: "cyan" | "violet" | "amber" | "slate" }) {
  const stroke = { cyan: "#06b6d4", violet: "#6366f1", amber: "#d97706", slate: "#334155" }[tone];
  const points = trend?.points ?? [25, 35, 30, 45, 40, 50];
  const normalized = points.map((point) => Math.min(92, Math.max(8, point)));
  const polyline = normalized.map((point, index) => `${index * 20},${54 - point / 2}`).join(" ");
  const max = trend?.max ?? Math.max(...normalized);
  const min = trend?.min ?? Math.min(...normalized);
  const threshold = trend?.threshold ?? 80;
  const range = trend?.range ?? "60m";
  const isHot = max > 78;
  return <Card className={`min-w-0 overflow-hidden border-slate-200 bg-white shadow-sm ${isHot ? "ring-2 ring-orange-200" : ""}`}><CardContent className="p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><strong className="mt-1 block truncate text-2xl font-black text-slate-950">{value}</strong><p className="mt-1 truncate text-[15px] font-semibold leading-6 text-slate-500">{detail}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"><Icon size={18} /></span></div><div className="mt-3 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500"><span>Last {range}</span><span className={isHot ? "text-orange-600" : "text-slate-500"}>threshold {threshold}%</span></div><svg className="mt-2 h-14 w-full overflow-visible" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="14" x2="100" y2="14" stroke={isHot ? "#f97316" : "#cbd5e1"} strokeDasharray="4 4" /><polyline points={polyline} fill="none" stroke={isHot ? "#f97316" : stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><line x1="0" y1="44" x2="100" y2="44" stroke="#e2e8f0" strokeDasharray="4 4" /></svg><div className="mt-1 flex items-center justify-between text-sm font-bold leading-6 text-slate-500"><span>min {min}%</span><span>max {max}%</span></div></CardContent></Card>;
}

type ServersPanelProps = {
  records: VpsRecord[];
  visibleRecords: VpsRecord[];
  statusMessage: ReactNode;
  serverSearch: string;
  statusFilter: string;
  busy: boolean;
  provisionPasswords: Record<string, string>;
  createForm: { name: string; host: string; port: string; username: string; password: string };
  metrics: DashboardOverview["metrics"];
  jobs: DashboardOverview["jobs"];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCreateFormChange: (value: ServersPanelProps["createForm"]) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: (vps: VpsRecord, event: FormEvent<HTMLFormElement>) => void;
  onVerify: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
};

export function ServersPanel(props: ServersPanelProps) {
  const metricById = new Map(props.metrics.map((metric) => [metric.vpsId, metric]));
  return <div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]"><section className="min-w-0 space-y-4"><Card className="min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm"><CardHeader className="min-w-0 pb-3"><CardTitle className="truncate">Servers</CardTitle><CardDescription>Search, filter, install keys, and verify access.</CardDescription></CardHeader><CardContent className="min-w-0 space-y-4"><div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px]"><Input aria-label="Search servers" placeholder="Search name, host, provider, tag..." value={props.serverSearch} onChange={(event) => props.onSearchChange(event.target.value)} /><select aria-label="Filter status" className="h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-ring" value={props.statusFilter} onChange={(event) => props.onStatusFilterChange(event.target.value)}><option value="all">All states</option><option value="healthy">Healthy</option><option value="warning">Warning</option><option value="unreachable">Down</option><option value="ready">Key ready</option><option value="pending">Needs password</option></select></div>{props.statusMessage}{props.records.length === 0 ? <EmptyState>No VPS servers yet. Add your first server with the form beside this list.</EmptyState> : props.visibleRecords.length === 0 ? <EmptyState>No servers match this filter.</EmptyState> : <div className="grid min-w-0 gap-2">{props.visibleRecords.map((vps) => <ServerCard key={vps.id} vps={vps} metric={metricById.get(vps.id)} jobs={props.jobs.filter((job) => job.vpsId === vps.id)} busy={props.busy} password={props.provisionPasswords[vps.id] || ""} onPasswordChange={props.onPasswordChange} onProvision={props.onProvision} onVerify={props.onVerify} onDelete={props.onDelete} />)}</div>}<ServerOpsSummary records={props.records} metrics={props.metrics} /></CardContent></Card></section><CreateServerCard {...props} /></div>;
}

function CreateServerCard({ createForm, busy, onCreate, onCreateFormChange }: ServersPanelProps) {
  return <Card className="h-fit min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm"><CardHeader className="min-w-0 pb-3"><p className="truncate text-xs font-black uppercase tracking-[0.18em] text-accent">Add server</p><CardTitle className="truncate">New VPS</CardTitle><CardDescription>Password is optional and never stored.</CardDescription></CardHeader><CardContent><form onSubmit={onCreate} autoComplete="off" className="grid min-w-0 gap-4"><fieldset className="grid gap-3"><legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Basic info</legend><Label>Name<Input required maxLength={120} placeholder="prod-sgp-01" value={createForm.name} onChange={(event) => onCreateFormChange({ ...createForm, name: event.target.value })} /></Label><Label>Host / IP<Input required maxLength={255} placeholder="203.0.113.20" value={createForm.host} onChange={(event) => onCreateFormChange({ ...createForm, host: event.target.value })} /></Label></fieldset><fieldset className="grid gap-3"><legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">SSH access</legend><div className="grid min-w-0 gap-3 sm:grid-cols-2"><Label>Port<Input required type="number" min={1} max={65535} value={createForm.port} onChange={(event) => onCreateFormChange({ ...createForm, port: event.target.value })} /></Label><Label>Username<Input required maxLength={64} placeholder="root" value={createForm.username} onChange={(event) => onCreateFormChange({ ...createForm, username: event.target.value })} /></Label></div></fieldset><fieldset className="grid gap-3"><legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Key provisioning</legend><Label>Optional password<Input type="password" maxLength={4096} autoComplete="new-password" placeholder="One-time key install" value={createForm.password} onChange={(event) => onCreateFormChange({ ...createForm, password: event.target.value })} /></Label></fieldset><Button type="submit" disabled={busy} className="min-w-0 rounded-xl"><Server size={18} /><span className="truncate">Create VPS</span></Button></form></CardContent></Card>;
}

function ServerCard({ vps, metric, jobs, busy, password, onPasswordChange, onProvision, onVerify, onDelete }: { vps: VpsRecord; metric?: DashboardOverview["metrics"][number]; jobs: DashboardOverview["jobs"]; busy: boolean; password: string; onPasswordChange: (id: string, value: string) => void; onProvision: ServersPanelProps["onProvision"]; onVerify: ServersPanelProps["onVerify"]; onDelete: ServersPanelProps["onDelete"] }) {
  const isReady = Boolean(vps.keyProvisionedAt);
  const isDown = vps.status === "unreachable";
  const [showPassword, setShowPassword] = useState(false);
  return <article className={`min-w-0 rounded-xl border bg-white px-4 py-4 shadow-sm transition ${isDown ? "border-red-200 bg-red-50/45 shadow-red-950/5 ring-1 ring-red-100" : "border-slate-200 hover:border-slate-300"}`}><div className={`grid gap-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(230px,0.8fr)_minmax(220px,0.55fr)_auto] xl:items-center ${isDown ? "border-l-4 border-red-500 pl-3" : ""}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[17px] font-black tracking-tight text-slate-950">{vps.name}</h3>{isDown ? <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-black uppercase text-red-700"><AlertTriangle size={13} />Down</span> : <Badge variant={chipVariant(vps.status)}>{serverStatusLabel(vps.status)}</Badge>}<Badge variant={isReady ? "ready" : "pending"}>{isReady ? "Key ready" : "Needs password"}</Badge></div><p className="mt-1 break-all text-sm font-semibold leading-6 text-slate-600">{vps.username}@{vps.host}:{vps.port}</p><div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-bold text-slate-500"><span className="flex items-center gap-1.5"><ServerCog size={14} />{vps.provider || "Provider not set"}</span><span className="text-slate-300">/</span><span className="flex items-center gap-1.5"><MapPin size={14} />{vps.region || "Region not set"}</span><span className="text-slate-300">/</span><span className="flex items-center gap-1.5"><Clock3 size={14} />Seen {formatDate(vps.lastSeenAt)}</span></div>{vps.tags?.length ? <p className="mt-2 truncate text-xs font-bold text-slate-500" title={`Tags: ${vps.tags.join(", ")}`}><span className="font-black uppercase tracking-[0.08em] text-slate-400">Tags:</span> {vps.tags.join(", ")}</p> : null}{vps.notes ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{vps.notes}</p> : null}</div><ServerRuntimeMeta metric={metric} jobs={jobs} /><ServerMetricStrip metric={metric} /><div className="flex min-w-0 flex-wrap items-start justify-start gap-2 xl:justify-end">{isReady ? <><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onVerify(vps)}><ShieldCheck size={16} />Verify access</Button><Button type="button" size="sm" variant="secondary" className="border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-100" disabled><Activity size={16} />Metrics</Button></> : <><Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setShowPassword((value) => !value)}><KeyRound size={16} />Install key</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onVerify(vps)}><ShieldCheck size={16} />Verify access</Button></>}<ServerOverflow vps={vps} busy={busy} onRotate={() => setShowPassword(true)} onDelete={onDelete} /></div></div>{showPassword ? <form onSubmit={(event) => onProvision(vps, event)} autoComplete="off" className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]"><Label>{isReady ? "One-time password for rotation" : "One-time password"}<Input type="password" maxLength={4096} autoComplete="new-password" placeholder="Used once to install or rotate the key" value={password} onChange={(event) => onPasswordChange(vps.id, event.target.value)} /></Label><Button type="submit" size="sm" disabled={busy} className="self-end rounded-xl"><KeyRound size={16} />{isReady ? "Rotate key" : "Install key"}</Button></form> : null}</article>;
}

function ServerRuntimeMeta({ metric, jobs }: { metric?: DashboardOverview["metrics"][number]; jobs: DashboardOverview["jobs"] }) {
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const parts = [metric ? `Uptime ${formatUptime(metric.uptime)}` : null, metric ? `Last check ${freshnessLabel(metric.collectedAt)}` : null, `${runningJobs} running job${runningJobs === 1 ? "" : "s"}`].filter(Boolean);
  return <div className="min-w-0 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-bold leading-5 text-slate-600 shadow-sm"><p className="truncate" title={parts.join(" / ")}>{parts.join(" / ")}</p></div>;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(0, Math.floor(seconds / 60))}m`;
}

function ServerMetricStrip({ metric }: { metric?: DashboardOverview["metrics"][number] }) {
  const base = "rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-black text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.03)]";
  if (!metric) return <div className="flex flex-wrap items-center gap-1.5 xl:justify-end"><span className={base}>CPU n/a</span><span className={base}>RAM n/a</span><span className={base}>Disk n/a</span><span className={base}>Load n/a</span></div>;
  return <div className="flex flex-wrap items-center gap-1.5 xl:justify-end"><span className={base}><span className="text-slate-500">CPU</span> {metric.cpu}%</span><span className={base}><span className="text-slate-500">RAM</span> {metric.memory}%</span><span className={base}><span className="text-slate-500">Disk</span> {metric.disk}%</span><span className={base}><span className="text-slate-500">Load</span> {metric.loadAverage}</span></div>;
}

function ServerOverflow({ vps, busy, onRotate, onDelete }: { vps: VpsRecord; busy: boolean; onRotate: () => void; onDelete: ServersPanelProps["onDelete"] }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline" aria-label={`More actions for ${vps.name}`}><MoreHorizontal size={16} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 rounded-xl"><DropdownMenuItem disabled><TerminalSquare size={15} />Open terminal</DropdownMenuItem><DropdownMenuItem disabled><Activity size={15} />View metrics</DropdownMenuItem><DropdownMenuItem onClick={onRotate} disabled={busy}><RotateCw size={15} />{vps.keyProvisionedAt ? "Rotate key" : "Install key"}</DropdownMenuItem><DropdownMenuItem disabled><Edit3 size={15} />Edit server</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" disabled={busy} onClick={() => onDelete(vps)}><Trash2 size={15} />Delete server</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function ServerOpsSummary({ records, metrics }: { records: VpsRecord[]; metrics: DashboardOverview["metrics"] }) {
  const ready = records.filter((server) => server.keyProvisionedAt).length;
  const down = records.filter((server) => server.status === "unreachable").length;
  const regions = records.reduce<Record<string, number>>((acc, server) => { const key = server.region || "Unassigned"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const regionText = Object.entries(regions).slice(0, 3).map(([region, count]) => `${region} ${count}`).join(" \u00b7 ") || "None";
  const hottest = metrics.length ? [...metrics].sort((a, b) => b.cpu - a.cpu)[0] : null;
  return <section className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Server operations summary"><SummaryPill label="SSH keys" value={`${ready}/${records.length} ready`} /><SummaryPill label="Down" value={`${down}`} tone={down ? "red" : "default"} /><SummaryPill label="Regions" value={regionText} /><SummaryPill label="Hottest CPU" value={hottest ? `${hottest.vpsId} ${hottest.cpu}%` : "No metrics"} /></section>;
}

function SummaryPill({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "red" }) {
  return <div className={`min-w-0 rounded-xl border px-3.5 py-3 shadow-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}><p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-75">{label}</p><p className="mt-1 whitespace-normal break-words text-[15px] font-black leading-5" title={value}>{value}</p></div>;
}
export function JobsPanel({ jobs, compact = false }: { jobs: DashboardOverview["jobs"]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const running = jobs.filter((job) => job.status === "running").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const queued = jobs.filter((job) => job.status === "queued").length;
  const workers = new Set(jobs.map((job) => job.workerId).filter(Boolean)).size;
  const completed = jobs.filter((job) => job.status === "succeeded" || job.status === "failed").length;
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;
  const successRate = completed ? Math.round((succeeded / completed) * 100) : 0;
  const jobTypes = Array.from(new Set(jobs.map((job) => job.type))).sort();
  const visibleJobs = jobs.filter((job) => {
    const haystack = [job.type, job.id, job.vpsId, job.workerId, job.status, job.errorMessage, job.outputPreview].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase()) && (statusFilter === "all" || job.status === statusFilter) && (typeFilter === "all" || job.type === typeFilter);
  });

  if (compact) {
    return <Card className="min-w-0 max-w-full overflow-hidden border-slate-200"><CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4"><div className="flex items-center justify-between gap-3"><CardTitle className="truncate text-xl font-black">Recent jobs</CardTitle><Badge variant={failed ? "destructive" : running ? "pending" : "outline"}>{running} running</Badge></div></CardHeader><CardContent className="grid min-w-0 max-w-full gap-3 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">{jobs.length ? jobs.slice(0, 5).map((job) => <CompactJobRow key={job.id} job={job} />) : <EmptyState>No jobs yet.</EmptyState>}</CardContent></Card>;
  }

  return <Card className="min-w-0 max-w-full overflow-hidden border-slate-200 bg-white shadow-sm"><CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-xl font-black">Jobs</CardTitle><CardDescription>Background work across provisioning, metrics, and key checks.</CardDescription></div><div className="flex shrink-0 items-center gap-2"><div className="rounded-xl border border-slate-200 bg-slate-50 p-1"><Button type="button" variant={viewMode === "compact" ? "secondary" : "ghost"} size="sm" className="h-8 rounded-lg text-xs font-black" onClick={() => setViewMode("compact")}>Compact view</Button><Button type="button" variant={viewMode === "detailed" ? "secondary" : "ghost"} size="sm" className="h-8 rounded-lg text-xs font-black" onClick={() => setViewMode("detailed")}>Detailed view</Button></div><Button type="button" variant="outline" size="sm" className="rounded-xl text-sm font-black">Logs</Button></div></div></CardHeader><CardContent className="grid min-w-0 max-w-full gap-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0"><section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_170px_190px]" aria-label="Jobs filters"><Input aria-label="Search jobs" placeholder="Search jobs..." value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter job status" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="queued">Queued</option><option value="running">Running</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option></select><select aria-label="Filter job type" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{jobTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></section>{visibleJobs.length ? <div className="grid gap-2">{visibleJobs.map((job) => viewMode === "compact" ? <JobCompactListRow key={job.id} job={job} /> : <JobCard key={job.id} job={job} />)}</div> : <EmptyState>No jobs match these filters.</EmptyState>}<section className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Jobs summary"><SummaryPill label="Workers" value={`${workers || 0}`} /><SummaryPill label="Running" value={`${running}`} /><SummaryPill label="Queued" value={`${queued}`} /><SummaryPill label="Failed" value={`${failed}`} tone={failed ? "red" : "default"} /><SummaryPill label="Success rate" value={completed ? `${successRate}%` : "n/a"} /></section></CardContent></Card>;
}

function CompactJobRow({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  return <article className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-[17px] font-black leading-6 text-slate-950" title={job.type}>{job.type}</strong><p className="mt-1 truncate text-[15px] font-semibold leading-6 text-slate-500" title={`${job.vpsId} ? ${progress}% progress`}>{job.vpsId} ? {job.workerId || "Worker n/a"} ? {progress}% progress</p></div><Badge className="shrink-0 uppercase" variant={chipVariant(job.status)}>{job.status}</Badge></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${progress}%` }} /></div></article>;
}

function JobCompactListRow({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const durationText = job.durationMs != null ? `${(job.durationMs / 1000).toFixed(0)}s` : "duration n/a";
  const meta = [job.vpsId, job.workerId || "worker n/a", durationText, `${job.retryCount ?? 0} retries`, job.startedAt ? `started ${freshnessLabel(job.startedAt)}` : null].filter(Boolean).join(" ? ");
  return <article className={`grid min-w-0 gap-2 rounded-xl border px-3 py-2.5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${isFailed ? "border-red-200 bg-red-50/70" : "border-slate-200 bg-white"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-[15px] font-black text-slate-950" title={job.type}>{job.type}</strong><Badge className="uppercase" variant={chipVariant(job.status)}>{job.status}</Badge><span className="truncate font-mono text-[11px] font-bold text-slate-400">{job.id}</span></div><p className="mt-1 truncate text-xs font-bold text-slate-500" title={meta}>{meta}</p>{isQueued ? <p className="mt-1 text-xs font-bold text-slate-500">Queued ? {job.outputPreview || "Waiting for an available worker."}</p> : null}{isFailed && job.errorMessage ? <p className="mt-1 line-clamp-2 text-xs font-bold text-red-700">{job.errorMessage}</p> : null}</div><div className="flex flex-wrap items-center gap-2 md:justify-end">{!isQueued ? <span className="min-w-12 text-right text-xs font-black text-slate-500">{progress}%</span> : null}{job.errorLogUrl ? <Button type="button" asChild variant={isFailed ? "destructive" : isRunning ? "secondary" : "outline"} size="sm" className={`h-8 rounded-lg text-xs font-black ${isRunning ? "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : ""}`}><a href={job.errorLogUrl} target="_blank" rel="noopener noreferrer">View log</a></Button> : null}{isRunning ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs font-black" disabled>Cancel</Button> : null}{isFailed ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-red-200 text-xs font-black text-red-700" disabled>Retry</Button> : null}<JobOverflow job={job} /></div></article>;
}

function JobCard({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  const durationText = job.durationMs != null ? `${(job.durationMs / 1000).toFixed(0)}s` : "Duration n/a";
  const retryText = `${job.retryCount ?? 0} retries`;
  const timeBits = [job.startedAt ? `Started ${freshnessLabel(job.startedAt)}` : null, job.finishedAt ? `Finished ${freshnessLabel(job.finishedAt)}` : null].filter(Boolean);
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const inlineMeta = [job.vpsId, job.workerId || "Worker n/a", durationText, retryText, ...timeBits].join(" ? ");
  return <article className={`grid min-w-0 gap-3 rounded-xl border p-4 shadow-sm ${isFailed ? "border-red-200 bg-red-50/60 ring-1 ring-red-100" : "border-slate-200 bg-white"}`}><div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-lg font-black leading-6 text-slate-950" title={job.type}>{job.type}</strong><Badge className="uppercase" variant={chipVariant(job.status)}>{job.status}</Badge></div><p className="mt-1 break-all font-mono text-xs font-bold text-slate-500">{job.id}</p><p className="mt-2 text-sm font-bold leading-5 text-slate-600">{inlineMeta}</p></div><div className="flex flex-wrap items-center gap-2 xl:justify-end">{job.errorLogUrl ? <Button type="button" asChild variant={isFailed ? "destructive" : isRunning ? "secondary" : "outline"} size="sm" className={`rounded-xl ${isRunning ? "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : ""}`}><a href={job.errorLogUrl} target="_blank" rel="noopener noreferrer">View log</a></Button> : <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled>View log</Button>}{isRunning ? <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled title="Cancel is not wired to an API yet">Cancel</Button> : null}{isFailed ? <Button type="button" variant="outline" size="sm" className="rounded-xl border-red-200 text-red-700 hover:bg-red-50" disabled title="Retry is not wired to an API yet">Retry</Button> : null}<JobOverflow job={job} /></div></div>{isQueued ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold leading-5 text-slate-600">Queued ? {job.outputPreview || "Waiting for an available worker."}</p> : <div><div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500"><span>Progress</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${isFailed ? "bg-red-500" : "bg-cyan-600"}`} style={{ width: `${progress}%` }} /></div></div>}{job.errorMessage ? <p className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold leading-5 text-red-700">{job.errorMessage}</p> : job.outputPreview && !isQueued ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-5 text-slate-600">{job.outputPreview}</p> : null}</article>;
}

function JobOverflow({ job }: { job: DashboardOverview["jobs"][number] }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2" aria-label={`More actions for ${job.id}`}><MoreHorizontal size={15} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44 rounded-xl"><DropdownMenuItem disabled>Restart worker</DropdownMenuItem><DropdownMenuItem disabled>Open server</DropdownMenuItem><DropdownMenuItem onClick={() => navigator.clipboard?.writeText(job.id)}>Copy job id</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
export function MetricsPanel({ metrics }: { metrics: DashboardOverview["metrics"] }) {
  return <Card><CardHeader><CardTitle>Metrics</CardTitle><CardDescription>Telemetry freshness and resource usage.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{metrics.length ? metrics.map((metric) => <article key={metric.vpsId} className="rounded-lg border border-border bg-secondary/50 p-4"><div className="flex items-center justify-between gap-3"><strong>{metric.vpsId}</strong><Badge variant={chipVariant(metric.freshness)}>{metric.freshness}</Badge></div><p className="mt-2 text-sm text-muted-foreground">CPU {metric.cpu}% · Memory {metric.memory}% · Disk {metric.disk}%</p><p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-accent">Collected {freshnessLabel(metric.collectedAt)}</p></article>) : <EmptyState>No metrics yet.</EmptyState>}</CardContent></Card>;
}

export function AuditPanel({ events, compact = false }: { events: DashboardOverview["auditEvents"]; compact?: boolean }) {
  return <Card className="min-w-0 max-w-full overflow-hidden border-slate-200"><CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4"><CardTitle className="truncate text-xl font-black">{compact ? "Recent audit" : "Audit"}</CardTitle></CardHeader><CardContent className="min-w-0 max-w-full overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">{events.length ? <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200"><div className="hidden grid-cols-[1.05fr_1.35fr_0.9fr_1fr_0.85fr_0.8fr_0.7fr] gap-3 bg-slate-100 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500 md:grid"><span>Time</span><span>Event</span><span>Actor</span><span>Server</span><span>Severity</span><span>Status</span><span>Action</span></div><div className="divide-y divide-slate-200">{events.map((event, index) => { const target = event.serverLabel || [event.resourceType, event.resourceId].filter(Boolean).join("/") || "dashboard"; const severity = event.severity || (event.result === "success" ? "info" : "warning"); const eventLabel = event.actionLabel || event.action; return <article key={event.id} className={`grid min-w-0 gap-2 p-3 text-sm font-semibold leading-6 text-slate-600 transition hover:bg-cyan-50/60 md:grid-cols-[1.05fr_1.35fr_0.9fr_1fr_0.85fr_0.8fr_0.7fr] md:items-center ${index % 2 ? "bg-slate-50/60" : "bg-white"}`}><span className="truncate font-bold text-slate-600">{formatDate(event.timestamp)}</span><span className="flex min-w-0 items-center gap-2 font-mono text-[15px] font-semibold text-slate-950"><Activity className="shrink-0 text-slate-500" size={16} /><span className="truncate" title={event.action}>{eventLabel}</span></span><span className="truncate">{event.actor || "system"}</span><span className="w-fit max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600" title={target}>{target}</span><Badge className="w-fit uppercase" variant={severity === "warning" ? "warning" : severity === "critical" ? "destructive" : "outline"}>{severity}</Badge><Badge className="w-fit uppercase" variant={chipVariant(event.result)}>{event.result}</Badge><button type="button" className="w-fit font-black text-primary underline-offset-4 hover:underline">Details</button></article>; })}</div></div> : <EmptyState>No audit events yet.</EmptyState>}</CardContent></Card>;
}
export function TerminalPanel({ terminal }: { terminal: DashboardOverview["terminal"] }) {
  return <Card className="min-w-0"><CardHeader><CardTitle>{terminal.label}</CardTitle><CardDescription>Canned output only. No real SSH connections.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-2 font-black"><TerminalSquare size={18} />No real SSH connections</div><p className="text-sm text-muted-foreground">Commands: {terminal.commands.join(", ") || "none"}</p>{terminal.sessions.map((session) => <pre key={session.command} className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-primary p-3 text-sm text-primary-foreground">$ {session.command}{"\n"}{session.output}</pre>)}</CardContent></Card>;
}

export function SettingsPanel({ overview }: { overview: DashboardOverview }) {
  return <Card><CardHeader><CardTitle>Settings</CardTitle><CardDescription>Read-only safety posture.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Badge variant="outline">APP_MODE={overview.settings.appMode}</Badge><Badge variant="outline">web terminal {overview.settings.webTerminalEnabled ? "enabled" : "disabled"}</Badge><Badge variant="outline">real SSH {overview.settings.realSshEnabled ? "enabled" : "disabled"}</Badge><Badge variant="outline">local auth {overview.settings.authRequiredInLocalMode ? "required" : "off"}</Badge></CardContent></Card>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
