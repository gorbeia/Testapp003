export type InvoiceChainNode = {
  id: string;
  tenantId: string;
  number: string;
  hash: string;
  previousHash?: string;
  createdAt: string;
};

export type ChainValidationResult = {
  valid: boolean;
  chain: InvoiceChainNode[];
  breaks: ChainBreak[];
};

export type ChainBreak = {
  type: "MISSING_LINK" | "HASH_MISMATCH" | "ORPHAN_NODE";
  invoiceId: string;
  expected?: string;
  actual?: string;
};
