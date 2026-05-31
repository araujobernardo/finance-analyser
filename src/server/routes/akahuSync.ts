// FA-BANK-002 — Akahu Bank Sync
// Routes: POST /api/bank/sync, POST /api/bank/connect, GET /api/bank/connection,
//         DELETE /api/bank/connection, POST /api/bank/accounts/link,
//         DELETE /api/bank/accounts/link/:akahuAccountId

import { Router } from "express";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import { syncUserAccounts } from "../services/akahuSync.ts";

export const akahuSyncRouter = Router();

akahuSyncRouter.use(authenticateToken);

// POST /api/bank/sync — manually trigger a bank sync for the authenticated user
akahuSyncRouter.post("/sync", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const result = await syncUserAccounts(userId);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("No Akahu connection")) {
      res.status(404).json({ error: "No Akahu connection found" });
      return;
    }
    next(err);
  }
});
