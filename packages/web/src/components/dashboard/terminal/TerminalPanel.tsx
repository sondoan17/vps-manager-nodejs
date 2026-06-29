import { TerminalSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { ScrollArea } from "../../ui/scroll-area";
import type { DashboardOverview } from "../../../lib/api";

export function TerminalPanel({
  terminal,
}: {
  terminal: DashboardOverview["terminal"];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{terminal.label}</CardTitle>
        <CardDescription>
          Canned output only. No real SSH connections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 font-black">
          <TerminalSquare size={18} />
          No real SSH connections
        </div>
        <p className="text-sm text-muted-foreground">
          Commands: {terminal.commands.join(", ") || "none"}
        </p>
        {terminal.sessions.map((session) => (
          <ScrollArea
            key={session.command}
            className="max-w-full rounded-md bg-primary"
          >
            <pre className="whitespace-pre-wrap break-words p-3 pr-4 text-sm text-primary-foreground">
              $ {session.command}
              {"\n"}
              {session.output}
            </pre>
          </ScrollArea>
        ))}
      </CardContent>
    </Card>
  );
}
