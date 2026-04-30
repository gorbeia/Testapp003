import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildBizkaiaXml } from '../../packages/tbai-core/src/xml-builder.js';
import { signXml } from '../../packages/tbai-core/src/signer.js';
import { computeTicketBaiHash, hashInputFromInvoice } from '../../packages/tbai-core/src/hash.js';
import { simulateHacienda } from '../../packages/tbai-core/src/hacienda.js';
import {
  getPool,
  closePool,
  insertInvoice,
  writeAuditLog,
  fetchInvoiceById,
  fetchAuditLogs,
} from '../../packages/tbai-core/src/db.js';
import { makeInvoice } from '../fixtures.js';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Verify connection
    const pool = getPool();
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await closePool();
  });

  it('persists a full invoice pipeline result', async () => {
    const invoice = makeInvoice({ invoiceNumber: `DB-${Date.now()}` });

    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);
    const totalAmount = 1815.0;
    const hash = computeTicketBaiHash(hashInputFromInvoice(invoice, totalAmount));
    const response = await simulateHacienda(signedXml);

    expect(response.status).toBe('ACCEPTED');

    const record = await insertInvoice(
      invoice,
      xml,
      signedXml,
      hash,
      response.ticketId,
    );

    expect(record.id).toBeTruthy();
    expect(record.tenantId).toBe(invoice.tenantId);
    expect(record.invoiceNumber).toBe(invoice.invoiceNumber);
    expect(record.series).toBe('T');
    expect(record.status).toBe('ACCEPTED');
    expect(record.xml).toBe(xml);
    expect(record.signedXml).toBe(signedXml);
    expect(record.hash).toBe(hash);
    expect(record.ticketId).toBe(response.ticketId);

    // Fetch and verify
    const fetched = await fetchInvoiceById(record.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(record.id);
    expect(fetched!.hash).toBe(hash);
  });

  it('writes and retrieves audit log entries', async () => {
    const invoice = makeInvoice({ invoiceNumber: `AUDIT-${Date.now()}` });
    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);
    const hash = computeTicketBaiHash(hashInputFromInvoice(invoice, 1815));
    const response = await simulateHacienda(signedXml);

    const record = await insertInvoice(invoice, xml, signedXml, hash, response.ticketId);

    await writeAuditLog(record.id, 'XML_GENERATED', { xmlLength: xml.length });
    await writeAuditLog(record.id, 'SIGNED', { algorithm: 'RSA-SHA256' });
    await writeAuditLog(record.id, 'SUBMITTED', {
      ticketId: response.ticketId,
      status: response.status,
    });

    const logs = await fetchAuditLogs(record.id);

    expect(logs).toHaveLength(3);
    expect(logs[0].event).toBe('XML_GENERATED');
    expect(logs[0].payload).toMatchObject({ xmlLength: expect.any(Number) });
    expect(logs[1].event).toBe('SIGNED');
    expect(logs[2].event).toBe('SUBMITTED');
    expect(logs[2].payload).toMatchObject({ status: 'ACCEPTED' });
  });

  it('enforces idempotency via ON CONFLICT upsert', async () => {
    const invoiceNumber = `IDEM-DB-${Date.now()}`;
    const invoice = makeInvoice({ invoiceNumber });
    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);
    const hash = computeTicketBaiHash(hashInputFromInvoice(invoice, 1815));
    const response = await simulateHacienda(signedXml);

    const r1 = await insertInvoice(invoice, xml, signedXml, hash, response.ticketId);
    const r2 = await insertInvoice(invoice, xml, signedXml, hash, response.ticketId);

    // Same UUID — upsert, not duplicate
    expect(r1.id).toBe(r2.id);
  });

  it('cascade-deletes audit logs when invoice is deleted', async () => {
    const invoice = makeInvoice({ invoiceNumber: `CASCADE-${Date.now()}` });
    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);
    const hash = computeTicketBaiHash(hashInputFromInvoice(invoice, 1815));
    const response = await simulateHacienda(signedXml);

    const record = await insertInvoice(invoice, xml, signedXml, hash, response.ticketId);
    await writeAuditLog(record.id, 'CREATED', {});

    const pool = getPool();
    await pool.query('DELETE FROM invoices WHERE id = $1', [record.id]);

    const logs = await fetchAuditLogs(record.id);
    expect(logs).toHaveLength(0);
  });
});
