CREATE TABLE tbai_jobs (
  id UUID PRIMARY KEY,
  invoice_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  xml TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | processing | sent | accepted | failed | dead_letter
  attempt_count INT NOT NULL DEFAULT 0,
  ticket_id TEXT,
  last_error TEXT,
  request_hash TEXT NOT NULL,
  locked_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  hacienda_reference TEXT,
  state_check_at TIMESTAMP,
  reconciliation_status TEXT
);

CREATE INDEX idx_tbai_jobs_status ON tbai_jobs(status);

CREATE TABLE tbai_submission_log (
  id UUID PRIMARY KEY,
  invoice_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL, -- pending | sent | accepted | failed
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  ticket_id TEXT,
  request_hash TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_submissions (
  id UUID PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_payload TEXT NOT NULL,
  response_payload TEXT,
  status TEXT NOT NULL, -- sent | accepted | rejected | unknown
  ticket_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);
