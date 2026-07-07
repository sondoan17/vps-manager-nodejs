import {
  Activity,
  BarChart3,
  Bell,
  ClipboardList,
  FlaskConical,
  Gauge,
  HelpCircle,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShieldCogCorner,
  TerminalSquare,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { cn } from "../../lib/utils";

export type LiveConnectionState =
  | { status: "connecting" }
  | { status: "live"; latestEventAt: string }
  | { status: "reconnecting"; latestEventAt?: string }
  | { status: "stale"; latestEventAt?: string };

export type DashboardView =
  | "overview"
  | "servers"
  | "jobs"
  | "metrics"
  | "audit"
  | "terminal"
  | "settings";

const views: Array<{ id: DashboardView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "servers", label: "Servers", icon: Server },
  { id: "jobs", label: "Jobs", icon: ClipboardList },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "audit", label: "Audit", icon: Activity },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

type Props = {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  mode: "demo" | "local";
  busy: boolean;
  liveState: LiveConnectionState;
  onRefresh: () => void;
  onLogout?: () => void;
  children: ReactNode;
};

export function DashboardShell({
  activeView,
  onViewChange,
  mode,
  busy,
  liveState,
  onRefresh,
  onLogout,
  children,
}: Props) {
  const activeLabel =
    views.find((view) => view.id === activeView)?.label || "Overview";
  const terminalTitle = mode === "demo" ? "Demo terminal" : "Terminal";
  const terminalDescription =
    mode === "demo"
      ? "Preview command output without opening real SSH sessions."
      : "Run safe read-only commands and inspect server output.";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleMobileViewChange(view: DashboardView) {
    onViewChange(view);
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-background">
      <div className="grid min-h-screen w-full min-w-0 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden min-h-screen w-[17rem] shrink-0 border-r border-white/[0.06] bg-[#07080a]/95 px-4 py-5 text-[#f9f9f9] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] xl:flex xl:flex-col">
          <div className="mb-7 flex items-center gap-3 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-[#101111] text-[#FF6363] shadow-[rgba(255,255,255,0.08)_0px_1px_0px_0px_inset,rgba(0,0,0,0.35)_0px_8px_24px]">
              <Server size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold tracking-[0.1px] text-[#f9f9f9]">
                VPS Ops
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9c9c9d]">
                Command ops
              </p>
            </div>
          </div>
          <nav
            aria-label="Dashboard sidebar sections"
            className="grid w-full gap-2"
          >
            {views.map((view) => (
              <NavButton
                key={view.id}
                active={activeView === view.id}
                icon={view.icon}
                onClick={() => onViewChange(view.id)}
              >
                {view.label}
              </NavButton>
            ))}
          </nav>
          <div className="mt-auto flex items-start gap-2 rounded-md border border-white/[0.06] bg-[#101111] p-3 text-[#9c9c9d] shadow-[rgb(27,28,30)_0px_0px_0px_1px,rgb(7,8,10)_0px_0px_0px_1px_inset]">
            <HelpCircle className="mt-0.5 shrink-0" size={15} />
            <p className="text-[13px] font-semibold leading-5">
              Passwords are sent only for one-time key provisioning and are not
              stored in browser storage.
            </p>
          </div>
        </aside>
        <section className="min-w-0 max-w-full overflow-hidden">
          <div className="relative min-h-[12.5rem] max-w-full overflow-hidden border-b border-white/[0.06] bg-[#07080a] sm:min-h-[14rem] xl:min-h-[15.5rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,99,99,0.22),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(85,179,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_44%)]" />
            <div className="absolute inset-0 opacity-[0.36] [background-image:linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#FF6363]/45 to-transparent" />
            <div className="relative px-3 py-2 text-[#f9f9f9] sm:px-4 xl:px-6 xl:py-3">
              <div className="rounded-2xl border border-white/[0.06] bg-[#101111]/85 p-2.5 shadow-[rgb(27,28,30)_0px_0px_0px_1px,rgb(7,8,10)_0px_0px_0px_1px_inset,rgba(0,0,0,0.35)_0px_12px_36px] backdrop-blur-md sm:p-3">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <label className="relative min-w-0 max-w-full xl:w-80">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9c9c9d]"
                      size={17}
                    />
                    <input
                      aria-label="Global server search"
                      placeholder="Search servers..."
                      className="h-10 w-full rounded-md border-0 bg-[#07080a] pl-11 pr-4 text-sm font-medium text-[#f9f9f9] outline-none ring-1 ring-white/[0.08] placeholder:text-[#6a6b6c] focus:ring-4 focus:ring-[rgba(85,179,255,0.15)]"
                    />
                  </label>

                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <ModeBadge mode={mode} />
                    <LiveBadge state={liveState} />
                    <IconButton label="Alerts">
                      <Bell size={18} />
                    </IconButton>

                    <IconButton
                      label="Refresh"
                      disabled={busy}
                      onClick={onRefresh}
                    >
                      <RefreshCw size={18} />
                    </IconButton>
                    <UserMenu onLogout={onLogout} />
                  </div>
                </div>
                <nav
                  aria-label="Dashboard sections"
                  className="relative mt-2 xl:hidden"
                >
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <div className="flex items-center justify-between gap-3 rounded-lg border-0 bg-[#101111] shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] p-2 text-sm font-semibold text-primary sm:p-3">
                      <div className="hidden min-w-0 md:block">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Current section
                        </p>
                        <p className="truncate">{activeLabel}</p>
                      </div>
                      <p className="min-w-0 truncate text-sm md:hidden">
                        {activeLabel}
                      </p>
                      <SheetTrigger asChild>
                        <button
                          type="button"
                          aria-label="Open dashboard menu"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#101111]/80 text-[#18191a] shadow-[rgba(255,255,255,0.1)_0px_1px_0px_0px_inset,rgba(0,0,0,0.2)_0px_-1px_0px_0px_inset] transition hover:bg-[#101111] hover:opacity-90 sm:h-11 sm:w-11"
                        >
                          <Menu size={20} />
                        </button>
                      </SheetTrigger>
                    </div>
                    <SheetContent
                      side="right"
                      className="w-[88vw] max-w-sm border-0 bg-[#101111] p-5"
                    >
                      <SheetHeader className="mb-5 text-left">
                        <SheetTitle>Dashboard menu</SheetTitle>
                        <SheetDescription>
                          Switch between VPS operations sections.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="grid gap-2">
                        {views.map((view) => (
                          <NavButton
                            key={view.id}
                            active={activeView === view.id}
                            icon={view.icon}
                            onClick={() => handleMobileViewChange(view.id)}
                          >
                            {view.label}
                          </NavButton>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </nav>
              </div>
            </div>
            <div
              className={cn(
                "relative flex min-w-0 max-w-full items-start px-4 text-[#f9f9f9] sm:px-8 xl:px-10",
                activeView === "servers"
                  ? "pb-5 pt-0 sm:pb-7 sm:pt-1"
                  : "pb-8 pt-0 sm:pb-14 sm:pt-3",
              )}
            >
              <div className="min-w-0 max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9c9c9d] sm:text-xs">
                  VPS command center
                </p>
                <h1 className="mt-2 break-words font-display text-2xl font-semibold leading-none tracking-[0px] sm:text-4xl">
                  {activeView === "servers"
                    ? "Servers"
                    : activeView === "jobs"
                      ? "Jobs"
                      : activeView === "metrics"
                        ? "Metrics"
                        : activeView === "audit"
                          ? "Audit"
                          : activeView === "terminal"
                            ? terminalTitle
                            : "Command dashboard"}
                </h1>
                {activeView === "servers" ? (
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-[#9c9c9d] sm:mt-1.5 sm:text-sm sm:leading-5">
                    Manage VPS access, SSH keys, health checks, and
                    provisioning.
                  </p>
                ) : null}
                {activeView === "jobs" ? (
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-[#9c9c9d] sm:mt-1.5 sm:text-sm sm:leading-5">
                    Track provisioning, metrics collection, key verification,
                    and background tasks.
                  </p>
                ) : null}
                {activeView === "metrics" ? (
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-[#9c9c9d] sm:mt-1.5 sm:text-sm sm:leading-5">
                    Monitor CPU, memory, disk, load, and telemetry freshness
                    across servers.
                  </p>
                ) : null}
                {activeView === "audit" ? (
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-[#9c9c9d] sm:mt-1.5 sm:text-sm sm:leading-5">
                    Review operational events, security actions, SSH access, and
                    job activity.
                  </p>
                ) : null}
                {activeView === "terminal" ? (
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-[#9c9c9d] sm:mt-1.5 sm:text-sm sm:leading-5">
                    {terminalDescription}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "relative min-w-0 max-w-full overflow-hidden px-3 pb-8 sm:px-5 xl:px-8",
              activeView === "overview"
                ? "-mt-10 pt-0 sm:-mt-12"
                : activeView === "servers"
                  ? "pt-3"
                  : "pt-5",
            )}
          >
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeBadge({ mode }: { mode: "demo" | "local" }) {
  const state = mode === "demo" ? "demo" : "ready";
  const iconByState = {
    demo: FlaskConical,
    pending: ShieldCogCorner,
    ready: ShieldCheck,
  } satisfies Record<"demo" | "pending" | "ready", LucideIcon>;
  const Icon = iconByState[state];

  return (
    <Badge
      variant={state === "ready" ? "ready" : "pending"}
      className="gap-1.5 uppercase"
    >
      <Icon size={14} />
      {mode}
    </Badge>
  );
}

function LiveBadge({ state }: { state: LiveConnectionState }) {
  const label = state.status === "connecting" ? "Connecting"
    : state.status === "live" ? "Live"
    : state.status === "reconnecting" ? "Reconnecting"
    : "Stale";

  const dotColor = state.status === "live" ? "bg-[#07080a]" : "bg-[#9c9c9d]";

  const badgeVariant = state.status === "live" ? "ready"
    : state.status === "connecting" ? "pending"
    : "destructive";

  return (
    <Badge variant={badgeVariant as any} className="gap-1.5 text-[11px] uppercase">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
      {state.status !== "connecting" && "latestEventAt" in state && state.latestEventAt ? (
        <span className="ml-1 text-[10px] font-normal opacity-70">
          {new Date(state.latestEventAt).toLocaleTimeString()}
        </span>
      ) : null}
    </Badge>
  );
}

function UserMenu({ onLogout }: { onLogout?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center rounded-md text-sm font-semibold text-primary transition hover:bg-[#101111]/25"
          aria-label="Open user menu"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage
              src="https://github.com/shadcn.png"
              alt="Local admin"
              className="grayscale"
            />
            <AvatarFallback>LA</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-md" align="end">
        <DropdownMenuLabel>
          <div className="grid gap-1">
            <span>Local admin</span>
            <span className="text-xs font-normal text-muted-foreground">
              VPS operations workspace
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserCircle size={16} />
            Profile
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings size={16} />
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ShieldCheck size={16} />
            Security notes
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={onLogout ? "text-[#f9f9f9]" : "text-muted-foreground"}
          onSelect={onLogout}
          disabled={!onLogout}
        >
          <LogOut size={16} />
          {onLogout ? "Log out" : "Log out unavailable"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#101111]/90 text-primary shadow-sm transition hover:bg-[#101111]"
      {...props}
    >
      {children}
    </button>
  );
}

function NavButton({
  active,
  className,
  icon: Icon,
  mobile = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  icon: LucideIcon;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.08em] transition",
        mobile ? "w-auto shrink-0 bg-[#101111]" : "w-full",
        active
          ? "border-[#f9f9f9] bg-[#f9f9f9] text-white shadow-sm"
          : mobile
            ? "text-primary hover:bg-secondary"
            : "text-[#9c9c9d] hover:border-white/[0.1] hover:bg-[#101111] hover:text-[#f9f9f9]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-md",
          active ? "bg-[#101111] text-[#f9f9f9]" : "bg-[#101111] text-[#9c9c9d]",
        )}
      >
        <Icon size={16} />
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}
