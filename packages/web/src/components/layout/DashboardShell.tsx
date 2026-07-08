import {
  Bell,
  FlaskConical,
  HelpCircle,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShieldCogCorner,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

// ── Route-based nav items ─────────────────────────────────────────────

type NavItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  matchPattern: string; // prefix match for active state
};

const topNavItems: NavItem[] = [
  { label: "VPS List", icon: Server, to: "/vps", matchPattern: "/vps" },
];

type Props = {
  mode: "demo" | "local";
  busy: boolean;
  liveState: LiveConnectionState;
  onRefresh: () => void;
  onLogout?: () => void;
  children: ReactNode;
};

export function DashboardShell({
  mode,
  busy,
  liveState,
  onRefresh,
  onLogout,
  children,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Determine active page for header
  const isVpsList = pathname === "/vps";
  const isVpsNew = pathname === "/vps/new";

  // Active label for the mobile header
  const activeLabel = isVpsNew
    ? "New VPS"
    : isVpsList
      ? "VPS List"
      : "Workspace";

  // Header title and description
  let headerTitle: string;
  let headerDescription: string | null = null;
  if (isVpsList) {
    headerTitle = "Servers";
    headerDescription =
      "Manage VPS access, SSH keys, health checks, and provisioning.";
  } else if (isVpsNew) {
    headerTitle = "New VPS";
    headerDescription = "Add a new server to your fleet.";
  } else {
    headerTitle = "Operations dashboard";
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleNavClick(to: string) {
    navigate(to);
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-background">
      <div className="grid min-h-screen w-full min-w-0 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden min-h-screen w-[17rem] shrink-0 border-r border-white/10 bg-[#1f2228] px-4 py-5 text-[#ffffff] shadow-none xl:flex xl:flex-col">
          <div className="mb-7 flex items-center gap-3 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-none border border-white/10 bg-white/[0.03] text-[#ffffff] shadow-none">
              <Server size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-normal tracking-normal text-[#ffffff]">
                VPS Ops
              </p>
              <p className="text-[10px] font-normal uppercase tracking-[0.18em] text-white/50">
                Model ops
              </p>
            </div>
          </div>
          <nav
            aria-label="Dashboard sidebar sections"
            className="grid w-full gap-2"
          >
            {topNavItems.map((item) => {
              // Active if the pathname starts with the match pattern
              const isActive =
                item.matchPattern === "/vps"
                  ? pathname.startsWith("/vps")
                  : pathname === item.to;
              return (
                <NavButton
                  key={item.to}
                  active={isActive}
                  icon={item.icon}
                  onClick={() => handleNavClick(item.to)}
                >
                  {item.label}
                </NavButton>
              );
            })}
          </nav>
          <div className="mt-auto flex items-start gap-2 rounded-none border border-white/10 bg-white/[0.03] p-3 text-white/50 shadow-none">
            <HelpCircle className="mt-0.5 shrink-0" size={15} />
            <p className="text-[13px] font-normal leading-5">
              Passwords are sent only for one-time key provisioning and are not
              stored in browser storage.
            </p>
          </div>
        </aside>
        <section className="min-w-0 max-w-full overflow-hidden">
          <div className="relative min-h-[12.5rem] max-w-full overflow-hidden border-b border-white/10 bg-[#1f2228] sm:min-h-[14rem] xl:min-h-[15.5rem]">
            <div className="absolute inset-0 bg-transparent" />
            <div className="absolute inset-0 hidden" />
            <div className="absolute inset-x-8 top-0 h-px bg-white/20" />
            <div className="relative px-3 py-2 text-[#ffffff] sm:px-4 xl:px-6 xl:py-3">
              <div className="rounded-none border border-white/10 bg-white/[0.03] p-2.5 shadow-none sm:p-3">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <label className="relative min-w-0 max-w-full xl:w-80">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
                      size={17}
                    />
                    <input
                      aria-label="Global server search"
                      placeholder="Search servers..."
                      className="h-10 w-full rounded-none border-0 bg-[#1f2228] pl-11 pr-4 text-sm font-medium text-[#ffffff] outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-4 focus:ring-blue-500/50"
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
                    <div className="flex items-center justify-between gap-3 rounded-none border-0 bg-white/[0.03] shadow-none p-2 text-sm font-normal text-primary sm:p-3">
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
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-white text-[#1f2228] shadow-none transition hover:bg-white/[0.03] hover:opacity-90 sm:h-11 sm:w-11"
                        >
                          <Menu size={20} />
                        </button>
                      </SheetTrigger>
                    </div>
                    <SheetContent
                      side="right"
                      className="w-[88vw] max-w-sm border-l border-white/[0.12] bg-[#1b1e24] p-5 text-[#ffffff]"
                    >
                      <SheetHeader className="mb-5 text-left">
                        <SheetTitle>Dashboard menu</SheetTitle>
                        <SheetDescription>
                          Switch between VPS operations sections.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="grid gap-2">
                        {topNavItems.map((item) => {
                          const isActive = pathname.startsWith(
                            item.matchPattern,
                          );
                          return (
                            <NavButton
                              key={item.to}
                              active={isActive}
                              icon={item.icon}
                              onClick={() => handleNavClick(item.to)}
                            >
                              {item.label}
                            </NavButton>
                          );
                        })}
                      </div>
                    </SheetContent>
                  </Sheet>
                </nav>
              </div>
            </div>
            <div
              className={cn(
                "relative flex min-w-0 max-w-full items-start px-4 text-[#ffffff] sm:px-8 xl:px-10",
                isVpsList
                  ? "pb-5 pt-0 sm:pb-7 sm:pt-1"
                  : "pb-8 pt-0 sm:pb-14 sm:pt-3",
              )}
            >
              <div className="min-w-0 max-w-3xl">
                <p className="text-[10px] font-normal uppercase tracking-[0.24em] text-white/50 sm:text-xs">
                  VPS control plane
                </p>
                <h1 className="mt-2 break-words font-display text-2xl font-normal leading-none tracking-normal sm:text-4xl">
                  {headerTitle}
                </h1>
                {headerDescription ? (
                  <p className="mt-1 max-w-2xl text-xs font-normal leading-4 text-white/50 sm:mt-1.5 sm:text-sm sm:leading-5">
                    {headerDescription}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "relative isolate min-w-0 max-w-full overflow-hidden px-3 pb-8 before:absolute before:inset-x-0 before:top-0 before:z-0 before:h-16 before:bg-[#1f2228] sm:px-5 xl:px-8",
              isVpsList ? "pt-3" : "pt-5",
            )}
          >
            <div className="relative z-10">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ── Same UI elements as before ────────────────────────────────────────

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
  const label =
    state.status === "connecting"
      ? "Connecting"
      : state.status === "live"
        ? "Live"
        : state.status === "reconnecting"
          ? "Reconnecting"
          : "Stale";

  const dotColor =
    state.status === "live" ? "bg-[#1f2228]" : "bg-[rgba(255,255,255,0.5)]";

  const badgeVariant =
    state.status === "live"
      ? "ready"
      : state.status === "connecting"
        ? "pending"
        : "destructive";

  return (
    <Badge
      variant={badgeVariant as any}
      className="gap-1.5 text-[11px] uppercase"
    >
      <span className={`h-1.5 w-1.5 rounded-none ${dotColor}`} />
      {label}
      {state.status !== "connecting" &&
      "latestEventAt" in state &&
      state.latestEventAt ? (
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
          className="inline-flex h-10 w-10 shrink-0 items-center rounded-none text-sm font-normal text-primary transition hover:bg-white/[0.03]/25"
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
      <DropdownMenuContent className="w-56 rounded-none" align="end">
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
          className={onLogout ? "text-[#ffffff]" : "text-muted-foreground"}
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
      className="grid h-10 w-10 shrink-0 place-items-center rounded-none bg-white/[0.03]/90 text-primary shadow-none transition hover:bg-white/[0.03]"
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
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-none border border-transparent px-3 py-2.5 text-left text-[12px] font-normal uppercase tracking-[0.08em] transition",
        "w-full",
        active
          ? "border-[#ffffff] bg-[#ffffff] text-[#1f2228] shadow-none"
          : "text-white/50 hover:border-white/10 hover:bg-white/[0.03] hover:text-[#ffffff]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-none",
          active
            ? "bg-[#1f2228] text-[#ffffff]"
            : "bg-white/[0.03] text-white/50",
        )}
      >
        <Icon size={16} />
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}
