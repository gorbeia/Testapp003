import { Invoice } from "./types.js";

export function buildXml(invoice: Invoice): string {
  const lines = invoice.lines
    .map(
      (l) =>
        `<Linea><Descripcion>${l.description}</Descripcion><Cantidad>${l.quantity}</Cantidad><PrecioUnitario>${l.unitPrice}</PrecioUnitario><Importe>${l.total}</Importe></Linea>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><TicketBai><Cabecera><IDVersionTBAI>1.2</IDVersionTBAI></Cabecera><Sujetos><Emisor><NIF>${invoice.issuer.nif}</NIF><ApellidosNombreRazonSocial>${invoice.issuer.name}</ApellidosNombreRazonSocial></Emisor></Sujetos><Factura><CabeceraFactura><NumFactura>${invoice.number}</NumFactura><FechaExpedicionFactura>${invoice.issueDate}</FechaExpedicionFactura></CabeceraFactura><DatosFactura><Lineas>${lines}</Lineas><ImporteTotalFactura>${invoice.totals.totalAmount.toFixed(2)}</ImporteTotalFactura></DatosFactura></Factura></TicketBai>`;
}
