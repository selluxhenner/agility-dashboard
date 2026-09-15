"use client";
// The authenticated app chrome: rail (nav by role, department scope) + top bar + content, plus
// the overlays every page shares: input sheet, toast, dev panel. Port of the shell in
// legacy/demo/index.html; state comes from DemoProvider, nav from src/config/nav.ts.
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor } from "@/config/nav";
import { SITE } from "@/config/site";
import { useDemo } from "@/components/dashboard/DemoProvider";
import { mineRows, openCases } from "@/components/dashboard/derive";
import { fmt } from "@/lib/utils/format";
import { DevPanel } from "./DevPanel";
import { InputSheet } from "./InputSheet";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = useDemo();
  const { tenant, seed, role, persona, N, dept, menu, setMenu, pop, setPop, sheet, toast } = ctx;
  const pathname = usePathname();

  // Rail counts, everything counted from the rows.
  const cnt = (n: number) => (n ? String(n) : "");
  const countFor: Record<string, string> = {
    "/team": cnt(mineRows(ctx).length),
    "/leader": cnt(openCases(ctx).length),
    "/problems": cnt(N.problems),
    "/ideas": cnt(N.ideas),
    "/collaboration": cnt(N.initiatives),
  };
  const scopeItems = [{ id: "All", name: "All departments", people: N.people }, ...seed.depts];

  return (
    <div className={styles.root}>
      <aside className={styles.rail} data-open={menu ? "true" : undefined} aria-label="Main">
        <div className={styles.brand}>
          <Image src="/brand/logo.png" alt="" width={28} height={28} className={styles.logo} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{SITE.name}</span>
            <span className={styles.brandTenant}>{tenant.name}</span>
          </span>
          <button type="button" className={styles.close} onClick={() => setMenu(false)} aria-label="Close menu">×</button>
        </div>

        <div className={styles.railLabel}>Views</div>
        <nav className={styles.nav}>
          {navFor(role).map((n) => {
            const href = "/" + tenant.slug + n.href;
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={n.href} href={href} className={styles.navItem} data-active={active ? "true" : undefined} onClick={() => { setPop(null); setMenu(false); }}>
                <span>{n.label}</span>
                <span className={styles.navCount}>{countFor[n.href] ?? ""}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.rule} />

        <div className={styles.railLabelRow}>
          <span className={styles.railLabel}>Scope</span>
          {dept !== "All" && <button type="button" className={styles.clearScope} onClick={() => ctx.setDept("All")}>clear</button>}
        </div>
        <div className={`${styles.nav} ${styles.scope}`}>
          {scopeItems.map((d) => (
            <button key={d.id} type="button" className={styles.scopeItem} data-active={dept === d.id ? "true" : undefined} onClick={() => ctx.setDept(d.id)}>
              <span>{d.name}</span>
              <span className={styles.navCount}>{fmt(d.people)}</span>
            </button>
          ))}
        </div>

        <div className={styles.user}>
          <span className={styles.userAvatar}>{persona.who.ini}</span>
          <span className={styles.userText}>
            <span className={styles.userName}>{persona.who.name}</span>
            <span className={styles.userLine}>{persona.who.line}</span>
          </span>
        </div>
      </aside>

      <div className={styles.main}>
        <TopBar />
        <main className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>

      {/* click anywhere else closes search / decisions / user menu */}
      {pop && <div className={styles.backdrop} onClick={() => setPop(null)} />}
      {sheet && <InputSheet />}
      {toast && <div className={styles.toast} role="status">{toast}</div>}
      {menu && <div className={styles.scrim} onClick={() => setMenu(false)} />}
      <DevPanel />
    </div>
  );
}
