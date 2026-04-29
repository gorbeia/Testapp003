import { create } from "xmlbuilder2";
import { Invoice } from "@tbai/core";
import { computeVatGroups } from "@tbai/core/src/vat.js";

const NS = "urn:ticketbai:emision";

export function buildBizkaiaXml(invoice: Invoice, options: {
  previousHash?: string;
  software: {
    name: string;
    version: string;
    developerNif: string;
  };
}): string {
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("TicketBai", { xmlns: NS });

  // Cabecera
  doc.ele("Cabecera").ele("IDVersionTBAI").txt("1.2").up().up();

  // Sujetos
  const sujetos = doc.ele("Sujetos");
  const emisor = sujetos.ele("Emisor");
  emisor.ele("NIF").txt(invoice.issuer.nif);
  emisor.ele("ApellidosNombreRazonSocial").txt(invoice.issuer.name);

  // Factura
  const factura = doc.ele("Factura");
  const cabeceraFactura = factura.ele("CabeceraFactura");
  cabeceraFactura.ele("NumFactura").txt(invoice.number);
  cabeceraFactura.ele("FechaExpedicionFactura").txt(invoice.issueDate);

  const datosFactura = factura.ele("DatosFactura");
  datosFactura.ele("DescripcionFactura").txt("Factura generada automáticamente");

  // VAT breakdown (TipoDesglose — REQUIRED by Bizkaia)
  const tipoDesglose = datosFactura.ele("TipoDesglose");
  const desgloseFactura = tipoDesglose.ele("DesgloseFactura");
  const sujeta = desgloseFactura.ele("Sujeta");
  const noExenta = sujeta.ele("NoExenta");
  noExenta.ele("TipoNoExenta").txt("S1");

  const vatGroups = computeVatGroups(invoice.lines);
  vatGroups.forEach(group => {
    const detalleIVA = noExenta.ele("DetalleIVA");
    detalleIVA.ele("TipoImpositivo").txt(group.rate.toFixed(2));
    detalleIVA.ele("BaseImponible").txt(group.base.toFixed(2));
    detalleIVA.ele("CuotaImpuesto").txt(group.tax.toFixed(2));
  });

  datosFactura.ele("ImporteTotalFactura").txt(invoice.totals.totalAmount.toFixed(2));

  // Corrective invoice section
  const isCorrective = (invoice as any).type === "CORRECTIVE";
  if (isCorrective && (invoice as any).corrective) {
    const rectificativa = factura.ele("FacturaRectificativa");
    rectificativa.ele("TipoRectificativa").txt((invoice as any).corrective.correctionType);
    const motivo = rectificativa.ele("ImporteRectificacion");
    motivo.ele("BaseRectificada").txt((invoice as any).totals.baseAmount?.toFixed(2) ?? "0.00");
    motivo.ele("CuotaRectificada").txt((invoice as any).totals.vatAmount?.toFixed(2) ?? "0.00");
    rectificativa.ele("FacturaRectificadaSustituida").txt((invoice as any).corrective.originalInvoiceId);
  }

  // Encadenamiento (CRITICAL — hash chain)
  const encadenamiento = doc.ele("Encadenamiento");
  if (options.previousHash) {
    encadenamiento.ele("FacturaAnterior").ele("Huella").txt(options.previousHash);
  }

  // SistemaInformatico (MANDATORY)
  const sistema = doc.ele("SistemaInformatico");
  sistema.ele("NombreRazonSocial").txt(options.software.name);
  sistema.ele("NIF").txt(options.software.developerNif);
  sistema.ele("Version").txt(options.software.version);

  return doc.end({ prettyPrint: false });
}
