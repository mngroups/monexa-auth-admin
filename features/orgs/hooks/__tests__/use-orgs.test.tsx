import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ listOrgsAction: vi.fn() }));
vi.mock("../../actions/orgs.actions", () => actions);

const { useOrgs } = await import("../use-orgs");

const params = { page: 1, pageSize: 10 };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return wrapper;
}

async function mountTwice(staleTime: number) {
  const wrapper = setup();
  const first = renderHook(() => useOrgs(params, { staleTime }), { wrapper });
  await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
  first.unmount();
  const second = renderHook(() => useOrgs(params, { staleTime }), { wrapper });
  await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
  second.unmount();
}

describe("useOrgs staleTime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.listOrgsAction.mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 10, total: 0 },
    });
  });

  it("reuses a fresh result when staleTime is positive", async () => {
    await mountTwice(30_000);
    expect(actions.listOrgsAction).toHaveBeenCalledTimes(1);
  });

  it("refetches on every mount when staleTime is 0", async () => {
    await mountTwice(0);
    expect(actions.listOrgsAction).toHaveBeenCalledTimes(2);
  });

  it("stays idle when disabled", () => {
    renderHook(() => useOrgs(params, { staleTime: 0, enabled: false }), { wrapper: setup() });
    expect(actions.listOrgsAction).not.toHaveBeenCalled();
  });
});
