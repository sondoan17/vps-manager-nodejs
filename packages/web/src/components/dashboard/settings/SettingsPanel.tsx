import { useState } from "react";

import {
  Badge,
} from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import type { DashboardOverview } from "../../../lib/api";
import {
  clearLocalAuthToken,
  getLocalAuthToken,
  setLocalAuthToken,
} from "../../../lib/auth-token";

export function SettingsPanel({ overview }: { overview: DashboardOverview }) {
  const [token, setToken] = useState(() => getLocalAuthToken());
  const [saved, setSaved] = useState(false);

  const saveToken = () => {
    setLocalAuthToken(token);
    setSaved(true);
  };

  const clearToken = () => {
    clearLocalAuthToken();
    setToken("");
    setSaved(false);
  };

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
          <CardTitle>Local API token</CardTitle>
          <CardDescription>
            Used only by this browser tab to authorize protected local actions such as deleting a VPS.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="local-auth-token">LOCAL_AUTH_TOKEN</Label>
            <Input
              id="local-auth-token"
              type="password"
              autoComplete="off"
              value={token}
              placeholder={overview.settings.authRequiredInLocalMode ? "Required in local mode" : "Optional"}
              onChange={(event) => {
                setToken(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <Button type="button" onClick={saveToken}>Save for session</Button>
          <Button type="button" variant="outline" onClick={clearToken}>Clear</Button>
          {saved ? (
            <p className="text-sm text-muted-foreground md:col-span-3">
              Token saved in this browser session. Protected API requests will include Authorization.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
