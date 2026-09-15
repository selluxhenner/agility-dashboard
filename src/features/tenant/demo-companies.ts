// Demo tenants until there is a database. "Company-specific" = the [company] URL segment + this table.
import type { Role } from "@/config/roles";

export type DemoUser = { id: string; name: string; email: string; role: Role; dept: string; handle?: string };
export type DemoCompany = { slug: string; name: string; mark: string; anonymousHandles: boolean; users: DemoUser[] };

export const DEMO_COMPANIES: DemoCompany[] = [
  {
    slug: "acme",
    name: "Acme Maschinenbau GmbH",
    mark: "A",
    anonymousHandles: true,
    users: [
      { id: "u1", name: "B. Hartmann", email: "b.hartmann@acme.example", role: "manager", dept: "Betriebsleitung" },
      { id: "u2", name: "T. Vogel", email: "t.vogel@acme.example", role: "leader", dept: "Production" },
      { id: "u3", name: "J. Schmidt", email: "j.schmidt@acme.example", role: "member", dept: "Production, Line 3", handle: "Anonymous #4471" },
    ],
  },
];
