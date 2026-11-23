import { PermissionsProvider } from "@mono/auth/react";
import type { AppShellProps } from "@mono/ui";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_PERMISSIONS } from "@/lib/permissions/admin";
import { ROUTE_PERMISSIONS } from "@/lib/permissions/routes";

const logout = vi.fn();
vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({ login: vi.fn(), isLoggingIn: false, logout, isLoggingOut: false }),
}));
let pathname = "/members";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => pathname,
}));
vi.mock("@mono/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mono/ui")>();
  return {
    ...actual,
    AppShell: ({ menu, bottomNav, onLogout, onOpenChange, pathname, children }: AppShellProps) => (
      <div data-pathname={pathname}>
        <nav aria-label="Menu">
          {menu.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </nav>
        <nav aria-label="Navigasi mobile">
          {bottomNav?.map((item) => (
            <span key={item.href}>{item.label}</span>
          ))}
        </nav>
        <button type="button" onClick={onLogout}>
          Keluar
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Ciutkan sidebar
        </button>
        {children}
      </div>
    ),
  };
});

const { AppShell } = await import("../app-shell");

function renderShell(permissions: string[] | null) {
  return render(
    <PermissionsProvider permissions={permissions} routes={ROUTE_PERMISSIONS}>
      <AppShell defaultOpen userName="budi">
        <p>page</p>
      </AppShell>
    </PermissionsProvider>
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname = "/members";
    document.cookie = "sidebar_state=; max-age=0";
  });

  const menuLabels = () =>
    within(screen.getByRole("navigation", { name: "Menu" }))
      .queryAllByText(/./)
      .map((el) => el.textContent);

  it("renders the accessible menu, mobile tab and page", () => {
    renderShell(Object.values(ADMIN_PERMISSIONS));
    expect(screen.getByText("page")).toBeInTheDocument();
    expect(menuLabels()).toEqual([
      "Anggota",
      "Branding",
      "Aktivitas",
      "Organisasi",
      "Aplikasi",
      "Pengguna",
    ]);
    expect(
      within(screen.getByRole("navigation", { name: "Navigasi mobile" })).getByText("Anggota")
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Menu" }).parentElement).toHaveAttribute(
      "data-pathname",
      "/members"
    );
  });

  it("shows an org admin only the entries their permissions open", () => {
    renderShell(["org.member:manage", "org.activity:view"]);
    expect(menuLabels()).toEqual(["Anggota", "Aktivitas"]);
  });

  it("shows a platform admin the platform and activity entries", () => {
    renderShell(["platform:all"]);
    expect(menuLabels()).toEqual(["Aktivitas", "Organisasi", "Aplikasi", "Pengguna"]);
  });

  it("hides every entry from a user without permissions", () => {
    renderShell([]);
    expect(menuLabels()).toEqual([]);
  });

  it("logs out", () => {
    renderShell(null);
    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
    expect(logout).toHaveBeenCalled();
  });

  it("persists the sidebar's open state", () => {
    renderShell(null);
    fireEvent.click(screen.getByRole("button", { name: "Ciutkan sidebar" }));
    expect(document.cookie).toContain("sidebar_state=false");
  });
});
