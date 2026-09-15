// LANDING. Hero with the 19-vs-3-days clock, the one metric, how it works, why things stall,
// a card per role, what a pilot needs (nothing), CTA band, who is behind it.
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LEGAL, SITE } from "@/config/site";
import styles from "./page.module.css";

const STEPS = [
  { n: "01", title: "Raise it in one field", body: "Describe what you need. The routing table names the owner, a deputy, and the typical wait - before you hit send." },
  { n: "02", title: "It lands with a clock", body: "The owner sees an inbox sorted by age. One action each: yes, no and why, hand over to a name, or ask one question." },
  { n: "03", title: "Waiting becomes visible", body: `Management sees the wait ledger: median time to first answer, share within the ${SITE.promiseDays}-day promise, and where the waiting goes.` },
];

// The four ways a case dies, as written on the board in the first workshop - and what closes each one.
const STALLS = [
  { said: "not responsible", is: "Ownership gap. The map has no entry, so nobody owns it.", fix: "Every decision type has one owning role and one named deputy. Fifteen rows, filled in once." },
  { said: "wrong department", is: "Routing error. It went to the wrong desk and sat there.", fix: "The owner is proposed before you hit send. Wrong desk? Hand over to a name in one click - the clock keeps running." },
  { said: "no time", is: "Queue overflow. Read, meant to answer, never did.", fix: "An inbox sorted by age, and a median that management sees. Empty by end of day becomes the ritual." },
  { said: "is it important?", is: "Triage. The receiver cannot rank it against their own work.", fix: "Ask one question back instead of guessing. The wait is labelled, not hidden." },
];

const ROLES = [
  { eyebrow: "Team member", title: "My cases", body: "What happened to what I sent. One field to raise the next one - anonymously if the company allows it.",
    rows: [["", "Sent 3 days ago · read by T. Vogel"], ["", "Answered: yes · in build"], ["", "Shipped · 20 min saved per changeover"]] },
  { eyebrow: "Team leader", title: "Inbox", body: "Open items addressed to me, oldest first. Empty by end of day is the whole ritual.",
    rows: [["11d", "Changeover sheet duplicates MES"], ["4d", "Second forklift on late shift"], ["1d", "Move QA sign-off to line"]], age: true },
  { eyebrow: "Manager", title: "Overview", body: "Decisions waiting, the wait ledger, and the four reasons things stall.",
    rows: [["38 h", "median to first answer"], ["81 %", `within the ${SITE.promiseDays}-day promise`], ["6", "decisions waiting on you"]] },
];

const PILOT_FACTS: [string, string][] = [
  ["0", "integrations"],
  ["0", "per-person metrics"],
  ["1", "field to raise a case"],
  ["5", "working days"],
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
        <p className={`${styles.ctaNote} nh-mono`}>Free pilot · five working days · nothing to integrate</p>

        <div className={styles.clock} role="figure" aria-label="One decision, nineteen working days: three of work, sixteen of waiting, eleven of them on two people">
          <div className={styles.clockRow}>
            <div className={styles.clockLabel}>One decision, today <span>request to first human response</span></div>
            <div className={styles.bar}><div className={styles.barFill} style={{ width: "100%" }} /></div>
            <div className={`${styles.clockVal} nh-mono`}>19 days</div>
          </div>
          <div className={styles.clockRow}>
            <div className={styles.clockLabel}>Of which actual work</div>
            <div className={styles.bar}><div className={`${styles.barFill} ${styles.barAccent}`} style={{ width: "16%" }} /></div>
            <div className={`${styles.clockVal} nh-mono`}>3 days</div>
          </div>
          <div className={styles.clockRow}>
            <div className={styles.clockLabel}>Of which waiting on two people</div>
            <div className={styles.bar}><div className={`${styles.barFill} ${styles.barMute}`} style={{ width: "58%" }} /></div>
            <div className={`${styles.clockVal} nh-mono`}>11 days</div>
          </div>
          <p className={styles.clockNote}>Nineteen working days. Three of them are work. The rest is waiting for someone to say yes, no, or &ldquo;not me&rdquo; - and most of that wait sits on two desks.</p>
        </div>
      </section>

      <section className={styles.metric} id="metric">
        <div className={styles.metricInner}>
          <div>
            <p className="nh-eyebrow">The only number that matters</p>
            <div className={styles.metricBig}><span className="nh-mono">Median hours</span> from request to first human response</div>
            <p className={styles.metricSub}>One metric, visible from day one, in the same currency your people already feel. Everything else is a dashboard.</p>
          </div>
          <blockquote className={styles.thesis}>
            <p>Startups are not faster because they work faster.<br />They are faster because they wait less.</p>
          </blockquote>
        </div>
      </section>

      <section className={styles.section} id="how">
        <p className="nh-eyebrow">How it works</p>
        <h2>Three moves. No new meetings.</h2>
        <ol className={styles.steps}>
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className={`${styles.stepN} nh-mono`}>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} id="why">
        <p className="nh-eyebrow">Why things stall</p>
        <h2>A case dies in one of four ways.</h2>
        <p className={styles.sectionLead}>We asked leaders to write down why a request that reached them never got an answer. Every reason was one of these four. Each one has a specific fix - none of them is &ldquo;another meeting&rdquo;.</p>
        <ul className={styles.stalls}>
          {STALLS.map((s) => (
            <li key={s.said}>
              <p className={`${styles.stallSaid} nh-mono`}>&ldquo;{s.said}&rdquo;</p>
              <p className={styles.stallIs}>{s.is}</p>
              <p className={styles.stallFix}><span className="nh-eyebrow">With {SITE.name}</span>{s.fix}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} id="roles">
        <p className="nh-eyebrow">One case, seen from three sides</p>
        <h2>A home screen per role.</h2>
        <div className={styles.roles}>
          {ROLES.map((r) => (
            <article className={styles.role} key={r.title}>
              <p className="nh-eyebrow">{r.eyebrow}</p>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
              <ul className={styles.roleList}>
                {r.rows.map(([k, v]) => (
                  <li key={v}>{k && <span className={`nh-mono ${r.age ? styles.age : ""}`}>{k}</span>}{v}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="pilot">
        <div className={styles.trust}>
          <div className={styles.trustText}>
            <p className="nh-eyebrow">What a pilot needs from you</p>
            <h2>Nothing to connect. Nothing to monitor.</h2>
            <p>
              No SSO, no mailbox access, no read access to your systems. One department, one decision type, one field.
              {SITE.name} measures how long <em>cases</em> wait - never how individuals perform. There is no per-person
              metric in the data model, which is also why there is nothing for a works council to co-determine.
            </p>
            <p>
              Anonymous raising is a per-company switch. Every case, event and number can be exported or deleted on request.
              Data stays in the EU. <Link href="/privacy" className={styles.inlineLink}>Read the privacy policy</Link>.
            </p>
          </div>
          <dl className={styles.facts}>
            {PILOT_FACTS.map(([n, l]) => (
              <div key={l}>
                <dt className="nh-mono">{n}</dt>
                <dd>{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={styles.band}>
        <div>
          <h2>Fifteen rows, filled in once.</h2>
          <p>Not an org chart everyone maintains. A map of decision types: each with one owning role and one named deputy. A department head fills it in twenty minutes.</p>
        </div>
        <Button href="/contact" variant="accent">Book a pilot</Button>
      </section>

      <section className={`${styles.section} ${styles.about}`} id="about">
        <div>
          <p className="nh-eyebrow">Who is behind this</p>
          <h2>Built in Berlin, at CODE.</h2>
        </div>
        <div className={styles.aboutBody}>
          <p>
            {SITE.name} is built by <strong>{LEGAL.operator}</strong> and a small team at{" "}
            <strong>{LEGAL.org}</strong> in Berlin. The idea came out of talking to companies that used to be faster:
            not one of them had a shortage of ideas. They had a shortage of answers. First pilots run in November 2026.
          </p>
          <p>
            If your company has one decision that always takes weeks, we would like to time it with you.{" "}
            <Link href="/contact" className={styles.inlineLink}>Book a pilot</Link> or write to{" "}
            <a href={`mailto:${LEGAL.email}`} className={styles.inlineLink}>{LEGAL.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
