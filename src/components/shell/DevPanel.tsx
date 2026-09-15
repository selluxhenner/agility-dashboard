"use client";
// Dev panel (bottom-right): switch the role, view the inbox as another desk holder, advance the
// demo clock, demo data on/off, export session cases, reset. Development only - it never ships
// to a pilot; sessions replace it in Phase 2.
import { useDemo } from "@/components/dashboard/DemoProvider";
import { deskFor, deskHolders } from "@/features/cases/selectors";
import styles from "./DevPanel.module.css";

export function DevPanel() {
  const ctx = useDemo();
  const { seed, S, role, persona, demo, dev, setDev, leadAs } = ctx;
  const isLead = role === "leader";
  const day = S.day;
  const dayLabel = day === 0 ? "Today" : "Today + " + day + (day === 1 ? " day" : " days");
  const dayNote = day === 0 ? "clocks run from the real date" : "every open clock moved " + day + (day === 1 ? " day" : " days") + " — past the promise, cases escalate";
  const newCount = S.cases.filter((c) => !c.seed).length;
  const status = (isLead && leadAs ? persona.who.name : persona.role.label) + " · demo " + (demo ? "on" : "off") + (day ? " · +" + day + " d" : "");

  return (
    <div className={styles.dev}>
      {dev && (
        <div className={styles.panel}>
          <div className={styles.label}>Viewing as</div>
          <div className={styles.roles}>
            {seed.personas.map((r) => (
              <button key={r.id} type="button" className={styles.role} data-on={role === r.id ? "true" : undefined} onClick={() => ctx.setRole(r.id)}>{r.label}</button>
            ))}
          </div>

          {isLead && (
            <>
              <div className={styles.subLabel}>Inbox of</div>
              <div className={styles.personas}>
                {deskHolders(S, seed.routes).map((n) => {
                  const on = persona.who.name === n, count = deskFor(S, n).length;
                  return (
                    <button key={n} type="button" className={styles.persona} data-on={on ? "true" : undefined} onClick={() => ctx.setLeadAs(n)}>
                      {n}{count ? <span className={styles.personaCount}>{count}</span> : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button type="button" className={styles.day} onClick={() => { ctx.act.advanceDay(1); ctx.showToast("One day later. " + (day + 1) + (day + 1 === 1 ? " day" : " days") + " into the demo — watch the clocks."); }}>
            <span className={styles.rowText}><span className={styles.rowTitle}>{dayLabel}</span><span className={styles.rowNote}>{dayNote}</span></span>
            <span className={styles.plusDay}>+1 day</span>
          </button>

          <button type="button" className={styles.rowBtn} onClick={ctx.toggleDemo}>
            <span className={styles.rowText}><span className={styles.rowTitle}>{demo ? "Demo data on" : "Demo data off"}</span><span className={styles.rowNote}>off = empty install, nothing measured yet</span></span>
            <span className={styles.track} data-on={demo ? "true" : undefined}><span className={styles.knob} /></span>
          </button>

          <button type="button" className={styles.rowBtn} onClick={ctx.copySnippet}>
            <span className={styles.rowText}><span className={styles.rowTitle}>Copy for seed.ts</span><span className={styles.rowNote}>{newCount ? newCount + (newCount === 1 ? " new case this session" : " new cases this session") : "nothing new this session"} · pastes into CASES</span></span>
            <span className={styles.copyIcon}>⧉</span>
          </button>

          <div className={styles.foot}>
            <button type="button" className={styles.reset} onClick={ctx.resetDemo}>Reset demo state</button>
            <span className={styles.keys}>⌘K search · Esc</span>
          </div>
        </div>
      )}
      <button type="button" className={styles.toggle} data-on={dev ? "true" : undefined} onClick={() => { setDev(!dev); ctx.setPop(null); }} title={status}>
        <span className={styles.toggleDot} />Dev
      </button>
    </div>
  );
}
