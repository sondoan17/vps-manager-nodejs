import { type FormEvent } from "react";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#1f2228] text-white">
      <div className="rounded-none border border-white/10 bg-white/[0.03] px-6 py-5 font-normal shadow-none">
        Checking dashboard access...
      </div>
    </main>
  );
}

export function LoginGate({
  password,
  busy,
  message,
  onPasswordChange,
  onSubmit,
}: {
  password: string;
  busy: boolean;
  message?: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#1f2228] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-transparent" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative m-auto w-full max-w-md rounded-none border border-white/12 bg-[#1f2228] p-6 shadow-none sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-normal uppercase tracking-[0.24em] text-[#a3a3a3]">
            Secure local console
          </p>
          <h1 className="mt-2 font-display text-4xl font-normal leading-tight tracking-[-0.05em]">
            Unlock FlexServer
          </h1>
          <p className="mt-3 text-sm font-normal leading-6 text-white/70">
            Enter the dashboard password. The password is verified server-side
            against the stored credential and is never stored in browser
            storage.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="dashboard-password" className="text-white">
              Dashboard password
            </Label>
            <Input
              id="dashboard-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="h-12 rounded-none border-white/15 bg-[#1f2228]/75 text-white placeholder:text-white/40"
              placeholder="Enter password"
              autoFocus
            />
          </div>
          {message ? (
            <Alert
              variant="destructive"
              className="rounded-none px-3 py-2 text-sm font-normal"
            >
              {message}
            </Alert>
          ) : null}
          <Button
            type="submit"
            disabled={busy}
            className="h-12 rounded-none bg-[#1f2228] font-normal text-white hover:bg-[#1f1f1f]"
          >
            {busy ? "Verifying..." : "Enter dashboard"}
          </Button>
        </form>
      </section>
    </main>
  );
}
