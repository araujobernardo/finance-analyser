import type { ErrorRequestHandler } from "express";

interface AppError extends Error {
  status?: number;
}

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req,
  res,
  _next,
) => {
  const status = err.status ?? 500;
  console.error(`[${status}]`, err);
  const clientMessage =
    status < 500 ? (err.message ?? "Bad Request") : "Internal Server Error";
  res.status(status).json({ error: clientMessage });
};
