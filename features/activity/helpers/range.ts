/**
 * Picked days -> API bounds: `from` is the local start of the first day and
 * `to` the local end of the last day (23:59:59.999), both ISO strings.
 * A cleared range yields neither.
 */
export function toRangeParams(range?: { from?: Date; to?: Date }): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  if (range?.from) {
    const start = new Date(range.from);
    start.setHours(0, 0, 0, 0);
    out.from = start.toISOString();
  }
  if (range?.to) {
    const end = new Date(range.to);
    end.setHours(23, 59, 59, 999);
    out.to = end.toISOString();
  }
  return out;
}
