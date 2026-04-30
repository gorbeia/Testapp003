import { describe, it, expect, vi } from "vitest";
import { retry } from "../retry.js";

describe("retry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retry(fn, { retries: 3, baseDelayMs: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error("temporary");
      return "ok";
    });
    const result = await retry(fn, { retries: 3, baseDelayMs: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("permanent"));
    await expect(retry(fn, { retries: 2, baseDelayMs: 0 })).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("throws the last error when all retries exhausted", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      throw new Error(`attempt-${++n}`);
    });
    await expect(retry(fn, { retries: 2, baseDelayMs: 0 })).rejects.toThrow("attempt-3");
  });
});
