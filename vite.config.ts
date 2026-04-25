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
    // Pre-bundle packages that ship ES-module entry-points via their
    // 'exports' field.  Without this, the vmThreads Node.js runner on
    // Linux CI resolves recharts → @reduxjs/toolkit → .mjs and throws
    // "SyntaxError: Unexpected token 'export'".  Pre-bundling converts
    // these packages to CJS-compatible bundles in a single Vite pass,
    // deduplicating React so there is only one copy in the test VM.
    deps: {
      optimizer: {
        ssr: {
          include: [
            "recharts",
            "@reduxjs/toolkit",
            "react-router-dom",
            "react-router",
          ],
        },
      },
    },
  },
});
