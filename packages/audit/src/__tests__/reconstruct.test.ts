import { describe, it, expect } from "vitest";
import { reconstructChain } from "../reconstruct.js";
import type { InvoiceChainNode } from "../types.js";

function node(overrides: Partial<InvoiceChainNode> & { hash: string }): InvoiceChainNode {
  return {
    id: overrides.hash,
    tenantId: "t1",
    number: overrides.id ?? overrides.hash,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("reconstructChain — valid chains", () => {
  it("single invoice with no previous hash is valid", () => {
    const result = reconstructChain([node({ hash: "h1" })]);
    expect(result.valid).toBe(true);
    expect(result.chain).toHaveLength(1);
    expect(result.breaks).toHaveLength(0);
  });

  it("linear chain of three invoices is valid", () => {
    const n1 = node({ hash: "h1" });
    const n2 = node({ hash: "h2", previousHash: "h1" });
    const n3 = node({ hash: "h3", previousHash: "h2" });

    const result = reconstructChain([n1, n2, n3]);
    expect(result.valid).toBe(true);
    expect(result.chain).toHaveLength(3);
    expect(result.chain[0].hash).toBe("h1");
    expect(result.chain[1].hash).toBe("h2");
    expect(result.chain[2].hash).toBe("h3");
  });

  it("reconstructs chain regardless of input order", () => {
    const n1 = node({ hash: "h1" });
    const n2 = node({ hash: "h2", previousHash: "h1" });
    const n3 = node({ hash: "h3", previousHash: "h2" });

    // Pass in reverse order
    const result = reconstructChain([n3, n1, n2]);
    expect(result.valid).toBe(true);
    expect(result.chain[0].hash).toBe("h1");
    expect(result.chain[2].hash).toBe("h3");
  });
});

describe("reconstructChain — broken chains", () => {
  it("detects an orphan node (gap in chain)", () => {
    const n1 = node({ hash: "h1" });
    // n3 references h2 which doesn't exist
    const n3 = node({ hash: "h3", previousHash: "h2" });

    const result = reconstructChain([n1, n3]);
    expect(result.valid).toBe(false);
    const orphan = result.breaks.find(b => b.type === "ORPHAN_NODE");
    expect(orphan).toBeDefined();
  });

  it("detects a hash mismatch in the chain", () => {
    const n1 = node({ hash: "h1" });
    // n2 claims its previous is h1, but stored with wrong ref
    const n2: InvoiceChainNode = {
      id: "n2",
      tenantId: "t1",
      number: "2",
      hash: "h2",
      previousHash: "WRONG_HASH", // tampered
      createdAt: new Date().toISOString(),
    };
    const result = reconstructChain([n1, n2]);
    expect(result.valid).toBe(false);
  });

  it("returns an empty result for an empty input", () => {
    const result = reconstructChain([]);
    // No nodes = no chain, and no start node found
    expect(result.chain).toHaveLength(0);
  });
});

describe("reconstructChain — audit properties", () => {
  it("all nodes are visited in a valid chain", () => {
    const nodes = [
      node({ hash: "h1" }),
      node({ hash: "h2", previousHash: "h1" }),
      node({ hash: "h3", previousHash: "h2" }),
    ];
    const result = reconstructChain(nodes);
    const visitedHashes = result.chain.map(n => n.hash);
    expect(visitedHashes).toContain("h1");
    expect(visitedHashes).toContain("h2");
    expect(visitedHashes).toContain("h3");
  });

  it("chain length equals number of nodes for a valid linear chain", () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      node({ hash: `h${i + 1}`, previousHash: i === 0 ? undefined : `h${i}` })
    );
    const result = reconstructChain(nodes);
    expect(result.valid).toBe(true);
    expect(result.chain).toHaveLength(10);
  });
});
