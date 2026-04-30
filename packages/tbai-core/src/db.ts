import { Pool, PoolClient } from 'pg';
import { InvoiceInput, InvoiceRecord } from './types.js';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not set');
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function insertInvoice(
  input: InvoiceInput,
  xml: string,
  signedXml: string,
  hash: string,
  ticketId: string,
  client?: PoolClient,
): Promise<InvoiceRecord> {
  const db = client ?? getPool();
  const { rows } = await db.query<InvoiceRecord>(
    `INSERT INTO invoices
       (tenant_id, invoice_number, series, status, xml, signed_xml, hash, ticket_id)
     VALUES ($1, $2, $3, 'ACCEPTED', $4, $5, $6, $7)
     ON CONFLICT (tenant_id, series, invoice_number)
       DO UPDATE SET
         status     = EXCLUDED.status,
         xml        = EXCLUDED.xml,
         signed_xml = EXCLUDED.signed_xml,
         hash       = EXCLUDED.hash,
         ticket_id  = EXCLUDED.ticket_id
     RETURNING
       id, tenant_id AS "tenantId", invoice_number AS "invoiceNumber",
       series, status, xml, signed_xml AS "signedXml", hash,
       ticket_id AS "ticketId", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [input.tenantId, input.invoiceNumber, input.series ?? '', xml, signedXml, hash, ticketId],
  );
  return rows[0];
}

export async function writeAuditLog(
  invoiceId: string,
  event: string,
  payload: Record<string, unknown>,
  client?: PoolClient,
): Promise<void> {
  const db = client ?? getPool();
  await db.query(
    `INSERT INTO audit_log (invoice_id, event, payload) VALUES ($1, $2, $3)`,
    [invoiceId, event, JSON.stringify(payload)],
  );
}

export async function fetchInvoiceById(id: string): Promise<InvoiceRecord | null> {
  const { rows } = await getPool().query<InvoiceRecord>(
    `SELECT
       id, tenant_id AS "tenantId", invoice_number AS "invoiceNumber",
       series, status, xml, signed_xml AS "signedXml", hash,
       ticket_id AS "ticketId", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM invoices WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function fetchAuditLogs(invoiceId: string): Promise<Array<{
  id: number; event: string; payload: Record<string, unknown>; createdAt: Date;
}>> {
  const { rows } = await getPool().query(
    `SELECT id, event, payload, created_at AS "createdAt"
     FROM audit_log WHERE invoice_id = $1 ORDER BY id`,
    [invoiceId],
  );
  return rows;
}
