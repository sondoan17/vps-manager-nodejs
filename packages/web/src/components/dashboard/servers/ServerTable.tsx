import { useState } from "react";
import { Link } from "react-router-dom";
import { DownloadCloud, ShieldCheck, Trash2 } from "lucide-react";
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
} from "../../../lib/dashboard-formatters";
import type { VpsRecord } from "../../../lib/api";

export function ServerTable({
  vpsList,
  busy,
  provisionPasswords,
  onVerify,
  onInstallAgent,
  onDelete,
}: {
  vpsList: VpsRecord[];
  busy: boolean;
  provisionPasswords: Record<string, string>;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<VpsRecord | null>(null);

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
              const isLocal =
                vps.kind === "local" || vps.managedBy === "system";
              const isReady = isLocal || Boolean(vps.keyProvisionedAt);
              return (
                <tr
                  key={vps.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3">
                    <Link
                      to={`/vps/${encodeURIComponent(vps.id)}`}
                      className="font-normal text-[#ffffff] hover:text-white/80"
                    >
                      {vps.name}
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
                    <Badge variant={isReady ? "ready" : "pending"}>
                      {isLocal
                        ? "Local agent"
                        : isReady
                          ? "Key ready"
                          : "Needs password"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-white/50">
                    {formatDate(vps.lastSeenAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link to={`/vps/${encodeURIComponent(vps.id)}`}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-[11px]"
                        >
                          Manage
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-[11px]"
                        disabled={busy || isLocal}
                        onClick={() => onVerify(vps)}
                      >
                        <ShieldCheck size={13} />
                        Verify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-[11px]"
                        disabled={busy || isLocal}
                        onClick={() => onInstallAgent(vps)}
                      >
                        <DownloadCloud size={13} />
                        Agent
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-[11px] text-destructive hover:text-destructive"
                        disabled={busy || isLocal}
                        onClick={() => handleDeleteClick(vps)}
                      >
                        <Trash2 size={13} />
                      </Button>
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
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
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
    </>
  );
}
