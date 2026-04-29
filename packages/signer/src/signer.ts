import { Signer, Certificate } from "@tbai/core";
import * as xadesjs from "xadesjs";
import { Crypto } from "@peculiar/webcrypto";
import * as xmldom from "@xmldom/xmldom";
import forge from "node-forge";

const crypto = new Crypto();
xadesjs.Application.setEngine("NodeJS", crypto);
(xadesjs as any).Parse = xmldom.DOMParser;
(xadesjs as any).XMLSerializer = xmldom.XMLSerializer;

export class NodeXadesSigner implements Signer {
  async sign(xml: string, cert: Certificate): Promise<{ xml: string }> {
    // 1. Parse XML
    const doc = new xmldom.DOMParser().parseFromString(xml);

    // 2. Ensure root has Id (required by TicketBAI)
    const root = doc.documentElement;
    const docId = "Document-" + this.randomId();
    root.setAttribute("Id", docId);

    // 3. Extract certificate
    const { privateKey, certPem, certDer } = this.extractCertificate(cert);

    const key = await crypto.subtle.importKey(
      "pkcs8",
      this.pemToArrayBuffer(privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // 4. Create signature
    const signedXml = new xadesjs.SignedXml();
    (signedXml as any).SigningKey = key;

    const signatureId = "Signature-" + this.randomId();
    const signedPropsId = "SignedProperties-" + this.randomId();

    // 5. Reference: whole document
    const refDoc = new (xadesjs as any).Reference();
    refDoc.Uri = "#" + docId;
    refDoc.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256";
    refDoc.AddTransform("http://www.w3.org/2000/09/xmldsig#enveloped-signature");
    refDoc.AddTransform("http://www.w3.org/2001/10/xml-exc-c14n#");
    signedXml.AddReference(refDoc);

    // 6. Reference: SignedProperties (MANDATORY)
    const refProps = new (xadesjs as any).Reference();
    refProps.Uri = "#" + signedPropsId;
    refProps.Type = "http://uri.etsi.org/01903#SignedProperties";
    refProps.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256";
    refProps.AddTransform("http://www.w3.org/2001/10/xml-exc-c14n#");
    signedXml.AddReference(refProps);

    // 7. KeyInfo
    const certBase64 = certPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const keyInfo = new (xadesjs as any).KeyInfo();
    keyInfo.AddClause(new (xadesjs as any).KeyInfoX509Data(certBase64));
    (signedXml as any).KeyInfo = keyInfo;

    // 8. XAdES properties
    const signedProperties = new (xadesjs as any).SignedProperties();
    signedProperties.Id = signedPropsId;

    const signingTime = new (xadesjs as any).SigningTime();
    signingTime.Value = new Date();

    const certDigest = await crypto.subtle.digest("SHA-256", certDer);
    const certDigestBase64 = Buffer.from(certDigest).toString("base64");

    const signingCert = new (xadesjs as any).SigningCertificate();
    const certID = new (xadesjs as any).Cert();
    certID.CertDigest = {
      DigestMethod: "http://www.w3.org/2001/04/xmlenc#sha256",
      DigestValue: certDigestBase64,
    };
    signingCert.CertCollection.push(certID);

    signedProperties.SignedSignatureProperties = {
      SigningTime: signingTime,
      SigningCertificate: signingCert,
    };
    (signedXml as any).Properties = signedProperties;

    // 9. Compute signature
    await signedXml.Sign({ name: "RSASSA-PKCS1-v1_5" } as any, key as any, doc as any);

    // 10. Set Signature Id
    const signatureNode = (signedXml as any).GetXml();
    signatureNode.setAttribute("Id", signatureId);

    // 11. Append to root
    root.appendChild(signatureNode);

    // 12. Serialize
    return { xml: new xmldom.XMLSerializer().serializeToString(doc) };
  }

  private extractCertificate(cert: Certificate): {
    privateKey: string;
    certPem: string;
    certDer: ArrayBuffer;
  } {
    const p12Der = forge.util.createBuffer(cert.p12.toString("binary"));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, cert.password);

    let privateKey: string | null = null;
    let certPem: string | null = null;
    let certDer: ArrayBuffer | null = null;

    for (const sci of p12.safeContents) {
      for (const bag of sci.safeBags) {
        if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag && bag.key) {
          privateKey = forge.pki.privateKeyToPem(bag.key);
        }
        if (bag.type === forge.pki.oids.certBag && bag.cert) {
          certPem = forge.pki.certificateToPem(bag.cert);
          const der = forge.asn1.toDer(forge.pki.certificateToAsn1(bag.cert)).getBytes();
          certDer = Buffer.from(der, "binary");
        }
      }
    }

    if (!privateKey || !certPem || !certDer) {
      throw new Error("Invalid certificate");
    }
    return { privateKey, certPem, certDer };
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  private randomId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
