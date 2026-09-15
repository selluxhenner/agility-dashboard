# Page map

| Page | Session | Role | Purpose |
|---|---|---|---|
| `index.html` | - | - | Landing |
| `pricing.html` | - | - | Pricing |
| `contact.html` | - | - | Contact / book a pilot |
| `login.html` | - | - | Find your company (email or slug) -> `app/login.html?company=` |
| `signup.html` | - | - | Create company + first manager |
| `forgot-password.html` | - | - | Reset request |
| `invite.html?token=` | - | - | Accept invite |
| `app/login.html?company=` | - | - | Company-branded login |
| `app/index.html` | yes | any | Redirect to `ROLE_HOME[role]` |
| `app/manager.html` | yes | manager | Overview |
| `app/leader.html` | yes | leader, manager | Inbox |
| `app/team.html` | yes | any | My cases |
| `app/problems.html` | yes | any | Problems |
| `app/ideas.html` | yes | any | Ideas |
| `app/collaboration.html` | yes | any | Initiatives |
| `app/progress.html` | yes | any | Movement since baseline |
| `app/case.html?id=` | yes | own / addressed / manager | Case detail |
| `app/settings/index.html` | yes | manager | Company: name, slug, logo, departments |
| `app/settings/members.html` | yes | manager | Members and roles |
| `app/settings/routing.html` | yes | manager | Routing table |

Role rules are data in `js/core/roles.js` (`ROLE_HOME`, `PAGE_ACCESS`, `NAV`) and enforced by
`NHSession.require()` which `NHShell.mount()` calls on every app page. The guard is client-side -
fine for a demo, replaced by real auth later without touching pages.

Script order on an app page: `seed/*` -> `core/roles` -> `core/session` -> `core/tenant` ->
`core/store` (+ `routing`/`metrics` as needed) -> `shell/shell` -> `pages/<page>`.
