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

export default app;

// Only start the HTTP server when running directly (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
