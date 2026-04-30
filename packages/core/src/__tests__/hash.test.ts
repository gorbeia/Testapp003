import { describe, it, expect } from "vitest";
import { computeHash, computeTicketBaiHash } from "../hash.js";

describe("computeHash", () => {
  it("produces a 64-char hex string", () => {
    const h = computeHash({ invoiceNumber: "1", issueDate: "2026-01-01", totalAmount: 100 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for identical inputs", () => {
    const input = { invoiceNumber: "A-001", issueDate: "2026-01-01", totalAmount: 121 };
    expect(computeHash(input)).toBe(computeHash(input));
  });

  it("changes when invoiceNumber changes", () => {
    const base = { issueDate: "2026-01-01", totalAmount: 100 };
    expect(computeHash({ ...base, invoiceNumber: "1" }))
      .not.toBe(computeHash({ ...base, invoiceNumber: "2" }));
  });

  it("changes when totalAmount changes", () => {
    const base = { invoiceNumber: "1", issueDate: "2026-01-01" };
    expect(computeHash({ ...base, totalAmount: 100 }))
      .not.toBe(computeHash({ ...base, totalAmount: 101 }));
  });

  it("changes when previousHash is present vs absent", () => {
    const base = { invoiceNumber: "2", issueDate: "2026-01-02", totalAmount: 200 };
    const withoutPrev = computeHash(base);
    const withPrev = computeHash({ ...base, previousHash: "abc123" });
    expect(withoutPrev).not.toBe(withPrev);
  });
});

describe("per-series hash chain isolation", () => {
  it("series A and series R maintain independent chains", () => {
    // Simulate series A: invoices A-001, A-002
    const hashA1 = computeHash({ invoiceNumber: "A-001", issueDate: "2026-01-01", totalAmount: 100 });
    const hashA2 = computeHash({ invoiceNumber: "A-002", issueDate: "2026-01-02", totalAmount: 200, previousHash: hashA1 });

    // Simulate series R: invoices R-001, R-002 (independent chain, no shared state)
    const hashR1 = computeHash({ invoiceNumber: "R-001", issueDate: "2026-01-01", totalAmount: -100 });
    const hashR2 = computeHash({ invoiceNumber: "R-002", issueDate: "2026-01-02", totalAmount: -200, previousHash: hashR1 });

    // Chains are independent: series A does not reference series R
    expect(hashA2).not.toBe(hashR2);

    // Each chain is internally consistent
    const hashA2_reproduced = computeHash({ invoiceNumber: "A-002", issueDate: "2026-01-02", totalAmount: 200, previousHash: hashA1 });
    expect(hashA2).toBe(hashA2_reproduced);

    // A chain with cross-series contamination would produce a different hash
    const hashA2_wrongChain = computeHash({ invoiceNumber: "A-002", issueDate: "2026-01-02", totalAmount: 200, previousHash: hashR1 });
    expect(hashA2).not.toBe(hashA2_wrongChain);
  });
});

describe("computeTicketBaiHash", () => {
  const base = {
    issuerNif: "12345678A",
    invoiceNumber: "F-001",
    issueDate: "2026-01-15",
    totalAmount: 121.0,
    vatAmount: 21.0,
  };

  it("produces a 64-char hex string", () => {
    expect(computeTicketBaiHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(computeTicketBaiHash(base)).toBe(computeTicketBaiHash(base));
  });

  it("chains: h2 depends on h1", () => {
    const h1 = computeTicketBaiHash(base);
    const h2 = computeTicketBaiHash({ ...base, invoiceNumber: "F-002", previousHash: h1 });
    expect(h2).not.toBe(h1);
    // h2 without the chain is different from h2 with the chain
    const h2NoChain = computeTicketBaiHash({ ...base, invoiceNumber: "F-002" });
    expect(h2).not.toBe(h2NoChain);
  });

  it("changes when issuerNif changes", () => {
    expect(computeTicketBaiHash({ ...base, issuerNif: "87654321B" }))
      .not.toBe(computeTicketBaiHash(base));
  });

  it("changes when vatAmount changes", () => {
    expect(computeTicketBaiHash({ ...base, vatAmount: 10.0 }))
      .not.toBe(computeTicketBaiHash(base));
  });

  it("formats amounts to 2 decimal places in hash input", () => {
    // 121 and 121.00 must produce the same hash
    const h1 = computeTicketBaiHash({ ...base, totalAmount: 121 });
    const h2 = computeTicketBaiHash({ ...base, totalAmount: 121.0 });
    expect(h1).toBe(h2);
  });
});
