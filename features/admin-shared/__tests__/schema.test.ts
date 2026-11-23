import { describe, expect, it } from "vitest";
import { z } from "zod";

import { pageOf } from "../schema";

describe("pageOf", () => {
  const schema = pageOf(z.object({ id: z.string() }));

  it("parses a page envelope", () => {
    const page = { items: [{ id: "a" }], page: 1, pageSize: 20, total: 1 };
    expect(schema.parse(page)).toEqual(page);
  });

  it("rejects an item of the wrong shape", () => {
    expect(() => schema.parse({ items: [{ id: 1 }], page: 1, pageSize: 20, total: 1 })).toThrow();
  });
});
