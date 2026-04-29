export function parseHaciendaResponse(xml: string) {
  const accepted = xml.includes("<Resultado>Aceptado</Resultado>");
  const ticketIdMatch = xml.match(/<IdTicketBai>(.*?)<\/IdTicketBai>/);
  const errors = [...xml.matchAll(/<Error>(.*?)<\/Error>/g)].map(m => m[1]);
  return { accepted, ticketId: ticketIdMatch?.[1], errors };
}
