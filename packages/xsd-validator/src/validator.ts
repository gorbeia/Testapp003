import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export type Province = "bizkaia" | "gipuzkoa" | "alava";

export type XsdValidationResult = {
  valid: boolean;
  errors: string[];
};

export class XsdValidator {
  constructor(private schemaBasePath: string) {}

  validate(xml: string, province: Province): XsdValidationResult {
    const schemaFile = path.join(this.schemaBasePath, province, "ticketbai.xsd");

    if (!fs.existsSync(schemaFile)) {
      return { valid: false, errors: [`Schema file not found: ${schemaFile}`] };
    }

    const tmp = path.join(os.tmpdir(), `tbai-${Date.now()}.xml`);
    try {
      fs.writeFileSync(tmp, xml, "utf-8");
      execSync(`xmllint --noout --schema ${schemaFile} ${tmp} 2>&1`, { encoding: "utf-8" });
      return { valid: true, errors: [] };
    } catch (err: any) {
      const output: string = err.stdout ?? err.message ?? "";
      const errors = output
        .split("\n")
        .filter(l => l.includes("error") || l.includes("Error"))
        .map(l => l.trim())
        .filter(Boolean);
      return { valid: false, errors: errors.length ? errors : [output.trim()] };
    } finally {
      try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    }
  }
}
