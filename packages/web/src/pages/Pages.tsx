import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { DashboardShell } from "../components/layout/DashboardShell";
import { ServersPanel } from "../components/dashboard/DashboardPanels";
import { useDashboard, type DashboardCtx } from "../context/DashboardContext";

// ── Layout wrapper ──────────────────────────────────────────────────

export function DashboardLayout() {
  const ctx = useDashboard();
  return (
    <DashboardShell
      mode={ctx.mode}
      busy={ctx.busy}
      liveState={ctx.liveState}
      onRefresh={ctx.onRefresh}
      onLogout={ctx.onLogout}
    >
      <Outlet />
    </DashboardShell>
  );
}

// ── VPS list page ───────────────────────────────────────────────────

export function VpsListPage() {
  const ctx = useDashboard();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  return (
    <ServersPanel
      records={ctx.records}
      visibleRecords={ctx.visibleRecords}
      statusMessage={ctx.statusAlert}
      serverSearch={ctx.serverSearch}
      statusFilter={ctx.statusFilter}
      busy={ctx.busy}
      provisionPasswords={ctx.provisionPasswords}
      createForm={ctx.createForm}
      metrics={ctx.metrics}
      systemInfo={ctx.systemInfo}
      dockerMetrics={ctx.dockerMetrics}
      jobs={ctx.jobs}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSearchChange={ctx.onSearchChange}
      onStatusFilterChange={ctx.onStatusFilterChange}
      onCreateFormChange={ctx.onCreateFormChange}
      onCreate={ctx.onCreate}
      onPasswordChange={ctx.onPasswordChange}
      onProvision={ctx.onProvision}
      onVerify={ctx.onVerify}
      onInstallAgent={ctx.onInstallAgent}
      onToggleDockerMetrics={ctx.onToggleDockerMetrics}
      onDelete={ctx.onDelete}
    />
  );
}

// ── New VPS page ────────────────────────────────────────────────────

export function VpsNewPage() {
  const ctx = useDashboard();
  return (
    <div className="mx-auto max-w-lg">
      <CreateVpsFormInline ctx={ctx} />
    </div>
  );
}

function CreateVpsFormInline({ ctx }: { ctx: DashboardCtx }) {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="min-w-0 space-y-2">
        <h2 className="text-xl font-normal text-white">New VPS</h2>
        <p className="text-sm text-white/50">
          Password is optional and never stored.
        </p>
      </div>
      <form
        onSubmit={ctx.onCreate}
        autoComplete="off"
        className="grid min-w-0 gap-4"
      >
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-xs font-normal uppercase tracking-[0.14em] text-white/50">
            Basic info
          </legend>
          <Label className="text-white">
            Display name
            <Input
              required
              aria-label="Display name"
              maxLength={80}
              pattern=".*\S.*"
              title="Enter a display name containing at least one non-space character."
              aria-describedby="display-name-help"
              placeholder="Production Singapore"
              value={ctx.createForm.displayName}
              onChange={(e) =>
                ctx.onCreateFormChange({
                  ...ctx.createForm,
                  displayName: e.target.value,
                })
              }
            />
            <span
              id="display-name-help"
              className="block text-xs font-normal leading-5 text-white/45"
            >
              A friendly label shown throughout the dashboard (1–80 characters).
            </span>
          </Label>
          <Label className="text-white">
            Name
            <Input
              required
              aria-label="Name"
              maxLength={120}
              placeholder="prod-sgp-01"
              value={ctx.createForm.name}
              onChange={(e) =>
                ctx.onCreateFormChange({
                  ...ctx.createForm,
                  name: e.target.value,
                })
              }
            />
            <span className="block text-xs font-normal leading-5 text-white/45">
              Stable server name kept for API and older-record compatibility.
            </span>
          </Label>
          <Label className="text-white">
            Host / IP
            <Input
              required
              maxLength={255}
              placeholder="203.0.113.20"
              value={ctx.createForm.host}
              onChange={(e) =>
                ctx.onCreateFormChange({
                  ...ctx.createForm,
                  host: e.target.value,
                })
              }
            />
          </Label>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-xs font-normal uppercase tracking-[0.14em] text-white/50">
            SSH access
          </legend>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Label className="text-white">
              Port
              <Input
                required
                type="number"
                min={1}
                max={65535}
                value={ctx.createForm.port}
                onChange={(e) =>
                  ctx.onCreateFormChange({
                    ...ctx.createForm,
                    port: e.target.value,
                  })
                }
              />
            </Label>
            <Label className="text-white">
              Username
              <Input
                required
                maxLength={64}
                placeholder="root"
                value={ctx.createForm.username}
                onChange={(e) =>
                  ctx.onCreateFormChange({
                    ...ctx.createForm,
                    username: e.target.value,
                  })
                }
              />
            </Label>
          </div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-xs font-normal uppercase tracking-[0.14em] text-white/50">
            Key provisioning
          </legend>
          <Label className="text-white">
            Optional password
            <Input
              type="password"
              maxLength={4096}
              autoComplete="new-password"
              placeholder="One-time key install"
              value={ctx.createForm.password}
              onChange={(e) =>
                ctx.onCreateFormChange({
                  ...ctx.createForm,
                  password: e.target.value,
                })
              }
            />
          </Label>
        </fieldset>
        <Button
          type="submit"
          disabled={ctx.busy}
          className="min-w-0 rounded-none"
        >
          Create VPS
        </Button>
      </form>
    </div>
  );
}

// ── 404 page ────────────────────────────────────────────────────────

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="text-center">
        <h2 className="text-2xl font-normal text-white">404</h2>
        <p className="mt-2 text-white/50">Page not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/vps")}
        >
          Go to VPS list
        </Button>
      </div>
    </div>
  );
}
