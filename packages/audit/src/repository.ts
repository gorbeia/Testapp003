import { Pool } from "pg";
import { InvoiceChainNode } from "./types.js";

export class AuditRepository {
  constructor(private pool: Pool) {}

  async loadTenantChain(tenantId: string): Promise<InvoiceChainNode[]> {
    const res = await this.pool.query(
      `SELECT id, tenant_id, number, hash, previous_hash, created_at
       FROM invoices WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId]
    );
    return res.rows.map(r => ({
      id: r.id, tenantId: r.tenant_id, number: r.number,
      hash: r.hash, previousHash: r.previous_hash, createdAt: r.created_at,
    }));
  }
}
