import { PermissionsProvider } from "@mono/auth/react";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveOrgProvider } from "@/features/admin-shared/hooks/use-active-org";
import { ADMIN_PERMISSIONS } from "@/lib/permissions/admin";
import { renderWithProviders } from "@/test-utils/render";

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@mono/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mono/hooks")>()),
  useIsMobile: () => mobile.value,
}));

const activity = vi.hoisted(() => ({ listActivityAction: vi.fn() }));
vi.mock("../../actions/activity.actions", () => activity);
const orgs = vi.hoisted(() => ({ listOrgsAction: vi.fn() }));
vi.mock("@/features/orgs/actions/orgs.actions", () => orgs);

const { ActivityPage } = await import("../activity-page");

const ok = <T,>(data: T) => ({ ok: true as const, data });
const entry = (id: string, action: string, at: string) => ({
  id,
  at,
  actorUserId: `actor-${id}`,
  orgId: "o1",
  action,
  targetType: "user",
  targetId: `t-${id}`,
  ip: "10.0.0.1",
  userAgent: "ua",
  metadata: {},
});
const page = (items: unknown[]) => ok({ items, page: 1, pageSize: 10, total: items.length });

function renderPage(permissions: string[]) {
  return renderWithProviders(
    <PermissionsProvider permissions={permissions}>
      <ActiveOrgProvider orgId="o1">
        <ActivityPage />
      </ActiveOrgProvider>
    </PermissionsProvider>
  );
}

describe("ActivityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobile.value = false;
    orgs.listOrgsAction.mockResolvedValue(
      ok({
        items: [
          {
            id: "o1",
            slug: "acme",
            name: "Acme",
            isActive: true,
            createdAt: "x",
            updatedAt: "x",
            logo: null,
          },
        ],
        page: 1,
        pageSize: 100,
        total: 1,
      })
    );
  });

  it("uses the org scope for an org admin and hides the org filter", async () => {
    activity.listActivityAction.mockResolvedValue(
      page([
        entry("e2", "member.remove", "2026-11-02T10:00:00Z"),
        entry("e1", "member.create", "2026-11-01T10:00:00Z"),
      ])
    );
    renderPage([ADMIN_PERMISSIONS.activityView]);
    await screen.findByText("member.remove");
    expect(activity.listActivityAction).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "org", page: 1 })
    );
    expect(screen.queryByText("Organisasi", { selector: "label" })).not.toBeInTheDocument();
    expect(orgs.listOrgsAction).not.toHaveBeenCalled();
    const rows = screen.getAllByText(/^member\./).map((n) => n.textContent);
    expect(rows).toEqual(["member.remove", "member.create"]);
    expect(screen.getByText("actor-e2")).toBeInTheDocument();
  });

  it("uses the platform scope for a platform admin and shows the org filter", async () => {
    activity.listActivityAction.mockResolvedValue(
      page([entry("e1", "org.create", "2026-11-01T10:00:00Z")])
    );
    renderPage([ADMIN_PERMISSIONS.platformAll]);
    await screen.findByText("org.create");
    expect(activity.listActivityAction).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "platform" })
    );
    expect(screen.getByText("Organisasi", { selector: "label, span" })).toBeInTheDocument();
    await waitFor(() => expect(orgs.listOrgsAction).toHaveBeenCalled());
  });

  it("shows a skeleton while loading", () => {
    activity.listActivityAction.mockReturnValue(new Promise(() => {}));
    renderPage([ADMIN_PERMISSIONS.activityView]);
    expect(screen.getByTestId("activity-skeleton")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    activity.listActivityAction.mockResolvedValue(page([]));
    renderPage([ADMIN_PERMISSIONS.activityView]);
    expect(await screen.findByText(/belum ada aktivitas/i)).toBeInTheDocument();
  });

  it("shows the BE error", async () => {
    activity.listActivityAction.mockResolvedValue({
      ok: false,
      error: { message: "Akses ditolak", status: 403 },
    });
    renderPage([ADMIN_PERMISSIONS.activityView]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Akses ditolak");
  });

  it("renders cards on mobile", async () => {
    mobile.value = true;
    activity.listActivityAction.mockResolvedValue(
      page([entry("e1", "member.create", "2026-11-01T10:00:00Z")])
    );
    renderPage([ADMIN_PERMISSIONS.activityView]);
    expect(await screen.findByText("member.create")).toBeInTheDocument();
  });
});
