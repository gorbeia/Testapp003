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
} from '../../packages/tbai-core/src/db.js';
import { InvoiceInput } from '../../packages/tbai-core/src/types.js';

const INVOICE_COUNT = 100;
const CONCURRENCY = 10;

function makeLoadInvoice(index: number): InvoiceInput {
  return {
    tenantId: `tenant-load-${(index % 5) + 1}`,
    invoiceNumber: `LOAD-${String(index).padStart(5, '0')}`,
    series: 'L',
    issueDate: '2024-01-15',
    issuerNif: 'B12345678',
    issuerName: 'LoadTest Empresa SL',
    recipientNif: 'A87654321',
    recipientName: 'LoadTest Cliente SA',
    lines: [
      {
        description: `Service item ${index}`,
        quantity: (index % 10) + 1,
        unitPrice: 50 + (index % 200),
        vatRate: 21,
      },
    ],
  };
}

async function processInvoice(invoice: InvoiceInput, previousHash?: string): Promise<{
  invoiceId: string;
  hash: string;
  status: string;
  durationMs: number;
}> {
  const start = Date.now();

  const xml = buildBizkaiaXml(invoice);
  const signedXml = signXml(xml);

  const totalAmount =
    invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 + l.vatRate / 100), 0);

  const hash = computeTicketBaiHash(hashInputFromInvoice(invoice, totalAmount, previousHash));
  const response = await simulateHacienda(signedXml);

  const record = await insertInvoice(invoice, xml, signedXml, hash, response.ticketId);
  await writeAuditLog(record.id, 'LOAD_TEST_SUBMITTED', {
    ticketId: response.ticketId,
    status: response.status,
    index: invoice.invoiceNumber,
  });

  return {
    invoiceId: record.id,
    hash,
    status: response.status,
    durationMs: Date.now() - start,
  };
}

describe('Load Test — 100 Invoices', () => {
  beforeAll(async () => {
    const pool = getPool();
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await closePool();
  });

  it(`processes ${INVOICE_COUNT} invoices with concurrency=${CONCURRENCY}`, async () => {
    const invoices = Array.from({ length: INVOICE_COUNT }, (_, i) => makeLoadInvoice(i + 1));

    const results: Array<{ invoiceId: string; hash: string; status: string; durationMs: number }> =
      [];
    const errors: string[] = [];

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < invoices.length; i += CONCURRENCY) {
      const chunk = invoices.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map((inv) => processInvoice(inv)),
      );

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason?.message ?? String(result.reason));
        }
      }
    }

    const accepted = results.filter((r) => r.status === 'ACCEPTED');
    const durations = results.map((r) => r.durationMs);
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxMs = Math.max(...durations);
    const minMs = Math.min(...durations);

    console.log(`\nLoad Test Results:`);
    console.log(`  Total invoices:  ${INVOICE_COUNT}`);
    console.log(`  Succeeded:       ${results.length}`);
    console.log(`  Accepted:        ${accepted.length}`);
    console.log(`  Errors:          ${errors.length}`);
    console.log(`  Avg duration:    ${avgMs.toFixed(1)}ms`);
    console.log(`  Min duration:    ${minMs}ms`);
    console.log(`  Max duration:    ${maxMs}ms`);

    if (errors.length > 0) {
      console.error('Errors encountered:', errors.slice(0, 5));
    }

    expect(errors).toHaveLength(0);
    expect(results).toHaveLength(INVOICE_COUNT);
    expect(accepted).toHaveLength(INVOICE_COUNT);
  }, 120_000);

  it('all hashes in a sequential chain are unique', () => {
    const count = 20;
    const hashes = new Set<string>();
    let prevHash: string | undefined;

    for (let i = 1; i <= count; i++) {
      const inv = makeLoadInvoice(i);
      const totalAmount = inv.lines.reduce(
        (s, l) => s + l.quantity * l.unitPrice * (1 + l.vatRate / 100),
        0,
      );
      const h = computeTicketBaiHash(hashInputFromInvoice(inv, totalAmount, prevHash));
      hashes.add(h);
      prevHash = h;
    }

    expect(hashes.size).toBe(count);
  });

  it('retry simulation: same invoice submitted twice returns same ticketId', async () => {
    const invoice = makeLoadInvoice(999);
    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);

    const r1 = await simulateHacienda(signedXml);
    const r2 = await simulateHacienda(signedXml);

    expect(r1.status).toBe('ACCEPTED');
    expect(r2.status).toBe('ACCEPTED');
    expect(r1.ticketId).toBe(r2.ticketId);
  });
});
