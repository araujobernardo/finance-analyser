-- FA-NW-004 Foundation: add auto_sync and balance_clamped columns
-- to assets and liabilities tables

ALTER TABLE "assets"
  ADD COLUMN "auto_sync" boolean NOT NULL DEFAULT true,
  ADD COLUMN "balance_clamped" boolean NOT NULL DEFAULT false;

ALTER TABLE "liabilities"
  ADD COLUMN "auto_sync" boolean NOT NULL DEFAULT true,
  ADD COLUMN "balance_clamped" boolean NOT NULL DEFAULT false;
