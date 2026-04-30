import { createHash } from 'crypto';
import { InvoiceInput } from './types.js';

export interface HashInput {
  issuerNif: string;
  invoiceNumber: string;
  series: string;
  issueDate: string;
  totalAmount: string;
  previousHash?: string;
}

/**
 * Computes the TicketBAI hash (TBAI-QR hash) per Basque Country spec §5.2.
 * The concatenation order follows: NIF+Serie+NumFactura+Fecha+ImporteTotal+HuellaTBAIAnterior
 */
export function computeTicketBaiHash(input: HashInput): string {
  const chain = [
    input.issuerNif,
    input.series,
    input.invoiceNumber,
    input.issueDate,
    input.totalAmount,
    input.previousHash ?? '',
  ].join('');

  return createHash('sha256').update(chain, 'utf8').digest('hex');
}

export function hashInputFromInvoice(
  invoice: InvoiceInput,
  totalAmount: number,
  previousHash?: string,
): HashInput {
  return {
    issuerNif: invoice.issuerNif,
    invoiceNumber: invoice.invoiceNumber,
    series: invoice.series ?? '',
    issueDate: invoice.issueDate,
    totalAmount: totalAmount.toFixed(2),
    previousHash,
  };
}
