import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    pool: "vmThreads",
    setupFiles: ["./src/test-setup.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
    // Prefer the 'module-sync' and 'node' export conditions so that
    // react-router-dom, react-router and @reduxjs/toolkit resolve to their
    // CJS-compatible builds rather than the raw .mjs files.  Without this,
    // Linux CI (Node.js / vmThreads runner) cannot evaluate the ESM-only
    // entry points and throws "SyntaxError: Unexpected token 'export'".
    resolve: {
      conditions: ["module-sync", "node"],
    },
  },
});
