import { create } from "xmlbuilder2";
import { Invoice } from "@tbai/core";
import { computeVatGroups } from "@tbai/core/src/vat.js";

const NS = "urn:ticketbai:gipuzkoa";
const SCHEMA_VERSION = "1.2";

export function buildGipuzkoaXml(invoice: Invoice, options: {
  previousHash?: string;
  software: {
    name: string;
    version: string;
    developerNif: string;
    licenseKey: string;
  };
}): string {
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("TicketBai", { xmlns: NS });

  // Cabecera
  doc.ele("Cabecera").ele("IDVersionTBAI").txt(SCHEMA_VERSION).up().up();

  // Sujetos
  const sujetos = doc.ele("Sujetos");
  const emisor = sujetos.ele("Emisor");
  emisor.ele("NIF").txt(invoice.issuer.nif);
  emisor.ele("ApellidosNombreRazonSocial").txt(invoice.issuer.name);

  // Factura
  const factura = doc.ele("Factura");
  const cabeceraFactura = factura.ele("CabeceraFactura");
  cabeceraFactura.ele("SerieFactura").txt(invoice.series);
  cabeceraFactura.ele("NumFactura").txt(invoice.number);
  cabeceraFactura.ele("FechaExpedicionFactura").txt(invoice.issueDate);

  const datosFactura = factura.ele("DatosFactura");
  datosFactura.ele("DescripcionFactura").txt("Factura generada automáticamente");

  // VAT breakdown (TipoDesglose — REQUIRED)
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
  if (invoice.type === "CORRECTIVE" && invoice.corrective) {
    const rectificativa = factura.ele("FacturaRectificativa");
    rectificativa.ele("TipoRectificativa").txt(invoice.corrective.correctionType);
    const importeRect = rectificativa.ele("ImporteRectificacion");
    importeRect.ele("BaseRectificada").txt((invoice.totals.baseAmount ?? 0).toFixed(2));
    importeRect.ele("CuotaRectificada").txt((invoice.totals.vatAmount ?? 0).toFixed(2));
    rectificativa.ele("FacturaRectificadaSustituida").txt(invoice.corrective.originalInvoiceId);
  }

  // Encadenamiento (hash chain — CRITICAL)
  const encadenamiento = doc.ele("Encadenamiento");
  if (options.previousHash) {
    encadenamiento.ele("FacturaAnterior").ele("Huella").txt(options.previousHash);
  } else {
    encadenamiento.ele("PrimerRegistro").txt("S");
  }

  // SistemaInformatico (MANDATORY)
  const sistema = doc.ele("SistemaInformatico");
  sistema.ele("NombreRazonSocial").txt(options.software.name);
  sistema.ele("NIF").txt(options.software.developerNif);
  sistema.ele("NombreSistemaInformatico").txt(options.software.name);
  sistema.ele("Version").txt(options.software.version);
  sistema.ele("NumeroInstalacion").txt(options.software.licenseKey);
  sistema.ele("TipoUsoPosibleSoloVerifactu").txt("N");
  sistema.ele("TipoUsoPosibleMultiOT").txt("S");
  sistema.ele("IndicadorMultiplesOT").txt("N");

  return doc.end({ prettyPrint: false });
}
