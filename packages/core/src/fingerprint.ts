import crypto from "crypto";

export function computeRequestHash(input: {
  invoiceId: string;
  xml: string;
  certificateFingerprint: string;
  endpoint: string;
}) {
  const raw = [
    input.invoiceId,
    input.xml,
    input.certificateFingerprint,
    input.endpoint,
  ].join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function extractFingerprint(certPem: string) {
  return crypto.createHash("sha256").update(certPem).digest("hex");
}

export function generateIdempotencyKey(invoice: any) {
  return crypto
    .createHash("sha256")
    .update(invoice.invoiceNumber + invoice.issueDate)
    .digest("hex");
}
