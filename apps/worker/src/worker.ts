import { Pool } from "pg";
import { lockJob } from "./lock.js";
import { retry } from "@tbai/core";
import { submitToHacienda } from "./submit.js";
import { parseHaciendaResponse } from "./parse-response.js";
import { sendToDLQ } from "./dlq.js";

export class TicketBaiWorker {
  constructor(private db: Pool, private endpoint: string, private certAgent: any) {}

  async runOnce() {
    const job = await lockJob(this.db);
    if (!job) return;

    try {
      if (job.attempt_count > 5) {
        await sendToDLQ(this.db, job, "RETRY_LIMIT_EXCEEDED");
        await this.db.query(`UPDATE tbai_jobs SET status='dead_letter' WHERE id=$1`, [job.id]);
        return;
      }

      const response = await retry(
        () => submitToHacienda(job.xml, this.endpoint, this.certAgent),
        { retries: 3, baseDelayMs: 1000 }
      );

      const parsed = parseHaciendaResponse(response);

      if (parsed.accepted) {
        await this.db.query(
          `UPDATE tbai_jobs SET status='accepted', ticket_id=$2, last_error=NULL WHERE id=$1`,
          [job.id, parsed.ticketId]
        );
      } else {
        await this.db.query(
          `UPDATE tbai_jobs SET status='failed', last_error=$2 WHERE id=$1`,
          [job.id, parsed.errors.join(",")]
        );
      }
    } catch (err: any) {
      await this.db.query(
        `UPDATE tbai_jobs SET status='failed', last_error=$2 WHERE id=$1`,
        [job.id, err.message]
      );
    }
  }

  async runForever(intervalMs = 2000) {
    while (true) {
      await this.runOnce();
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
}
