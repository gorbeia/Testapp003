import { describe, it, expect } from "vitest";
import { computeVatGroups, validateTotals } from "../vat.js";
import type { Invoice, InvoiceLine } from "../types.js";

function makeInvoice(lines: InvoiceLine[], totalAmount: number): Invoice {
  return {
    id: "1",
    tenantId: "t1",
    number: "F-001",
    issueDate: "2026-01-01",
    issuer: { name: "Test SL", nif: "A12345678" },
    lines,
    totals: { totalAmount },
  };
}

describe("computeVatGroups", () => {
  it("groups lines by VAT rate", () => {
    const lines: InvoiceLine[] = [
      { description: "A", quantity: 1, unitPrice: 100, total: 100, vatRate: 21 },
      { description: "B", quantity: 1, unitPrice: 50, total: 50, vatRate: 21 },
      { description: "C", quantity: 1, unitPrice: 200, total: 200, vatRate: 10 },
    ];
    const groups = computeVatGroups(lines);
    expect(groups).toHaveLength(2);

    const g21 = groups.find(g => g.rate === 21)!;
    expect(g21.base).toBe(150);
    expect(g21.tax).toBe(31.5);

    const g10 = groups.find(g => g.rate === 10)!;
    expect(g10.base).toBe(200);
    expect(g10.tax).toBe(20);
  });

  it("handles a single VAT rate", () => {
    const lines: InvoiceLine[] = [
      { description: "X", quantity: 3, unitPrice: 10, total: 30, vatRate: 4 },
    ];
    const [group] = computeVatGroups(lines);
    expect(group.rate).toBe(4);
    expect(group.base).toBe(30);
    expect(group.tax).toBe(1.2);
  });

  it("rounds tax to 2 decimal places", () => {
    const lines: InvoiceLine[] = [
      { description: "X", quantity: 1, unitPrice: 1, total: 1, vatRate: 21 },
    ];
    const [group] = computeVatGroups(lines);
    // 21% of 1.00 = 0.21
    expect(group.tax).toBe(0.21);
  });

  it("returns empty array for no lines", () => {
    expect(computeVatGroups([])).toEqual([]);
  });
});

describe("validateTotals", () => {
  it("passes when totals match VAT calculation", () => {
    const lines: InvoiceLine[] = [
      { description: "A", quantity: 1, unitPrice: 100, total: 100, vatRate: 21 },
    ];
    // base=100, tax=21, total=121
    const invoice = makeInvoice(lines, 121);
    expect(() => validateTotals(invoice)).not.toThrow();
  });

  it("throws when totals do not match", () => {
    const lines: InvoiceLine[] = [
      { description: "A", quantity: 1, unitPrice: 100, total: 100, vatRate: 21 },
    ];
    const invoice = makeInvoice(lines, 120); // wrong: should be 121
    expect(() => validateTotals(invoice)).toThrow(/mismatch/i);
  });

  it("passes with multiple VAT rates", () => {
    const lines: InvoiceLine[] = [
      { description: "A", quantity: 1, unitPrice: 100, total: 100, vatRate: 21 },
      { description: "B", quantity: 1, unitPrice: 50, total: 50, vatRate: 10 },
    ];
    // 100 * 1.21 + 50 * 1.10 = 121 + 55 = 176
    const invoice = makeInvoice(lines, 176);
    expect(() => validateTotals(invoice)).not.toThrow();
  });
});
