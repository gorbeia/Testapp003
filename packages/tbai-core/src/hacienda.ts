import { createHash } from 'crypto';
import { HaciendaResponse } from './types.js';

interface SimulateOptions {
  /** Force a rejection for testing error paths */
  forceReject?: boolean;
  /** Simulate network latency in ms (default: 0) */
  latencyMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulates the Bizkaia Hacienda LROE endpoint.
 * In production this would be an authenticated HTTPS POST to:
 * https://www.bizkaia.eus/ogasuna/lroe/...
 */
export async function simulateHacienda(
  xml: string,
  options: SimulateOptions = {},
): Promise<HaciendaResponse> {
  const { forceReject = false, latencyMs = 0 } = options;

  if (latencyMs > 0) await sleep(latencyMs);

  const env = process.env.TBAI_ENV ?? 'sandbox';

  // Validate XML is non-empty and has the TicketBai root
  if (!xml || !xml.includes('TicketBai')) {
    return {
      status: 'REJECTED',
      ticketId: '',
      timestamp: new Date().toISOString(),
      errorCode: 'ERR_INVALID_XML',
      errorMessage: 'XML does not contain TicketBai root element',
    };
  }

  if (forceReject) {
    return {
      status: 'REJECTED',
      ticketId: '',
      timestamp: new Date().toISOString(),
      errorCode: 'ERR_SIMULATED_REJECT',
      errorMessage: 'Simulated rejection for test purposes',
    };
  }

  // Deterministic ticketId derived from document hash so retries return same ID
  const docHash = createHash('sha256').update(xml).digest('hex').substring(0, 16).toUpperCase();
  const ticketId = `TBAI-${env.toUpperCase()}-${docHash}`;

  return {
    status: 'ACCEPTED',
    ticketId,
    timestamp: new Date().toISOString(),
  };
}
