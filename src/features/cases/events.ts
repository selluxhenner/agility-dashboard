// The event log. Append-only facts; the reducer turns seed + events into what the page shows.
// Port of legacy/demo/js/store.js - types first, reducer in reducer.ts.
// Never store display text as state: store who / which day / which route; build sentences at render.
export type CaseEventType =
  | "case.read"
  | "case.decided"
  | "case.handed"
  | "case.asked"
  | "case.answered"
  | "case.override"
  | "case.shipped"
  | "idea.cosigned"
  | "idea.approved"
  | "idea.funded";

export type CaseEvent = {
  id: string;
  day: number;
  ts: number;
  actor: string;
  type: CaseEventType;
  target: string;
  payload?: Record<string, unknown>;
};
