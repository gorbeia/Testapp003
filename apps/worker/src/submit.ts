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

export function simulateHaciendaResponse(xml: string) {
  const crypto = require("crypto");
  return {
    status: "ACCEPTED",
    ticketId: "SANDBOX-" + crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    warnings: []
  };
}
