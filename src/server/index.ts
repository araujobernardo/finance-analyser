import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.ts";
import { accountsRouter } from "./routes/accounts.ts";
import { assetsRouter } from "./routes/assets.ts";
import authRouter from "./routes/auth.ts";
import healthRouter from "./routes/health.ts";
import { liabilitiesRouter } from "./routes/liabilities.ts";
import { netWorthRouter } from "./routes/netWorth.ts";
import {
  transactionsRouter,
  transactionOpsRouter,
} from "./routes/transactions.ts";

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
app.use("/api/assets", assetsRouter);
app.use("/api/liabilities", liabilitiesRouter);
app.use("/api/net-worth", netWorthRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", status: 404 });
});

app.use(errorHandler);

export default app;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
