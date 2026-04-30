import * as xadesjs from "xadesjs";
import { Crypto } from "@peculiar/webcrypto";
import * as xmldom from "@xmldom/xmldom";
import xpath from "xpath";

const crypto = new Crypto();
xadesjs.Application.setEngine("NodeJS", crypto);
xadesjs.setNodeDependencies({ DOMParser: xmldom.DOMParser, XMLSerializer: xmldom.XMLSerializer });

export class NodeXadesVerifier {
  async verify(xml: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    try {
      const doc = new xmldom.DOMParser().parseFromString(xml);
      const signatureNode = xpath.select(
        "//*[local-name()='Signature']",
        doc as any
      )[0] as Element | undefined;

      if (!signatureNode) {
        return { valid: false, errors: ["Missing Signature node"] };
      }

      const signedXml = new xadesjs.SignedXml(doc as unknown as Document);
      signedXml.LoadXml(signatureNode as unknown as Element);
      const valid = await signedXml.Verify();

      if (!valid) errors.push("Cryptographic signature validation failed");

      // Check mandatory XAdES elements
      const signedProps = xpath.select("//*[local-name()='SignedProperties']", doc as any);
      if ((signedProps as Node[]).length === 0) errors.push("Missing SignedProperties");

      const signingTime = xpath.select("//*[local-name()='SigningTime']", doc as any);
      if ((signingTime as Node[]).length === 0) errors.push("Missing SigningTime");

      return { valid: valid && errors.length === 0, errors };
    } catch (err: any) {
      return { valid: false, errors: ["Verification error: " + err.message] };
    }
  }
}
