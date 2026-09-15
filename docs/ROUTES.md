# Route map

| URL | File (`src/app/`) | Session | Role | Purpose |
|---|---|---|---|---|
| `/` | `(marketing)/page.tsx` | - | - | Landing |
| `/pricing` | `(marketing)/pricing/page.tsx` | - | - | Pricing |
| `/contact` | `(marketing)/contact/page.tsx` | - | - | Contact / book a pilot |
| `/login` | `(auth)/login/page.tsx` | - | - | Find your company -> `/[company]/login` |
| `/signup` | `(auth)/signup/page.tsx` | - | - | Create company + first manager |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | - | - | Reset request |
| `/invite/[token]` | `(auth)/invite/[token]/page.tsx` | - | - | Accept invite |
| `/[company]/login` | `[company]/login/page.tsx` | - | - | Company-branded login |
| `/[company]` | `[company]/(app)/page.tsx` | yes | any | Redirect to `ROLE_HOME[role]` |
| `/[company]/manager` | `.../(app)/manager/page.tsx` | yes | manager | Overview |
| `/[company]/leader` | `.../(app)/leader/page.tsx` | yes | leader, manager | Inbox |
| `/[company]/team` | `.../(app)/team/page.tsx` | yes | any | My cases |
| `/[company]/problems` | `.../(app)/problems/page.tsx` | yes | any | Problems |
| `/[company]/ideas` | `.../(app)/ideas/page.tsx` | yes | any | Ideas |
| `/[company]/collaboration` | `.../(app)/collaboration/page.tsx` | yes | any | Initiatives |
| `/[company]/progress` | `.../(app)/progress/page.tsx` | yes | any | Movement since baseline |
| `/[company]/cases/[caseId]` | `.../(app)/cases/[caseId]/page.tsx` | yes | own / addressed / manager | Case detail |
| `/[company]/settings/*` | `.../(app)/settings/{company,members,routing}/page.tsx` | yes | manager | Company admin |
| `/api/health` | `api/health/route.ts` | - | - | Uptime check |

Role rules are data in `src/config/roles.ts` (`ROLE_HOME`, `ROLE_ACCESS`, `canAccess()`) and nav
per role in `src/config/nav.ts`. Enforcement (`src/proxy.ts` + the `(app)` layout) arrives with
sessions in Phase 2; until then every app page renders with the demo tenant as manager.

Layouts nest: `app/layout.tsx` (html, fonts) -> `(marketing)/layout.tsx` (header, footer) or
`[company]/layout.tsx` (resolve tenant, 404) -> `(app)/layout.tsx` (AppShell: rail + top bar)
-> `settings/layout.tsx` (sub-nav). Auth pages compose `AuthShell` themselves.
