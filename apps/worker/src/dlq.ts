import { Pool } from "pg";
import axios from "axios";

export async function sendToDLQ(db: Pool, job: any, reason: string, error?: any) {
  await db.query(
    `INSERT INTO tbai_dead_letter_queue (id, invoice_id, tenant_id, reason, error_code, error_detail, xml, attempts)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [job.id, job.invoice_id, job.tenant_id, reason, error?.code ?? null, error?.message ?? null, job.xml, job.attempt_count]
  );

  if (process.env.SLACK_WEBHOOK_URL) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: "TicketBAI DLQ triggered",
      attachments: [{ text: JSON.stringify({ invoiceId: job.invoice_id, reason, error: error?.message }, null, 2) }],
    });
  }
}
