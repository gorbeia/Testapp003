import { InvoiceInput, InvoiceTotals } from './types.js';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function computeTotals(invoice: InvoiceInput): InvoiceTotals {
  let baseAmount = 0;
  let vatAmount = 0;
  for (const line of invoice.lines) {
    const lineBase = line.quantity * line.unitPrice;
    baseAmount += lineBase;
    vatAmount += lineBase * (line.vatRate / 100);
  }
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round((baseAmount + vatAmount) * 100) / 100,
  };
}

function buildLines(invoice: InvoiceInput): string {
  return invoice.lines
    .map((line) => {
      const lineBase = Math.round(line.quantity * line.unitPrice * 100) / 100;
      const lineVat = Math.round(lineBase * (line.vatRate / 100) * 100) / 100;
      return `
        <DetalleFactura>
          <DescripcionDetalle>${escapeXml(line.description)}</DescripcionDetalle>
          <Cantidad>${line.quantity}</Cantidad>
          <ImporteUnitario>${line.unitPrice.toFixed(2)}</ImporteUnitario>
          <TipoImpositivo>${line.vatRate.toFixed(2)}</TipoImpositivo>
          <ImporteTotal>${(lineBase + lineVat).toFixed(2)}</ImporteTotal>
        </DetalleFactura>`;
    })
    .join('');
}

export function buildBizkaiaXml(invoice: InvoiceInput): string {
  const totals = computeTotals(invoice);
  const series = invoice.series ?? '';
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<T:TicketBai
  xmlns:T="urn:ticketbai:emision"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="urn:ticketbai:emision ticketBaiV1-2-1.xsd">
  <Cabecera>
    <IDVersionTBAI>1.2</IDVersionTBAI>
  </Cabecera>
  <Sujetos>
    <Emisor>
      <NIF>${escapeXml(invoice.issuerNif)}</NIF>
      <ApellidosNombreRazonSocial>${escapeXml(invoice.issuerName)}</ApellidosNombreRazonSocial>
    </Emisor>
    <Destinatarios>
      <IDDestinatario>
        <NIF>${escapeXml(invoice.recipientNif)}</NIF>
        <ApellidosNombreRazonSocial>${escapeXml(invoice.recipientName)}</ApellidosNombreRazonSocial>
      </IDDestinatario>
    </Destinatarios>
    <EmitidaPorTercerosODestinatario>N</EmitidaPorTercerosODestinatario>
  </Sujetos>
  <Factura>
    <CabeceraFactura>
      <SerieFactura>${escapeXml(series)}</SerieFactura>
      <NumFactura>${escapeXml(invoice.invoiceNumber)}</NumFactura>
      <FechaExpedicionFactura>${escapeXml(invoice.issueDate)}</FechaExpedicionFactura>
      <HoraExpedicionFactura>${now.substring(11, 19)}</HoraExpedicionFactura>
    </CabeceraFactura>
    <DatosFactura>
      <DescripcionFactura>Factura electronica TicketBAI</DescripcionFactura>
      <DetallesFactura>${buildLines(invoice)}
      </DetallesFactura>
      <ImporteTotalFactura>${totals.totalAmount.toFixed(2)}</ImporteTotalFactura>
    </DatosFactura>
    <TipoDesglose>
      <DesgloseFactura>
        <Sujeta>
          <NoExenta>
            <DetalleNoExenta>
              <TipoNoExenta>S1</TipoNoExenta>
              <DesgloseIVA>
                <DetalleIVA>
                  <BaseImponible>${totals.baseAmount.toFixed(2)}</BaseImponible>
                  <TipoImpositivo>${invoice.lines[0]?.vatRate.toFixed(2) ?? '21.00'}</TipoImpositivo>
                  <CuotaImpuesto>${totals.vatAmount.toFixed(2)}</CuotaImpuesto>
                </DetalleIVA>
              </DesgloseIVA>
            </DetalleNoExenta>
          </NoExenta>
        </Sujeta>
      </DesgloseFactura>
    </TipoDesglose>
  </Factura>
  <HuellaTBAI>
    <Software>
      <LicenciaTBAI>TBAI-BIZIZK-000001-2023</LicenciaTBAI>
      <EntidadDesarrolladora>
        <NIF>A48000000</NIF>
      </EntidadDesarrolladora>
      <Nombre>TestHarness</Nombre>
      <Version>1.0.0</Version>
    </Software>
    <NumSerieDispositivo>LOCAL-TEST-001</NumSerieDispositivo>
  </HuellaTBAI>
</T:TicketBai>`;
}
