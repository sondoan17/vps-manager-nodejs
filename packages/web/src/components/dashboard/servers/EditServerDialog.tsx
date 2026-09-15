import { useEffect, useState, type FormEvent } from "react";
import type { UpdateVpsPayload, VpsRecord } from "../../../lib/api";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

type FormState = Record<"displayName" | "host" | "port" | "username" | "provider" | "notes", string>;

const fromVps = (vps: VpsRecord): FormState => ({
  displayName: vps.displayName || vps.name || "",
  host: vps.host || "",
  port: String(vps.port),
  username: vps.username || "",
  provider: vps.provider || "",
  notes: vps.notes || "",
});

export function EditServerDialog({ vps, open, onOpenChange, onSave }: {
  vps: VpsRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vps: VpsRecord, payload: UpdateVpsPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && vps) {
      setForm(fromVps(vps));
      setError("");
    }
  }, [open, vps]);

  function close() {
    if (saving) return;
    setForm(null);
    setError("");
    onOpenChange(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!vps || !form || saving) return;
    const displayName = form.displayName.trim();
    const host = form.host.trim();
    const username = form.username.trim();
    const port = Number(form.port);
    if (!displayName || !host || !username) {
      setError("Display name, host, and username are required.");
      return;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setError("SSH port must be a whole number from 1 to 65535.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(vps, { displayName, host, port, username, provider: form.provider.trim() || "unknown", notes: form.notes.trim() });
      setForm(null);
      setError("");
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update server.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof FormState, value: string) => setForm((current) => current ? { ...current, [key]: value } : current);
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <AlertDialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border-white/10 bg-[#111318] p-0 text-white">
        <form onSubmit={submit}>
          <AlertDialogHeader className="border-b border-white/10 px-5 py-5 sm:px-6">
            <AlertDialogTitle>Edit server</AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">Update the name and SSH connection details. Location is detected automatically.</AlertDialogDescription>
          </AlertDialogHeader>
          {form ? <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <Label className="text-white sm:col-span-2">Display name<Input autoFocus required maxLength={80} value={form.displayName} onChange={(e) => field("displayName", e.target.value)} /></Label>
            <Label className="text-white">Host / IP<Input required maxLength={255} value={form.host} onChange={(e) => field("host", e.target.value)} /></Label>
            <Label className="text-white">SSH port<Input required type="number" min={1} max={65535} step={1} value={form.port} onChange={(e) => field("port", e.target.value)} /></Label>
            <Label className="text-white sm:col-span-2">Username<Input required maxLength={64} autoComplete="username" value={form.username} onChange={(e) => field("username", e.target.value)} /></Label>
            <Label className="text-white">Provider<Input maxLength={80} value={form.provider} onChange={(e) => field("provider", e.target.value)} /></Label>
            <div className="self-end pb-2 text-xs leading-5 text-white/45">Location cannot be edited.</div>
            <Label className="text-white sm:col-span-2">Notes<textarea className="mt-1.5 min-h-24 w-full resize-y border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20" maxLength={1000} value={form.notes} onChange={(e) => field("notes", e.target.value)} /></Label>
            {error ? <p role="alert" className="sm:col-span-2 border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          </div> : null}
          <AlertDialogFooter className="border-t border-white/10 px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
