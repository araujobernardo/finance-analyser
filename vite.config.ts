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
    server: {
      deps: {
        // Inline @reduxjs/toolkit so Vite transforms it instead of Node
        // loading the raw ESM entry-point (.mjs) via the 'exports' field
        // 'import' condition.  On Linux CI the vmThreads runner cannot
        // evaluate a .mjs file loaded via require(), causing:
        //   SyntaxError: Unexpected token 'export'
        // Context: recharts (CJS) requires @reduxjs/toolkit; vitest resolves
        // it to redux-toolkit.modern.mjs which Node's require() cannot parse.
        inline: ["@reduxjs/toolkit"],
      },
    },
  },
});
