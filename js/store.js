// NextHub dashboard — the store.
//
// Seed rows live in js/data.js. Everything that happens *in the browser* —
// a case raised, a yes, a hand-over, a co-sign — is an event appended to a
// log in localStorage. Nothing mutates the seed. The page state is
//
//     reduce(seed, log)  →  { day, cases, ideas, problems, ledger }
//
// so every count, clock and status is derived from seed + events at render
// time. Reset = clear the log. Later a backend just becomes another place the
// same events come from.
//
// Rules (docs/ACTIONS_PLAN.md §2): the reducer never reads the DOM and never
// calls setState. UI code appends events via this.act.* in js/dashboard.js
// and reads the reduced state. Only Kevin changes this file.
//
// Time: `log.day` is the demo clock, 0 = today. Seed cases carry `raisedDay`
// as a negative offset; age = day - raisedDay. A paused clock (question sent)
// does not count towards the promise.

const NHStore = (function () {
  const KEY = 'nexthub.demo.v2';
  const LEGACY_KEY = 'nexthub.demo.v1';

  // ── event types ────────────────────────────────────────────────────────
  const T = {
    CASE_RAISED: 'case.raised',       // { title, body, routeId, assignee, fromDept }
    CASE_READ: 'case.read',           // —
    CASE_DECIDED: 'case.decided',     // { answer: 'yes'|'no', reason?, note?, makeIdea? }
    CASE_HANDED: 'case.handed',       // { to, why? }
    CASE_ASKED: 'case.asked',         // { text }
    CASE_ANSWERED: 'case.answered',   // { text }
    CASE_BUILDING: 'case.building',   // { days, expected? }          (seed history)
    CASE_SHIPPED: 'case.shipped',     // { outcome, outcomeNote }     (seed history)
    ROUTE_OVERRIDDEN: 'route.overridden', // { proposed, chosen }  (route ids)
    IDEA_COSIGNED: 'idea.cosigned',   // —
    IDEA_UNCOSIGNED: 'idea.uncosigned', // —
    IDEA_ASKED: 'idea.asked',         // { text }
    IDEA_APPROVED: 'idea.approved',   // { team?: [names], note? }
    IDEA_FUNDED: 'idea.funded',       // { team?: [names], note? }
    DAY_ADVANCED: 'day.advanced'      // { by }
  };

  // ── log: load / save / append ──────────────────────────────────────────
  const empty = () => ({ events: [], day: 0 });

  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
  const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const remove = key => { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } };

  let seq = 0;
  const newId = prefix => prefix + '_' + Date.now().toString(36) + (seq++).toString(36);

  function load() {
    const cur = read(KEY);
    if (cur && Array.isArray(cur.events)) return { events: cur.events, day: cur.day | 0 };
    const legacy = read(LEGACY_KEY);
    if (legacy) { const log = migrateV1(legacy); write(KEY, log); remove(LEGACY_KEY); return log; }
    return empty();
  }

  function save(log) { write(KEY, log); return log; }

  function reset() { remove(KEY); remove(LEGACY_KEY); return empty(); }

  // Append one event and persist. Returns the new log (the old one is untouched).
  function append(log, ev) {
    const e = Object.assign({ id: newId('e'), ts: Date.now(), day: log.day }, ev);
    const next = { events: log.events.concat([e]), day: ev.type === T.DAY_ADVANCED ? log.day + ((ev.payload && ev.payload.by) || 1) : log.day };
    return save(next);
  }

  // v1 stored rendered rows ({ sent: [...], cases: { id: status } }). Recover
  // the facts we can and drop the rest.
  function migrateV1(v1) {
    const log = empty();
    const push = ev => log.events.push(Object.assign({ id: newId('e'), ts: Date.now(), day: 0 }, ev));
    (v1.sent || []).slice().reverse().forEach(row => {
      const p = propose(row.title || '');
      const route = p && p.route;
      push({ type: T.CASE_RAISED, actor: 'Anonymous #4471', target: newId('c'),
        payload: { title: row.title || 'Untitled', body: '', routeId: route ? route.id : null, assignee: route ? route.owner.name : 'Triage desk', fromDept: 'Production, Line 3' } });
    });
    Object.keys(v1.cases || {}).forEach(id => {
      const seed = (typeof CASES !== 'undefined' ? CASES : []).find(c => c.id === id);
      const route = seed && ROUTES.find(r => r.id === seed.routeId);
      const status = v1.cases[id];
      if (status === 'decided') push({ type: T.CASE_DECIDED, actor: 'T. Vogel', target: id, payload: { answer: 'yes' } });
      else if (status === 'handed') push({ type: T.CASE_HANDED, actor: 'T. Vogel', target: id, payload: { to: route ? (route.owner.name === 'T. Vogel' ? route.deputy : route.owner.name) : 'deputy' } });
      else if (status === 'asked') push({ type: T.CASE_ASKED, actor: 'T. Vogel', target: id, payload: { text: '' } });
    });
    return log;
  }

  // ── routing: propose (never decide) the owning row for a piece of text ──
  // Moved here from dashboard.js so migration and UI share one matcher.
  function propose(text) {
    const t = (text || '').toLowerCase();
    if (t.trim().length < 8) return null;
    let best = null, bestHits = 0;
    ROUTES.forEach(r => {
      const hits = r.keys.filter(k => t.indexOf(k) >= 0).length;
      if (hits > bestHits) { best = r; bestHits = hits; }
    });
    if (!best) return { route: null, confidence: 0 };
    return { route: best, confidence: Math.min(96, 55 + bestHits * 14) };
  }

  // ── reduce ─────────────────────────────────────────────────────────────
  // seed = { cases: CASES, ideas: IDEAS, problems: PROBLEMS, routes: ROUTES, promiseDays }
  function reduce(seed, log) {
    const day = log.day | 0;
    const routes = seed.routes || [];
    const routeOf = id => routes.find(r => r.id === id) || null;

    const cases = {}, order = [];
    const ideas = {}, problems = {};

    const freshCase = (id, row, isSeed) => {
      const c = {
        id, seed: isSeed, title: row.title, body: row.body || '', from: row.from, fromDept: row.fromDept || '',
        routeId: row.routeId || null, assignee: row.assignee, raisedDay: row.raisedDay | 0,
        reason: row.reason || '', upside: row.upside || '', linkedIdea: row.linkedIdea || null,
        // derived below
        status: 'open', read: null, decided: null, question: null, handed: [], building: null, shipped: null,
        override: null, pausedDays: 0, pausedSince: null, history: []
      };
      cases[id] = c; order.push(id);
      return c;
    };

    (seed.cases || []).forEach(row => freshCase(row.id, row, true));
    (seed.ideas || []).forEach(i => { ideas[i.id] = Object.assign({}, i, { team: i.team.slice(), cosigners: [], thread: [], approved: null }); });
    (seed.problems || []).forEach(p => { problems[p.id] = Object.assign({}, p); });

    // Seed history first (in day order), then live events (in log order).
    const seedEvents = [];
    (seed.cases || []).forEach(row => (row.seedEvents || []).forEach(ev => seedEvents.push(Object.assign({ target: row.id, seed: true }, ev))));
    (seed.ideas || []).forEach(row => (row.seedEvents || []).forEach(ev => seedEvents.push(Object.assign({ target: row.id, seed: true }, ev))));
    seedEvents.sort((a, b) => (a.day | 0) - (b.day | 0));

    const apply = ev => {
      const pl = ev.payload || {};
      const d = ev.day | 0;
      switch (ev.type) {
        case T.CASE_RAISED: {
          const c = freshCase(ev.target, { title: pl.title, body: pl.body, from: ev.actor, fromDept: pl.fromDept, routeId: pl.routeId, assignee: pl.assignee, raisedDay: d, reason: pl.reason || 'triage', upside: pl.upside || '' }, false);
          c.history.push(ev); break;
        }
        case T.CASE_READ: { const c = cases[ev.target]; if (!c || c.read !== null) break; c.read = d; c.history.push(ev); break; }
        case T.CASE_DECIDED: {
          const c = cases[ev.target]; if (!c) break;
          if (c.read === null) c.read = d;
          if (c.pausedSince !== null) { c.pausedDays += d - c.pausedSince; c.pausedSince = null; }
          c.decided = { answer: pl.answer === 'no' ? 'no' : 'yes', reason: pl.reason || '', note: pl.note || '', by: ev.actor, day: d };
          c.status = 'decided'; c.history.push(ev); break;
        }
        case T.CASE_HANDED: {
          const c = cases[ev.target]; if (!c || c.status !== 'open') break;
          if (c.read === null) c.read = d;
          c.handed.push({ from: ev.actor, to: pl.to, why: pl.why || '', day: d });
          c.assignee = pl.to; c.history.push(ev); break;
        }
        case T.CASE_ASKED: {
          const c = cases[ev.target]; if (!c || c.status !== 'open') break;
          if (c.read === null) c.read = d;
          c.question = { text: pl.text || '', by: ev.actor, day: d, answer: null };
          c.status = 'asked'; c.pausedSince = d; c.history.push(ev); break;
        }
        case T.CASE_ANSWERED: {
          const c = cases[ev.target]; if (!c || c.status !== 'asked') break;
          c.question.answer = { text: pl.text || '', by: ev.actor, day: d };
          c.pausedDays += d - c.pausedSince; c.pausedSince = null;
          c.status = 'open'; c.history.push(ev); break;
        }
        case T.CASE_BUILDING: {
          const c = cases[ev.target]; if (!c) break;
          c.building = { day: d, days: pl.days || 30, expected: pl.expected || '', by: ev.actor };
          c.status = 'building'; c.history.push(ev); break;
        }
        case T.CASE_SHIPPED: {
          const c = cases[ev.target]; if (!c) break;
          c.shipped = { day: d, outcome: pl.outcome || '', outcomeNote: pl.outcomeNote || '', by: ev.actor };
          c.status = 'shipped'; c.history.push(ev); break;
        }
        case T.ROUTE_OVERRIDDEN: {
          const c = cases[ev.target]; if (!c) break;
          const chosen = routeOf(pl.chosen);
          c.override = { proposed: pl.proposed || c.routeId, chosen: pl.chosen, day: d, by: ev.actor };
          if (chosen) { c.routeId = chosen.id; c.assignee = chosen.owner.name; }
          c.history.push(ev); break;
        }
        case T.IDEA_COSIGNED: {
          const i = ideas[ev.target]; if (!i) break;
          if (!i.cosigners.some(x => x.name === ev.actor)) i.cosigners.push({ name: ev.actor, day: d });
          break;
        }
        case T.IDEA_UNCOSIGNED: {
          const i = ideas[ev.target]; if (!i) break;
          i.cosigners = i.cosigners.filter(x => x.name !== ev.actor);
          break;
        }
        case T.IDEA_ASKED: {
          const i = ideas[ev.target]; if (!i) break;
          i.thread.push({ text: pl.text || '', by: ev.actor, day: d, answer: null });
          break;
        }
        case T.IDEA_APPROVED:
        case T.IDEA_FUNDED: {
          const i = ideas[ev.target]; if (!i) break;
          i.approved = { by: ev.actor, day: d, note: pl.note || '', funded: ev.type === T.IDEA_FUNDED };
          i.status = 'In trial'; i.wait = 0;
          if (pl.team && pl.team.length) i.team = pl.team.slice();
          const p = problems[i.problem]; if (p && p.owner !== 'trial') p.owner = 'trial';
          break;
        }
        case T.DAY_ADVANCED: break; // day is tracked on the log itself
        default: break;
      }
    };

    seedEvents.forEach(apply);
    (log.events || []).forEach(apply);

    // Derived per case: age, clock, overdue, escalation, last action.
    const promise = seed.promiseDays || 5;
    order.forEach(id => {
      const c = cases[id];
      const route = routeOf(c.routeId);
      c.route = route;
      c.age = day - c.raisedDay;
      const stopDay = c.decided ? c.decided.day : c.building ? c.building.day : c.shipped ? c.shipped.day : null;
      const paused = c.pausedDays + (c.pausedSince !== null ? day - c.pausedSince : 0);
      c.clock = Math.max(0, (stopDay !== null ? stopDay : day) - c.raisedDay - paused);
      c.open = c.status === 'open';
      c.overdue = c.open && c.clock > promise;
      c.escalated = c.overdue && route ? { to: route.owner.name === c.assignee ? route.deputy : route.owner.name } : null;
      c.dueDay = c.raisedDay + promise + paused;
    });

    const ledger = {
      handedOver: order.reduce((a, id) => a + cases[id].handed.length, 0),
      escalated: order.reduce((a, id) => a + (cases[id].escalated ? 1 : 0), 0),
      overrides: order.reduce((a, id) => a + (cases[id].override ? 1 : 0), 0)
    };

    return {
      day,
      cases: order.map(id => cases[id]),
      ideas: (seed.ideas || []).map(i => ideas[i.id]),
      problems: (seed.problems || []).map(p => problems[p.id]),
      ledger
    };
  }

  // ── selectors ──────────────────────────────────────────────────────────
  const inboxFor = (state, name) => state.cases.filter(c => c.assignee === name && c.open);
  const mineFor = (state, handle) => state.cases.filter(c => c.from === handle);
  const cosignedBy = (state, handle) => state.ideas.filter(i => i.cosigners.some(x => x.name === handle));

  // What did `name` last do to this case that took it off their desk?
  // A question only counts while it is still unanswered — once the sender
  // replies the case is back on the desk.
  function actedBy(c, name) {
    for (let k = c.history.length - 1; k >= 0; k--) {
      const ev = c.history[k];
      if (ev.actor !== name) continue;
      if (ev.type === T.CASE_DECIDED) return 'decided';
      if (ev.type === T.CASE_HANDED) return 'handed';
      if (ev.type === T.CASE_ASKED) return c.status === 'asked' ? 'asked' : null;
    }
    return null;
  }
  // Open cases on someone's desk: live ones plus the ones paused on a question.
  const deskFor = (state, name) => state.cases.filter(c => c.assignee === name && (c.open || c.status === 'asked'));
  const clearedBy = (state, name) => state.cases.filter(c => actedBy(c, name) !== null);

  // Session-created cases as CASES rows (with their history as seedEvents),
  // for pasting into js/data.js.
  function exportSnippet(state) {
    const rows = state.cases.filter(c => !c.seed).map(c => {
      const row = { id: c.id, title: c.title, body: c.body, from: c.from, fromDept: c.fromDept, routeId: c.routeId, assignee: c.handed.length ? c.history.find(e => e.type === T.CASE_RAISED).payload.assignee : c.assignee,
        raisedDay: c.raisedDay - state.day, reason: c.reason, upside: c.upside };
      const evs = c.history.filter(e => e.type !== T.CASE_RAISED).map(e => ({ type: e.type, day: (e.day | 0) - state.day, actor: e.actor, payload: e.payload }));
      if (evs.length) row.seedEvents = evs;
      return '  ' + JSON.stringify(row).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ');
    });
    return rows.length ? '// paste into CASES in js/data.js\n' + rows.join(',\n') + ',' : '';
  }

  return { T, KEY, load, save, reset, append, reduce, propose, inboxFor, deskFor, mineFor, cosignedBy, actedBy, clearedBy, exportSnippet, newId };
})();
