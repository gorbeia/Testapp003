import { describe, it, expect, beforeAll } from "vitest";
import { NodeXadesSigner } from "../src/signer.js";
import { NodeXadesVerifier } from "../src/verifier.js";
import { getTestP12 } from "./helpers/generate-cert.js";

let p12: Buffer;
const signer = new NodeXadesSigner();
const verifier = new NodeXadesVerifier();

beforeAll(async () => {
  p12 = await getTestP12();
});

const cert = () => ({ p12, password: "password" });

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?><TicketBai xmlns="urn:ticketbai:emision"><Cabecera><IDVersionTBAI>1.2</IDVersionTBAI></Cabecera><Factura><CabeceraFactura><NumFactura>F-001</NumFactura></CabeceraFactura></Factura></TicketBai>`;

describe("NodeXadesSigner", () => {
  it("returns a non-empty signed XML string", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    expect(typeof xml).toBe("string");
    expect(xml.length).toBeGreaterThan(sampleXml.length);
  });

  it("appended Signature element to root", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    expect(xml).toContain("<ds:Signature");
  });

  it("includes SignedProperties (mandatory for TicketBAI)", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    expect(xml).toContain("SignedProperties");
  });

  it("includes SigningTime in signature", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    expect(xml).toContain("SigningTime");
  });

  it("includes X509 certificate data in KeyInfo", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    expect(xml).toContain("X509");
  });

  it("signed XML is parseable (well-formed)", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    // If DOMParser can re-parse it without errors, it's well-formed
    const { DOMParser } = await import("@xmldom/xmldom");
    const doc = new DOMParser().parseFromString(xml);
    expect(doc.documentElement).not.toBeNull();
    expect(doc.documentElement.tagName).toBe("TicketBai");
  });
});

describe("NodeXadesVerifier", () => {
  it("verifies a correctly signed document", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    const result = await verifier.verify(xml);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an unsigned document", async () => {
    const result = await verifier.verify(sampleXml);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a tampered document", async () => {
    const { xml } = await signer.sign(sampleXml, cert());
    // Tamper with the invoice number after signing
    const tampered = xml.replace("<NumFactura>F-001</NumFactura>", "<NumFactura>TAMPERED</NumFactura>");
    const result = await verifier.verify(tampered);
    expect(result.valid).toBe(false);
  });
});
