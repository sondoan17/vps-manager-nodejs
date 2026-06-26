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
  onRefresh: () => void;
  children: ReactNode;
};

export function DashboardShell({
  activeView,
  onViewChange,
  mode,
  busy,
  onRefresh,
  children,
}: Props) {
  const activeLabel =
    views.find((view) => view.id === activeView)?.label || "Overview";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleMobileViewChange(view: DashboardView) {
    onViewChange(view);
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-background">
      <div className="grid min-h-screen w-full min-w-0 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden min-h-screen w-[17rem] shrink-0 border-r border-slate-200 bg-white px-4 py-5 xl:flex xl:flex-col">
          <div className="mb-7 flex items-center gap-3 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Server size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg text-slate-950">VPS Ops</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Operations console
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
          <div className="mt-auto flex items-start gap-2 border-t border-slate-200 pt-4 text-slate-500">
            <HelpCircle className="mt-0.5 shrink-0" size={15} />
            <p className="text-[13px] font-semibold leading-5">
              Passwords are sent only for one-time key provisioning and are not stored in browser storage.
            </p>
          </div>
        </aside>
        <section className="min-w-0 max-w-full overflow-hidden">
          <div className="relative min-h-[11.75rem] max-w-full overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 sm:min-h-[13rem] xl:min-h-[14.5rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.22),transparent_24%),radial-gradient(circle_at_88%_0%,rgba(99,102,241,0.28),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="absolute -right-20 top-2 h-36 w-36 rounded-full bg-cyan-400/25 blur-3xl" />
            <div className="absolute left-12 top-16 h-24 w-24 rounded-full bg-indigo-300/20 blur-2xl" />
            <div className="relative px-3 py-2 text-white sm:px-4 xl:px-6 xl:py-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-2.5 backdrop-blur-md sm:p-3">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <label className="relative min-w-0 max-w-full xl:w-80">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55"
                      size={17}
                    />
                    <input
                      aria-label="Global server search"
                      placeholder="Search servers..."
                      className="h-10 w-full rounded-xl border-0 bg-slate-950/45 pl-11 pr-4 text-sm font-semibold text-white outline-none ring-1 ring-white/20 placeholder:text-white/55 focus:bg-slate-950/60 focus:ring-4 focus:ring-cyan-300/20"
                    />
                  </label>

                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <ModeBadge mode={mode} />
                    <IconButton label="Alerts">
                      <Bell size={18} />
                    </IconButton>

                    <IconButton label="Refresh" disabled={busy} onClick={onRefresh}>
                      <RefreshCw size={18} />
                    </IconButton>
                    <UserMenu />
                  </div>
                </div>
                <nav
                  aria-label="Dashboard sections"
                  className="relative mt-2 xl:hidden"
                >
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/90 p-2 text-sm font-black text-primary sm:p-3">
                      <div className="hidden min-w-0 md:block">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Current section
                        </p>
                        <p className="truncate">{activeLabel}</p>
                      </div>
                      <p className="min-w-0 truncate text-sm md:hidden">{activeLabel}</p>
                      <SheetTrigger asChild>
                        <button
                          type="button"
                          aria-label="Open dashboard menu"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm transition hover:bg-primary/90 sm:h-11 sm:w-11 sm:rounded-2xl"
                        >
                          <Menu size={20} />
                        </button>
                      </SheetTrigger>
                    </div>
                    <SheetContent
                      side="right"
                      className="w-[88vw] max-w-sm border-0 bg-white p-5"
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
            <div className={cn("relative flex min-w-0 max-w-full items-start px-4 text-white sm:px-8 xl:px-10", activeView === "servers" ? "pb-5 pt-0 sm:pb-7 sm:pt-1" : "pb-8 pt-0 sm:pb-14 sm:pt-3")}>
              <div className="min-w-0 max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65 sm:text-xs sm:tracking-[0.22em]">
                  VPS command center
                </p>
                <h1 className="mt-1 break-words font-display text-xl leading-none sm:text-3xl">
                  {activeView === "servers" ? "Servers" : activeView === "jobs" ? "Jobs" : "Operations dashboard"}
                </h1>
                {activeView === "servers" ? <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5">Manage VPS access, SSH keys, health checks, and provisioning.</p> : null}
                {activeView === "jobs" ? <p className="mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5">Track provisioning, metrics collection, key verification, and background tasks.</p> : null}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "relative min-w-0 max-w-full overflow-hidden px-3 pb-4 sm:px-4 xl:px-6",
              activeView === "overview" ? "-mt-10 pt-0 sm:-mt-12" : activeView === "servers" ? "pt-3" : "pt-5",
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

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center rounded-2xl text-sm font-black text-primary transition hover:bg-white/25"
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
      <DropdownMenuContent className="w-56 rounded-2xl" align="end">
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
        <DropdownMenuItem className="text-muted-foreground">
          <LogOut size={16} />
          Log out unavailable
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
      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/90 text-primary shadow-sm transition hover:bg-white"
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
        "inline-flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-black uppercase tracking-[0.04em] transition",
        mobile ? "w-auto shrink-0 bg-white" : "w-full",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : mobile
            ? "text-primary hover:bg-secondary"
            : "text-muted-foreground hover:bg-muted hover:text-primary",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          active ? "bg-white/12" : "bg-slate-100 text-slate-600",
        )}
      >
        <Icon size={16} />
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}
