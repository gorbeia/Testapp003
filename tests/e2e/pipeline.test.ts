import { describe, it, expect } from 'vitest';
import { buildBizkaiaXml } from '../../packages/tbai-core/src/xml-builder.js';
import { signXml } from '../../packages/tbai-core/src/signer.js';
import { computeTicketBaiHash, hashInputFromInvoice } from '../../packages/tbai-core/src/hash.js';
import { simulateHacienda } from '../../packages/tbai-core/src/hacienda.js';
import { makeInvoice } from '../fixtures.js';

describe('TicketBAI E2E Pipeline', () => {
  it('executes the full invoice lifecycle', async () => {
    // Step 1 — Create invoice input
    const invoice = makeInvoice({ invoiceNumber: 'E2E-001' });

    // Step 2 — Generate XML
    const xml = buildBizkaiaXml(invoice);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('T:TicketBai');
    expect(xml).toContain('<NIF>B12345678</NIF>');
    expect(xml).toContain('<NumFactura>E2E-001</NumFactura>');
    expect(xml).toContain('<SerieFactura>T</SerieFactura>');
    expect(xml).toContain('</T:TicketBai>');
    expect(xml.length).toBeGreaterThan(500);

    // Step 3 — Sign XML
    const signedXml = signXml(xml);

    expect(signedXml).toContain('<ds:Signature');
    expect(signedXml).toContain('<ds:SignatureValue');
    expect(signedXml).toContain('<ds:DigestValue>');
    expect(signedXml).toContain('</T:TicketBai>');
    // Signature must be inside the root element
    const sigIdx = signedXml.indexOf('<ds:Signature');
    const closeIdx = signedXml.indexOf('</T:TicketBai>');
    expect(sigIdx).toBeGreaterThan(0);
    expect(sigIdx).toBeLessThan(closeIdx);

    // Step 4 — Compute hash
    const totalAmount = 10 * 100 * 1.21 + 500 * 1.21; // 1815.00
    const hashInput = hashInputFromInvoice(invoice, totalAmount);
    const hash = computeTicketBaiHash(hashInput);

    expect(hash).toBeTruthy();
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    // Hash must be deterministic
    const hash2 = computeTicketBaiHash(hashInput);
    expect(hash).toBe(hash2);

    // Step 5 — Simulate submission
    const response = await simulateHacienda(signedXml);

    // Step 6 — Assertions
    expect(response.status).toBe('ACCEPTED');
    expect(response.ticketId).toBeTruthy();
    expect(response.ticketId).toContain('TBAI-SANDBOX');
    expect(response.timestamp).toBeTruthy();
  });

  it('rejects malformed XML', async () => {
    const response = await simulateHacienda('<invalid>not ticketbai</invalid>');
    expect(response.status).toBe('REJECTED');
    expect(response.errorCode).toBeTruthy();
  });

  it('handles forced rejection', async () => {
    const invoice = makeInvoice({ invoiceNumber: 'E2E-REJECT-001' });
    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);
    const response = await simulateHacienda(signedXml, { forceReject: true });

    expect(response.status).toBe('REJECTED');
    expect(response.errorCode).toBe('ERR_SIMULATED_REJECT');
  });

  it('produces idempotent ticketId for same document', async () => {
    const invoice = makeInvoice({ invoiceNumber: 'E2E-IDEM-001' });
    const xml = buildBizkaiaXml(invoice);
    const signedXml = signXml(xml);

    const r1 = await simulateHacienda(signedXml);
    const r2 = await simulateHacienda(signedXml);

    expect(r1.ticketId).toBe(r2.ticketId);
    expect(r1.status).toBe('ACCEPTED');
    expect(r2.status).toBe('ACCEPTED');
  });

  it('hash changes when invoice fields change', () => {
    const base = makeInvoice({ invoiceNumber: 'H-001' });
    const h1 = computeTicketBaiHash(hashInputFromInvoice(base, 100));

    const changed = makeInvoice({ invoiceNumber: 'H-002' });
    const h2 = computeTicketBaiHash(hashInputFromInvoice(changed, 100));

    expect(h1).not.toBe(h2);
  });

  it('chained hashes link invoices', () => {
    const inv1 = makeInvoice({ invoiceNumber: 'CHAIN-001' });
    const inv2 = makeInvoice({ invoiceNumber: 'CHAIN-002' });

    const h1 = computeTicketBaiHash(hashInputFromInvoice(inv1, 1210));
    const h2 = computeTicketBaiHash(hashInputFromInvoice(inv2, 605, h1));

    // h2 depends on h1 — different from a standalone h2
    const h2Standalone = computeTicketBaiHash(hashInputFromInvoice(inv2, 605));
    expect(h2).not.toBe(h2Standalone);
  });

  it('XML escapes special characters correctly', () => {
    const invoice = makeInvoice({
      invoiceNumber: 'ESC-001',
      issuerName: 'Empresa & Cía <Test>',
      recipientName: 'Cliente "Especial"',
    });
    const xml = buildBizkaiaXml(invoice);

    expect(xml).toContain('Empresa &amp; C');
    expect(xml).toContain('&lt;Test&gt;');
    expect(xml).not.toContain('<Test>');
  });
});
