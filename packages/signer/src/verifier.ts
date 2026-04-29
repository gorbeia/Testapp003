import * as xadesjs from "xadesjs";
import { Crypto } from "@peculiar/webcrypto";
import * as xmldom from "@xmldom/xmldom";
import xpath from "xpath";

const crypto = new Crypto();
xadesjs.Application.setEngine("NodeJS", crypto);
(xadesjs as any).Parse = xmldom.DOMParser;
(xadesjs as any).XMLSerializer = xmldom.XMLSerializer;

export class NodeXadesVerifier {
  async verify(xml: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    try {
      const doc = new xmldom.DOMParser().parseFromString(xml);
      const signatureNode = xpath.select("//*[local-name()='Signature']", doc as any)[0] as Node;

      if (!signatureNode) {
        return { valid: false, errors: ["Missing Signature node"] };
      }

      const signedXml = new xadesjs.SignedXml(doc as any);
      (signedXml as any).LoadXml(signatureNode);
      const valid = await signedXml.Verify();

      if (!valid) errors.push("Cryptographic signature validation failed");

      const signedProps = xpath.select("//*[local-name()='SignedProperties']", doc as any);
      if (signedProps.length === 0) errors.push("Missing SignedProperties");

      const signingTime = xpath.select("//*[local-name()='SigningTime']", doc as any);
      if (signingTime.length === 0) errors.push("Missing SigningTime");

      const references = xpath.select("//*[local-name()='Reference']", doc as any) as Element[];
      const hasSignedPropsRef = references.some(ref =>
        ref.getAttribute("Type")?.includes("SignedProperties")
      );
      if (!hasSignedPropsRef) errors.push("Missing SignedProperties reference");

      return { valid: valid && errors.length === 0, errors };
    } catch (err: any) {
      return { valid: false, errors: ["Verification error: " + err.message] };
    }
  }
}
