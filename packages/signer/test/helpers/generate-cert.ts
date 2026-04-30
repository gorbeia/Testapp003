import forge from "node-forge";

let cached: Buffer | null = null;

export async function getTestP12(): Promise<Buffer> {
  if (cached) return cached;

  // 1024-bit for speed in tests only — never use in production
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const attrs = [{ name: "commonName", value: "TicketBAI Test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "password");
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  cached = Buffer.from(p12Der, "binary");
  return cached;
}
