# NextHub - build plan

> **Decision 15 Sep 2026: Next.js.** The repo is the Next.js app; the old static demo is
> frozen in `legacy/demo/`. Folder rules: `docs/ARCHITECTURE.md`.

The product: employees raise a case in one field, it lands in the right leader's inbox with a
clock, the leader answers, the manager sees the wait ledger. Three roles, three home screens
(the whiteboard concept, section 8). The demo in `legacy/demo/` proves the inbox loop for one
company; this app adds everything around it: landing, login, company, roles, real data.

## The user journey

```
/                                  LANDING (public)
  -> /login                        step 1: work email or company slug -> finds the company
      -> /acme/login               step 2: company-branded login
          -> /acme                 role router: reads the session, redirects by role
              manager  -> /acme/manager   Overview   decisions waiting, wait ledger, stall reasons
              leader   -> /acme/leader    Inbox      open items by age; yes / no+why / hand over / ask
              member   -> /acme/team      My cases   raise one field; see what happened to mine
              shared      /acme/{problems,ideas,collaboration,progress,cases/[id]}
              admin       /acme/settings/{company,members,routing}      (manager only)
/signup                            creates a company + its first manager -> /[slug]/login
/invite/[token]                    joins an existing company with the role on the invite
```

Two logins are deliberate: the first only finds the tenant, the second authenticates inside it.
That is what gives each company its own branding now and its own SSO later.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript, `src/` | route groups map 1:1 onto the journey above |
| Styling | tokens + CSS Modules, global `nh-*` primitives | ports the demo palette with least friction; no framework to learn |
| Auth (Phase 2) | Auth.js v5: credentials + invite tokens; SSO providers later | per-tenant sessions, works in `proxy.ts` |
| DB (Phase 2) | Postgres + Prisma | every table has `companyId`; `lib/db` enforces it |
| Validation | zod (when forms go live) | shared between forms and server actions |
| Tests | vitest (unit), Playwright (e2e, Phase 3) | reducer/metrics stay pure; the inbox loop e2e is ported from the demo |
| Tenancy | path (`/acme/...`) first, subdomain via `proxy.ts` later | zero DNS work locally |

## Phases

Each phase ends with something a teammate can open in a browser. One branch per task, PR to
`main`, Kevin merges (`CONTRIBUTING.md`).

### Phase 0 - Repo + scaffold (done 15 Sep)
- [x] Next.js 16 app at the repo root; static demo moved to `legacy/demo/` (still in CI)
- [x] Every route exists (`docs/ROUTES.md`); `src/config/roles.ts`: ROLE_HOME, ROLE_ACCESS, NAV
- [x] Landing, login step 1, login step 2 ported to React (visual only); AppShell rail + top bar
- [x] `features/`: tenant (demo table), routing matcher, metrics, case event types; unit tests
- [x] CI: lint, typecheck, test, build; CLAUDE.md / CONTRIBUTING.md / CODEOWNERS updated
- [x] Rename the GitHub repo `agility-dashborad` -> `nexthub` (done 15 Sep)
- [ ] Hosting: Vercel project on `main` (Kevin)

### Phase 1 - Finish the public side (2-3 days)
- [ ] Pricing and contact pages with real copy; contact form (server action; email later)
- [ ] Signup / invite / forgot-password as real forms that validate (zod) and redirect
- [ ] Login step 1 looks up the tenant (`findTenantByEmail`) and redirects; unknown -> inline error
- [ ] Mobile pass on every public page

### Phase 2 - Sessions, tenant guard, role homes with seed data (1-2 weeks)
- [ ] Prisma schema + seed (port `legacy/demo/js/data.js` into company `acme`)
- [ ] Auth.js credentials; session `{userId, companySlug, role}`; `proxy.ts` enforces login + `ROLE_ACCESS`
- [ ] Role router reads the session; AppShell shows the real user; log out
- [ ] `features/cases/reducer.ts`: port `legacy/demo/js/store.js` + its 16 tests
- [ ] **Member** `/team`: My cases + raise field with routing proposal
- [ ] **Leader** `/leader`: Inbox by age; four actions through one input sheet -> server actions
- [ ] **Manager** `/manager`: Overview - `features/metrics` computes the ledger from cases + events
- [ ] Dev panel (dev only): switch role, demo data off (empty states, "measured in pilot"), reset

### Phase 3 - Shared views, settings, e2e (1 week)
- [ ] Problems, Ideas (co-sign / approve / fund), Collaboration, Progress, Case detail timeline
- [ ] Settings: company (departments), members (invite, role), routing table editor
- [ ] Playwright e2e: login flow; the whole inbox loop (port of `.github/ci/flow.test.cjs`)

### Phase 4 - Pilot-ready
- [ ] A second company in the seed to prove isolation; per-company logo and accent
- [ ] Email: invites, password reset, "an item is older than N days"
- [ ] SSO (Microsoft Entra first - the target list is mid-size German industry)
- [ ] Subdomain tenancy via `proxy.ts`
- [ ] Delete `legacy/demo/` and its two CI jobs once the port is complete

## Decisions to make before Phase 2
1. Does a Leader also get "My cases"? (default: yes - everyone can raise; NAV already says so)
2. Can a Manager act in the Inbox? (default: view yes; act = an `override` event, as in the demo)
3. Anonymous handles per company or always on? (default: per company, `anonymousHandles`)
4. Tailwind or not? (decided: not - tokens + CSS Modules, fewer concepts for the team)

## What stays where
- `legacy/demo/` - the static demo. Keep it for sales calls until Phase 2 replaces it; then delete.
- Strategy, outreach, competitor docs - outside the repo (Startup_speed root). Untouched.
