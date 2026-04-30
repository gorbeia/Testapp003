import { InvoiceInput } from '../packages/tbai-core/src/types.js';

export function makeInvoice(overrides: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    tenantId: 'tenant-test-001',
    invoiceNumber: `INV-${Date.now()}`,
    series: 'T',
    issueDate: '2024-01-15',
    issuerNif: 'B12345678',
    issuerName: 'Empresa Test SL',
    recipientNif: 'A87654321',
    recipientName: 'Cliente Test SA',
    lines: [
      {
        description: 'Servicio de consultoría',
        quantity: 10,
        unitPrice: 100,
        vatRate: 21,
      },
      {
        description: 'Licencia de software',
        quantity: 1,
        unitPrice: 500,
        vatRate: 21,
      },
    ],
    ...overrides,
  };
}
