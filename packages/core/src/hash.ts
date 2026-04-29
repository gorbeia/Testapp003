import crypto from "crypto";

export function computeHash(input: {
  invoiceNumber: string;
  issueDate: string;
  totalAmount: number;
  previousHash?: string;
}): string {
  const base = `${input.invoiceNumber}|${input.issueDate}|${input.totalAmount}|${input.previousHash ?? ""}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

// Full TicketBAI hash (Huella) — includes NIF and VAT
export function computeTicketBaiHash(input: {
  issuerNif: string;
  invoiceNumber: string;
  issueDate: string;
  totalAmount: number;
  vatAmount: number;
  previousHash?: string;
  correctiveReference?: string;
}): string {
  const raw = [
    input.issuerNif,
    input.invoiceNumber,
    input.issueDate,
    input.totalAmount.toFixed(2),
    input.vatAmount.toFixed(2),
    input.previousHash ?? "",
    input.correctiveReference ?? ""
  ].join("|");
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}
