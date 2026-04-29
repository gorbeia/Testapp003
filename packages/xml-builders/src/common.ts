import { create } from "xmlbuilder2";

export function createBaseDocument(rootName: string, namespace: string) {
  return create({
    version: "1.0",
    encoding: "UTF-8",
  }).ele(rootName, {
    xmlns: namespace,
  });
}

export function formatXml(doc: any): string {
  return doc.end({
    prettyPrint: false, // MUST be false for determinism
  });
}
