// Authenticated shell: rail + top bar around every app page. Session + role guard live here
// (Phase 2). For now it renders the chrome with the demo tenant so pages can be built.
import { findTenant } from "@/features/tenant";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ company: string }> }) {
  const { company } = await params;
  const tenant = (await findTenant(company))!;
  return <AppShell tenant={tenant} role="manager">{children}</AppShell>;
}
