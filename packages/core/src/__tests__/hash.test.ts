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
