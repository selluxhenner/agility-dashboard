// LANDING. Hero with the product shot, the 19-vs-3-days clock, the one metric, how it works, the three roles, closing line.
// Each section has its own measure - a narrow column for reading, a wide one for the role table.
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

const STEPS = [
  { title: "Raise it in one field", body: "Describe what you need. The routing table names the owner, a deputy, and the typical wait - before you hit send." },
  { title: "It lands with a clock", body: "The owner sees an inbox sorted by age. One action each: yes, no and why, hand over to a name, or ask one question." },
  { title: "Waiting becomes visible", body: "Management sees the wait ledger: median time to first answer, share within the 14-day promise, and where the waiting goes." },
];

const ROLES = [
  { who: "Team member", screen: "My cases", body: "What happened to what I sent. One field to raise the next one - anonymously if the company allows it.",
    shot: "/screenshots/team.png", alt: "My cases: each case shows sent, read, decided and shipped, next to the one field for raising a problem" },
  { who: "Team leader", screen: "Inbox", body: "Open items addressed to me, oldest first. Empty by end of day is the whole ritual.",
    shot: "/screenshots/leader.png", alt: "Inbox: open cases sorted by age, each with its deadline, next to the selected case" },
  { who: "Manager", screen: "Overview", body: "Decisions waiting, the wait ledger, and the four reasons things stall.",
    shot: "/screenshots/manager.png", alt: "Overview: decisions owed with their clocks, and the numbers that moved since the baseline" },
];

export default function LandingPage() {
  return (
    <>
      <section className={styles.hero}>
        <p className="nh-eyebrow">For companies that used to be faster</p>
        <h1>Who owns this decision?</h1>
        <p className={styles.lead}>
          An employee asks in one field. It lands in the right leader&rsquo;s inbox with a clock.
          The leader answers. Everyone can see what is waiting on whom - and for how long.
        </p>
        <div className={styles.cta}>
          <Button href="/contact">Book a pilot</Button>
          <Button href="/login" variant="ghost">Log in to your company</Button>
        </div>
      </section>

      <figure className={styles.product}>
        <div className={styles.frame}>
          <div className={styles.frameBar} aria-hidden="true">
            <span /><span /><span />
            <p className="nh-mono">acme.nexthub.app/overview</p>
          </div>
          <Image
            src="/screenshots/overview.png" width={2880} height={1800} preload
            sizes="(max-width: 1240px) 100vw, 1240px"
            alt="The manager overview: decisions waiting on you, the wait ledger, and where the waiting goes"
          />
        </div>
      </figure>

      <figure className={styles.clock} aria-label="Typical wait today versus the work inside it">
        <div className={styles.clockRow}>
          <div className={styles.clockLabel}>Today <span>request to first human response</span></div>
          <div className={styles.bar}><div className={styles.barFill} style={{ width: "100%" }} /></div>
          <div className={`${styles.clockVal} nh-mono`}>19 days</div>
        </div>
        <div className={styles.clockRow}>
          <div className={styles.clockLabel}>Of which actual work</div>
          <div className={styles.bar}><div className={`${styles.barFill} ${styles.barAccent}`} style={{ width: "16%" }} /></div>
          <div className={`${styles.clockVal} nh-mono`}>3 days</div>
        </div>
        <figcaption className={styles.clockNote}>
          Nineteen working days. Three of them are work. The rest is waiting for someone to say yes, no, or &ldquo;not me&rdquo;.
        </figcaption>
      </figure>

      <section className={styles.metric} id="metric">
        <div className={styles.metricInner}>
          <p className="nh-eyebrow">The only number that matters</p>
          <p className={styles.metricBig}><span className="nh-mono">Median hours</span> from request to first human response.</p>
          <p className={styles.metricSub}>One metric, visible from day one, in the same currency your people already feel. Everything else is a dashboard.</p>
        </div>
      </section>

      <section className={styles.how} id="how">
        <div className={styles.howHead}>
          <p className="nh-eyebrow">How it works</p>
          <h2>Three moves.<br />No new meetings.</h2>
        </div>
        <div className={styles.steps}>
          {STEPS.map((s) => (
            <div className={styles.step} key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.roles} id="roles">
        <p className="nh-eyebrow">One case, seen from three sides</p>
        <h2>A home screen per role.</h2>
        <div className={styles.roleTable}>
          {ROLES.map((r) => (
            <div className={styles.roleRow} key={r.screen}>
              <div className={styles.roleWho}>
                <span className="nh-eyebrow">{r.who}</span>
                <h3>{r.screen}</h3>
              </div>
              <p className={styles.roleBody}>{r.body}</p>
              <div className={styles.roleShot}>
                <Image src={r.shot} alt={r.alt} width={2348} height={1000} sizes="(max-width: 1240px) 100vw, 1130px" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.close}>
        <h2>Fifteen rows, filled in once.</h2>
        <p>Not an org chart everyone maintains. A map of decision types: each with one owning role and one named deputy. A department head fills it in twenty minutes.</p>
        <Button href="/contact" variant="accent">Book a pilot</Button>
      </section>
    </>
  );
}
