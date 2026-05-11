import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // forks pool uses real child processes which have native ESM support.
    // vmThreads (the previous setting) uses vm contexts that cannot evaluate
    // .mjs entry points via require(), causing SyntaxError on Linux CI for
    // packages like recharts, @reduxjs/toolkit, and react-router.
    pool: "forks",
    // IMPORTANT: must be setupFiles (not globalSetup). Vitest 4.x requires
    // afterEach / beforeEach calls in setup files to run inside a suite context,
    // which only happens when the file is loaded via setupFiles. Using globalSetup
    // would execute the file outside any suite and throw:
    //   "Vitest failed to find the current suite."
    setupFiles: ["./src/test-setup.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
