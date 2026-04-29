import { Invoice } from "./types.js";

export function validateInvoice(invoice: Invoice): void {
  if (!invoice.number) throw new Error("Invoice number required");
  if (!invoice.issueDate) throw new Error("Issue date required");
  if (!invoice.issuer?.nif) throw new Error("Issuer NIF required");
  if (!invoice.lines?.length) throw new Error("Invoice must have at least one line");
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
