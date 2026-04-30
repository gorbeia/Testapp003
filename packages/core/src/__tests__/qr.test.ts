import { describe, it, expect } from "vitest";
import { buildTicketBaiQrPayload } from "../qr.js";

const base = {
  issuerNif: "12345678A",
  invoiceNumber: "F-001",
  issueDate: "2026-01-15",
  totalAmount: 121.0,
  vatAmount: 21.0,
  hash: "abc123def456",
  signatureId: "Signature-xyz",
};

describe("buildTicketBaiQrPayload", () => {
  it("uses sandbox URL by default", () => {
    const url = buildTicketBaiQrPayload(base);
    expect(url).toMatch(/^https:\/\/tbai-test\.eus\/qr/);
  });

  it("uses production URL when environment is prod", () => {
    const url = buildTicketBaiQrPayload({ ...base, environment: "prod" });
    expect(url).toMatch(/^https:\/\/tbai\.eus\/qr/);
  });

  it("encodes all 7 required fields in data param", () => {
    const url = buildTicketBaiQrPayload(base);
    const data = decodeURIComponent(new URL(url).searchParams.get("data")!);
    const parts = data.split("|");
    expect(parts).toHaveLength(7);
    expect(parts[0]).toBe(base.issuerNif);
    expect(parts[1]).toBe(base.invoiceNumber);
    expect(parts[2]).toBe(base.issueDate);
    expect(parts[3]).toBe(base.totalAmount.toFixed(2));
    expect(parts[4]).toBe(base.vatAmount.toFixed(2));
    expect(parts[5]).toBe(base.hash);
    expect(parts[6]).toBe(base.signatureId);
  });

  it("formats amounts to 2 decimal places", () => {
    const url = buildTicketBaiQrPayload({ ...base, totalAmount: 121, vatAmount: 21 });
    const data = decodeURIComponent(new URL(url).searchParams.get("data")!);
    const parts = data.split("|");
    expect(parts[3]).toBe("121.00");
    expect(parts[4]).toBe("21.00");
  });
});
