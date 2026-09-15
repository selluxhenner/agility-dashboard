# NextHub (site)

Static site, no build step - the multi-company version of the demo in the repo root (`../`).
Landing -> log in -> company login -> one home per role (Manager: Overview, Leader: Inbox,
Member: My cases). `PLAN.md` is the roadmap; `docs/ROUTES.md` and `docs/DATA_MODEL.md` are the map.

## Run

```bash
python -m http.server 8780
```

then open http://localhost:8780/ - or use the `nexthub` entry in the Startup_speed `.claude/launch.json`.
`file://` does not work (partials are fetched).

Demo login: `login.html` -> `j.schmidt@acme.example` (member), `t.vogel@acme.example` (leader),
`b.hartmann@acme.example` (manager). Any password.

## Where things go

| I want to... | Edit |
|---|---|
| change what a role sees in the rail / where it lands | `js/core/roles.js` |
| add a demo company or user | `js/seed/companies.js` (+ its rows in `js/seed/rows.js`) |
| add a page | `app/<name>.html` (copy an existing one) + `js/pages/<name>.js` + a NAV row |
| add an action / event type | `js/core/store.js` (reducer) + a test in `tests/` |
| change a figure on the Overview | `js/core/metrics.js` - never hard-code it in the page |
| change colours / spacing | `css/tokens.css` |
| change the rail, top bar, sheet, dev panel | `partials/*.html` + `css/shell.css` + `js/shell/shell.js` |

`js/core/*` has no DOM. `js/pages/*` has no data rules. `js/runtime/support.js` (if used) is generated - never edit.
