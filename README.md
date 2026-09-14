# NextHub Dashboard (demo)

Demo page for the innovation & agility dashboard. Static — no build step.

```
index.html          page markup (design-component template) + editable props
css/dashboard.css   page-level styles
js/data.js          seed data (departments, problems, ideas, cases, routing table, …)
js/store.js         event log (localStorage) + reducer: seed + events → page state
js/dashboard.js     component logic (state, view models for the template, this.act.*)
support.js          dc-runtime (generated, do not edit) — renders the template
docs/               plans (ACTIONS_PLAN.md: how the buttons come alive)
.github/ci/         CI scripts: browser smoke test, reducer unit tests
```

## Roles

Three roles, three home screens (see `../PRODUCT_CONCEPT_ORG_OS.md` §8). Switch
between them with the **Dev** button, bottom left.

| Role | Home | What it is for |
|---|---|---|
| Employee (J. Schmidt, posts as Anonymous #4471) | **My cases** | what happened to what I sent; one field to raise a problem — the routing table *proposes* an owner, deputy and buddy |
| Team leader (T. Vogel, Production) | **Inbox** | open items addressed to me, sorted by age, one action each: yes / no / hand over / ask one question; plus what my team is waiting on elsewhere |
| Manager (B. Hartmann, Betriebsleitung) | **Overview** | decisions waiting, the wait ledger (median to first answer, % within the 14-day promise), where the waiting goes (four stall reasons), movement since baseline |

Problems, Ideas, Collaboration and Progress are shared views; the top bar
(search, the "waiting" button, the user menu) adapts to the role.

Below 760px the rail becomes a drawer behind the ☰ button, popovers pin to
the top of the screen and side panels stack — the rules live at the bottom
of `css/dashboard.css` (class hooks `nh-*` in `index.html`).

## Data — seed in `js/data.js`, events in `js/store.js`

Every number on the page is counted from rows. The rows come from two places:

- **Seed** — the arrays in `js/data.js`. Never change at runtime.
- **Events** — what happens in the browser: a case raised, a yes, a hand-over,
  a co-sign. Each button appends one event to a log in `localStorage`
  (`nexthub.demo.v2`). Nothing mutates the seed.

The page renders `NHStore.reduce(seed, log)`: cases, ideas and problems with
their *current* status, assignee, clock and history. Reset demo state = clear
the log. Event types and payloads are listed at the top of `js/store.js`; the
plan behind it is `docs/ACTIONS_PLAN.md`.

**A case is one object, seen from three sides.** The employee sees the cases
they raised (`from` = their handle), a team leader sees the open ones addressed
to them right now (`assignee`), the manager sees all. `raisedDay` is relative
to demo day 0 (today); age and the promise clock are derived. Seed rows may
carry `seedEvents` — history that already happened, applied by the same reducer
as live actions (that is how the employee's shipped and in-build cases exist).

UI code changes state only through `this.act.*` in `js/dashboard.js`
(`raise`, `decide`, `hand`, `ask`, `answer`, `cosign`, `approve`, `fund`,
`advanceDay`, …). Actions that need input — a reason, a line of text, people —
go through one **input sheet**: `this.openSheet(kind, id)` opens it,
`sheetVals()` decides what it shows and what confirming does, the markup lives
once in `index.html` (`.nh-sheet`, a bottom sheet on phones).

Add a row to the seed and the counts follow:

| Add a … | to | link it via |
|---|---|---|
| problem | `PROBLEMS` | `ideas: ['i9']` (ideas that answer it), `signals[].by` = `'Name · Department'` |
| idea | `IDEAS` | `problem: 'p3'`, `status` (Awaiting decision · In trial · Building · Shipped · Unfunded), `team: ['—']` = no owner |
| cross-team project | `INITIATIVES` | `members[].name` — shipped ones give those people credit |
| case (anyone's inbox / my cases) | `CASES` | `routeId` → `ROUTES`; `assignee` = whose inbox; `from` = whose "my cases"; `seedEvents` for history |
| routing row | `ROUTES` | `keys` are the words the intake field matches on |
| department | `DEPTS` | `id` is what problems/initiatives reference |

Figures with no underlying rows (medians, € values, survey coverage,
baseline "was …" values) live in `METRICS` at the bottom of the file — one
place to edit, and they all read "measured in pilot" when demo data is off.

Everything done in the browser survives a reload (it is the event log).
**Copy for data.js** in the dev panel exports the cases raised this session as
`CASES` rows, history included, to paste into the file.

Tests (all run in CI): `node .github/ci/store.test.cjs` (reducer, no browser);
with the page served on :8765, `node .github/ci/smoke.cjs` (renders, roles,
mobile) and `node .github/ci/flow.test.cjs` (the whole inbox loop through the
real UI — needs `npm i playwright` on `NODE_PATH`).

## Dev panel

Fixed bottom-right; closes after any press. **Viewing as** switches the role; **Demo data** on/off
swaps every list for its empty state and every figure for "measured in pilot"
— the honest day-one install. State you create in the session (a case you
sent, an inbox item you answered) survives the toggle; **Reset demo state**
clears it. `defaultRole` and `demoData` are also editable props.

## Run

Serve the folder over HTTP (the runtime re-fetches the page, which `file://` blocks):

```bash
python -m http.server 8765
```

then open <http://localhost:8765/index.html> (or use the `dashboard` entry in `.claude/launch.json`). React is loaded from a CDN, so an
internet connection is required.

## How the pieces fit

`support.js` looks for `<x-dc>` in the page and renders its contents as a
template (`{{ … }}` bindings, `<sc-if>`, `<sc-for>`). The logic class is
picked up from `<script data-dc-script>` and evaluated with `DCLogic` in scope,
so `index.html` only contains the one-liner
`const Component = window.createDashboardComponent(DCLogic);` — the class
itself lives in `js/dashboard.js`, and the data it renders in `js/data.js`.
