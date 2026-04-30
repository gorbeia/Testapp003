import { describe, it, expect } from "vitest";
import { buildAlavaXml } from "../alava.js";
import { testInvoice } from "./fixtures.js";

const softwareOpts = {
  software: {
    name: "TBAIGateway",
    version: "1.0.0",
    developerNif: "X0000001A",
    licenseKey: "ALAVA-LIC-001",
  },
};

describe("buildAlavaXml", () => {
  it("produces valid XML string", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(typeof xml).toBe("string");
    expect(xml).toMatch(/^<\?xml/);
  });

  it("uses Álava namespace", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("urn:ticketbai:araba");
  });

  it("includes version 1.2 header", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<IDVersionTBAI>1.2</IDVersionTBAI>");
  });

  it("includes issuer NIF", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("A12345678");
  });

  it("includes series and invoice number", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<SerieFactura>A</SerieFactura>");
    expect(xml).toContain("F-2026-001");
  });

  it("aggregates line amounts into VAT breakdown (not per-line)", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    // Lines are aggregated into VAT groups, not enumerated individually
    expect(xml).toContain("<BaseImponible>1000.00</BaseImponible>");  // 21% group
    expect(xml).toContain("<BaseImponible>200.00</BaseImponible>");   // 10% group
  });

  it("includes VAT breakdown (TipoDesglose) — mandatory", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("TipoDesglose");
    expect(xml).toContain("DetalleIVA");
    expect(xml).toContain("<TipoImpositivo>21.00</TipoImpositivo>");
    expect(xml).toContain("<TipoImpositivo>10.00</TipoImpositivo>");
    expect(xml).toContain("BaseImponible");
    expect(xml).toContain("CuotaImpuesto");
  });

  it("includes total amount", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("<ImporteTotalFactura>1430.00</ImporteTotalFactura>");
  });

  it("includes SistemaInformatico block", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("SistemaInformatico");
    expect(xml).toContain("<Version>1.0.0</Version>");
    expect(xml).toContain("NombreSistemaInformatico");
  });

  it("includes PrimerRegistro when no previous hash", () => {
    const xml = buildAlavaXml(testInvoice, softwareOpts);
    expect(xml).toContain("Encadenamiento");
    expect(xml).toContain("<PrimerRegistro>S</PrimerRegistro>");
  });

  it("includes previous hash in Encadenamiento when provided", () => {
    const xml = buildAlavaXml(testInvoice, { ...softwareOpts, previousHash: "def456" });
    expect(xml).toContain("Encadenamiento");
    expect(xml).toContain("<Huella>def456</Huella>");
    expect(xml).not.toContain("PrimerRegistro");
  });

  it("is deterministic", () => {
    expect(buildAlavaXml(testInvoice, softwareOpts)).toBe(buildAlavaXml(testInvoice, softwareOpts));
  });
});
