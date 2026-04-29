import { Pool } from "pg";

export async function lockJob(db: Pool) {
  const res = await db.query(
    `UPDATE tbai_jobs
     SET status='processing', locked_at=now(), attempt_count = attempt_count + 1
     WHERE id = (
       SELECT id FROM tbai_jobs
       WHERE status IN ('pending','failed')
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED LIMIT 1
     ) RETURNING *`
  );
  return res.rows[0] || null;
}
