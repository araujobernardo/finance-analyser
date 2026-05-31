// FA-BANK-002 — Akahu Bank Sync
// Routes: POST /api/bank/sync, POST /api/bank/connect, GET /api/bank/connection,
//         DELETE /api/bank/connection, POST /api/bank/accounts/link,
//         DELETE /api/bank/accounts/link/:akahuAccountId

import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import { syncUserAccounts } from "../services/akahuSync.ts";
import { db } from "../../db/index.ts";
import { akahuConnections, akahuAccountLinks } from "../../db/schema.ts";
import { encrypt } from "../utils/encryption.ts";

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

// POST /api/bank/connect — store encrypted Akahu user token
const connectBodySchema = z.object({
  akahuUserId: z.string().min(1),
  userToken: z.string().min(1),
});

akahuSyncRouter.post("/connect", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const parsed = connectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: "Invalid request body",
          details: parsed.error.flatten(),
        });
      return;
    }
    const { akahuUserId, userToken } = parsed.data;
    const encryptedUserToken = encrypt(userToken);

    const rows = await db
      .insert(akahuConnections)
      .values({ userId, akahuUserId, encryptedUserToken })
      .onConflictDoUpdate({
        target: akahuConnections.userId,
        set: { encryptedUserToken, updatedAt: new Date() },
      })
      .returning();

    const row = rows[0]!;

    const { encryptedUserToken: _token, ...safeRow } = row;
    res.status(201).json(safeRow);
  } catch (err: unknown) {
    next(err);
  }
});

// GET /api/bank/connection — return connection row + account links
akahuSyncRouter.get("/connection", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const connectionRows = await db
      .select()
      .from(akahuConnections)
      .where(eq(akahuConnections.userId, userId));

    if (connectionRows.length === 0) {
      res.status(404).json({ error: "No connection found" });
      return;
    }

    const row = connectionRows[0]!;

    const { encryptedUserToken: _token, ...safeConnection } = row;

    const accountLinksRows = await db
      .select()
      .from(akahuAccountLinks)
      .where(eq(akahuAccountLinks.userId, userId));

    res.json({ connection: safeConnection, accountLinks: accountLinksRows });
  } catch (err: unknown) {
    next(err);
  }
});

// DELETE /api/bank/connection — remove connection (CASCADE deletes account links)
akahuSyncRouter.delete("/connection", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    await db
      .delete(akahuConnections)
      .where(eq(akahuConnections.userId, userId));
    res.status(204).send();
  } catch (err: unknown) {
    next(err);
  }
});
