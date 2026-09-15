"use client";
// One case, seen from three sides: its history as a timeline built from the event log.
// Visible to whoever raised it, whoever it is addressed to, and managers (docs/ROUTES.md).
import Link from "next/link";
import { useDemo } from "@/components/dashboard/DemoProvider";
import { Avatar, Empty, Pill, reasonTone, statusTone } from "@/components/dashboard/shared/primitives";
import type { CaseEvent } from "@/features/cases/events";
import { onDesk } from "@/features/cases/selectors";
import ui from "@/components/dashboard/shared/ui.module.css";
import styles from "./CaseDetailView.module.css";

const STATUS_LABEL = { open: "Sent", asked: "Question for you", decided: "Decided", building: "Building", shipped: "Shipped" } as const;

// Facts in, one sentence out - nothing here is stored.
function sentence(e: CaseEvent): string {
  const p = e.payload;
  switch (e.type) {
    case "case.raised": return e.actor + " raised this";
    case "case.read": return e.actor + " read it";
    case "case.decided": return e.actor + " answered “" + (p.answer ?? "yes") + "”" + (p.reason ? " — " + p.reason : "") + (p.note ? ": “" + p.note + "”" : "");
    case "case.handed": return e.actor + " handed it to " + p.to + (p.why ? " — “" + p.why + "”" : "");
    case "case.asked": return e.actor + " asked: “" + (p.text || "One question.") + "” · clock paused";
    case "case.answered": return e.actor + " answered: “" + p.text + "” · clock running again";
    case "case.building": return e.actor + " started the build" + (p.expected ? " — expected " + p.expected : "") + (p.days ? ", " + p.days + " days" : "");
    case "case.shipped": return e.actor + " shipped it — " + p.outcome + (p.outcomeNote ? " (" + p.outcomeNote + ")" : "");
    case "case.override": return e.actor + " overruled the proposed route";
    default: return e.actor + " · " + e.type;
  }
}

export function CaseDetailView({ caseId }: { caseId: string }) {
  const ctx = useDemo();
  const { S, role, persona, href, ready, f } = ctx;
  if (!ready) return <div className={ui.loading} />;
  const c = S.cases.find((x) => x.id === caseId);
  const who = persona.who;
  const mayOpen = !!c && (role === "manager" || c.from === who.handle || c.from === who.name || onDesk(c, who.name));
  if (!c || !mayOpen) {
    return (
      <div className={ui.card}>
        <Empty title={c ? "Not addressed to you" : "No such case"} sub={c ? "A case is visible to whoever raised it, whoever it is addressed to, and managers." : "Nothing with the id “" + caseId + "” exists for this company."}>
          <Link href={href("/")} className={ui.ghost}>Back home</Link>
        </Empty>
      </div>
    );
  }
  const P = ctx.seed.promiseDays;
  const clock = c.status === "asked" ? "clock paused at " + c.clock + " d"
    : c.open ? (c.overdue ? c.clock - P + " d past the promise" : P - c.clock + " d left on the promise") : "answered in " + c.clock + " d";

  return (
    <div className={ui.split}>
      <div className={ui.card}>
        <div className={ui.eyebrow}>Case {c.id}</div>
        <div className={ui.h2}>{c.title}</div>
        <div className={`${ui.chips} ${styles.meta}`}>
          <Pill tone={statusTone(STATUS_LABEL[c.status])}>{STATUS_LABEL[c.status]}</Pill>
          <Pill tone={reasonTone(c.reason)}>{c.reason}</Pill>
          <span className={ui.small}>raised {f(c.raisedDay)} · {clock}</span>
        </div>
        <div className={`${ui.quote} ${ui.mt14}`}>
          <div className={ui.quoteText}>{c.body || "—"}</div>
          <div className={ui.quoteBy}><Avatar name={c.from} size="sm" /> {c.from} · {c.fromDept}</div>
        </div>
        <div className={`${ui.grid2} ${ui.mt14}`}>
          <div className={ui.tile}><div className={ui.tileTitle}>{c.assignee}</div><div className={ui.tileL}>on whose desk it is{c.escalated ? " · also " + c.escalated.to : ""}</div></div>
          <div className={ui.tile}><div className={ui.tileTitle}>{c.route ? c.route.type : "no matching route"}</div><div className={ui.tileL}>{c.route ? "deputy " + c.route.deputy + " · buddy " + c.route.buddy : "a human triages it"}</div></div>
        </div>
        <div className={`${ui.grid2} ${ui.mt8}`}>
          <div className={ui.tile}><div className={ui.tileTitle}>{c.upside || "not estimated yet"}</div><div className={ui.tileL}>what it costs while it waits</div></div>
          <div className={ui.tile}><div className={ui.tileTitle}>{c.shipped ? c.shipped.outcome : c.building?.expected ? "expected " + c.building.expected : "pending"}</div><div className={ui.tileL}>outcome</div></div>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.eyebrow}>What happened</div>
        <ol className={styles.timeline}>
          {c.history.map((e) => (
            <li key={e.id} className={styles.event}>
              <span className={styles.dot} data-seed={e.seed ? "true" : undefined} />
              <div className={styles.eventBody}>
                <div className={styles.eventText}>{sentence(e)}</div>
                <div className={styles.eventWhen}>{f(e.day)}</div>
              </div>
            </li>
          ))}
          {c.escalated && (
            <li className={styles.event}>
              <span className={styles.dot} data-tone="accent" />
              <div className={styles.eventBody}>
                <div className={styles.eventText}>Past the {P}-day promise — the map moved it sideways to {c.escalated.to} as well</div>
                <div className={styles.eventWhen}>{f(c.escalated.day)}</div>
              </div>
            </li>
          )}
        </ol>
        <div className={`${ui.note} ${ui.mt}`}>Every line is one event in the log. Nothing on this page is stored as text — it is built from who did what on which day.</div>
      </div>
    </div>
  );
}
