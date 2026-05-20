import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { accounts, transactions } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import { syncLinkedAssets } from "../utils/syncLinkedAssets.ts";
import { recalculateUserGoals } from "../utils/recalculateUserGoals.ts";

export const transactionsRouter = Router({ mergeParams: true });

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const createTransactionSchema = z.object({
  date: z.string().regex(DATE_REGEX, "date must be YYYY-MM-DD"),
  amount: z.number(),
  description: z.string().min(1),
  category: z.string().optional(),
  isTransfer: z.boolean().optional().default(false),
  isManualTransfer: z.boolean().optional().default(false),
});

const updateTransactionSchema = z
  .object({
    category: z.string().optional(),
    description: z.string().min(1).optional(),
    isTransfer: z.boolean().optional(),
    isManualTransfer: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.category !== undefined ||
      data.description !== undefined ||
      data.isTransfer !== undefined ||
      data.isManualTransfer !== undefined,
    {
      message:
        "At least one of category, description, isTransfer, or isManualTransfer must be provided",
    },
  );

function serializeTransaction(row: {
  id: string;
  userId: string;
  accountId: string;
  date: string;
  amount: string;
  description: string;
  category: string | null;
  isTransfer: boolean;
  isManualTransfer: boolean;
  createdAt: Date;
}) {
  return {
    ...row,
    amount: parseFloat(row.amount),
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/accounts/:accountId/transactions
transactionsRouter.get("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const accountId = req.params["accountId"] as string;

    // Verify account ownership
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.userId, userId),
        ),
      )
      .orderBy(desc(transactions.date));

    res.json({ transactions: rows.map(serializeTransaction) });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts/:accountId/transactions
transactionsRouter.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const accountId = req.params["accountId"] as string;

    // Verify account ownership
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }

    const {
      date,
      amount,
      description,
      category,
      isTransfer,
      isManualTransfer,
    } = parsed.data;

    const [row] = await db
      .insert(transactions)
      .values({
        userId,
        accountId,
        date,
        amount: amount.toString(),
        description,
        category: category ?? null,
        isTransfer,
        isManualTransfer,
      })
      .returning();

    // FA-NW-004 US3: sync any assets/liabilities linked to this account
    await syncLinkedAssets(accountId, userId, db);
    // FA-GOAL-003 T005: recalculate savings_target goal progress after a new transaction
    await recalculateUserGoals(userId, db);

    res.status(201).json(serializeTransaction(row));
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts/:accountId/transactions/import
const importTransactionRowSchema = z.object({
  date: z.string().regex(DATE_REGEX, "date must be YYYY-MM-DD"),
  amount: z.number(),
  description: z.string().min(1),
  category: z.string().optional(),
  isTransfer: z.boolean().optional().default(false),
  isManualTransfer: z.boolean().optional().default(false),
});

const importTransactionsSchema = z.object({
  transactions: z.array(importTransactionRowSchema),
});

transactionsRouter.post(
  "/import",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userId = (res.locals as AuthLocals).user.userId;
      const accountId = req.params["accountId"] as string;

      // Verify account ownership
      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      const outerParsed = importTransactionsSchema.safeParse(req.body);
      if (!outerParsed.success) {
        res.status(400).json({
          error:
            outerParsed.error.issues[0]?.message ??
            "transactions must be an array",
        });
        return;
      }

      const validRows: Array<{
        userId: string;
        accountId: string;
        date: string;
        amount: string;
        description: string;
        category: string | null;
        isTransfer: boolean;
        isManualTransfer: boolean;
      }> = [];
      let skipped = 0;

      for (const row of outerParsed.data.transactions) {
        const rowParsed = importTransactionRowSchema.safeParse(row);
        if (rowParsed.success) {
          validRows.push({
            userId,
            accountId,
            date: rowParsed.data.date,
            amount: rowParsed.data.amount.toString(),
            description: rowParsed.data.description,
            category: rowParsed.data.category ?? null,
            isTransfer: rowParsed.data.isTransfer,
            isManualTransfer: rowParsed.data.isManualTransfer,
          });
        } else {
          skipped++;
        }
      }

      if (validRows.length > 0) {
        await db.insert(transactions).values(validRows);
        // FA-NW-004 US3: sync any assets/liabilities linked to this account.
        // Wrapped in try-catch: sync failures are secondary effects and must
        // never roll back a successful import.
        try {
          await syncLinkedAssets(accountId, userId, db);
        } catch (syncErr) {
          console.error(
            "[import] syncLinkedAssets failed (non-fatal):",
            syncErr,
          );
        }
        // FA-GOAL-003 T006: recalculate savings_target goal progress after bulk import.
        // Wrapped in try-catch: recalculation failures are secondary effects and must
        // never roll back a successful import.
        try {
          await recalculateUserGoals(userId, db);
        } catch (goalErr) {
          console.error(
            "[import] recalculateUserGoals failed (non-fatal):",
            goalErr,
          );
        }
      }

      res.json({ imported: validRows.length, skipped });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/transactions/:id
// Registered separately on a different router prefix; this file exports a
// standalone patchDeleteRouter for /api/transactions routes.
export const transactionOpsRouter = Router();

transactionOpsRouter.patch(
  "/:id",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userId = (res.locals as AuthLocals).user.userId;
      const id = req.params["id"] as string;

      const parsed = updateTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
        return;
      }

      const updates: Partial<{
        category: string | null;
        description: string;
        isTransfer: boolean;
        isManualTransfer: boolean;
      }> = {};
      if (parsed.data.category !== undefined)
        updates.category = parsed.data.category;
      if (parsed.data.description !== undefined)
        updates.description = parsed.data.description;
      if (parsed.data.isTransfer !== undefined)
        updates.isTransfer = parsed.data.isTransfer;
      if (parsed.data.isManualTransfer !== undefined)
        updates.isManualTransfer = parsed.data.isManualTransfer;

      const [updated] = await db
        .update(transactions)
        .set(updates)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      // FA-NW-004 US3: sync any assets/liabilities linked to this transaction's account
      await syncLinkedAssets(updated.accountId, userId, db);
      // FA-GOAL-003 T006: recalculate savings_target goal progress after transaction edit
      await recalculateUserGoals(userId, db);

      res.json(serializeTransaction(updated));
    } catch (err) {
      next(err);
    }
  },
);

transactionOpsRouter.delete(
  "/:id",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userId = (res.locals as AuthLocals).user.userId;
      const id = req.params["id"] as string;

      const [deleted] = await db
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning();

      if (!deleted) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      // FA-NW-004 US3: sync any assets/liabilities linked to this transaction's account
      await syncLinkedAssets(deleted.accountId, userId, db);
      // FA-GOAL-003 T006: recalculate savings_target goal progress after transaction delete
      await recalculateUserGoals(userId, db);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
