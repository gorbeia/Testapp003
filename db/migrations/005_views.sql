CREATE VIEW invoice_status_view AS
SELECT i.id AS invoice_id, i.tenant_id, j.status AS submission_status,
       j.ticket_id, j.attempt_count, j.last_error
FROM tbai_jobs j JOIN invoices i ON i.id = j.invoice_id::uuid;

CREATE VIEW system_health_view AS
SELECT
  (SELECT COUNT(*) FROM tbai_jobs WHERE status='failed') AS failed_jobs,
  (SELECT COUNT(*) FROM tbai_jobs WHERE status='processing') AS processing_jobs,
  (SELECT COUNT(*) FROM tbai_jobs WHERE status='pending') AS pending_jobs,
  (SELECT COUNT(*) FROM tbai_dead_letter_queue) AS dlq_items;

CREATE VIEW certificate_health_view AS
SELECT tenant_id,
  COUNT(*) FILTER (WHERE status='active') AS active_certs,
  COUNT(*) FILTER (WHERE status='expired') AS expired_certs,
  MIN(valid_to) AS next_expiry
FROM certificates GROUP BY tenant_id;
