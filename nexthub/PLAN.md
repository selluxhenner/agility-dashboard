# NextHub - build plan

> **Decision 15 Sep 2026: we move to Next.js.** This folder lives inside the `agility-dashborad`
> repo (CI, CODEOWNERS and PR rules already configured there). The static HTML skeleton below is
> the first cut and becomes the Next.js app in place - see "Moving to Next.js" at the bottom.

The product: an employee raises a case in one field, it lands in the right leader's inbox with a
clock, the leader answers, the manager sees the wait ledger. Three roles, three home screens
(`../PRODUCT_CONCEPT_ORG_OS.md` section 8). The demo in `../` proves the inbox
loop for one company; this site adds everything around it: landing, login, company, roles.

Today this is HTML + CSS + plain JS globals, served with `python -m http.server`. Landing and
both login pages exist as static pages. The folders are cut the App Router way so the Next.js
scaffold (Phase 0b) takes them over one by one instead of a rewrite.

## The user journey

```
index.html                         LANDING (public)
  -> login.html                    step 1: work email or company slug -> finds the company
      -> app/login.html?company=acme   step 2: company-branded login (demo users from companies.js)
          -> app/index.html        role router: reads the session, redirects by role
              manager  -> app/manager.html   Overview   decisions waiting, wait ledger, stall reasons
              leader   -> app/leader.html    Inbox      open items by age; yes / no+why / hand over / ask
              member   -> app/team.html      My cases   raise one field; see what happened to mine
              shared      app/problems.html  ideas.html  collaboration.html  progress.html  case.html?id=
              admin       app/settings/index.html  members.html  routing.html   (manager only)
signup.html                        creates a company + its first manager -> app/login.html?company=<slug>
invite.html?token=                 joins an existing company with the role on the invite
```

Two logins are deliberate: the first only finds the tenant, the second authenticates inside it.
That is what gives each company its own branding now and its own SSO later.

"Company-specific" in a static site = `?company=<slug>` + `js/seed/companies.js`. The slug is
saved in the session so app pages do not need it in the URL. Seed rows and the event log are
both keyed by slug, so two demo companies never see each other's data.

## Folder map

```
index.html pricing.html contact.html            marketing (public)
login.html signup.html forgot-password.html invite.html   global auth (finds / creates a company)
app/                                            company-specific, needs a session
  login.html  index.html                        company login, role router
  manager.html  leader.html  team.html          the three role homes
  problems/ideas/collaboration/progress/case    shared views
  settings/  index members routing              company admin
css/      tokens base marketing auth shell dashboard
js/core/  roles session tenant store routing metrics   the domain - pure, no DOM
js/shell/ shell.js                              app chrome: guard, partials, nav per role
js/pages/ one file per page                     DOM + events -> NHStore
js/seed/  companies.js seed.js                  demo tenants + per-company seed rows
js/runtime/                                     support.js (generated) if a page uses <x-dc>
partials/ rail topbar sheet devpanel footer     shared HTML, injected by shell.js
assets/brand/                                   logos, favicons
tests/                                          node scripts (reducer, smoke, flow)
docs/                                           ROUTES.md DATA_MODEL.md
```

Rule of thumb: **core decides, pages render, shell guards.** `js/core/*` never touches the DOM
and never reads `location`/`localStorage` except through `NHSession` and `NHStore`. `js/pages/*`
never mutates data - it appends events. Every list and figure is counted from rows.

## Phases

Each phase ends with something a teammate can open in a browser. One branch per task, PR to
`main`, Kevin merges (same git rules as `../CLAUDE.md`).

### Phase 0a - Static skeleton (done 15 Sep)
- [x] Every page exists as a stub with the right script includes
- [x] `js/core/roles.js`: ROLE_HOME, PAGE_ACCESS, NAV
- [x] `js/seed/companies.js`: one demo company, three users
- [x] Landing (`index.html`), login step 1 (`login.html`), login step 2 (`app/login.html`) built, visual only
- [x] Lives in the `agility-dashborad` repo as `nexthub/` on branch `feat/nexthub-site`

### Phase 0b - Next.js scaffold (next)
- [ ] `npx create-next-app@latest` (TypeScript, App Router, `src/`, ESLint) into `nexthub/` - Kevin runs it, since it adds `package.json`
- [ ] Port `index.html` -> `src/app/(marketing)/page.tsx`, `login.html` -> `(auth)/login/page.tsx`, `app/login.html` -> `[company]/login/page.tsx`; CSS becomes CSS Modules, tokens stay in `globals.css`
- [ ] `js/core/*` -> `src/features/*` unchanged (no DOM in them); `js/seed/*` -> `prisma/seed`
- [ ] Delete the static pages as each one is ported; `npm run dev` replaces `python -m http.server`
- [ ] Add a `nexthub` job to `.github/workflows/ci.yml` (lint + build) - Kevin

### Phase 1 - Landing + login flow, no dashboard yet (2-3 days)
- [ ] `index.html`: hero, the one metric, CTA; copy from `../vision_frame_w7.html` / the deck
- [ ] `login.html`: email or slug -> `NHTenant.findByEmail/find` -> redirect; unknown -> inline error
- [ ] `app/login.html`: shows company name + logo, user picker or email; `NHSession.login` -> `app/index.html`
- [ ] `app/index.html`: redirect by `ROLE_HOME`
- [ ] `signup.html` / `invite.html` / `forgot-password.html`: forms that validate and redirect (demo)
- [ ] `css/tokens.css` + `css/auth.css` + `css/marketing.css`; tokens ported from `dashboard.css`
- [ ] Log out (user menu) clears the session and returns to `login.html`

### Phase 2 - App shell + role homes with seed data (1 week)
- [ ] `shell.js`: inject partials, render NAV by role, active link, drawer < 760px, branding
- [ ] `js/seed/rows.js`: port `../js/data.js` under `acme`
- [ ] `js/core/store.js`: port the reducer from `js/store.js` + `tests/store.test.cjs`
- [ ] **Member** `team.html`: My cases + raise field with routing proposal (`NHRouting.propose`)
- [ ] **Leader** `leader.html`: Inbox by age; four actions through the one sheet -> events
- [ ] **Manager** `manager.html`: Overview - `NHMetrics` computes the ledger from cases + events
- [ ] Dev panel: switch role, demo data off (empty states, "measured in pilot"), reset

### Phase 3 - Shared views + settings (1 week)
- [ ] Problems, Ideas (co-sign / approve / fund), Collaboration, Progress, Case detail timeline
- [ ] Settings: company (departments), members (invite, role), routing table editor -> saved as events
- [ ] `tests/smoke.cjs` (every page, three roles, mobile) and `tests/flow.test.cjs` (the whole loop)

### Phase 4 - Second company + pilot polish
- [ ] A second demo company in `companies.js` / `seed.js` to prove isolation
- [ ] Per-company logo and accent colour
- [ ] Hosting: any static host (GitHub Pages / Netlify); still no build step

## Decisions to make before Phase 2
1. Does a Leader also get "My cases"? (default: yes - everyone can raise; NAV already says so)
2. Can a Manager act in the Inbox? (default: view yes; act = an `override` event, as in the demo)
3. Anonymous handles per company or always on? (default: per company, `anonymousHandles` in companies.js)
4. Pages built with the `<x-dc>` runtime (as the demo) or plain DOM? (default: plain DOM for
   marketing/auth, `<x-dc>` for the dashboard pages so the demo logic ports unchanged)

## Moving to Next.js
The cut is already the App Router cut:
`index/pricing/contact` -> `(marketing)/`, `login/signup/invite/forgot` -> `(auth)/`,
`app/` -> `[company]/(app)/` with `manager|leader|team` as route folders, `js/core/*` -> `features/*`
(unchanged, they have no DOM), `js/pages/*` -> page components, `partials/` -> `components/shell/`,
`js/seed/*` -> `prisma/seed`, `NHSession` -> Auth.js, `?company=` -> `[company]` segment.

## What stays where
- Repo root (`../`) - the static demo. Keep it for sales calls until Phase 2 replaces it; then archive.
- `../../*.md` (outside the repo) - strategy, outreach, competitors. Untouched.
- `nexthub/` (this folder) - the product.
