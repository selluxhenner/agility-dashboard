import type { Role } from "./roles";

export type NavItem = { label: string; href: string; roles: readonly Role[] };

// Left rail. Filtered by role in the app shell layout. hrefs are relative to /[company].
export const NAV: NavItem[] = [
  { label: "Overview", href: "/manager", roles: ["manager"] },
  { label: "Inbox", href: "/leader", roles: ["leader", "manager"] },
  { label: "My cases", href: "/team", roles: ["member", "leader", "manager"] },
  { label: "Problems", href: "/problems", roles: ["member", "leader", "manager"] },
  { label: "Ideas", href: "/ideas", roles: ["member", "leader", "manager"] },
  { label: "Collaboration", href: "/collaboration", roles: ["member", "leader", "manager"] },
  { label: "Progress", href: "/progress", roles: ["member", "leader", "manager"] },
  { label: "Settings", href: "/settings", roles: ["manager"] },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((n) => n.roles.includes(role));
}
