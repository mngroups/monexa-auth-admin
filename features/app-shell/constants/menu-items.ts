import type { AppShellItem } from "@mono/ui";
import { AppWindow, Building2, History, Image, UserCog, Users } from "lucide-react";

/**
 * Sidebar entries, top to bottom. The order is also the post-login landing
 * order: "/" sends the user to the first entry they may open (see
 * `resolveLandingRoute`). The same entries appear in the mobile bottom nav.
 * Gate an entry by adding its route to `lib/permissions/routes.ts::ROUTE_PERMISSIONS`.
 */
export const MENU_ITEMS: AppShellItem[] = [
  { label: "Anggota", href: "/members", icon: Users },
  { label: "Branding", href: "/branding", icon: Image },
  { label: "Aktivitas", href: "/activity", icon: History },
  { label: "Organisasi", href: "/orgs", icon: Building2 },
  { label: "Aplikasi", href: "/apps", icon: AppWindow },
  { label: "Pengguna", href: "/users", icon: UserCog },
];
