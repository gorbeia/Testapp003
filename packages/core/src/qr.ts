export type TicketBaiQrInput = {
  issuerNif: string;
  invoiceNumber: string;
  issueDate: string;
  totalAmount: number;
  vatAmount: number;
  hash: string;
  signatureId: string;
  environment?: "test" | "prod";
};

export function buildTicketBaiQrPayload(input: TicketBaiQrInput): string {
  const baseUrl =
    input.environment === "prod"
      ? "https://tbai.eus/qr"
      : "https://tbai-test.eus/qr";

  const payload = [
    input.issuerNif,
    input.invoiceNumber,
    input.issueDate,
    input.totalAmount.toFixed(2),
    input.vatAmount.toFixed(2),
    input.hash,
    input.signatureId
  ].join("|");

  return `${baseUrl}?data=${encodeURIComponent(payload)}`;
}
