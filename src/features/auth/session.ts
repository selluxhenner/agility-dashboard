// Session shape and helpers. Backed by nothing yet (login is visual only); Auth.js lands in Phase 2.
// Pages and layouts call getSession()/requireRole() - they never read cookies themselves.
import type { Role } from "@/config/roles";

export type Session = { userId: string; companySlug: string; role: Role };

export async function getSession(): Promise<Session | null> {
  return null;
}
