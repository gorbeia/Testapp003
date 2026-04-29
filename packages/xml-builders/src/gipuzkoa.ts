import { createBaseDocument, formatXml } from "./common.js";
import { Invoice } from "@tbai/core";

const NS = "urn:ticketbai:gipuzkoa";

export function buildGipuzkoaXml(invoice: Invoice): string {
  const doc = createBaseDocument("TicketBai", NS);
  const cabecera = doc.ele("Cabecera");
  cabecera.ele("ObligadoTributario").ele("NIF").txt(invoice.issuer.nif);

  const factura = doc.ele("Factura");
  factura.ele("NumeroFactura").txt(invoice.number);
  factura.ele("FechaExpedicion").txt(invoice.issueDate);

  const lineas = factura.ele("Lineas");
  invoice.lines.forEach(line => {
    const l = lineas.ele("Linea");
    l.ele("Descripcion").txt(line.description);
    l.ele("Cantidad").txt(line.quantity.toString());
    l.ele("PrecioUnitario").txt(line.unitPrice.toString());
    l.ele("Importe").txt(line.total.toString());
  });

  factura.ele("TotalFactura").txt(invoice.totals.totalAmount.toString());
  return formatXml(doc);
}
