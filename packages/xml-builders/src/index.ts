import { Invoice } from "@tbai/core";
import { buildBizkaiaXml } from "./bizkaia.js";
import { buildGipuzkoaXml } from "./gipuzkoa.js";
import { buildAlavaXml } from "./alava.js";

export type Province = "bizkaia" | "gipuzkoa" | "alava";

export function buildXml(invoice: Invoice, province: Province): string {
  switch (province) {
    case "bizkaia":
      return buildBizkaiaXml(invoice, {
        software: { name: "TBAIGateway", version: "1.0.0", developerNif: "" }
      });
    case "gipuzkoa":
      return buildGipuzkoaXml(invoice);
    case "alava":
      return buildAlavaXml(invoice);
  }
}
