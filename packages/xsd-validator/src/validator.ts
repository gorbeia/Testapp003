import fs from "fs";
import path from "path";
import libxml from "libxmljs2";

export type Province = "bizkaia" | "gipuzkoa" | "alava";

export type XsdValidationResult = {
  valid: boolean;
  errors: string[];
};

export class XsdValidator {
  private schemas: Record<Province, libxml.Document>;

  constructor(basePath: string) {
    this.schemas = {
      bizkaia: this.loadSchema(basePath, "bizkaia"),
      gipuzkoa: this.loadSchema(basePath, "gipuzkoa"),
      alava: this.loadSchema(basePath, "alava"),
    };
  }

  private loadSchema(basePath: string, province: Province) {
    const file = path.join(basePath, province, "ticketbai.xsd");
    const xsd = fs.readFileSync(file, "utf-8");
    return libxml.parseXml(xsd);
  }

  validate(xml: string, province: Province): XsdValidationResult {
    try {
      const xmlDoc = libxml.parseXml(xml);
      const valid = xmlDoc.validate(this.schemas[province]);
      if (valid) return { valid: true, errors: [] };
      return { valid: false, errors: xmlDoc.validationErrors.map(e => e.message) };
    } catch (err: any) {
      return { valid: false, errors: ["XSD validation error: " + err.message] };
    }
  }
}
