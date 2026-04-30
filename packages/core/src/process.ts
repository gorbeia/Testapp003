import { computeHash } from "./hash.js";
import { buildXml } from "./xml.js";
import { Invoice, InvoiceRecord, Signer } from "./types.js";

export async function processInvoice(input: {
  invoice: Invoice;
  previous?: InvoiceRecord | null;
  signer: Signer;
}): Promise<{ record: InvoiceRecord }> {
  const hash = computeHash({
    invoiceNumber: input.invoice.number,
    issueDate: input.invoice.issueDate,
    totalAmount: input.invoice.totals.totalAmount,
    previousHash: input.previous?.hash
  });

  const xml = buildXml(input.invoice);
  const signed = await input.signer.sign(xml, input.invoice as any);

  const record: InvoiceRecord = {
    id: input.invoice.id,
    tenantId: input.invoice.tenantId,
    series: input.invoice.series,
    number: input.invoice.number,
    hash,
    previousHash: input.previous?.hash,
    xml,
    signedXml: signed.xml,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  return { record };
}
