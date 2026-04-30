export type Party = {
  name: string;
  nif: string;
  address?: string;
};

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  vatRate: number; // e.g. 21, 10, 4
};

export type Totals = {
  totalAmount: number;
  taxAmount?: number;
  baseAmount?: number;
  vatAmount?: number;
};

export type Invoice = {
  id: string;
  tenantId: string;
  series: string;
  number: string;
  issueDate: string; // ISO date (YYYY-MM-DD)
  issuer: Party;
  recipient?: Party;
  lines: InvoiceLine[];
  totals: Totals;
  type?: "STANDARD" | "CORRECTIVE";
  corrective?: {
    originalInvoiceId: string;
    correctionType: string;
  };
};

export type InvoiceRecord = {
  id: string;
  tenantId: string;
  series: string;
  number: string;
  hash: string;
  previousHash?: string;
  xml: string;
  signedXml: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

export type Certificate = {
  p12: Buffer;
  password: string;
};

export type SignedXml = {
  xml: string;
};

export interface Signer {
  sign(xml: string, certificate: Certificate): Promise<SignedXml>;
}

export interface Storage {
  append(record: InvoiceRecord): Promise<void>;
  getLast(tenantId: string, series: string): Promise<InvoiceRecord | null>;
}

export type CorrectiveReason = "ERROR_AMOUNT" | "ERROR_TAX" | "ERROR_CLIENT" | "CANCELATION";
