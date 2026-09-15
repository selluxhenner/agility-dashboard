"use client";
// Collaboration across departments: one cluster per initiative, a line between every two
// people on it, plus the selected initiative and the full list. Port of the COLLABORATION
// block in legacy/demo/index.html.
import { useState } from "react";
import { useDemo } from "@/components/dashboard/DemoProvider";
import { Avatar, Empty, Pill, statusTone } from "@/components/dashboard/shared/primitives";
import { ViewHead } from "@/components/dashboard/shared/ViewHead";
import type { Initiative } from "@/features/demo/types";
import { hits, teamHay, tokens } from "@/features/search";
import { ini } from "@/lib/utils/format";
import ui from "@/components/dashboard/shared/ui.module.css";
import styles from "./CollaborationView.module.css";

const GCOLS = 4, GCELLW = 145, GCELLH = 230, GPADX = 20, GPADY = 60;
const clusterCenter = (idx: number) => ({ x: GPADX + (idx % GCOLS) * GCELLW + GCELLW / 2, y: GPADY + Math.floor(idx / GCOLS) * GCELLH + GCELLH / 2 });
const edgeLook = (status: Initiative["status"]) =>
  status === "Shipped" ? { stroke: "#141414", dash: "0" } : status === "Awaiting decision" ? { stroke: "#ff5a1f", dash: "0" } : status === "Proposed" ? { stroke: "#b9b9b4", dash: "7 7" } : { stroke: "#8c8c88", dash: "0" };

export function CollaborationView({ initialId }: { initialId?: string }) {
  const ctx = useDemo();
  const { seed, D, q, deptName, matches, ready } = ctx;
  const [tid, setTid] = useState<string | null>(initialId ?? null);
  if (!ready) return <div className={ui.loading} />;

  const toks = tokens(q);
  const active = D.initiatives.filter((t) => matches(t.depts) && (!toks.length || hits(teamHay(t, seed.depts), toks)));
  const st = D.initiatives.find((t) => t.id === tid) ?? D.initiatives[0] ?? null;

  return (
    <>
      <ViewHead view="network" />
      <div className={styles.split}>
        <div className={`${ui.card} ${styles.mapCard}`}>
          <div className={ui.h}>Who is connected with who, and for what</div>
          <div className={ui.sub}>One cluster per project. Every line joins two people who work on it together. Click a project, a person or a line.</div>

          <svg viewBox="0 0 620 520" className={styles.map}>
            {D.initiatives.map((t, idx) => {
              const c = clusterCenter(idx);
              const isActive = st?.id === t.id;
              const op = isActive ? 1 : matches(t.depts) ? 0.85 : 0.22;
              const look = edgeLook(t.status);
              const members = t.members.filter((m) => m.name !== "—");
              const count = members.length;
              const ringR = count <= 1 ? 0 : count <= 4 ? 30 : 38;
              const pts = members.map((m, i) => {
                const a = ((-90 + i * (360 / Math.max(count, 1))) * Math.PI) / 180;
                return { m, x: c.x + ringR * Math.cos(a), y: c.y + ringR * Math.sin(a) };
              });
              const edges: { d: string; k: string }[] = [];
              for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) edges.push({ k: a + "-" + b, d: "M " + pts[a].x + " " + pts[a].y + " L " + pts[b].x + " " + pts[b].y });
              return (
                <g key={t.id} className={styles.cluster} opacity={op} onClick={() => setTid(t.id)}>
                  <rect x={c.x - 62} y={c.y - 92} width={124} height={156} rx={14} fill={isActive ? "#fff" : "#faf9f7"} stroke={isActive ? "#141414" : "#eeede8"} strokeWidth={1.2} />
                  <text x={c.x} y={c.y - 74} textAnchor="middle" className={styles.clusterLabel}>{t.name}</text>
                  <text x={c.x} y={c.y + 68} textAnchor="middle" className={styles.clusterMeta}>{count ? count + (count === 1 ? " person" : " people") : "nobody assigned"}</text>
                  {edges.map((e) => <path key={e.k} d={e.d} fill="none" stroke={look.stroke} strokeWidth={1.6} strokeDasharray={look.dash} strokeLinecap="round" />)}
                  {!count ? (
                    <g>
                      <circle cx={c.x} cy={c.y} r={16} fill="#f4f3f0" stroke="#141414" strokeWidth={1.2} />
                      <text x={c.x} y={c.y} dy={4} textAnchor="middle" className={styles.nodeIni} fill="#a0a099">?</text>
                    </g>
                  ) : pts.map((p) => (
                    <g key={p.m.name + p.m.role}>
                      <circle cx={p.x} cy={p.y} r={15} fill={isActive ? "#141414" : "#fff"} stroke="#141414" strokeWidth={1.2} />
                      <text x={p.x} y={p.y} dy={4} textAnchor="middle" className={styles.nodeIni} fill={isActive ? "#fff" : "#141414"}>{ini(p.m.name)}</text>
                      <text x={p.x} y={p.y} dy={26} textAnchor="middle" className={styles.nodeTitle}>{p.m.name}</text>
                      <text x={p.x} y={p.y} dy={38} textAnchor="middle" className={styles.nodeMeta}>{p.m.role}</text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>

          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.swatch} /> shipped</span>
            <span className={styles.legendItem}><span className={styles.swatch} data-tone="running" /> running now</span>
            <span className={styles.legendItem}><span className={styles.swatch} data-tone="accent" /> waiting on a decision</span>
            <span className={styles.legendItem}><span className={styles.swatchDashed} /> proposed, nobody assigned</span>
          </div>
        </div>

        <div className={ui.stack14}>
          <div className={ui.card}>
            <div className={ui.eyebrow}>Selected initiative</div>
            <div className={ui.h2}>{st ? st.name : "No cross-team work yet"}</div>
            {st && (
              <div className={`${ui.chips} ${styles.selMeta}`}>
                <Pill tone={statusTone(st.status)}>{st.status}</Pill>
                <span className={ui.small}>{st.stage}</span>
              </div>
            )}
            <div className={`${ui.body} ${styles.why}`}>Started because: {st ? st.why : "the first case that needs two departments will appear here"}</div>
            <div className={`${ui.eyebrow} ${ui.mt20}`}>Departments joined up</div>
            <div className={styles.depts}>{(st?.depts ?? []).map((d) => <span key={d} className={ui.deptChip}>{deptName(d)}</span>)}</div>
            <div className={`${ui.eyebrow} ${ui.mt20}`}>People on it</div>
            <div className={styles.members}>
              {(st?.members ?? []).map((m) => (
                <div key={m.name + m.role} className={ui.personRow}>
                  <Avatar name={m.name} />
                  <span className={styles.memberName}>{m.name}</span>
                  <span className={styles.memberRole}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${ui.card} ${styles.allCard}`}>
            <div className={`${ui.h} ${styles.allTitle}`}>All cross-team work</div>
            {active.length === 0 && <Empty title="Nothing yet" sub="The first case that needs two departments draws the first cluster." />}
            <div className={`${ui.list} ${ui.mt8}`}>
              {active.map((t) => (
                <div key={t.id} className={ui.row} data-active={st?.id === t.id ? "true" : undefined} onClick={() => setTid(t.id)}>
                  <div className={ui.mark} />
                  <div className={ui.rowBody}>
                    <div className={styles.allRow}>
                      <span className={ui.tileTitle}>{t.name}</span>
                      <Pill tone={statusTone(t.status)}>{t.status}</Pill>
                    </div>
                    <div className={styles.allMeta}>{t.depts.map(deptName).join(" × ")} · {t.people ? t.people + " people" : "nobody assigned"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
