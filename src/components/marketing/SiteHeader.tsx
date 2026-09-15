import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/config/site";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.nav}>
      <Link className={styles.logo} href="/" aria-label={`${SITE.name} home`}>
        <Image src="/brand/logo.png" alt="" width={28} height={28} />
        <span>{SITE.name}</span>
      </Link>
      <nav className={styles.links} aria-label="Site">
        <Link href="/#how">How it works</Link>
        <Link href="/#roles">Roles</Link>
        <Link href="/pricing">Pricing</Link>
      </nav>
      <div className={styles.actions}>
        <Button href="/login" variant="ghost" size="sm">Log in</Button>
        <Button href="/contact" size="sm">Book a pilot</Button>
      </div>
    </header>
  );
}
