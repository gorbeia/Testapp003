CREATE TABLE tbai_dead_letter_queue (
  id UUID PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  error_code TEXT,
  error_detail TEXT,
  original_payload JSONB,
  xml TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_dlq_tenant ON tbai_dead_letter_queue(tenant_id);
