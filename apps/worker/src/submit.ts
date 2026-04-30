import axios from "axios";

export async function submitToHacienda(xml: string, endpoint: string, certAgent: any) {
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

export function simulateHaciendaResponse(_xml: string): string {
  const { randomUUID } = require("crypto");
  const ticketId = `SANDBOX-${randomUUID()}`;
  return `<RespuestaTicketBai><Resultado>Aceptado</Resultado><IdTicketBai>${ticketId}</IdTicketBai></RespuestaTicketBai>`;
}
