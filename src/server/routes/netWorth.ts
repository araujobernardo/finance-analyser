import { Router } from "express";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { netWorthSnapshots } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";

export const netWorthRouter = Router();

// Apply auth middleware to all routes on this router
netWorthRouter.use(authenticateToken);

// GET /api/net-worth/snapshots
netWorthRouter.get("/snapshots", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoffDate = twoYearsAgo.toISOString().split("T")[0] as string;

    const rows = await db
      .select()
      .from(netWorthSnapshots)
      .where(
        and(
          eq(netWorthSnapshots.userId, userId),
          gte(netWorthSnapshots.snapshotDate, cutoffDate),
        ),
      )
      .orderBy(asc(netWorthSnapshots.snapshotDate));

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/net-worth/snapshots
netWorthRouter.post("/snapshots", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const { totalAssets, totalLiabilities } = req.body as {
      totalAssets?: unknown;
      totalLiabilities?: unknown;
    };

    if (
      typeof totalAssets !== "number" ||
      !isFinite(totalAssets) ||
      typeof totalLiabilities !== "number" ||
      !isFinite(totalLiabilities)
    ) {
      res
        .status(400)
        .json({
          error: "totalAssets and totalLiabilities must be finite numbers",
        });
      return;
    }

    const netWorth = totalAssets - totalLiabilities;
    const snapshotDate = new Date().toISOString().split("T")[0] as string;

    const [row] = await db
      .insert(netWorthSnapshots)
      .values({
        userId,
        totalAssets: String(totalAssets),
        totalLiabilities: String(totalLiabilities),
        netWorth: String(netWorth),
        snapshotDate,
      })
      .onConflictDoUpdate({
        target: [netWorthSnapshots.userId, netWorthSnapshots.snapshotDate],
        set: {
          totalAssets: String(totalAssets),
          totalLiabilities: String(totalLiabilities),
          netWorth: String(netWorth),
        },
      })
      .returning();

    res.json(row);
  } catch (err) {
    next(err);
  }
});
