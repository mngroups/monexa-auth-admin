import { describe, expect, it } from "vitest";

import { toRangeParams } from "../range";

describe("toRangeParams", () => {
  it("spans the local start of the first day to the local end of the last day", () => {
    const res = toRangeParams({
      from: new Date(2026, 10, 1, 15, 30),
      to: new Date(2026, 10, 3, 9),
    });
    expect(res.from).toBe(new Date(2026, 10, 1, 0, 0, 0, 0).toISOString());
    expect(res.to).toBe(new Date(2026, 10, 3, 23, 59, 59, 999).toISOString());
  });

  it("returns nothing when the range is cleared", () => {
    expect(toRangeParams(undefined)).toEqual({});
    expect(toRangeParams({})).toEqual({});
  });

  it("handles a half-picked range", () => {
    const res = toRangeParams({ from: new Date(2026, 10, 1) });
    expect(res.from).toBe(new Date(2026, 10, 1, 0, 0, 0, 0).toISOString());
    expect(res.to).toBeUndefined();
  });

  it("does not mutate its input", () => {
    const from = new Date(2026, 10, 1, 15);
    toRangeParams({ from });
    expect(from.getHours()).toBe(15);
  });
});
