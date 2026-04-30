import { describe, it, expect } from "vitest";
import { validateInvoice, validateCorrectiveInvoice } from "../validation.js";
import type { Invoice } from "../types.js";

const validInvoice: Invoice = {
  id: "1",
  tenantId: "t1",
  series: "A",
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

describe("validateInvoice — series", () => {
  it("throws when series is missing", () => {
    expect(() => validateInvoice({ ...validInvoice, series: "" })).toThrow(/series/i);
  });
});

describe("validateInvoice — per-line validation", () => {
  const baseLine = { description: "Service", quantity: 1, unitPrice: 100, total: 100, vatRate: 21 };

  it("throws when line description is empty", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, description: "" }] })
    ).toThrow(/description/i);
  });

  it("throws when line quantity is zero", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, quantity: 0 }] })
    ).toThrow(/quantity/i);
  });

  it("throws when line quantity is negative", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, quantity: -1 }] })
    ).toThrow(/quantity/i);
  });

  it("throws when line unitPrice is zero", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, unitPrice: 0 }] })
    ).toThrow(/unitPrice/i);
  });

  it("throws when line total is negative", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, total: -5 }] })
    ).toThrow(/total/i);
  });

  it("throws when vatRate is invalid", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, vatRate: 15 }] })
    ).toThrow(/vatRate/i);
  });

  it("accepts vatRate of 0", () => {
    expect(() =>
      validateInvoice({ ...validInvoice, lines: [{ ...baseLine, vatRate: 0 }] })
    ).not.toThrow();
  });

  it("accepts all valid vatRates", () => {
    for (const rate of [0, 4, 10, 21]) {
      expect(() =>
        validateInvoice({ ...validInvoice, lines: [{ ...baseLine, vatRate: rate }] })
      ).not.toThrow();
    }
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
