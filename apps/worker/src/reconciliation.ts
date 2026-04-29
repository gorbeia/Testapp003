import { Pool } from "pg";
import axios from "axios";

export class ReconciliationService {
  constructor(private db: Pool, private endpoint: string) {}

  async findCandidates() {
    const res = await this.db.query(
      `SELECT * FROM tbai_jobs
       WHERE status IN ('processing','failed')
          OR (status='sent' AND state_check_at < now() - interval '5 minutes')
       ORDER BY created_at ASC`
    );
    return res.rows;
  }

  async verifyWithHacienda(job: any) {
    if (!job.ticket_id) return null;
    try {
      const res = await axios.get(this.endpoint, { params: { ticketId: job.ticket_id }, timeout: 10000 });
      return res.data;
    } catch {
      return null;
    }
  }
}
