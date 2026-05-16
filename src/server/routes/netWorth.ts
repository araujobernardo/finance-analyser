import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken.ts";

export const netWorthRouter = Router();

// Apply auth middleware to all routes on this router
netWorthRouter.use(authenticateToken);

// GET /api/net-worth/snapshots — stub (implemented in T009)
netWorthRouter.get("/snapshots", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

// POST /api/net-worth/snapshots — stub (implemented in T012)
netWorthRouter.post("/snapshots", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});
