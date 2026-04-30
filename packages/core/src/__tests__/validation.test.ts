import { describe, it, expect } from "vitest";
import { validateInvoice, validateCorrectiveInvoice } from "../validation.js";
import type { Invoice } from "../types.js";

const validInvoice: Invoice = {
  id: "1",
  tenantId: "t1",
  number: "F-001",
  issueDate: "2026-01-01",
  issuer: { name: "Test SL", nif: "A12345678" },
  lines: [{ description: "Service", quantity: 1, unitPrice: 100, total: 100, vatRate: 21 }],
  totals: { totalAmount: 121 },
};

describe("validateInvoice", () => {
  it("passes for a valid invoice", () => {
    expect(() => validateInvoice(validInvoice)).not.toThrow();
  });

  it("throws when invoice number is missing", () => {
    expect(() => validateInvoice({ ...validInvoice, number: "" })).toThrow(/number/i);
  });

  it("throws when issueDate is missing", () => {
    expect(() => validateInvoice({ ...validInvoice, issueDate: "" })).toThrow(/date/i);
  });

  it("throws when issuer NIF is missing", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, issuer: { name: "Test", nif: "" } })
    ).toThrow(/nif/i);
  });

  it("throws when lines array is empty", () => {
    expect(() => validateInvoice({ ...validInvoice, lines: [] })).toThrow(/line/i);
  });
});

describe("validateCorrectiveInvoice", () => {
  it("passes for a standard invoice", () => {
    expect(() => validateCorrectiveInvoice({ ...validInvoice, type: "STANDARD" })).not.toThrow();
  });

  it("throws when corrective has no original reference", () => {
    expect(() =>
      validateCorrectiveInvoice({ ...validInvoice, type: "CORRECTIVE", corrective: {} })
    ).toThrow(/original/i);
  });

  it("passes for a corrective invoice with originalInvoiceId and lines", () => {
    const corrective = {
      ...validInvoice,
      type: "CORRECTIVE",
      corrective: { originalInvoiceId: "ORIG-001" },
    };
    expect(() => validateCorrectiveInvoice(corrective)).not.toThrow();
  });
});
