ALTER TABLE goals
  ADD COLUMN category_name  varchar(100),
  ADD COLUMN current_amount numeric(15, 2),
  ADD COLUMN updated_at     timestamptz NOT NULL DEFAULT now();
