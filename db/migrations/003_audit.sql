CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_audit_invoice ON audit_events(invoice_id);

CREATE TABLE audit_xml_store (
  id UUID PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  xml TEXT NOT NULL,
  xml_hash TEXT NOT NULL,
  signed BOOLEAN NOT NULL,
  signature_hash TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_chain (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE signing_sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  certificate_id UUID NOT NULL,
  invoice_id TEXT NOT NULL,
  xml_hash TEXT NOT NULL,
  signed_xml_hash TEXT NOT NULL,
  signer_version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
