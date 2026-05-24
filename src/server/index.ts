import cors from "cors";
import express from "express";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { errorHandler } from "./middleware/errorHandler.ts";
import { accountsRouter } from "./routes/accounts.ts";
import { assetsRouter } from "./routes/assets.ts";
import authRouter from "./routes/auth.ts";
import healthRouter from "./routes/health.ts";
import { goalsRouter } from "./routes/goals.ts";
import { budgetsRouter } from "./routes/budgets.ts";
import { budgetDefaultsRouter } from "./routes/budgetDefaults.ts";
import { userPreferencesRouter } from "./routes/userPreferences.ts";
import { jobsRouter } from "./routes/jobs.ts";
import { liabilitiesRouter } from "./routes/liabilities.ts";
import { netWorthRouter } from "./routes/netWorth.ts";
import {
  transactionsRouter,
  transactionOpsRouter,
} from "./routes/transactions.ts";
import { categoriesRouter } from "./routes/categories.ts";

const app = express();
const PORT = process.env.PORT ?? 3001;

const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  console.warn(
    "[server] CORS_ORIGIN is not set — cross-origin requests will be blocked",
  );
}
app.use(cors({ origin: corsOrigin }));

app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/accounts/:accountId/transactions", transactionsRouter);
app.use("/api/transactions", transactionOpsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/liabilities", liabilitiesRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/budget-defaults", budgetDefaultsRouter);
app.use("/api/preferences", userPreferencesRouter);
app.use("/api/net-worth", netWorthRouter);
app.use("/api/jobs", jobsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", status: 404 });
});

app.use(errorHandler);

export default app;

// ── Auto-migrate on startup ──────────────────────────────────────────────────
// Runs all pending Drizzle migrations before the server accepts connections.
// This is idempotent — already-applied migrations are skipped.
// Required because the Render server start command does not include a separate
// migration step, and some migrations (0006, 0007, 0008) were never applied to
// the production database.

async function startServer() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[startup] DATABASE_URL is not set — cannot run migrations");
    process.exit(1);
  }

  try {
    const migrationClient = postgres(dbUrl, { max: 1 });
    const migrationDb = drizzle(migrationClient);
    console.log("[startup] Applying pending migrations...");
    await migrate(migrationDb, { migrationsFolder: "./src/db/migrations" });
    console.log("[startup] Migrations complete.");
    await migrationClient.end();
  } catch (err) {
    console.error("[startup] Migration failed:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

await startServer();
