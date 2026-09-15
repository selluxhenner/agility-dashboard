// reduce(seed, events) -> current cases (status, assignee, clock, history).
// TODO Phase 2: port legacy/demo/js/store.js verbatim, with its tests (legacy .github/ci/store.test.cjs).
import type { CaseEvent } from "./events";

export type ReducedCase = { id: string; status: string; assignee: string; history: CaseEvent[] };

export function reduceCases(seed: readonly { id: string; assignee: string }[], events: readonly CaseEvent[]): ReducedCase[] {
  return seed.map((c) => ({
    id: c.id,
    status: "open",
    assignee: c.assignee,
    history: events.filter((e) => e.target === c.id),
  }));
}
