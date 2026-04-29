import { InvoiceChainNode, ChainValidationResult, ChainBreak } from "./types.js";

export function reconstructChain(nodes: InvoiceChainNode[]): ChainValidationResult {
  const map = new Map<string, InvoiceChainNode>();
  const byPrev = new Map<string, InvoiceChainNode>();
  const breaks: ChainBreak[] = [];

  for (const n of nodes) {
    map.set(n.hash, n);
    if (n.previousHash) byPrev.set(n.previousHash, n);
  }

  const start = nodes.find(n => !n.previousHash || !map.has(n.previousHash));
  if (!start) {
    return { valid: false, chain: [], breaks: [{ type: "MISSING_LINK", invoiceId: "UNKNOWN" }] };
  }

  const chain: InvoiceChainNode[] = [];
  let current: InvoiceChainNode | undefined = start;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.hash)) {
      breaks.push({ type: "ORPHAN_NODE", invoiceId: current.id });
      break;
    }
    visited.add(current.hash);
    chain.push(current);
    const next = byPrev.get(current.hash);
    if (next && next.previousHash !== current.hash) {
      breaks.push({ type: "HASH_MISMATCH", invoiceId: next.id, expected: current.hash, actual: next.previousHash });
    }
    current = next;
  }

  for (const n of nodes) {
    if (!visited.has(n.hash)) breaks.push({ type: "ORPHAN_NODE", invoiceId: n.id });
  }

  return { valid: breaks.length === 0, chain, breaks };
}
