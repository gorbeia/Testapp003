import express, { Request, Response } from "express";
import { Pool } from "pg";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const app = express();
app.use(express.json());

const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/health", async (_, res: Response) => {
  const result = await db.query("SELECT * FROM system_health_view");
  res.json(result.rows[0]);
});

app.get("/invoices", async (_, res: Response) => {
  const result = await db.query("SELECT * FROM invoice_status_view LIMIT 100");
  res.json(result.rows);
});

app.get("/invoices/:id", async (req: Request, res: Response) => {
  const result = await db.query("SELECT * FROM invoices WHERE id=$1", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

app.get("/dlq", async (_, res: Response) => {
  const result = await db.query("SELECT * FROM tbai_dead_letter_queue ORDER BY created_at DESC LIMIT 100");
  res.json(result.rows);
});

app.post("/dlq/:id/retry", async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const dlq = await client.query("SELECT * FROM tbai_dead_letter_queue WHERE id=$1", [id]);
    if (!dlq.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "DLQ entry not found" });
    }
    const entry = dlq.rows[0];
    await client.query(
      `UPDATE tbai_jobs SET status='pending', attempt_count=0, last_error=NULL WHERE id=$1`,
      [entry.job_id]
    );
    await client.query("DELETE FROM tbai_dead_letter_queue WHERE id=$1", [id]);
    await client.query("COMMIT");
    logger.info({ dlqId: id, jobId: entry.job_id }, "DLQ entry retried");
    res.json({ ok: true, jobId: entry.job_id });
  } catch (err: any) {
    await client.query("ROLLBACK");
    logger.error({ dlqId: id, error: err.message }, "DLQ retry failed");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/dlq/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await db.query("DELETE FROM tbai_dead_letter_queue WHERE id=$1 RETURNING id", [id]);
  if (!result.rows[0]) return res.status(404).json({ error: "DLQ entry not found" });
  logger.info({ dlqId: id }, "DLQ entry discarded");
  res.json({ ok: true });
});

app.get("/certificates", async (_, res: Response) => {
  const result = await db.query("SELECT * FROM certificate_health_view");
  res.json(result.rows);
});

app.get("/certificates/expiring", async (_, res: Response) => {
  const result = await db.query(
    `SELECT * FROM certificate_health_view WHERE next_expiry < NOW() + INTERVAL '30 days'`
  );
  res.json(result.rows);
});

// Check for expiring certificates every 24h and log a warning
setInterval(async () => {
  try {
    const result = await db.query(
      `SELECT * FROM certificate_health_view WHERE next_expiry < NOW() + INTERVAL '30 days'`
    );
    if (result.rows.length > 0) {
      logger.warn({ expiring: result.rows.map((r: any) => r.tenant_id) }, "certificates expiring within 30 days");
    }
  } catch (err: any) {
    logger.error({ error: err.message }, "certificate expiry check failed");
  }
}, 24 * 60 * 60 * 1000);

app.listen(3001, () => logger.info("Dashboard API running on port 3001"));
