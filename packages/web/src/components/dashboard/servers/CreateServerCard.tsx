import { Server } from "lucide-react";
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
import type { ServersPanelProps } from "./types";

export function CreateServerCard({
  createForm,
  busy,
  onCreate,
  onCreateFormChange,
}: ServersPanelProps) {
  return (
    <Card className="h-fit min-w-0 overflow-hidden border-0 bg-white/[0.03] shadow-none/95 shadow-none  xl:sticky xl:top-5">
      <CardHeader className="min-w-0 border-b border-white/10 bg-[#1f2228] pb-4 text-white">
        <p className="truncate text-[11px] font-normal uppercase tracking-[0.2em] text-[#a3a3a3]">
          Add server
        </p>
        <CardTitle className="truncate text-white">New VPS</CardTitle>
        <CardDescription className="text-white/58">
          Password is optional and never stored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onCreate}
          autoComplete="off"
          className="grid min-w-0 gap-4"
        >
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-normal uppercase tracking-[0.14em] text-white/50">
              Basic info
            </legend>
            <Label>
              Name
              <Input
                required
                maxLength={120}
                placeholder="prod-sgp-01"
                value={createForm.name}
                onChange={(event) =>
                  onCreateFormChange({
                    ...createForm,
                    name: event.target.value,
                  })
                }
              />
            </Label>
            <Label>
              Host / IP
              <Input
                required
                maxLength={255}
                placeholder="203.0.113.20"
                value={createForm.host}
                onChange={(event) =>
                  onCreateFormChange({
                    ...createForm,
                    host: event.target.value,
                  })
                }
              />
            </Label>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-normal uppercase tracking-[0.14em] text-white/50">
              SSH access
            </legend>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Label>
                Port
                <Input
                  required
                  type="number"
                  min={1}
                  max={65535}
                  value={createForm.port}
                  onChange={(event) =>
                    onCreateFormChange({
                      ...createForm,
                      port: event.target.value,
                    })
                  }
                />
              </Label>
              <Label>
                Username
                <Input
                  required
                  maxLength={64}
                  placeholder="root"
                  value={createForm.username}
                  onChange={(event) =>
                    onCreateFormChange({
                      ...createForm,
                      username: event.target.value,
                    })
                  }
                />
              </Label>
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-normal uppercase tracking-[0.14em] text-white/50">
              Key provisioning
            </legend>
            <Label>
              Optional password
              <Input
                type="password"
                maxLength={4096}
                autoComplete="new-password"
                placeholder="One-time key install"
                value={createForm.password}
                onChange={(event) =>
                  onCreateFormChange({
                    ...createForm,
                    password: event.target.value,
                  })
                }
              />
            </Label>
          </fieldset>
          <Button
            type="submit"
            disabled={busy}
            className="min-w-0 rounded-none"
          >
            <Server size={18} />
            <span className="truncate">Create VPS</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
