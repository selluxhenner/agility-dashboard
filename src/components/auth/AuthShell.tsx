// Two-column auth layout: dark side panel (brand + a message) and the centered card.
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/config/site";
import styles from "./AuthShell.module.css";

type Props = { side: React.ReactNode; children: React.ReactNode };

export function AuthShell({ side, children }: Props) {
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Link className={styles.logo} href="/" aria-label={`${SITE.name} home`}>
          <Image src="/brand/logo.png" alt="" width={28} height={28} />
          <span>{SITE.name}</span>
        </Link>
        <div className={styles.sideBody}>{side}</div>
        <p className={`${styles.sideFoot} nh-mono`}>Berlin · 2026</p>
      </aside>
      <main className={styles.main}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}

// Small building blocks pages compose inside the card.
export function AuthTitle({ step, title, sub }: { step?: string; title: string; sub?: string }) {
  return (
    <>
      {step && <p className="nh-eyebrow">{step}</p>}
      <h1 className={styles.title}>{title}</h1>
      {sub && <p className={styles.sub}>{sub}</p>}
    </>
  );
}

export function AuthFoot({ children }: { children: React.ReactNode }) {
  return <p className={styles.foot}>{children}</p>;
}

export function AuthStats({ items }: { items: [string, string][] }) {
  return (
    <div className={styles.stats}>
      {items.map(([v, l]) => (
        <div key={l}><span className="nh-mono">{v}</span><small>{l}</small></div>
      ))}
    </div>
  );
}
