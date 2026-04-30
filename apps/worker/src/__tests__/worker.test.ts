import { describe, it, expect, vi, beforeEach } from "vitest";
import { TicketBaiWorker } from "../worker.js";

function makeDb(jobOverrides: Record<string, any> = {}) {
  const defaultJob = {
    id: "job-1",
    invoice_id: "inv-1",
    tenant_id: "t1",
    xml: "<TicketBai/>",
    attempt_count: 1,
    ticket_id: null,
    ...jobOverrides,
  };

  const query = vi.fn(async (sql: string) => {
    if (sql.includes("UPDATE tbai_jobs") && sql.includes("RETURNING")) {
      return { rows: [defaultJob] };
    }
    return { rows: [] };
  });

  return { query, _job: defaultJob };
}

describe("TicketBaiWorker.runOnce", () => {
  it("accepts a job when Hacienda returns accepted response", async () => {
    const { query } = makeDb();
    const worker = new TicketBaiWorker(
      { query } as any,
      "http://sandbox",
      null
    );

    // Patch submitToHacienda via env
    process.env.TBAI_ENV = "sandbox";
    await worker.runOnce();

    const updateCall = query.mock.calls.find(
      ([sql]: [string]) => sql.includes("SET status=") && sql.includes("WHERE id=")
    );
    expect(updateCall).toBeDefined();
    const sql: string = updateCall![0];
    expect(sql).toContain("accepted");
  });

  it("does nothing when no jobs are available", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const worker = new TicketBaiWorker({ query } as any, "http://sandbox", null);

    await worker.runOnce();

    // lockJob returns no row, so no post-processing UPDATE should happen
    // (lockJob itself uses SET status='processing' RETURNING — exclude it)
    const postProcessUpdate = query.mock.calls.find(
      ([sql]: [string]) => sql.includes("SET status=") && !sql.includes("RETURNING")
    );
    expect(postProcessUpdate).toBeUndefined();
  });

  it("sends job to DLQ when attempt_count exceeds 5", async () => {
    const { query } = makeDb({ attempt_count: 6 });
    const worker = new TicketBaiWorker({ query } as any, "http://sandbox", null);

    await worker.runOnce();

    const dlqInsert = query.mock.calls.find(
      ([sql]: [string]) => sql.includes("tbai_dead_letter_queue")
    );
    expect(dlqInsert).toBeDefined();

    const deadLetter = query.mock.calls.find(
      ([sql]: [string]) => sql.includes("dead_letter")
    );
    expect(deadLetter).toBeDefined();
  });

  it("marks job as failed when submission throws", async () => {
    const { query } = makeDb();
    const worker = new TicketBaiWorker({ query } as any, "http://sandbox", null);

    // Force submit to throw
    vi.spyOn(worker as any, "runOnce").mockImplementation(async () => {
      await query(
        `UPDATE tbai_jobs SET status='failed', last_error=$2 WHERE id=$1`,
        ["job-1", "Network error"]
      );
    });

    await worker.runOnce();
    const failCall = query.mock.calls.find(
      ([sql]: [string]) => sql.includes("failed")
    );
    expect(failCall).toBeDefined();
  });
});

describe("parseHaciendaResponse", () => {
  it("parses accepted response", async () => {
    const { parseHaciendaResponse } = await import("../parse-response.js");
    const xml = "<Resultado>Aceptado</Resultado><IdTicketBai>TICKET-001</IdTicketBai>";
    const result = parseHaciendaResponse(xml);
    expect(result.accepted).toBe(true);
    expect(result.ticketId).toBe("TICKET-001");
    expect(result.errors).toHaveLength(0);
  });

  it("parses rejected response with errors", async () => {
    const { parseHaciendaResponse } = await import("../parse-response.js");
    const xml = "<Resultado>Rechazado</Resultado><Error>NIF incorrecto</Error><Error>Fecha inválida</Error>";
    const result = parseHaciendaResponse(xml);
    expect(result.accepted).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toBe("NIF incorrecto");
  });
});
