import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "packages/web/src")
    }
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    }
  },
  test: {
    environment: "node",
    include: ["packages/api/tests/**/*.test.ts", "packages/web/src/**/*.test.tsx"],
    environmentMatchGlobs: [["packages/web/src/**/*.test.tsx", "jsdom"]],
    globals: false,
    restoreMocks: true
  }
});
