import { describe, it, expect } from "vitest";
import { buildBizkaiaXml } from "../bizkaia.js";
import { testInvoice } from "./fixtures.js";

const softwareOpts = {
  software: { name: "TBAIGateway", version: "1.0.0", developerNif: "X0000001A" },
};

describe("buildBizkaiaXml", () => {
  it("produces valid XML string", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(typeof xml).toBe("string");
    expect(xml).toMatch(/^<\?xml/);
  });

  it("includes TicketBai root element with Bizkaia namespace", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("urn:ticketbai:emision");
  });

  it("includes version 1.2 header", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<IDVersionTBAI>1.2</IDVersionTBAI>");
  });

  it("includes issuer NIF", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<NIF>A12345678</NIF>");
  });

  it("includes invoice number", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<NumFactura>F-2026-001</NumFactura>");
  });

  it("includes issue date", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<FechaExpedicionFactura>2026-01-15</FechaExpedicionFactura>");
  });

  it("includes VAT breakdown (TipoDesglose) — mandatory for Bizkaia", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("TipoDesglose");
    expect(xml).toContain("DetalleIVA");
    expect(xml).toContain("<TipoImpositivo>21.00</TipoImpositivo>");
    expect(xml).toContain("<TipoImpositivo>10.00</TipoImpositivo>");
  });

  it("includes total amount", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<ImporteTotalFactura>1430.00</ImporteTotalFactura>");
  });

  it("includes SistemaInformatico block", () => {
    const xml = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml).toContain("SistemaInformatico");
    expect(xml).toContain("<NIF>X0000001A</NIF>");
    expect(xml).toContain("<Version>1.0.0</Version>");
  });

  it("includes previous hash in Encadenamiento when provided", () => {
    const xml = buildBizkaiaXml(testInvoice, { ...softwareOpts, previousHash: "abc123" });
    expect(xml).toContain("Encadenamiento");
    expect(xml).toContain("<Huella>abc123</Huella>");
  });

  it("is deterministic — same input produces same output", () => {
    const xml1 = buildBizkaiaXml(testInvoice, softwareOpts);
    const xml2 = buildBizkaiaXml(testInvoice, softwareOpts);
    expect(xml1).toBe(xml2);
  });
});
