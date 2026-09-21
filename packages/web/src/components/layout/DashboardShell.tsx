import {
  LogOut,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
import { cn } from "../../lib/utils";

export type LiveConnectionState =
  | { status: "connecting" }
  | { status: "live"; latestEventAt: string }
  | { status: "reconnecting"; latestEventAt?: string }
  | { status: "stale"; latestEventAt?: string };

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
  const { pathname } = useLocation();
  const isVpsList = pathname === "/vps";
  const isVpsNew = pathname === "/vps/new";
  const isWorkspace = pathname.startsWith("/vps/") && !isVpsNew;

  const contextLabel = isVpsList
    ? "Fleet"
    : isVpsNew
      ? "New VPS"
      : isWorkspace
        ? "Server workspace"
        : "Dashboard";

  const pageTitle = isVpsList ? "Servers" : "New VPS";
  const pageDescription = isVpsList
    ? "Manage VPS access, SSH keys, health checks, and provisioning."
    : "Add a new server to your fleet.";

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-background">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1f2228]/95 text-white backdrop-blur-md">
        <div className="flex min-h-14 min-w-0 items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-5 xl:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/vps"
              aria-label="FlexServer — go to servers"
              className="inline-flex shrink-0 items-center gap-2 text-white transition hover:text-white/80"
            >
              <span className="grid h-9 w-9 place-items-center border border-white/10 bg-white/[0.03] sm:h-10 sm:w-10">
                <Server size={18} />
              </span>
              <span className="hidden font-display text-sm font-normal sm:inline">
                FlexServer
              </span>
            </Link>

            <span aria-hidden="true" className="h-5 w-px bg-white/10" />

            <nav aria-label="Dashboard context" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-2 text-sm">
                {isWorkspace || isVpsNew ? (
                  <li className="hidden shrink-0 sm:block">
                    <Link
                      to="/vps"
                      className="text-white/50 transition hover:text-white"
                    >
                      Servers
                    </Link>
                  </li>
                ) : null}
                {isWorkspace || isVpsNew ? (
                  <li aria-hidden="true" className="hidden text-white/30 sm:block">
                    /
                  </li>
                ) : null}
                <li
                  className="truncate font-normal text-white"
                  aria-current="page"
                >
                  {contextLabel}
                </li>
              </ol>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 border-r border-white/10 pr-2 sm:gap-3 sm:pr-3">
              <ModeLabel mode={mode} />
              <LiveStatus state={liveState} />
            </div>
            <IconButton
              label={busy ? "Refreshing" : "Refresh dashboard"}
              disabled={busy}
              onClick={onRefresh}
            >
              <RefreshCw
                size={17}
                className={cn(busy && "animate-spin")}
              />
            </IconButton>
            <UserMenu onLogout={onLogout} />
          </div>
        </div>
      </header>

      {!isWorkspace ? (
        <section className="border-b border-white/10 bg-[#1f2228] px-3 py-5 text-white sm:px-5 sm:py-7 xl:px-8">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[11px] font-normal uppercase tracking-[0.18em] text-white/50">
              {isVpsList ? "Fleet" : "Fleet setup"}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-normal leading-tight sm:text-3xl">
              {pageTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-white/50">
              {pageDescription}
            </p>
          </div>
        </section>
      ) : null}

      <section className="min-w-0 max-w-full overflow-hidden px-3 py-4 sm:px-5 sm:py-5 xl:px-8">
        {children}
      </section>
    </main>
  );
}

function ModeLabel({ mode }: { mode: "demo" | "local" }) {
  return (
    <span className="hidden whitespace-nowrap text-xs font-normal text-white/60 md:inline">
      {mode === "demo" ? "Demo environment" : "Local environment"}
    </span>
  );
}

function LiveStatus({ state }: { state: LiveConnectionState }) {
  const label =
    state.status === "connecting"
      ? "Connecting"
      : state.status === "live"
        ? "Live"
        : state.status === "reconnecting"
          ? "Reconnecting"
          : "Connection stale";
  const latestEventAt = "latestEventAt" in state ? state.latestEventAt : undefined;
  const latestEvent = latestEventAt
    ? new Date(latestEventAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <span
      role="status"
      aria-label={`Monitoring connection: ${label}`}
      title={latestEvent ? `Latest monitoring event: ${latestEvent}` : undefined}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-white/75 sm:text-xs"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state.status === "live"
            ? "bg-emerald-400"
            : state.status === "connecting"
              ? "bg-amber-300"
              : "bg-rose-400",
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

function UserMenu({ onLogout }: { onLogout?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center text-sm font-normal text-primary transition hover:opacity-80 sm:h-10 sm:w-10"
          aria-label="Open local admin account menu"
          title="Local admin account"
        >
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
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
          <DropdownMenuItem disabled>
            <UserCircle size={16} />
            Profile
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings size={16} />
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
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
  className,
  ...props
}: {
  label: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/[0.03] text-primary transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
