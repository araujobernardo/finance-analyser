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
        // Force Vitest to transform these ESM-only packages through its
        // bundler instead of letting Node require() them directly.
        // On Linux CI the vmThreads pool externalises these packages and
        // Node's require() cannot parse their .mjs entry points, causing:
        //   SyntaxError: Cannot use import statement outside a module
        inline: ["@reduxjs/toolkit", "react-router", "react-router-dom"],
      },
    },
  },
});
