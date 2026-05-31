// FA-BANK-002 — Akahu Bank Sync
// Routes: POST /api/bank/sync, POST /api/bank/connect, GET /api/bank/connection,
//         DELETE /api/bank/connection, POST /api/bank/accounts/link,
//         DELETE /api/bank/accounts/link/:akahuAccountId

import { Router } from "express";
import {
  authenticateToken,
  type AuthLocals as _AuthLocals,
} from "../middleware/authenticateToken.ts";

export const akahuSyncRouter = Router();

akahuSyncRouter.use(authenticateToken);
