// Omit the .ts extension so esbuild resolves and bundles this via its
// normal TypeScript file resolution, rather than treating the literal
// ".ts" path as a runtime module reference it cannot load.
import app from "../src/server/index";
export default app;
