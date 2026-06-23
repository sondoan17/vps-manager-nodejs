import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: "../../public",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
