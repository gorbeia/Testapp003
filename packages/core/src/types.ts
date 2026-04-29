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
};

export type Invoice = {
  id: string;
  tenantId: string;
  number: string;
  issueDate: string; // ISO date (YYYY-MM-DD)
  issuer: Party;
  recipient?: Party;
  lines: InvoiceLine[];
  totals: Totals;
};

export type InvoiceRecord = {
  id: string;
  tenantId: string;
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
  getLast(tenantId: string): Promise<InvoiceRecord | null>;
}

export type InvoiceType = "STANDARD" | "CORRECTIVE";
export type CorrectiveReason = "ERROR_AMOUNT" | "ERROR_TAX" | "ERROR_CLIENT" | "CANCELATION";
