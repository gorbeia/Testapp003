import { describe, it, expect, afterEach } from "vitest";
import { simulateHaciendaResponse, getEndpoint } from "../submit.js";

afterEach(() => {
  delete process.env.TBAI_SANDBOX_RESULT;
  delete process.env.TBAI_SANDBOX_TIMEOUT_MS;
});

describe("simulateHaciendaResponse", () => {
  it("returns accepted XML by default", async () => {
    const xml = await simulateHaciendaResponse("<TicketBai/>");
    expect(xml).toContain("<Resultado>Aceptado</Resultado>");
    expect(xml).toContain("<IdTicketBai>SANDBOX-");
  });

  it("returns accepted XML when TBAI_SANDBOX_RESULT=accepted", async () => {
    process.env.TBAI_SANDBOX_RESULT = "accepted";
    const xml = await simulateHaciendaResponse("<TicketBai/>");
    expect(xml).toContain("<Resultado>Aceptado</Resultado>");
  });

  it("returns rejected XML when TBAI_SANDBOX_RESULT=rejected", async () => {
    process.env.TBAI_SANDBOX_RESULT = "rejected";
    const xml = await simulateHaciendaResponse("<TicketBai/>");
    expect(xml).toContain("<Resultado>Rechazado</Resultado>");
    expect(xml).toContain("<Error>");
  });

  it("throws timeout error when TBAI_SANDBOX_RESULT=timeout", async () => {
    process.env.TBAI_SANDBOX_RESULT = "timeout";
    process.env.TBAI_SANDBOX_TIMEOUT_MS = "10";
    await expect(simulateHaciendaResponse("<TicketBai/>")).rejects.toThrow(/timeout/i);
  });
});

describe("getEndpoint", () => {
  it("returns bizkaia sandbox endpoint", () => {
    const url = getEndpoint("bizkaia", "sandbox");
    expect(url).toContain("bizkaia.eus");
    expect(url).toContain("pruesarretak");
  });

  it("returns bizkaia production endpoint", () => {
    const url = getEndpoint("bizkaia", "production");
    expect(url).toContain("bizkaia.eus");
    expect(url).not.toContain("pruesarretak");
  });

  it("returns gipuzkoa sandbox endpoint", () => {
    const url = getEndpoint("gipuzkoa", "sandbox");
    expect(url).toContain("gipuzkoa.eus");
    expect(url).toContain("prep");
  });

  it("returns gipuzkoa production endpoint", () => {
    const url = getEndpoint("gipuzkoa", "production");
    expect(url).toContain("gipuzkoa.eus");
    expect(url).not.toContain("prep");
  });

  it("returns alava sandbox endpoint", () => {
    const url = getEndpoint("alava", "sandbox");
    expect(url).toContain("araba.eus");
    expect(url).toContain("pruebas");
  });

  it("returns alava production endpoint", () => {
    const url = getEndpoint("alava", "production");
    expect(url).toContain("araba.eus");
    expect(url).not.toContain("pruebas");
  });

  it("returns different URLs for sandbox vs production", () => {
    expect(getEndpoint("bizkaia", "sandbox")).not.toBe(getEndpoint("bizkaia", "production"));
    expect(getEndpoint("gipuzkoa", "sandbox")).not.toBe(getEndpoint("gipuzkoa", "production"));
    expect(getEndpoint("alava", "sandbox")).not.toBe(getEndpoint("alava", "production"));
  });
});
