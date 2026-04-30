import { Pool, PoolClient } from "pg";
import { Storage, InvoiceRecord } from "@tbai/core";

export class PostgresStorage implements Storage {
  constructor(private pool: Pool) {}

  async append(record: InvoiceRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO invoices (id, tenant_id, series, number, hash, previous_hash, xml, signed_xml, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [record.id, record.tenantId, record.series ?? "A", record.number,
       record.hash, record.previousHash, record.xml, record.signedXml, record.status]
    );
  }

  async getLast(tenantId: string, series: string): Promise<InvoiceRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM invoices WHERE tenant_id=$1 AND series=$2 ORDER BY created_at DESC LIMIT 1`,
      [tenantId, series]
    );
    return res.rows[0] ?? null;
  }
}

export async function withTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
