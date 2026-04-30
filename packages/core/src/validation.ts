import { Invoice } from "./types.js";

const VALID_VAT_RATES = [0, 4, 10, 21];

export function validateInvoice(invoice: Invoice): void {
  if (!invoice.series) throw new Error("Invoice series required");
  if (!invoice.number) throw new Error("Invoice number required");
  if (!invoice.issueDate) throw new Error("Issue date required");
  if (!invoice.issuer?.nif) throw new Error("Issuer NIF required");
  if (!invoice.lines?.length) throw new Error("Invoice must have at least one line");

  for (const [i, line] of invoice.lines.entries()) {
    const idx = i + 1;
    if (!line.description?.trim()) throw new Error(`Line ${idx}: description required`);
    if (line.quantity <= 0) throw new Error(`Line ${idx}: quantity must be positive`);
    if (line.unitPrice <= 0) throw new Error(`Line ${idx}: unitPrice must be positive`);
    if (line.total < 0) throw new Error(`Line ${idx}: total must be non-negative`);
    if (!VALID_VAT_RATES.includes(line.vatRate)) {
      throw new Error(`Line ${idx}: vatRate must be one of ${VALID_VAT_RATES.join(", ")}`);
    }
  }
}

export function validateCorrectiveInvoice(invoice: any) {
  if (invoice.type === "CORRECTIVE") {
    if (!invoice.corrective?.originalInvoiceId) {
      throw new Error("Corrective invoice must reference original invoice");
    }
    if (invoice.lines.length === 0) {
      throw new Error("Corrective invoice must contain adjustment lines");
    }
  }
}

export function validateCertificate(cert: any) {
  if (cert.status !== "active") {
    throw new Error("Certificate is not active");
  }
  if (new Date(cert.valid_to) < new Date()) {
    throw new Error("Certificate expired");
  }
  if (new Date(cert.valid_from) > new Date()) {
    throw new Error("Certificate not yet valid");
  }
}
