import { defineConfig } from "vitest/config";

export default defineConfig({
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
