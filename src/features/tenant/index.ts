// Resolve a company from its slug (the [company] URL segment) or from a work email.
// Backed by the demo table for now; swap the body for a DB query later - callers do not change.
import { DEMO_COMPANIES, type DemoCompany } from "./demo-companies";

export type Tenant = DemoCompany;

export async function findTenant(slug: string): Promise<Tenant | null> {
  return DEMO_COMPANIES.find((c) => c.slug === slug) ?? null;
}

export async function findTenantByEmail(email: string): Promise<Tenant | null> {
  const domain = email.split("@")[1];
  if (!domain) return null;
  return DEMO_COMPANIES.find((c) => c.users.some((u) => u.email.endsWith("@" + domain))) ?? null;
}
