# NextHub Dashboard (demo)

Demo page for the innovation & agility dashboard. Static — no build step.

```
index.html          page markup (design-component template) + editable props
css/dashboard.css   page-level styles
js/data.js          demo data (departments, problems, ideas, cases, routing table, …)
js/dashboard.js     component logic (state, view models for the template)
support.js          dc-runtime (generated, do not edit) — renders the template
uploads/            reference material used while designing; not loaded by the page
.claude/launch.json dev-server config for the Claude Code browser pane
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

## Data — `js/data.js` is the store

Every number on the page is counted from the arrays in `js/data.js`: the
rail counts (problems, ideas, teams, people per department), "All N →"
links, decisions waiting, the funnel, "stuck the longest", the contributors
list, the inbox stats. Add a row and the counts follow:

| Add a … | to | link it via |
|---|---|---|
| problem | `PROBLEMS` | `ideas: ['i9']` (ideas that answer it), `signals[].by` = `'Name · Department'` |
| idea | `IDEAS` | `problem: 'p3'`, `status` (Awaiting decision · In trial · Building · Shipped · Unfunded), `team: ['—']` = no owner |
| cross-team project | `INITIATIVES` | `members[].name` — shipped ones give those people credit |
| case in the team leader's inbox | `CASES` | `routeId` → a row in `ROUTES` |
| routing row | `ROUTES` | `keys` are the words the intake field matches on |
| department | `DEPTS` | `id` is what problems/initiatives reference |

Figures with no underlying rows (medians, € values, survey coverage,
baseline "was …" values) live in `METRICS` at the bottom of the file — one
place to edit, and they all read "measured in pilot" when demo data is off.

Cases raised in the browser (employee intake) and inbox actions are kept in
`localStorage`, so they survive a reload. **Copy for data.js** in the dev
panel copies the raised cases as `MY_IDEAS` entries to paste into the file.

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
