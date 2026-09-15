// The authenticated app chrome: rail (nav by role) + top bar + content. Ports the demo's
// nh-rail / nh-topbar; the input sheet and dev panel join in Phase 2.
import Image from "next/image";
import Link from "next/link";
import type { Role } from "@/config/roles";
import { navFor } from "@/config/nav";
import { SITE } from "@/config/site";
import type { Tenant } from "@/features/tenant";
import styles from "./AppShell.module.css";

type Props = { tenant: Tenant; role: Role; children: React.ReactNode };

export function AppShell({ tenant, role, children }: Props) {
  const user = tenant.users.find((u) => u.role === role) ?? tenant.users[0];
  return (
    <div className={styles.root}>
      <aside className={styles.rail} aria-label="Main">
        <Link className={styles.logo} href={`/${tenant.slug}`}>
          <Image src="/brand/logo.png" alt="" width={24} height={24} />
          <span>{SITE.name}</span>
        </Link>
        <p className={`${styles.tenant} nh-eyebrow`}>{tenant.name}</p>
        <nav className={styles.nav}>
          {navFor(role).map((n) => (
            <Link key={n.href} href={`/${tenant.slug}${n.href}`}>{n.label}</Link>
          ))}
        </nav>
        <div className={styles.user}>
          <strong>{user.name}</strong>
          <span>{role} · {user.dept}</span>
          <Link href="/login">Log out</Link>
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <input className={`nh-input ${styles.search}`} type="search" placeholder="Search problems, ideas, people" aria-label="Search" />
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
