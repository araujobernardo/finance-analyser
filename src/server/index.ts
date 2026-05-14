import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.ts";
import { accountsRouter } from "./routes/accounts.ts";
import authRouter from "./routes/auth.ts";
import healthRouter from "./routes/health.ts";
import {
  transactionsRouter,
  transactionOpsRouter,
} from "./routes/transactions.ts";

const app = express();
const PORT = process.env.PORT ?? 3001;

const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  console.warn(
    "[server] CORS_ORIGIN is not set — all cross-origin requests will be denied",
  );
}

function isOriginAllowed(origin: string): boolean {
  return corsOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });
}

app.use(
  cors({
    origin: corsOrigins.length > 0 ? isOriginAllowed : false,
    credentials: true,
  }),
);

app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/accounts/:accountId/transactions", transactionsRouter);
app.use("/api/transactions", transactionOpsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", status: 404 });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
