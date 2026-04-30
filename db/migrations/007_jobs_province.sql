-- Track which Hacienda province each job is submitted to for endpoint routing
ALTER TABLE tbai_jobs ADD COLUMN IF NOT EXISTS province TEXT NOT NULL DEFAULT 'bizkaia';
