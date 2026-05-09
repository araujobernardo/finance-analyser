import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.ts";
import { accountsRouter } from "./routes/accounts.ts";
import authRouter from "./routes/auth.ts";
import healthRouter from "./routes/health.ts";

const app = express();
const PORT = process.env.PORT ?? 3001;

const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  console.warn(
    "[server] CORS_ORIGIN is not set — all cross-origin requests will be denied",
  );
}

app.use(
  cors({
    origin: corsOrigin ?? false,
    credentials: true,
  }),
);

app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use("/api/accounts", accountsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", status: 404 });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
