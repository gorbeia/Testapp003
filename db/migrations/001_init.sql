CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  nif TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  cert_fingerprint TEXT NOT NULL,
  cert_pem TEXT NOT NULL,
  issuer TEXT,
  subject TEXT,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  status TEXT NOT NULL, -- active | expired | revoked
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE applications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_secret_hash TEXT,
  status TEXT NOT NULL, -- active | revoked
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  number TEXT NOT NULL,
  hash TEXT NOT NULL,
  previous_hash TEXT,
  xml TEXT NOT NULL,
  signed_xml TEXT NOT NULL,
  status TEXT NOT NULL,
  type TEXT DEFAULT 'STANDARD',
  corrective_original_id TEXT,
  corrective_reason TEXT,
  corrective_mode TEXT,
  ticket_id TEXT,
  submission_status TEXT,
  submission_error JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX uniq_invoice_per_tenant ON invoices (tenant_id, number);

-- Prevent mutation (immutability)
REVOKE UPDATE, DELETE ON invoices FROM PUBLIC;

CREATE FUNCTION prevent_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Modifications are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_trigger
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
