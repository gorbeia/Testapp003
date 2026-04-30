import { describe, it, expect } from "vitest";
import { buildAlavaXml } from "../alava.js";
import { testInvoice } from "./fixtures.js";

describe("buildAlavaXml", () => {
  it("produces a valid XML string", () => {
    const xml = buildAlavaXml(testInvoice);
    expect(typeof xml).toBe("string");
    expect(xml.length).toBeGreaterThan(0);
  });

  it("uses Álava namespace", () => {
    const xml = buildAlavaXml(testInvoice);
    expect(xml).toContain("urn:ticketbai:alava");
  });

  it("includes issuer NIF", () => {
    const xml = buildAlavaXml(testInvoice);
    expect(xml).toContain("A12345678");
  });

  it("includes invoice number", () => {
    const xml = buildAlavaXml(testInvoice);
    expect(xml).toContain("F-2026-001");
  });

  it("includes all invoice lines", () => {
    const xml = buildAlavaXml(testInvoice);
    expect(xml).toContain("Consultoría");
    expect(xml).toContain("Materiales");
  });

  it("includes total amount", () => {
    const xml = buildAlavaXml(testInvoice);
    expect(xml).toContain("1430");
  });

  it("is deterministic", () => {
    expect(buildAlavaXml(testInvoice)).toBe(buildAlavaXml(testInvoice));
  });
});
