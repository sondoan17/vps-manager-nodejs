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
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Read-only safety posture.</CardDescription>
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
  );
}
