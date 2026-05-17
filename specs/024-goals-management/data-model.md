# Data Model: Goals Management (FA-GOAL-002)

## No schema changes

The `goals` table is fully defined by FA-GOAL-001. This feature makes no DDL changes. All reads and writes go through Drizzle's existing `goals` schema export.

---

## TypeScript API type: `src/types/api.ts`

Add to the existing file:

```ts
export interface ApiGoal {
  id: string;
  userId: string;
  name: string;
  type:
    | "savings_target"
    | "debt_payoff"
    | "net_worth_milestone"
    | "spending_limit";
  targetAmount: string; // postgres-js returns numeric as string; call parseFloat() before arithmetic
  targetDate: string | null; // YYYY-MM-DD
  linkedAccountId: string | null;
  categoryName: string | null;
  currentAmount: string | null; // postgres-js returns numeric as string; null until manually set
  status: "active" | "achieved" | "abandoned";
  createdAt: string;
  updatedAt: string;
}
```

---

## Zod schemas: `src/server/routes/goals.ts`

### Shared constants

```ts
const GOAL_TYPES = [
  "savings_target",
  "debt_payoff",
  "net_worth_milestone",
  "spending_limit",
] as const;

const GOAL_STATUSES = ["active", "achieved", "abandoned"] as const;
```

### POST schema

```ts
const createGoalSchema = z
  .object({
    name: z.string().min(1).max(100),
    type: z.enum(GOAL_TYPES),
    targetAmount: z.number().min(0),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    linkedAccountId: z.string().uuid().nullable().optional(),
    categoryName: z.string().max(100).nullable().optional(),
  })
  .refine((d) => d.type !== "spending_limit" || d.categoryName != null, {
    message: "categoryName is required for spending_limit goals",
    path: ["categoryName"],
  })
  .refine((d) => d.type === "spending_limit" || d.categoryName == null, {
    message: "categoryName must be null for non-spending_limit goals",
    path: ["categoryName"],
  });
```

### PATCH schema

```ts
const updateGoalSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(GOAL_TYPES).optional(),
    targetAmount: z.number().min(0).optional(),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    linkedAccountId: z.string().uuid().nullable().optional(),
    categoryName: z.string().max(100).nullable().optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    currentAmount: z.number().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field required",
  })
  .refine(
    (d) => !d.type || d.type !== "spending_limit" || d.categoryName != null,
    {
      message: "categoryName is required for spending_limit goals",
      path: ["categoryName"],
    },
  )
  .refine(
    (d) => !d.type || d.type === "spending_limit" || d.categoryName == null,
    {
      message: "categoryName must be null for non-spending_limit goals",
      path: ["categoryName"],
    },
  );
```

---

## GoalsContext state shape

```ts
export interface GoalsContextValue {
  goals: ApiGoal[];
  isLoading: boolean;
  addGoal: (data: {
    name: string;
    type: string;
    targetAmount: number;
    targetDate?: string | null;
    linkedAccountId?: string | null;
    categoryName?: string | null;
  }) => Promise<boolean>;
  updateGoal: (
    id: string,
    updates: {
      name?: string;
      type?: string;
      targetAmount?: number;
      targetDate?: string | null;
      linkedAccountId?: string | null;
      categoryName?: string | null;
      status?: string;
      currentAmount?: number | null;
    },
  ) => Promise<boolean>;
  removeGoal: (id: string) => Promise<boolean>;
}
```

---

## Progress calculation (frontend)

```ts
function goalPercent(goal: ApiGoal): number {
  if (goal.currentAmount == null) return 0;
  const target = parseFloat(goal.targetAmount);
  if (target <= 0) return 0;
  return Math.min(100, (parseFloat(goal.currentAmount) / target) * 100);
}
```

- Returns `0` when `currentAmount` is null — paired with "Progress will update automatically" label.
- Capped at `100` to handle over-target goals; a separate "over target" label can be shown when the raw ratio exceeds 1.
