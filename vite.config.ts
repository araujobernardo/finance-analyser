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
    setupFiles: ["./src/test-setup.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
