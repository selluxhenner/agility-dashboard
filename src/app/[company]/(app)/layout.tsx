// Authenticated shell: rail + top bar around every app page. Session + role guard live here
// (Phase 2). Until then DemoProvider holds the persona (switchable in the dev panel), the event
// log and the demo seed for this company; AppShell renders the chrome from it.
import { findTenant } from "@/features/tenant";
import { seedFor } from "@/features/demo";
import { DemoProvider } from "@/components/dashboard/DemoProvider";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ company: string }> }) {
  const { company } = await params;
  const tenant = (await findTenant(company))!;
  const seed = seedFor(tenant.slug);
  return (
    <DemoProvider tenant={{ slug: tenant.slug, name: seed.company || tenant.name }} seed={seed}>
      <AppShell>{children}</AppShell>
    </DemoProvider>
  );
}
