import { Signer, Certificate } from "@tbai/core";
import * as xadesjs from "xadesjs";
import { Crypto } from "@peculiar/webcrypto";
import * as xmldom from "@xmldom/xmldom";
import forge from "node-forge";

const crypto = new Crypto();
xadesjs.Application.setEngine("NodeJS", crypto);
xadesjs.setNodeDependencies({ DOMParser: xmldom.DOMParser, XMLSerializer: xmldom.XMLSerializer });

export class NodeXadesSigner implements Signer {
  async sign(xml: string, cert: Certificate): Promise<{ xml: string }> {
    const doc = new xmldom.DOMParser().parseFromString(xml);
    const { privateKeyDer, certPem } = this.extractCertificate(cert);

    const key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // certBase64: DER without PEM headers, for x509 KeyInfo and signingCertificate
    const certBase64 = certPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");

    const signedXml = new xadesjs.SignedXml();
    const signature = await signedXml.Sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      doc as unknown as Document,
      {
        x509: [certBase64],
        signingCertificate: certBase64,
        signingTime: {},
        references: [
          {
            hash: "SHA-256",
            transforms: ["enveloped", "exc-c14n"],
          },
        ],
      }
    );

    doc.documentElement.appendChild(signature.GetXml() as unknown as Node);

    return { xml: new xmldom.XMLSerializer().serializeToString(doc) };
  }

  private extractCertificate(cert: Certificate): {
    privateKeyDer: ArrayBuffer;
    certPem: string;
  } {
    const p12Der = forge.util.createBuffer(cert.p12.toString("binary"));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, cert.password);

    let privateKeyDer: ArrayBuffer | null = null;
    let certPem: string | null = null;

    for (const sci of p12.safeContents) {
      for (const bag of sci.safeBags) {
        if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag && bag.key) {
          // WebCrypto requires PKCS#8 (not PKCS#1)
          const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(bag.key));
          const der = forge.asn1.toDer(pkcs8Asn1).getBytes();
          const buf = Buffer.from(der, "binary");
          privateKeyDer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
        if (bag.type === forge.pki.oids.certBag && bag.cert) {
          certPem = forge.pki.certificateToPem(bag.cert);
        }
      }
    }

    if (!privateKeyDer || !certPem) {
      throw new Error("Invalid certificate: missing key or cert");
    }
    return { privateKeyDer, certPem };
  }
}
