import {
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  History,
  Play,
  Server,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { ScrollArea } from "../../ui/scroll-area";
import type { DashboardOverview } from "../../../lib/api";

const safeCommands = [
  "uptime",
  "df -h",
  "free -m",
  "systemctl status nginx",
  "journalctl -n 20",
];

export function TerminalPanel({
  terminal,
}: {
  terminal: DashboardOverview["terminal"];
}) {
  const command = terminal.sessions[0]?.command || safeCommands[0];
  const commands = terminal.commands.length ? terminal.commands : safeCommands;
  const serverLabel = "Not tracked";
  const actor = "Not tracked";
  const duration = terminal.sessions.length ? "Recorded" : "Not tracked";
  const requestId = "Not available";
  const connectionText = terminal.sessions.length ? "connected · recorded output" : "idle · no output";

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="min-w-0 overflow-hidden border-white/10 bg-[#1f2228] text-[#ffffff] shadow-none shadow-black/20">
        <CardHeader className="border-b border-white/10 bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-none border border-[#a3a3a3]/25 bg-neutral-400/10 px-3 py-1 text-[11px] font-normal uppercase tracking-[0.16em] text-white/50">
                <ShieldCheck size={14} /> Read-only whitelist
              </div>
              <CardTitle className="flex items-center gap-2 font-mono text-xl text-white">
                <TerminalSquare className="text-white/50" size={22} />
                {terminal.label}
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-white/30">
                Safe commands only: {commands.join(", ")}. No stored
                password and no write, restart, install, or shell escape access.
              </CardDescription>
            </div>
            <div className="rounded-none border border-white/10 bg-[#1f2228]/70 px-4 py-3 font-mono text-xs text-white/50">
              <p className="text-white/50">session</p>
              <p className="mt-1 text-white/50">{connectionText}</p>
              <p className="mt-1 text-white/30">server metadata not tracked</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 rounded-none border border-white/10 bg-[#1f2228]/80 p-3 lg:grid-cols-[13rem_minmax(0,1fr)_auto] lg:items-end">
            <label className="grid gap-1.5 text-xs font-normal uppercase tracking-[0.12em] text-white/50">
              Server
              <div className="flex h-11 items-center gap-2 rounded-none border border-white/10 bg-[#1f2228] px-3 font-mono text-sm normal-case tracking-normal text-[#ffffff]">
                <Server size={15} className="text-white/50" />
                {serverLabel}
              </div>
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-normal uppercase tracking-[0.12em] text-white/50">
              Command preset / input
              <div className="flex h-11 min-w-0 items-center rounded-none border border-white/10 bg-[#1f2228] px-3 font-mono text-sm text-[#ffffff] ring-1 ring-white/[0.1]/10">
                <span className="mr-2 text-white/50">$</span>
                <span className="truncate">{command}</span>
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-none bg-neutral-800 px-4 text-sm font-normal text-white/30 opacity-60" type="button" disabled title="Run is not available in read-only mode">
                <Play size={15} /> Run
              </button>
              <button className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-none border border-white/10 px-3 text-sm font-normal text-white/50 opacity-60" type="button" disabled title="Output clearing is not available in read-only mode">
                <Trash2 size={15} /> Clear output
              </button>
              <button className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-none border border-white/10 px-3 text-sm font-normal text-white/50 opacity-60" type="button" disabled title="Output copying is not available in read-only mode">
                <Copy size={15} /> Copy output
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {commands.map((item) => (
              <span key={item} className="rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/50">
                {item}
              </span>
            ))}
          </div>

          <ScrollArea className="h-[34rem] max-w-full rounded-none border border-white/10 bg-[#1f2228] shadow-none">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-white/30">
              <span>output.log</span>
              <span>{terminal.sessions.length} session{terminal.sessions.length === 1 ? "" : "s"} · no audit reference</span>
            </div>
            <pre className="whitespace-pre-wrap break-words p-4 pr-5 font-mono text-[13px] leading-6 text-white/50">
              {terminal.sessions.map((session) => (
                `$ ${session.command}\n${session.output}\n\n`
              )).join("")}
              <span className="text-white/50">$</span>
              <span className="text-white/50"> waiting for whitelisted command</span>
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <aside className="grid gap-4">
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History size={17} /> Command history
            </CardTitle>
            <CardDescription>Recent read-only terminal runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {commands.slice(0, 5).map((item) => (
              <div key={item} className="rounded-none bg-white/[0.03] p-3 font-mono text-xs text-white/70">
                $ {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[#ffffff]">
              <Clipboard size={17} /> Audit trail
            </CardTitle>
            <CardDescription className="text-white/70/75">
              Session metadata is not tracked in this view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#ffffff]">
            <Meta icon={<Server size={15} />} label="Server" value={serverLabel} />
            <Meta icon={<CheckCircle2 size={15} />} label="Actor" value={actor} />
            <Meta icon={<Clock3 size={15} />} label="Duration" value={duration} />
            <Meta icon={<Clipboard size={15} />} label="Request id" value={requestId} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-none bg-white/[0.03] px-3 py-2">
      <span className="inline-flex items-center gap-2 font-normal text-white/70">{icon}{label}</span>
      <span className="truncate font-mono text-xs">{value}</span>
    </div>
  );
}
