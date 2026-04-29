import { Pool } from "pg";
import { Storage, InvoiceRecord } from "@tbai/core";

export class PostgresStorage implements Storage {
  constructor(private pool: Pool) {}

  async append(record: InvoiceRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO invoices (id, tenant_id, number, hash, previous_hash, xml, signed_xml, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [record.id, record.tenantId, record.number, record.hash,
       record.previousHash, record.xml, record.signedXml, record.status]
    );
  }

  async getLast(tenantId: string): Promise<InvoiceRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM invoices WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return res.rows[0] ?? null;
  }
}
