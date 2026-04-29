import { InvoiceLine, Invoice } from "./types.js";

export type VatGroup = {
  rate: number;
  base: number;
  tax: number;
};

export function computeVatGroups(lines: InvoiceLine[]): VatGroup[] {
  const groups: Record<number, { base: number }> = {};

  for (const line of lines) {
    const rate = line.vatRate;
    if (!groups[rate]) {
      groups[rate] = { base: 0 };
    }
    groups[rate].base += line.total;
  }

  return Object.entries(groups).map(([rate, data]) => {
    const r = Number(rate);
    const base = round2(data.base);
    const tax = round2((base * r) / 100);
    return { rate: r, base, tax };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function validateTotals(invoice: Invoice) {
  const vatGroups = computeVatGroups(invoice.lines);
  const totalBase = vatGroups.reduce((sum, g) => sum + g.base, 0);
  const totalTax = vatGroups.reduce((sum, g) => sum + g.tax, 0);
  const expectedTotal = round2(totalBase + totalTax);
  if (expectedTotal !== round2(invoice.totals.totalAmount)) {
    throw new Error(
      `Totals mismatch: expected ${expectedTotal}, got ${invoice.totals.totalAmount}`
    );
  }
}
