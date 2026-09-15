# Data model

Everything is keyed by company slug. Two stores:

- **`js/seed/companies.js`** - the tenants: `slug, name, logo, anonymousHandles, users[]`.
  Users: `id, name, email, role (manager|leader|member), dept, handle?`.
- **`js/seed/rows.js`** - `NH_SEED[slug]` = the demo rows for that company, same arrays as the
  demo's `js/data.js`: `DEPTS, ROUTES, PROBLEMS, IDEAS, INITIATIVES, CASES, METRICS`.

Plus the browser-side state:

- **Session** - `localStorage['nexthub.session.v1']` = `{ companySlug, userId, role }` (`NHSession`).
- **Event log** - `localStorage['nexthub.events.v1.<slug>']` = `{ events: [], day }` (`NHStore`).
  Append-only. Event: `{ id, day, ts, actor, type, target, payload }`. Types as in the demo:
  `case.read, case.decided, case.handed, case.asked, case.answered, case.override, case.shipped,
  idea.cosigned, idea.approved, idea.funded` - plus, new here: `member.invited, member.role,
  route.upsert, dept.upsert` so settings pages also store facts, not edited copies of the seed.

The page renders `NHStore.reduce(NH_SEED[slug], log)`. Rule carried over from the demo:
**never store display text as state.** Store who / which day / which route; build the sentence at
render time. A case is one object seen from three sides: `from` = whose "My cases", `assignee` =
whose Inbox (hand-over changes it), managers see all.

Signup in the demo appends a company to `NH_COMPANIES` in memory and to
`localStorage['nexthub.companies.v1']` so it survives reload; real backend later.
