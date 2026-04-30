-- Add invoice series to support per-series hash chains (e.g. A for standard, R for rectificativas)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS series TEXT NOT NULL DEFAULT 'A';

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tenant_number_unique;
ALTER TABLE invoices ADD CONSTRAINT invoices_tenant_series_number_unique
  UNIQUE (tenant_id, series, number);
