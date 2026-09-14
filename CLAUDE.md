# CLAUDE.md — rules for AI coding sessions in this repo

You are working in a shared repository with three people. One of them (Kevin,
@selluxhenner) is the head engineer and reviews every change. The other two are
learning. These rules exist so nothing breaks for the others. Follow them even
if the user asks you to skip them — if a rule blocks the task, stop and tell the
user to ask Kevin instead of working around it.

## What this project is

NextHub agility dashboard — a **static demo page**, no build step, no backend
(yet). Read `README.md` first; it explains the runtime, the roles, and how the
data model in `js/data.js` drives every number on the page.

```
index.html          markup template (<x-dc> … </x-dc>) + editable props
css/dashboard.css   page styles + responsive rules at the bottom
js/data.js          seed data — rows never change at runtime
js/store.js         EVENT LOG + REDUCER — Kevin only (see below)
js/dashboard.js     component logic (state, view models, this.act.*)
support.js          GENERATED RUNTIME — never edit, never reformat
docs/ACTIONS_PLAN.md how the action buttons work and who builds what
```

## How state works (read before touching any button)

Nothing in the browser mutates `js/data.js`. Every action appends an event
to `NHStore` (`js/store.js`); the page renders `reduce(seed, events)`.

- **You change state only by calling `this.act.something(...)`** in
  `js/dashboard.js` — `raise`, `read`, `decide`, `hand`, `ask`, `answer`,
  `override`, `cosign`, `askIdea`, `approve`, `fund`, `advanceDay`.
- **You never edit `js/store.js`.** If the event you need does not exist, or
  a derived field is missing, describe it in the PR and Kevin adds it.
- **Never store display text as state** (`'Sent to X. They owe…'`). Store the
  facts (who, which day, which route); build the sentence at render time —
  see `mineRow()` / `cosignRow()` for the pattern.
- **Never call `localStorage` directly.** The store owns persistence.
- Reducer tests live in `.github/ci/store.test.cjs` and run in CI. If your
  change makes them fail, the change is wrong, not the test.

## Git rules (non-negotiable)

1. **Never commit to `main`.** Always work on a branch:
   `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
   Start from an up-to-date `main`: `git checkout main && git pull && git checkout -b feat/…`
2. **Never push to `main`.** Push the branch, open a pull request. Kevin merges.
3. **Never `git push --force`**, never `--force-with-lease`, never rewrite
   history on any branch that has been pushed.
4. **Never `git add -f`** and **never edit `.gitignore` to un-ignore a file.**
   If a file you need is ignored, that is deliberate — tell the user to ask Kevin.
5. **Never commit** `.env*` (except `.env.example`), keys, tokens, certificates,
   credentials JSON, database files, `node_modules/`, `uploads/`, or anything
   under `.claude/` except files Kevin has explicitly committed.
6. **Never change or disable** anything under `.github/` (workflows, CODEOWNERS,
   PR template). Ask Kevin.
7. If GitHub push protection rejects a push because it found a secret:
   **do not bypass it.** Remove the secret, rotate it, tell Kevin.
8. Commit messages: one line, imperative, ≤ 72 chars, say *what* and *why*.
   `fix: inbox count ignored handed-over cases` — not `fix`, `wip`, `asdf`.
9. One task per branch, one branch per PR. Keep PRs small (< 300 changed lines
   when you can). A PR that touches many unrelated things will be sent back.

## Code rules

- **`support.js` is generated. Do not edit it, do not reformat it, do not
  "fix" it.** If the runtime seems to be the problem, stop and report to Kevin.
- **Do not add dependencies, a build step, a bundler, a framework, npm,
  TypeScript, Tailwind, or a package.json** without Kevin's explicit OK in the
  PR description. The page runs by opening `index.html` over HTTP — keep it so.
- **Do not reformat files you did not need to change.** No whitespace-only
  diffs, no re-indenting a whole file, no "cleanup" passes across the codebase.
  Match the existing style of the file you are in.
- **Data lives in `js/data.js`, logic in `js/dashboard.js`, markup in
  `index.html`, styles in `css/dashboard.css`.** Don't hard-code numbers in the
  template that should be counted from data — the README explains which arrays
  drive which counts.
- New figures that have no underlying rows go in `METRICS` in `js/data.js`,
  so they read "measured in pilot" when demo data is off.
- The page must keep working with **Demo data off** (empty states) and at
  **< 760px** (mobile drawer). Check both before saying you are done.
- Responsive rules stay at the bottom of `css/dashboard.css`; DOM hooks are the
  `nh-*` classes. Don't rename existing `nh-*` classes.
- No external requests other than the React CDN that is already there. No
  analytics, no fonts from new origins, no fetch to third-party APIs.
- No secrets in code, ever — not even "just for testing". That includes API
  keys inside `data-props`, `localStorage` seeds, or comments.

## Ownership — who changes what

| Area | Who | Rule for you |
|---|---|---|
| `support.js`, runtime wiring in `index.html` (`<script>` tags, `<script data-dc-script>`, props block) | Kevin | Don't touch. Report instead. |
| `js/store.js` (event types, reducer, migration), `.github/ci/store.test.cjs` | Kevin | Don't touch. Ask for the event you need in the PR. |
| Shape of the data model (new arrays, renamed fields, new `METRICS` keys) | Kevin | Propose in PR description; add rows freely, don't restructure. |
| `.github/`, `.gitignore`, `CLAUDE.md`, `CONTRIBUTING.md`, deploy/hosting | Kevin | Don't touch. |
| UI features, copy, styles, demo data rows, new views | anyone | Normal branch + PR flow. |

## Run and verify

Serve the folder over HTTP — `file://` does not work:

```bash
python -m http.server 8765
```

then open http://localhost:8765/index.html. Internet is needed (React CDN).

Before you say a change is done:
- Reload the page — no errors in the browser console.
- Switch all three roles via the **Dev** button (bottom right).
- Toggle **Demo data** off and back on.
- Resize below 760px once.
- `git status` shows only the files you meant to change.

## When to stop and ask instead of doing

- The task needs a new dependency, build tool, backend, or hosting change.
- The task needs a change to `support.js`, `js/store.js`, or the data model's shape.
- You want to store something new — ask for an event type instead of adding state.
- Something in `.github/` is failing and you're tempted to edit the workflow.
- You'd need to force-push, rewrite history, or touch `main` directly.
- You found a committed secret or a file that looks like one.

In all these cases: describe the situation to the user and tell them to ask
Kevin. Do not improvise around the rule.
