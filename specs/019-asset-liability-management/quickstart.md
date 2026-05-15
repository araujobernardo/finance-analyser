# Quickstart: Asset and Liability Management

Quick reference for implementing FA-NW-002. Read `plan.md` for the full breakdown.

---

## Pre-flight

```bash
# Verify assets/liabilities migrations have been applied
npm run db:migrate

# Confirm tables exist in Supabase (psql or Supabase Studio)
# assets, liabilities tables should be present
```

---

## Backend — new route files

Two new files, each following `src/server/routes/accounts.ts` exactly.

### `src/server/routes/assets.ts`

```typescript
import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { assets } from "../../db/schema.ts";
import { authenticateToken, type AuthLocals } from "../middleware/authenticateToken.ts";

export const assetsRouter = Router();

const ASSET_TYPES = ["property", "investments", "kiwisaver", "savings", "vehicle", "other"] as const;

const createAssetSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ASSET_TYPES),
  value: z.number().min(0),
  linkedAccountId: z.string().uuid().nullable().optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(ASSET_TYPES).optional(),
  value: z.number().min(0).optional(),
  linkedAccountId: z.string().uuid().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });

// GET /api/assets
assetsRouter.get("/", authenticateToken, async (_req, res, next) => { ... });

// POST /api/assets
assetsRouter.post("/", authenticateToken, async (req, res, next) => { ... });

// PATCH /api/assets/:id  — must include updatedAt: new Date() in .set({})
assetsRouter.patch("/:id", authenticateToken, async (req, res, next) => { ... });

// DELETE /api/assets/:id
assetsRouter.delete("/:id", authenticateToken, async (req, res, next) => { ... });
```

Repeat the same structure for `src/server/routes/liabilities.ts` with `LIABILITY_TYPES`.

### Register in `src/server/index.ts`

```typescript
import { assetsRouter } from "./routes/assets.ts";
import { liabilitiesRouter } from "./routes/liabilities.ts";

app.use("/api/assets", assetsRouter);
app.use("/api/liabilities", liabilitiesRouter);
```

---

## Frontend — file map

| File                                          | Purpose                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `src/types/api.ts`                            | Add `ApiAsset` and `ApiLiability` interfaces                             |
| `src/context/NetWorthContext.tsx`             | State, optimistic CRUD, parallel fetch on mount                          |
| `src/pages/NetWorthPage.tsx`                  | Page layout: summary bar + two-column grid                               |
| `src/components/net-worth/AssetList.tsx`      | Assets column: grouped by type, add/edit/delete                          |
| `src/components/net-worth/LiabilityList.tsx`  | Liabilities column: same pattern                                         |
| `src/components/net-worth/AssetModal.tsx`     | Add/edit form modal for assets                                           |
| `src/components/net-worth/LiabilityModal.tsx` | Add/edit form modal for liabilities                                      |
| `src/components/net-worth/NetWorthModal.css`  | Shared modal styles (extend AccountModal.css pattern)                    |
| `src/components/net-worth/NetWorthPage.css`   | Page layout styles                                                       |
| `src/App.tsx`                                 | Add `/net-worth` ProtectedRoute wrapping NetWorthProvider + NetWorthPage |
| `src/components/Sidebar.tsx`                  | Add Net Worth nav entry                                                  |

---

## Key patterns

### NZD formatting

```typescript
const fmt = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});
fmt.format(parseFloat(asset.value)); // value is string from API
```

### Parallel fetch on context mount

```typescript
const [assetsRes, liabilitiesRes] = await Promise.all([
  apiFetch("/api/assets"),
  apiFetch("/api/liabilities"),
]);
```

### Optimistic add (asset example)

```typescript
const tempId = "optimistic-" + crypto.randomUUID();
setAssets((prev) => [...prev, { id: tempId, ...optimisticData }]);
// on success: replace tempId with real record
// on failure: filter out tempId + addToast(...)
```

### Net worth summary bar colour

```typescript
const netWorth = totalAssets - totalLiabilities;
// netWorth >= 0 → var(--accent) green, < 0 → var(--red)
```

### Grouped list rendering

```typescript
const ASSET_TYPES = [
  "property",
  "investments",
  "kiwisaver",
  "savings",
  "vehicle",
  "other",
];
const grouped = ASSET_TYPES.map((type) => ({
  type,
  items: assets.filter((a) => a.type === type),
})).filter((g) => g.items.length > 0);
```

---

## Running locally

```bash
npm run dev        # starts Vite (5173) + Express (3001) concurrently
```

Navigate to `http://localhost:5173/net-worth` once the route is wired up.
