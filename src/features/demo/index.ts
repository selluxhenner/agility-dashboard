// The demo seed, scoped by company. Only `acme` has rows today; any other tenant is an empty
// install. Swap the body for a database query later - callers do not change.
import { SEED } from "./seed";
import type { Seed } from "./types";

export const EMPTY_SEED: Seed = {
  ...SEED, depts: [], people: [], problems: [], ideas: [], initiatives: [], outcomes: [], cases: [], waitingOn: [], stall: [],
};

export function seedFor(slug: string): Seed {
  return slug === "acme" ? SEED : EMPTY_SEED;
}

export type { Seed } from "./types";
