import { createBaseDocument, formatXml } from "./common.js";
import { Invoice } from "@tbai/core";

const NS = "urn:ticketbai:alava";

export function buildAlavaXml(invoice: Invoice): string {
  const doc = createBaseDocument("TicketBai", NS);
  const sujeto = doc.ele("Sujeto");
  sujeto.ele("NIF").txt(invoice.issuer.nif);

  const factura = doc.ele("FacturaEmitida");
  factura.ele("Numero").txt(invoice.number);
  factura.ele("Fecha").txt(invoice.issueDate);

  const detalles = factura.ele("Detalles");
  for (const line of invoice.lines) {
    const d = detalles.ele("Detalle");
    d.ele("Concepto").txt(line.description);
    d.ele("Cantidad").txt(line.quantity.toString());
    d.ele("Precio").txt(line.unitPrice.toString());
    d.ele("Total").txt(line.total.toString());
  }

  factura.ele("ImporteTotal").txt(invoice.totals.totalAmount.toString());
  return formatXml(doc);
}
