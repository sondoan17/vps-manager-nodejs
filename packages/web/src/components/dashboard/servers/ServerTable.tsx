import { useState } from "react";
import { Link } from "react-router-dom";
import { DownloadCloud, MoreHorizontal, ShieldCheck, Trash2, Unplug } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import {
  chipVariant,
  formatDate,
  serverStatusLabel,
  vpsDisplayName,
} from "../../../lib/dashboard-formatters";
import type { VpsRecord } from "../../../lib/api";
import type { DashboardJob } from "../../../lib/api";
import { AgentLifecycleStatus, agentJobFor } from "./AgentLifecycleStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

export function ServerTable({
  vpsList,
  busy,
  provisionPasswords,
  onVerify,
  onInstallAgent,
  onUninstallAgent,
  jobs,
  onDelete,
}: {
  vpsList: VpsRecord[];
  busy: boolean;
  provisionPasswords: Record<string, string>;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onUninstallAgent: (vps: VpsRecord) => void;
  jobs: DashboardJob[];
  onDelete: (vps: VpsRecord) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<VpsRecord | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<VpsRecord | null>(null);

  function handleDeleteClick(vps: VpsRecord) {
    const isLocalHost = vps.kind === "local" || vps.managedBy === "system";
    if (isLocalHost) return;
    setDeleteTarget(vps);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/50">
              <th className="px-3 py-2.5 font-normal">Name</th>
              <th className="px-3 py-2.5 font-normal">Host</th>
              <th className="px-3 py-2.5 font-normal">Status</th>
              <th className="px-3 py-2.5 font-normal">Key / Agent</th>
              <th className="px-3 py-2.5 font-normal">Last seen</th>
              <th className="px-3 py-2.5 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vpsList.map((vps) => {
              const displayName = vpsDisplayName(vps);
              const isLocal =
                vps.kind === "local" || vps.managedBy === "system";
              const isReady = isLocal || Boolean(vps.keyProvisionedAt);
              const serverJobs = jobs.filter((job) => job.vpsId === vps.id);
              const agentJob = agentJobFor(vps, serverJobs);
              const agentActionRunning = Boolean(agentJob && (agentJob.status === "queued" || agentJob.status === "running"));
              const showInstall = !agentActionRunning && vps.agentStatus !== "online" && vps.agentStatus !== "offline";
              const canUninstall = vps.agentStatus === "online" || vps.agentStatus === "offline" || vps.agentStatus === "failed";
              return (
                <tr
                  key={vps.id}
                  aria-label={`Server ${displayName}`}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3">
                    <Link
                      to={`/vps/${encodeURIComponent(vps.id)}`}
                      className="font-normal text-[#ffffff] hover:text-white/80"
                    >
                      {displayName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-white/70">
                    <span
                      className="truncate"
                      title={`${vps.username}@${vps.host}:${vps.port}`}
                    >
                      {vps.username}@{vps.host}:{vps.port}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={chipVariant(vps.status)}>
                      {serverStatusLabel(vps.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {isLocal ? <Badge variant="ready">
                      {isLocal
                        ? "Local agent"
                        : isReady
                          ? "Key ready"
                          : "Needs password"}
                    </Badge> : <AgentLifecycleStatus vps={vps} jobs={serverJobs} compact />}
                  </td>
                  <td className="px-3 py-3 text-white/50">
                    {formatDate(vps.lastSeenAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link to={`/vps/${encodeURIComponent(vps.id)}`}>
                        <Button
                          type="button"
                          aria-label={`Manage ${displayName}`}
                          size="sm"
                          variant="outline"
                          className="text-[11px]"
                        >
                          Manage
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        aria-label={`Verify access for ${displayName}`}
                        size="sm"
                        variant="outline"
                        className="text-[11px]"
                        disabled={busy || isLocal}
                        onClick={() => onVerify(vps)}
                      >
                        <ShieldCheck size={13} />
                        Verify
                      </Button>
                      {showInstall && !isLocal ? <Button
                        type="button"
                        aria-label={`Install agent for ${displayName}`}
                        size="sm"
                        variant="secondary"
                        className="text-[11px]"
                        disabled={busy || isLocal}
                        onClick={() => onInstallAgent(vps)}
                      >
                        <DownloadCloud size={13} />
                        {vps.agentStatus === "failed" ? "Retry agent" : "Agent"}
                      </Button> : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="sm" variant="outline" aria-label={`More actions for ${displayName}`}>
                            <MoreHorizontal size={13} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-none">
                          {canUninstall ? <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={busy}
                            onClick={() => window.setTimeout(() => setUninstallTarget(vps), 0)}
                          >
                            <Unplug size={14} /> Uninstall agent
                          </DropdownMenuItem> : null}
                          {canUninstall ? <DropdownMenuSeparator /> : null}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={busy || isLocal}
                            onClick={() => window.setTimeout(() => handleDeleteClick(vps), 0)}
                          >
                            <Trash2 size={14} /> Delete server
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Delete confirmation dialog (single instance for table) */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget ? vpsDisplayName(deleteTarget) : "server"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This permanently removes the server record for ${deleteTarget.username}@${deleteTarget.host}:${deleteTarget.port}. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={uninstallTarget !== null} onOpenChange={(open) => { if (!open) setUninstallTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall agent from {uninstallTarget ? vpsDisplayName(uninstallTarget) : "server"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Monitoring from this agent will stop. The server record and SSH access stay in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (uninstallTarget) onUninstallAgent(uninstallTarget);
                setUninstallTarget(null);
              }}
            >Uninstall agent</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
