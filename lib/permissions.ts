import type { AppRole } from "@/lib/session";

export type NavKey =
  | "dashboard"
  | "members"
  | "guest_passes"
  | "pt"
  | "subscriptions"
  | "reports"
  | "income"
  | "whatsapp"
  | "notifications"
  | "help"
  | "settings"
  | "profile";

const roleNav: Record<AppRole, NavKey[]> = {
  owner: ["dashboard", "members", "guest_passes", "pt", "subscriptions", "reports", "income", "whatsapp", "notifications", "help", "settings", "profile"],
  manager: ["dashboard", "members", "guest_passes", "pt", "subscriptions", "whatsapp", "notifications", "help", "profile"],
  staff: ["dashboard", "members", "guest_passes", "pt", "subscriptions", "notifications", "help", "profile"],
  trainer: ["pt", "members", "notifications", "help", "profile"],
};

const navPaths: Record<NavKey, string> = {
  dashboard: "/dashboard",
  members: "/dashboard/members",
  guest_passes: "/dashboard/guest-passes",
  pt: "/dashboard/pt",
  subscriptions: "/dashboard/subscriptions",
  reports: "/dashboard/reports",
  income: "/dashboard/income",
  whatsapp: "/dashboard/whatsapp",
  notifications: "/dashboard/notifications",
  help: "/dashboard/help",
  settings: "/dashboard/settings",
  profile: "/dashboard/profile",
};

export function getNavKeysForRole(role: AppRole): NavKey[] {
  return roleNav[role] || roleNav.owner;
}

export function getAllowedPathsForRole(role: AppRole): string[] {
  return getNavKeysForRole(role).map((key) => navPaths[key]);
}

export function canAccessPath(role: AppRole, pathname: string): boolean {
  if (
    role === 'owner' &&
    (pathname.startsWith('/dashboard/import') || pathname.startsWith('/dashboard/onboarding'))
  ) {
    return true;
  }
  const allowed = getAllowedPathsForRole(role);
  return allowed.some((href) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href)));
}

export function getDefaultPathForRole(role: AppRole): string {
  const first = getAllowedPathsForRole(role)[0];
  return first || "/dashboard/profile";
}

export function isOwnerRole(role: AppRole) {
  return role === "owner";
}

export function isManagerRole(role: AppRole) {
  return role === "owner" || role === "manager";
}
