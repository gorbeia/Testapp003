import axios from "axios";
import { randomUUID } from "crypto";

export type Province = "bizkaia" | "gipuzkoa" | "alava";
export type Environment = "sandbox" | "production";

const ENDPOINTS: Record<Province, Record<Environment, string>> = {
  bizkaia: {
    sandbox: "https://pruesarretak.bizkaia.eus/N3B4000M/aurkezpena",
    production: "https://sarrerak.bizkaia.eus/N3B4000M/aurkezpena",
  },
  gipuzkoa: {
    sandbox: "https://tbai.prep.gipuzkoa.eus/sarrerak/alta",
    production: "https://tbai.egoitza.gipuzkoa.eus/sarrerak/alta",
  },
  alava: {
    sandbox: "https://pruebas-ticketbai.araba.eus/TicketBAI/interfaces/RegistroFactura",
    production: "https://ticketbai.araba.eus/TicketBAI/interfaces/RegistroFactura",
  },
};

export function getEndpoint(province: Province, env: Environment): string {
  return ENDPOINTS[province][env];
}

export async function submitToHacienda(xml: string, endpoint: string, certAgent: any): Promise<string> {
  if (process.env.TBAI_ENV === "sandbox") {
    return simulateHaciendaResponse(xml);
  }
  const res = await axios.post(endpoint, xml, {
    httpsAgent: certAgent,
    headers: { "Content-Type": "text/xml" },
    timeout: 15000,
  });
  return res.data;
}

export function simulateHaciendaResponse(_xml: string): Promise<string> {
  const mode = process.env.TBAI_SANDBOX_RESULT ?? "accepted";

  if (mode === "rejected") {
    const xml = `<RespuestaTicketBai><Resultado>Rechazado</Resultado><Error>NIF incorrecto</Error></RespuestaTicketBai>`;
    return Promise.resolve(xml);
  }

  if (mode === "timeout") {
    const delayMs = Number(process.env.TBAI_SANDBOX_TIMEOUT_MS ?? 5000);
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Sandbox timeout")), delayMs)
    );
  }

  const ticketId = `SANDBOX-${randomUUID()}`;
  return Promise.resolve(
    `<RespuestaTicketBai><Resultado>Aceptado</Resultado><IdTicketBai>${ticketId}</IdTicketBai></RespuestaTicketBai>`
  );
}
