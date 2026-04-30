import type { Invoice } from "@tbai/core";

export const testInvoice: Invoice = {
  id: "test-001",
  tenantId: "tenant-1",
  number: "F-2026-001",
  issueDate: "2026-01-15",
  issuer: { name: "Test Empresa SL", nif: "A12345678" },
  recipient: { name: "Cliente SA", nif: "B87654321" },
  lines: [
    { description: "Consultoría", quantity: 2, unitPrice: 500, total: 1000, vatRate: 21 },
    { description: "Materiales", quantity: 10, unitPrice: 20, total: 200, vatRate: 10 },
  ],
  totals: { totalAmount: 1430 }, // 1000*1.21 + 200*1.10 = 1210 + 220 = 1430 ✓
};
