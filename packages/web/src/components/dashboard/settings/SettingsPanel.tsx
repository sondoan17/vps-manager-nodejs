import {
  Badge,
} from "../../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import type { DashboardOverview } from "../../../lib/api";

export function SettingsPanel({ overview }: { overview: DashboardOverview }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Runtime safety posture.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Badge variant="outline">APP_MODE={overview.settings.appMode}</Badge>
          <Badge variant="outline">
            web terminal{" "}
            {overview.settings.webTerminalEnabled ? "enabled" : "disabled"}
          </Badge>
          <Badge variant="outline">
            real SSH {overview.settings.realSshEnabled ? "enabled" : "disabled"}
          </Badge>
          <Badge variant="outline">
            local auth{" "}
            {overview.settings.authRequiredInLocalMode ? "required" : "off"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard access</CardTitle>
          <CardDescription>
            Local mode uses a secure HttpOnly cookie session. Dashboard passwords are verified server-side against the stored credential and are never saved in browser storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold leading-6 text-muted-foreground">
            Use the account menu in the top bar to log out and revoke the current session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
