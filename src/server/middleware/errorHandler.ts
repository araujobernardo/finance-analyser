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
  res
    .status(status)
    .json({ error: err.message || "Internal Server Error", status });
};
