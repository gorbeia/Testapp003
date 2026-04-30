import { describe, it, expect } from "vitest";
import { buildGipuzkoaXml } from "../gipuzkoa.js";
import { testInvoice } from "./fixtures.js";

describe("buildGipuzkoaXml", () => {
  it("produces a valid XML string", () => {
    const xml = buildGipuzkoaXml(testInvoice);
    expect(typeof xml).toBe("string");
    expect(xml.length).toBeGreaterThan(0);
  });

  it("uses Gipuzkoa namespace", () => {
    const xml = buildGipuzkoaXml(testInvoice);
    expect(xml).toContain("urn:ticketbai:gipuzkoa");
  });

  it("includes issuer NIF", () => {
    const xml = buildGipuzkoaXml(testInvoice);
    expect(xml).toContain("A12345678");
  });

  it("includes invoice number", () => {
    const xml = buildGipuzkoaXml(testInvoice);
    expect(xml).toContain("F-2026-001");
  });

  it("includes all invoice lines", () => {
    const xml = buildGipuzkoaXml(testInvoice);
    expect(xml).toContain("Consultoría");
    expect(xml).toContain("Materiales");
  });

  it("includes total amount", () => {
    const xml = buildGipuzkoaXml(testInvoice);
    expect(xml).toContain("1430");
  });

  it("is deterministic", () => {
    expect(buildGipuzkoaXml(testInvoice)).toBe(buildGipuzkoaXml(testInvoice));
  });
});
