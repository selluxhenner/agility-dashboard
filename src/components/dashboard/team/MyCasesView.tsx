"use client";
// TEAM MEMBER home: what happened to what I sent, plus one field to raise something - the
// routing table proposes owner, deputy and buddy; it never decides. Port of the MY IDEAS
// block in legacy/demo/index.html.
import { useState } from "react";
import { useDemo } from "@/components/dashboard/DemoProvider";
import { mineRows } from "@/components/dashboard/derive";
import { Avatar, Btn, Pill, statusTone } from "@/components/dashboard/shared/primitives";
import { ViewHead } from "@/components/dashboard/shared/ViewHead";
import { propose } from "@/features/routing";
import ui from "@/components/dashboard/shared/ui.module.css";
import styles from "./MyCasesView.module.css";

export function MyCasesView() {
  const ctx = useDemo();
  const { seed, S, D, demo, persona, act, openSheet, showToast, deptName, ready, f } = ctx;
  const [draft, setDraft] = useState("");
  if (!ready) return <div className={ui.loading} />;

  const who = persona.who, P = seed.promiseDays, O = seed.outcomeDays;
  const mine = mineRows(ctx);
  const proposal = propose(draft, seed.routes);
  const pr = proposal?.route ?? null;
  const canSend = draft.trim().length >= 8;
  const send = () => {
    if (!canSend) return;
    const owner = pr ? pr.owner.name : "Triage desk";
    const due = f(S.day + P);
    act.raise({ title: draft.trim(), body: "", routeId: pr ? pr.id : null, assignee: owner, fromDept: who.line, reason: pr ? "triage" : "not responsible" });
    setDraft("");
    showToast("Sent to " + owner + ". Answer owed by " + due + ".");
  };

  const promises = [
    { n: P + " d", label: "to a yes, a no or a question — from a named person, not a form" },
    { n: O + " d", label: "after launch, the outcome is measured and published back to you" },
    { n: "100%", label: "of shipped work names everyone who contributed, anonymous handles included" },
  ];
  const stats = [
    { v: String(mine.length), l: "problems and ideas you raised" },
    { v: String(mine.filter((m) => m.status === "Shipped").length), l: "shipped, credited to you" },
    { v: String(mine.filter((m) => m.status === "Building" || m.status === "In trial").length), l: "being built right now" },
    { v: demo ? seed.metrics.you.medianWait : "—", l: "your median wait for a reply" },
  ];

  return (
    <>
      <ViewHead view="mine" />
      <div className={ui.split}>
        <div className={`${ui.card} ${styles.cases}`}>
          {mine.length === 0 && (
            <div className={styles.emptyCase}>
              <div className={ui.emptyTitle}>You have not sent anything yet</div>
              <div className={ui.emptySub}>Describe what you need in the box on the right. It names the person who owns it and the date they owe you an answer — and it stays here until they do.</div>
            </div>
          )}
          {mine.map((m) => (
            <div key={m.kind + m.id} className={styles.caseItem}>
              <div className={ui.between}>
                <div className={styles.caseHead}>
                  <div className={styles.caseTitle}>{m.title}</div>
                  <div className={styles.submitted}>{m.submitted}</div>
                </div>
                <Pill tone={statusTone(m.status)}>{m.status}</Pill>
              </div>

              <div className={styles.steps}>
                {m.steps.map((s) => (
                  <div key={s.label} className={styles.step}>
                    <div className={styles.stepBar} data-tone={s.tone} />
                    <div className={styles.stepLabel} data-tone={s.tone}>{s.label}</div>
                    <div className={styles.stepWhen}>{s.when}</div>
                  </div>
                ))}
              </div>

              <div className={styles.clock} data-overdue={m.overdue ? "true" : undefined}>{m.clock}</div>

              <div className={styles.reply}>
                <div className={styles.replyText}>{m.reply}</div>
                <div className={styles.replyBy}>{m.replyBy}</div>
              </div>
              {m.canReply && (
                <div className={`${ui.btnRow} ${ui.mt}`}>
                  <Btn kind="accent" onClick={() => openSheet("reply", m.id)}>Answer {m.replyTo}</Btn>
                </div>
              )}

              <div className={styles.outcome}>
                <span className={ui.eyebrow}>Outcome</span>
                <span className={styles.outcomeV}>{m.outcome}</span>
                <span className={ui.small}>{m.outcomeNote}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`${ui.sticky} ${ui.stack}`}>
          <div className={ui.cardDark}>
            <div className={ui.h}>Raise a problem</div>
            <div className={`${ui.sub} ${styles.intakeSub}`}>One field. Say what is broken or what you need — it names who owns it and the date they owe you an answer.</div>
            <textarea className={styles.intake} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
              placeholder="e.g. We wait days for a €300 part on night shift because nobody there can sign the order" />

            {pr && proposal && (
              <div className={styles.proposal}>
                <div className={ui.head}>
                  <span className={ui.eyebrow}>Proposed owner</span>
                  <span className={styles.conf} data-ok={proposal.confidence >= 78 ? "true" : undefined}>{proposal.confidence}% match</span>
                </div>
                <div className={styles.ownerRow}>
                  <Avatar name={pr.owner.name} tone="light" />
                  <span className={styles.ownerText}>
                    <span className={styles.ownerName}>{pr.owner.name}</span>
                    <span className={styles.ownerRole}>{pr.owner.role} · {deptName(pr.owner.dept)}</span>
                  </span>
                  <span className={styles.wait}>
                    <span className={styles.waitV}>{pr.wait}</span>
                    <span className={styles.waitL}>typical wait</span>
                  </span>
                </div>
                <div className={styles.matched}>Matched row: <span className={styles.matchedRow}>{pr.type}</span> · deputy {pr.deputy} · your buddy there: {pr.buddy}</div>
                <button type="button" className={styles.wrong} onClick={() => showToast("Noted — a human routes it instead, and the override is logged against the map.")}>Not the right owner?</button>
              </div>
            )}
            {proposal && !pr && <div className={styles.noMatch}>No row in the map matches yet — a human routes it within a day and the gap is added to the map.</div>}

            <div className={`${ui.btnRow} ${ui.mt}`}>
              <button type="button" className={styles.send} data-ready={canSend ? "true" : undefined} onClick={send} disabled={!canSend}>
                {pr ? "Send to " + pr.owner.name : "Send — a human will route it"}
              </button>
            </div>

            <div className={styles.promises}>
              {promises.map((p) => (
                <div key={p.n} className={styles.promise}>
                  <span className={styles.promiseN}>{p.n}</span>
                  <span className={styles.promiseL}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={ui.card}>
            <div className={ui.eyebrow}>Your buddies</div>
            <div className={`${ui.small} ${styles.buddiesSub}`}>Someone at your level in the next department you can ask directly, without going up the tree first.</div>
            <div className={`${ui.list} ${ui.mt8}`}>
              {D.buddies.map((b) => (
                <div key={b.name} className={ui.personRow} data-click="true" onClick={() => showToast("Opens a direct line to " + b.name + " (" + b.dept + ") — sideways, not up the tree.")}>
                  <span className={ui.avatar}>{b.ini}</span>
                  <div className={ui.rowBody}>
                    <div className={styles.buddyName}>{b.name} <span className={styles.buddyDept}>· {b.dept}</span></div>
                    <div className={styles.buddyNote}>{b.note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <div className={ui.eyebrow}>Your contribution</div>
              <div className={`${ui.grid2} ${styles.statsGrid}`}>
                {stats.map((k) => (
                  <div key={k.l} className={ui.tile}>
                    <div className={ui.statV}>{k.v}</div>
                    <div className={ui.tileL}>{k.l}</div>
                  </div>
                ))}
              </div>
              <div className={`${ui.note} ${ui.mt}`}>You post as <span className={styles.handle}>{who.handle ?? who.name}</span>. The handle stays yours, so credit still follows you.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
