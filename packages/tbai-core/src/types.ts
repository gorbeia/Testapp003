export interface InvoiceInput {
  tenantId: string;
  invoiceNumber: string;
  series?: string;
  issueDate: string;       // YYYY-MM-DD
  issuerNif: string;
  issuerName: string;
  recipientNif: string;
  recipientName: string;
  lines: InvoiceLine[];
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;         // e.g. 21
}

export interface InvoiceTotals {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface HaciendaResponse {
  status: 'ACCEPTED' | 'REJECTED';
  ticketId: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface InvoiceRecord {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  series: string;
  status: string;
  xml: string | null;
  signedXml: string | null;
  hash: string | null;
  ticketId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
