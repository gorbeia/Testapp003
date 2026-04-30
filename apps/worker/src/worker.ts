import { Pool } from "pg";
import pino from "pino";
import { lockJob } from "./lock.js";
import { retry } from "@tbai/core";
import { submitToHacienda, getEndpoint, Province, Environment } from "./submit.js";
import { parseHaciendaResponse } from "./parse-response.js";
import { sendToDLQ } from "./dlq.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export class TicketBaiWorker {
  constructor(private db: Pool, private endpoint: string, private certAgent: any) {}

  async runOnce() {
    const job = await lockJob(this.db);
    if (!job) return;

    const province = (job.province ?? "bizkaia") as Province;
    const env = (process.env.TBAI_ENV === "sandbox" ? "sandbox" : "production") as Environment;
    const endpoint = this.endpoint || getEndpoint(province, env);

    logger.info({ jobId: job.id, tenantId: job.tenant_id, invoiceId: job.invoice_id, province }, "processing job");

    try {
      if (job.attempt_count > 5) {
        await sendToDLQ(this.db, job, "RETRY_LIMIT_EXCEEDED");
        await this.db.query(`UPDATE tbai_jobs SET status='dead_letter' WHERE id=$1`, [job.id]);
        logger.warn({ jobId: job.id, tenantId: job.tenant_id }, "job sent to DLQ");
        return;
      }

      const response = await retry(
        () => submitToHacienda(job.xml, endpoint, this.certAgent),
        { retries: 3, baseDelayMs: 1000 }
      );

      const parsed = parseHaciendaResponse(response);

      if (parsed.accepted) {
        await this.db.query(
          `UPDATE tbai_jobs SET status='accepted', ticket_id=$2, last_error=NULL WHERE id=$1`,
          [job.id, parsed.ticketId]
        );
        logger.info({ jobId: job.id, tenantId: job.tenant_id, ticketId: parsed.ticketId }, "job accepted");
      } else {
        await this.db.query(
          `UPDATE tbai_jobs SET status='failed', last_error=$2 WHERE id=$1`,
          [job.id, parsed.errors.join(",")]
        );
        logger.warn({ jobId: job.id, tenantId: job.tenant_id, errors: parsed.errors }, "job rejected by Hacienda");
      }
    } catch (err: any) {
      await this.db.query(
        `UPDATE tbai_jobs SET status='failed', last_error=$2 WHERE id=$1`,
        [job.id, err.message]
      );
      logger.error({ jobId: job.id, tenantId: job.tenant_id, error: err.message }, "job submission failed");
    }
  }

  async runForever(intervalMs = 2000) {
    while (true) {
      await this.runOnce();
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
}
