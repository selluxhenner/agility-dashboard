// Public site chrome: header + footer, no auth.
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import styles from "./layout.module.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
