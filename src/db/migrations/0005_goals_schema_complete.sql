-- FA-GOAL-001 Phase 2: extend goals table with new columns
-- current_amount is intentionally nullable (no NOT NULL) — null until populated by FA-GOAL-003
-- category_name is intentionally nullable — only used for spending_limit goals
-- updated_at is NOT NULL with server-side DEFAULT now() — consistent with assets and liabilities
ALTER TABLE goals
  ADD COLUMN category_name  varchar(100),
  ADD COLUMN current_amount numeric(15, 2),
  ADD COLUMN updated_at     timestamptz NOT NULL DEFAULT now();
