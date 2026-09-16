import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("web-terminal deployment safety configuration", () => {
  it("keeps the terminal disabled by default in compose, example env, and deployment workflow", () => {
    expect(read("docker-compose.yml")).toContain("ENABLE_WEB_TERMINAL: ${ENABLE_WEB_TERMINAL:-false}");
    expect(read(".env.example")).toMatch(/^ENABLE_WEB_TERMINAL=false$/m);

    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("ENABLE_WEB_TERMINAL_VALUE: ${{ vars.ENABLE_WEB_TERMINAL }}");
    expect(workflow).toContain('ENABLE_WEB_TERMINAL_VALUE="${ENABLE_WEB_TERMINAL_VALUE:-false}"');
    expect(workflow).toContain("ENABLE_WEB_TERMINAL=$ENABLE_WEB_TERMINAL_VALUE");
  });

  it("keeps the API host binding loopback-only", () => {
    expect(read("docker-compose.yml")).toMatch(/- "127\.0\.0\.1:3001:3000"/);
  });

  it("keeps the dedicated terminal nginx route safe and separate from generic API traffic", () => {
    const nginx = read("docker/nginx.conf");
    const terminal = nginx.match(/location ~ \^\/api\/vps\/\[\^\/\]\+\/terminal\$ \{([\s\S]*?)\n  \}/)?.[1];
    expect(terminal).toBeDefined();
    expect(terminal).toContain("proxy_http_version 1.1;");
    expect(terminal).toContain("proxy_set_header Upgrade $http_upgrade;");
    expect(terminal).toContain('proxy_set_header Connection "upgrade";');
    expect(terminal).toContain("proxy_buffering off;");
    expect(terminal).toContain("proxy_read_timeout 1h;");
    expect(terminal).toContain("proxy_send_timeout 1h;");

    expect(nginx).toMatch(/location \/api\/ \{/);
    expect(nginx).toContain("proxy_pass http://api:3000/api/;");
  });
});
