// Reducer tests for js/store.js. No framework, no browser: data.js and
// store.js are plain scripts, so they are evaluated in a vm sandbox with a
// fake localStorage. Run:  node .github/ci/store.test.cjs
//
// These protect the one piece of code every button depends on. Add a case
// here whenever an event type or a derived field changes.

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', '..');
const mem = {};
const sandbox = {
  console,
  localStorage: {
    getItem: k => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; }
  },
  Date
};
vm.createContext(sandbox);
for (const f of ['js/data.js', 'js/store.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
// top-level const/let live in the context's lexical scope, not on the sandbox object
const { NHStore, CASES, IDEAS, PROBLEMS, ROUTES, PROMISE_DAYS } = vm.runInContext('({ NHStore, CASES, IDEAS, PROBLEMS, ROUTES, PROMISE_DAYS })', sandbox);
const SEED = { cases: CASES, ideas: IDEAS, problems: PROBLEMS, routes: ROUTES, promiseDays: PROMISE_DAYS };
const T = NHStore.T;

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok ' + name); } catch (e) { console.log('  x  ' + name + '\n     ' + (e.message || e)); process.exitCode = 1; } };
const ev = (type, actor, target, payload, day) => ({ type, actor, target, payload: payload || {}, day: day || 0 });
const logOf = (...events) => ({ events, day: Math.max(0, ...events.map(e => e.day || 0)) });

console.log('\nstore.js reducer');

test('seed reduces: 8 cases, 6 open for T. Vogel, employee has 2 cases + 1 co-sign', () => {
  const S = NHStore.reduce(SEED, logOf());
  assert.strictEqual(S.cases.length, 8);
  assert.strictEqual(NHStore.inboxFor(S, 'T. Vogel').length, 6);
  assert.strictEqual(NHStore.mineFor(S, 'Anonymous #4471').length, 3); // c3 open + c7 shipped + c8 building
  assert.strictEqual(NHStore.cosignedBy(S, 'Anonymous #4471').map(i => i.id).join(), 'i1');
});

test('seed history: c7 shipped, c8 building, ages derived from raisedDay', () => {
  const S = NHStore.reduce(SEED, logOf());
  const c7 = S.cases.find(c => c.id === 'c7'), c8 = S.cases.find(c => c.id === 'c8'), c1 = S.cases.find(c => c.id === 'c1');
  assert.strictEqual(c7.status, 'shipped');
  assert.strictEqual(c7.shipped.outcome, '5 weeks → 11 days');
  assert.strictEqual(c7.clock, 3, 'decided 3 days after raise → clock stops at 3');
  assert.strictEqual(c8.status, 'building');
  assert.strictEqual(c1.age, 7);
  assert.strictEqual(c1.overdue, true, 'c1 is 7 d old, promise is ' + PROMISE_DAYS);
  assert.ok(c1.escalated && c1.escalated.to, 'overdue case names an escalation target');
});

test('case.raised: new case lands in the assignee inbox, employee sees it', () => {
  const S = NHStore.reduce(SEED, logOf(ev(T.CASE_RAISED, 'Anonymous #4471', 'c_new', { title: 'Night shift order', routeId: 'r1', assignee: 'R. Nowak', fromDept: 'Production, Line 3' })));
  const c = S.cases.find(x => x.id === 'c_new');
  assert.ok(c && !c.seed);
  assert.strictEqual(c.assignee, 'R. Nowak');
  assert.strictEqual(NHStore.inboxFor(S, 'R. Nowak').length, 1);
  assert.strictEqual(NHStore.mineFor(S, 'Anonymous #4471').length, 4);
  assert.strictEqual(c.age, 0);
  assert.strictEqual(c.overdue, false);
});

test('case.decided closes the case; clock stops; cleared list credits the actor', () => {
  const S = NHStore.reduce(SEED, logOf(ev(T.CASE_DECIDED, 'T. Vogel', 'c2', { answer: 'no', reason: 'not responsible', note: 'Night shift gets a €500 card.' })));
  const c = S.cases.find(x => x.id === 'c2');
  assert.strictEqual(c.status, 'decided');
  assert.strictEqual(c.decided.answer, 'no');
  assert.strictEqual(c.decided.reason, 'not responsible');
  assert.strictEqual(NHStore.inboxFor(S, 'T. Vogel').length, 5);
  assert.strictEqual(NHStore.actedBy(c, 'T. Vogel'), 'decided');
  assert.strictEqual(NHStore.clearedBy(S, 'T. Vogel').length, 1);
});

test('case.handed moves the case to the other inbox; ledger counts it', () => {
  const S = NHStore.reduce(SEED, logOf(ev(T.CASE_HANDED, 'T. Vogel', 'c2', { to: 'R. Nowak' })));
  const c = S.cases.find(x => x.id === 'c2');
  assert.strictEqual(c.assignee, 'R. Nowak');
  assert.strictEqual(c.open, true);
  assert.strictEqual(NHStore.inboxFor(S, 'T. Vogel').length, 5);
  assert.strictEqual(NHStore.inboxFor(S, 'R. Nowak').length, 1);
  assert.strictEqual(NHStore.actedBy(c, 'T. Vogel'), 'handed');
  assert.strictEqual(S.ledger.handedOver, 1);
});

test('case.asked pauses the clock; case.answered resumes it', () => {
  // raised at -4 (c2). Ask on day 0, answer on day 3, look on day 5 → clock = 9 - 3 paused = 6
  const log = { events: [ev(T.CASE_ASKED, 'T. Vogel', 'c2', { text: 'Which belt?' }, 0), ev(T.CASE_ANSWERED, 'S. Dahl', 'c2', { text: 'The 40 mm one.' }, 3)], day: 5 };
  const S = NHStore.reduce(SEED, log);
  const c = S.cases.find(x => x.id === 'c2');
  assert.strictEqual(c.status, 'open');
  assert.strictEqual(c.question.answer.text, 'The 40 mm one.');
  assert.strictEqual(c.age, 9);
  assert.strictEqual(c.clock, 6);
  const paused = NHStore.reduce(SEED, { events: [log.events[0]], day: 5 }).cases.find(x => x.id === 'c2');
  assert.strictEqual(paused.status, 'asked');
  assert.strictEqual(paused.clock, 4, 'while paused the clock stays where it was when the question went out');
  assert.strictEqual(NHStore.inboxFor(S, 'T. Vogel').some(x => x.id === 'c2'), true, 'answered case is back in the inbox');
});

test('a question is "off the desk" only while unanswered; deskFor keeps paused cases', () => {
  const asked = NHStore.reduce(SEED, logOf(ev(T.CASE_ASKED, 'T. Vogel', 'c2', { text: 'Which belt?' })));
  const c = asked.cases.find(x => x.id === 'c2');
  assert.strictEqual(NHStore.actedBy(c, 'T. Vogel'), 'asked');
  assert.strictEqual(NHStore.inboxFor(asked, 'T. Vogel').length, 5, 'paused case is not in the live inbox');
  assert.strictEqual(NHStore.deskFor(asked, 'T. Vogel').length, 6, 'but it is still on the desk');
  const back = NHStore.reduce(SEED, logOf(ev(T.CASE_ASKED, 'T. Vogel', 'c2', { text: 'Which belt?' }), ev(T.CASE_ANSWERED, 'S. Dahl', 'c2', { text: '40 mm' }, 1)));
  assert.strictEqual(NHStore.actedBy(back.cases.find(x => x.id === 'c2'), 'T. Vogel'), null, 'answered → back on the desk, not cleared');
  assert.strictEqual(NHStore.clearedBy(back, 'T. Vogel').length, 0);
});

test('day.advanced ages every open case; a fresh case crosses the promise', () => {
  const log = { events: [ev(T.CASE_RAISED, 'Anonymous #4471', 'c_x', { title: 'x', routeId: 'r6', assignee: 'T. Vogel' }, 0)], day: PROMISE_DAYS + 1 };
  const c = NHStore.reduce(SEED, log).cases.find(x => x.id === 'c_x');
  assert.strictEqual(c.age, PROMISE_DAYS + 1);
  assert.strictEqual(c.overdue, true);
  assert.strictEqual(c.escalated.to, 'S. Dahl', 'r6 owner is T. Vogel, so escalation goes to the deputy');
});

test('idea.cosigned is idempotent per actor; idea.uncosigned removes it', () => {
  const S1 = NHStore.reduce(SEED, logOf(ev(T.IDEA_COSIGNED, 'Anonymous #4471', 'i2'), ev(T.IDEA_COSIGNED, 'Anonymous #4471', 'i2')));
  assert.strictEqual(S1.ideas.find(i => i.id === 'i2').cosigners.length, 1);
  const S2 = NHStore.reduce(SEED, logOf(ev(T.IDEA_COSIGNED, 'Anonymous #4471', 'i2'), ev(T.IDEA_UNCOSIGNED, 'Anonymous #4471', 'i2')));
  assert.strictEqual(S2.ideas.find(i => i.id === 'i2').cosigners.length, 0);
  assert.strictEqual(S2.ideas.find(i => i.id === 'i1').cosigners.length, 1, 'seed co-sign on i1 untouched');
});

test('idea.approved: status → In trial, wait 0, team set, problem owner → trial', () => {
  const S = NHStore.reduce(SEED, logOf(ev(T.IDEA_APPROVED, 'B. Hartmann', 'i1', { team: ['C. Ilg', 'R. Nowak'] })));
  const i = S.ideas.find(x => x.id === 'i1');
  assert.strictEqual(i.status, 'In trial');
  assert.strictEqual(i.wait, 0);
  assert.deepStrictEqual(i.team, ['C. Ilg', 'R. Nowak']);
  assert.strictEqual(S.problems.find(p => p.id === 'p1').owner, 'trial');
  assert.strictEqual(S.ideas.filter(x => x.status === 'Awaiting decision').length, 2, 'was 3');
});

test('seed is never mutated by reduce', () => {
  const before = JSON.stringify([CASES, IDEAS, PROBLEMS]);
  NHStore.reduce(SEED, logOf(ev(T.IDEA_APPROVED, 'B. Hartmann', 'i1', { team: ['X'] }), ev(T.CASE_HANDED, 'T. Vogel', 'c2', { to: 'R. Nowak' })));
  assert.strictEqual(JSON.stringify([CASES, IDEAS, PROBLEMS]), before);
});

test('append persists and advances the day only on day.advanced', () => {
  let log = NHStore.reset();
  log = NHStore.append(log, ev(T.CASE_READ, 'T. Vogel', 'c1'));
  assert.strictEqual(log.day, 0);
  log = NHStore.append(log, ev(T.DAY_ADVANCED, 'dev', null, { by: 2 }));
  assert.strictEqual(log.day, 2);
  assert.strictEqual(NHStore.load().events.length, 2, 'load() reads back what append() saved');
  assert.strictEqual(NHStore.load().day, 2);
  NHStore.reset();
  assert.strictEqual(NHStore.load().events.length, 0);
});

test('v1 → v2 migration recovers sent cases and inbox actions', () => {
  NHStore.reset();
  mem['nexthub.demo.v1'] = JSON.stringify({ sent: [{ title: 'We need a faster way to order a sensor for line 3' }], cases: { c1: 'decided', c2: 'handed', c3: 'asked' } });
  const log = NHStore.load();
  assert.strictEqual(mem['nexthub.demo.v1'], undefined, 'legacy key removed');
  const S = NHStore.reduce(SEED, log);
  const raised = S.cases.find(c => !c.seed);
  assert.ok(raised, 'sent row became a case');
  assert.strictEqual(raised.routeId, 'r1', 'route re-proposed from the title');
  assert.strictEqual(S.cases.find(c => c.id === 'c1').status, 'decided');
  assert.strictEqual(S.cases.find(c => c.id === 'c2').assignee, 'R. Nowak');
  assert.strictEqual(S.cases.find(c => c.id === 'c3').status, 'asked');
  NHStore.reset();
});

test('exportSnippet emits only session cases, with history as seedEvents', () => {
  const S = NHStore.reduce(SEED, { events: [ev(T.CASE_RAISED, 'Anonymous #4471', 'c_e', { title: 'Export me', routeId: 'r2', assignee: 'M. Roth' }, 1), ev(T.CASE_READ, 'M. Roth', 'c_e', {}, 2)], day: 3 });
  const txt = NHStore.exportSnippet(S);
  assert.ok(/id: "c_e"/.test(txt));
  assert.ok(/raisedDay: -2/.test(txt), 'raised on day 1 of 3 → -2 relative to a new today');
  assert.ok(/case\.read/.test(txt));
  assert.ok(!/"c1"/.test(txt), 'seed cases are not exported');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : '') + '\n');
