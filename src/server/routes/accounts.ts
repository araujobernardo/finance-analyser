import { Router } from "express";
import { eq, and, asc, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { accounts, transactions } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";

export const accountsRouter = Router();

const ACCOUNT_TYPES = [
  "Checking",
  "Savings",
  "Credit Card",
  "Investment",
  "Cash",
] as const;

const createAccountSchema = z.object({
  nickname: z.string().min(1).max(100),
  accountType: z.enum(ACCOUNT_TYPES),
  accountNumber: z.string().optional().default(""),
});

const updateAccountSchema = z
  .object({
    nickname: z.string().min(1).max(100).optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
  })
  .refine(
    (data) => data.nickname !== undefined || data.accountType !== undefined,
    {
      message: "At least one of nickname or accountType must be provided",
    },
  );

// GET /api/accounts
accountsRouter.get("/", authenticateToken, async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const rows = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.createdAt));
    res.json({ accounts: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts
accountsRouter.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { nickname, accountType, accountNumber } = parsed.data;
    const [account] = await db
      .insert(accounts)
      .values({ userId, nickname, accountType, accountNumber })
      .returning();
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/accounts/:id
accountsRouter.patch("/:id", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;
    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const updates: Partial<{ nickname: string; accountType: string }> = {};
    if (parsed.data.nickname !== undefined)
      updates.nickname = parsed.data.nickname;
    if (parsed.data.accountType !== undefined)
      updates.accountType = parsed.data.accountType;

    const [updated] = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id
accountsRouter.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;
    const [deleted] = await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id/transactions — danger zone: delete all transactions
// for one account only; account itself is preserved.
accountsRouter.delete(
  "/:id/transactions",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userId = (res.locals as AuthLocals).user.userId;
      const id = req.params["id"] as string;

      // Verify account ownership before touching transactions
      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      // Count before deleting so we can return deletedCount
      const [{ value: deletedCount }] = await db
        .select({ value: count() })
        .from(transactions)
        .where(
          and(eq(transactions.accountId, id), eq(transactions.userId, userId)),
        );

      await db
        .delete(transactions)
        .where(
          and(eq(transactions.accountId, id), eq(transactions.userId, userId)),
        );

      res.json({ deletedCount: Number(deletedCount) });
    } catch (err) {
      next(err);
    }
  },
);
