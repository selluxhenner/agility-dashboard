// STEP 2 of login: company-branded login. Visual only: the form is a GET to /[company] (the role router).
import Link from "next/link";
import { AuthShell, AuthTitle, AuthFoot, AuthStats } from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { Divider } from "@/components/ui/Divider";
import { findTenant } from "@/features/tenant";
import styles from "@/components/auth/forms.module.css";

type Props = { params: Promise<{ company: string }> };

export async function generateMetadata({ params }: Props) {
  const tenant = await findTenant((await params).company);
  return { title: `Log in to ${tenant?.name ?? "your company"}` };
}

export default async function CompanyLoginPage({ params }: Props) {
  const { company } = await params;
  const tenant = (await findTenant(company))!; // layout already 404s on unknown slugs
  const short = tenant.name.split(" ")[0];
  const demoUser = tenant.users.find((u) => u.role === "leader") ?? tenant.users[0];

  return (
    <AuthShell
      side={
        <>
          <p className="nh-eyebrow">This week at {short}</p>
          <AuthStats items={[["38 h", "median to first answer"], ["81 %", "within the 14-day promise"], ["6", "decisions waiting"]]} />
          <p>Empty inbox by end of day is the whole ritual.</p>
        </>
      }
    >
      <div className={styles.company}>
        <span className={styles.mark} aria-hidden="true">{tenant.mark}</span>
        <div>
          <p className="nh-eyebrow">Step 2 of 2</p>
          <strong>{tenant.name}</strong>
        </div>
        <Link className={styles.switch} href="/login">Not your company?</Link>
      </div>

      <AuthTitle title="Welcome back" sub={`Log in with your ${short} account.`} />

      <form className={styles.form} action={`/${tenant.slug}`} method="get" autoComplete="off">
        <Field id="email" label="Email">
          <input className="nh-input" id="email" type="email" placeholder={`you@${demoUser.email.split("@")[1]}`} defaultValue={demoUser.email} autoComplete="username" />
        </Field>
        <Field id="password" label="Password" labelRight={<Link className="nh-hint" href="/forgot-password">Forgot?</Link>}>
          <div className="nh-input-wrap">
            <input className="nh-input" id="password" type="password" placeholder="••••••••" defaultValue="demo-demo" autoComplete="current-password" />
            <span className="nh-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
            </span>
          </div>
        </Field>
        <label className="nh-check"><input type="checkbox" defaultChecked /> Keep me logged in on this device</label>

        <button className="nh-btn nh-btn-primary nh-btn-block" type="submit">Log in</button>

        <Divider />
        <button className="nh-btn nh-btn-ghost nh-btn-block" type="button">
          <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true"><rect x="1" y="1" width="10" height="10" fill="#f35325" /><rect x="12" y="1" width="10" height="10" fill="#81bc06" /><rect x="1" y="12" width="10" height="10" fill="#05a6f0" /><rect x="12" y="12" width="10" height="10" fill="#ffba08" /></svg>
          Continue with Microsoft
        </button>
      </form>

      <AuthFoot>No account at {short} yet? Ask your team leader for an invite.</AuthFoot>
    </AuthShell>
  );
}
