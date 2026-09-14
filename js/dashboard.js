// NextHub dashboard — component logic.
//
// The dc-runtime (support.js) evaluates the page's <script data-dc-script>
// with `DCLogic` in scope and expects it to yield a `Component` class.
// `DCLogic` only exists once the runtime has loaded React, so this file
// exposes a factory; the one-line script in index.html calls it at boot.
//
// Data constants (DEPTS, PROBLEMS, IDEAS, ROLES, CASES, ...) come from js/data.js.
//
// Three roles, three home screens:
//   employee → "mine"     what happened to what I sent + one field to raise something
//   lead     → "inbox"    open items addressed to me, sorted by age, one action each
//   manager  → "overview" what is waiting, how the system moves, where the waiting goes
//
// The dev panel (bottom-left) switches the role and turns demo data on/off.
// With demo data off every list renders its empty state and every figure
// reads "measured in pilot" — the honest day-one install.

window.createDashboardComponent = function (DCLogic) {

  const MONO = 'IBM Plex Mono, monospace';
  const CASE_ACTIONS = { decided: 'Decided', handed: 'Handed over', asked: 'Question sent' };

  // Everything that happens in the browser is an event in NHStore (js/store.js).
  // The seed rows in js/data.js never change; the page renders
  // reduce(seed, events). "Copy for data.js" exports session cases as rows.
  const SEED = () => ({ cases: CASES, ideas: IDEAS, problems: PROBLEMS, routes: ROUTES, promiseDays: PROMISE_DAYS });
  const E = NHStore.T;
  const median = xs => { if (!xs.length) return null; const a = xs.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  class Component extends DCLogic {
    constructor(props) {
      super(props);
      const role = ROLES.find(r => r.id === (props.defaultRole || 'manager')) || ROLES[2];
      this.state = {
        role: role.id, tab: props.defaultView || role.home, dept: role.dept,
        pid: 'p1', iid: 'i1', tid: 't3', cid: 'c1', sort: 'people',
        demo: props.demoData !== false, dev: false,
        q: '', pop: null, draft: '', log: NHStore.load(), toast: null,
        sheet: null, // the one input sheet: { kind, id, text, picked, people } — see sheetVals()
        mobile: false, menu: false
      };
      this.onKey = this.onKey.bind(this);
      this.onMedia = this.onMedia.bind(this);

      // ── actions: the only way UI code changes domain state ──────────────
      // Each appends one event as the current persona and re-renders. UI
      // pieces (buttons, sheets) call these; they never touch the log or the
      // reducer directly. Payload shapes: js/store.js, docs/ACTIONS_PLAN.md §2.2.
      const emit = (type, target, payload) => {
        const log = NHStore.append(this.state.log, { type, actor: this.actor(), target, payload: payload || {} });
        this.setState({ log });
        return log;
      };
      this.act = {
        raise: p => { const id = NHStore.newId('c'); emit(E.CASE_RAISED, id, p); return id; },
        read: id => emit(E.CASE_READ, id),
        decide: (id, answer, reason, note) => emit(E.CASE_DECIDED, id, { answer, reason, note }),
        hand: (id, to, why) => emit(E.CASE_HANDED, id, { to, why }),
        ask: (id, text) => emit(E.CASE_ASKED, id, { text }),
        answer: (id, text) => emit(E.CASE_ANSWERED, id, { text }),
        override: (id, proposed, chosen) => emit(E.ROUTE_OVERRIDDEN, id, { proposed, chosen }),
        cosign: ideaId => {
          const i = this.reduce().ideas.find(x => x.id === ideaId);
          const already = i && i.cosigners.some(x => x.name === this.actor());
          return emit(already ? E.IDEA_UNCOSIGNED : E.IDEA_COSIGNED, ideaId);
        },
        askIdea: (ideaId, text) => emit(E.IDEA_ASKED, ideaId, { text }),
        approve: (ideaId, team, note) => emit(E.IDEA_APPROVED, ideaId, { team, note }),
        fund: (ideaId, team, note) => emit(E.IDEA_FUNDED, ideaId, { team, note }),
        advanceDay: by => emit(E.DAY_ADVANCED, null, { by: by || 1 })
      };
    }

    // Who is acting: the employee posts under their handle, everyone else by name.
    actor() {
      const r = ROLES.find(x => x.id === this.state.role) || ROLES[2];
      return r.id === 'employee' && r.who.handle ? r.who.handle : r.who.name;
    }

    // Seed + log → state. Cheap; called once per render.
    reduce() { return NHStore.reduce(SEED(), this.state.log); }

    componentDidMount() {
      window.addEventListener('keydown', this.onKey);
      // Narrow viewports: the rail becomes an off-canvas drawer (see css/dashboard.css).
      this.mq = window.matchMedia('(max-width: 760px)');
      this.mq.addEventListener('change', this.onMedia);
      this.onMedia(this.mq);
    }
    componentWillUnmount() {
      window.removeEventListener('keydown', this.onKey);
      if (this.mq) this.mq.removeEventListener('change', this.onMedia);
      clearTimeout(this.toastTimer);
    }
    onMedia(e) { this.setState({ mobile: e.matches, menu: false }); }

    // ⌘K / Ctrl+K focuses the search box; Escape closes whatever is open.
    onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('nh-search');
        if (el) el.focus();
        this.setState({ pop: 'search' });
      } else if (e.key === 'Escape') {
        const el = document.getElementById('nh-search');
        if (el) el.blur();
        this.setState({ pop: null, q: '', menu: false, sheet: null });
      }
    }

    // ── the input sheet ──────────────────────────────────────────────────
    // One modal serves every action that needs input: a reason (pick one),
    // a line of text, or a set of people. `kind` decides which parts show and
    // what confirming does. Helpers add UI by opening a sheet, never by
    // inventing new state.
    openSheet(kind, id, init) { this.setState({ sheet: Object.assign({ kind, id, text: '', picked: null, people: [] }, init || {}), pop: null }); }
    closeSheet() { this.set('sheet', null); }
    patchSheet(patch) { this.setState({ sheet: Object.assign({}, this.state.sheet, patch) }); }

    // ── colours / small style helpers ───────────────────────────────────
    accent() { return this.props.accent || '#ff5a1f'; }
    accentInk() { return '#b23c07'; }
    accentSoft() { return '#ffe7dc'; }

    set(k, v) { this.setState({ [k]: v }); }

    toast(msg) {
      clearTimeout(this.toastTimer);
      this.setState({ toast: msg });
      this.toastTimer = setTimeout(() => this.setState({ toast: null }), 3600);
    }

    btn(kind) {
      const base = { flex: 1, textAlign: 'center', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' };
      if (kind === 'primary') return Object.assign(base, { background: INK, color: '#fff' });
      if (kind === 'accent') return Object.assign(base, { background: this.accent(), color: '#1a1a17', fontWeight: 800 });
      if (kind === 'disabled') return Object.assign(base, { background: '#f0efea', color: '#a0a099', cursor: 'default' });
      return Object.assign(base, { background: '#faf9f7', border: '1px solid #e6e5e0', color: '#5b5b5b' });
    }

    pill(bg, fg, weight) {
      return { background: bg, color: fg, borderRadius: '7px', padding: '4px 9px', fontSize: '11px', fontWeight: weight || 700, whiteSpace: 'nowrap', letterSpacing: '0.01em' };
    }

    statusStyle(s) {
      if (s === 'Awaiting decision' || s === 'Sent' || s === 'Question for you') return this.pill(this.accentSoft(), this.accentInk());
      if (s === 'Shipped') return this.pill(INK, '#fff');
      if (s === 'Approved') return this.pill('#dcf3e3', '#116634');
      if (s === 'In trial' || s === 'Building') return this.pill('#ecebe6', '#3d3d3a');
      return this.pill('transparent', MUTE, 600);
    }

    trendStyle(t) {
      if (t === 'Worsening') return this.pill(this.accentSoft(), this.accentInk());
      if (t === 'Improving') return this.pill('#dcf3e3', '#116634');
      return this.pill('#f0efea', '#5b5b5b', 600);
    }

    reasonStyle(r) {
      if (r === 'wrong department' || r === 'not responsible') return this.pill(this.accentSoft(), this.accentInk());
      return this.pill('#f0efea', '#5b5b5b', 600);
    }

    ownerLabel(o) { return o === 'none' ? 'No owner' : o === 'trial' ? 'Fix in trial' : 'Ideas submitted'; }
    ownerStyle(o) { return o === 'none' ? this.pill(INK, '#fff') : this.pill('#f0efea', '#5b5b5b', 600); }

    chip(active) {
      return { padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        background: active ? INK : '#fff', color: active ? '#fff' : '#5b5b5b', border: '1px solid ' + (active ? INK : '#e6e5e0'), whiteSpace: 'nowrap' };
    }

    navStyle(active) {
      return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '9px 10px', borderRadius: '9px',
        fontSize: '13.5px', fontWeight: active ? 700 : 600, cursor: 'pointer',
        background: active ? '#2e2e28' : 'transparent', color: active ? '#fbfbf9' : '#a3a29a' };
    }

    scopeStyle(active) {
      return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 10px', borderRadius: '8px',
        fontSize: '12.5px', fontWeight: active ? 700 : 500, cursor: 'pointer',
        background: active ? '#2e2e28' : 'transparent', color: active ? '#fbfbf9' : '#93928a' };
    }

    countStyle(active) { return { fontFamily: MONO, fontSize: '10px', color: active ? '#e4e3db' : '#a3a29a' }; }

    row(active) {
      return { display: 'flex', gap: '13px', alignItems: 'stretch', padding: '13px 0 12px', borderTop: '1px solid #f0efea', cursor: 'pointer',
        background: active ? '#faf9f7' : 'transparent' };
    }

    mark(active) { return { width: '3px', borderRadius: '999px', flex: 'none', background: active ? INK : 'transparent' }; }

    bars(spark, color) {
      return spark.map((v, i) => ({ style: { flex: 1, minWidth: '4px', height: (4 + v * 20) + 'px', borderRadius: '2px',
        background: color || (i < 3 ? '#dedcd5' : INK) } }));
    }

    flatBars() { return this.bars([0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15], '#e6e5e0'); }

    ini(name) { return !name || name.startsWith('Anonymous') || name === '—' ? '?' : name.split(' ').map(w => w[0]).join('').slice(0, 2); }

    deptName(id) { const d = DEPTS.find(x => x.id === id); return d ? d.name : id; }
    // The three case criteria as tags — the KPI tag is the routing criterion and gets the ink.
    criteriaCount(c) { return (c.fit ? 1 : 0) + (c.urgent ? 1 : 0) + (c.kpi ? 1 : 0); }
    criteriaTags(c) {
      const tag = (label, strong) => ({ label, style: this.pill(strong ? INK : '#f0efea', strong ? '#fff' : '#5b5b5b', 600) });
      const t = [];
      if (c.fit) t.push(tag('Strategic fit'));
      if (c.urgent) t.push(tag('Urgent'));
      if (c.kpi) t.push(tag('Moves: ' + c.kpi, true));
      if (!t.length) t.push({ label: 'No criterion met', style: this.pill('transparent', '#a0a099', 500) });
      return t;
    }
    deptLabel(ids) { return ids.length > 3 ? ids.slice(0, 3).map(i => this.deptName(i)).join(' · ') + ' +' + (ids.length - 3) : ids.map(i => this.deptName(i)).join(' · '); }

    matches(depts) { return this.state.dept === 'All' || depts.indexOf(this.state.dept) >= 0; }

    edgeLook(status) {
      if (status === 'Shipped') return { stroke: INK, dash: '0' };
      if (status === 'Awaiting decision') return { stroke: this.accent(), dash: '0' };
      if (status === 'Proposed') return { stroke: '#b9b9b4', dash: '7 7' };
      return { stroke: '#8c8c88', dash: '0' };
    }

    // ── routing: propose (never decide) the owning row for a piece of text ──
    propose(text) { return NHStore.propose(text); }

    todayPlus(days) {
      const d = new Date(); d.setDate(d.getDate() + days);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    // ── role switching / dev panel ───────────────────────────────────────
    setRole(id) {
      const r = ROLES.find(x => x.id === id) || ROLES[2];
      this.setState({ role: r.id, tab: r.home, dept: r.dept, pop: null, q: '', dev: false, menu: false });
    }

    resetDemo() {
      this.setState({ log: NHStore.reset(), draft: '', q: '', pop: null, dev: false });
      this.toast('Demo state reset');
    }

    // Session-created cases as CASES rows (with their history) for js/data.js.
    copySnippet() {
      const S = this.reduce();
      const txt = NHStore.exportSnippet(S);
      const n = S.cases.filter(c => !c.seed).length;
      if (!txt) { this.toast('Nothing new to copy — raise a case as the employee first.'); return; }
      const done = () => this.toast('Copied ' + n + (n === 1 ? ' case' : ' cases') + ' — paste into CASES in js/data.js.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => window.prompt('Copy this into js/data.js:', txt));
      else window.prompt('Copy this into js/data.js:', txt);
    }

    // ── derived rows for "My cases": facts in, sentences out ─────────────
    // A day offset (0 = demo today) as a short date; 'today' / 'yesterday' near now.
    fmtDay(d, S) {
      const rel = d - S.day;
      return rel === 0 ? 'today' : rel === -1 ? 'yesterday' : this.todayPlus(d);
    }

    // One case, seen by the person who raised it.
    mineRow(c, S) {
      const f = d => this.fmtDay(d, S);
      const P = PROMISE_DAYS, deputy = c.route ? (c.route.owner.name === c.assignee ? c.route.deputy : c.route.owner.name) : 'their deputy';
      const q = c.question, dec = c.decided, b = c.building, sh = c.shipped;
      const buildDay = b ? Math.min(b.days, S.day - b.day) : 0;
      const days = n => n + (n === 1 ? ' day' : ' days');
      const status = sh ? 'Shipped' : b ? 'Building' : dec ? (dec.answer === 'yes' ? 'Approved' : 'Declined') : c.status === 'asked' ? 'Question for you' : 'Sent';
      const steps = [
        ['Sent', f(c.raisedDay), 'done'],
        ['Read by a human', c.read !== null ? f(c.read) : 'pending', c.read !== null ? 'done' : 'now'],
        dec ? ['Decided', f(dec.day), 'done']
          : c.status === 'asked' ? ['Decided', 'question for you', 'now']
            : c.overdue ? ['Decided', 'overdue', 'late']
              : ['Decided', 'due ' + f(c.dueDay), c.read !== null ? 'now' : 'todo'],
        sh ? ['Shipped', f(sh.day), 'done']
          : b ? ['Shipped', 'due ' + f(b.day + b.days), 'now']
            : ['Shipped', '—', 'todo']
      ];
      const clock = sh ? 'Answered in ' + days(c.clock) + '. Live since ' + f(sh.day) + '.'
        : b ? 'Answered in ' + days(c.clock) + '. In build since ' + f(b.day) + ' — day ' + buildDay + ' of ' + b.days + '.'
          : dec ? (dec.answer === 'yes' ? 'Answered “yes” in ' : 'Answered “no” in ') + days(c.clock) + (dec.reason ? ' — ' + dec.reason : '') + '.'
            : c.status === 'asked' ? q.by + ' asked you a question ' + f(q.day) + '. The clock is paused until you answer.'
              : c.overdue ? c.clock + ' days waiting — ' + days(c.clock - P) + ' past the promise.' + (c.escalated ? ' Moved to ' + c.escalated.to + ' automatically.' : '')
                : c.read !== null ? c.assignee + ' read this ' + f(c.read) + '. They owe you a yes, a no or a question by ' + f(c.dueDay) + '.'
                  : 'Sent to ' + c.assignee + '. They owe you a yes, a no or a question by ' + f(c.dueDay) + '.';
      const answered = q && q.answer && !dec;
      const reply = dec ? (dec.note || (dec.answer === 'yes' ? 'Yes — we are doing this.' : 'No.' + (dec.reason ? ' Reason: ' + dec.reason + '.' : '')))
        : c.status === 'asked' ? '“' + (q.text || 'One question for you before this can be decided.') + '”'
          : answered ? '“' + (q.text || 'One question.') + '” — you answered: “' + q.answer.text + '”. The clock is running again.'
            : c.handed.length ? 'Handed from ' + c.handed[c.handed.length - 1].from + ' to ' + c.assignee + ' ' + f(c.handed[c.handed.length - 1].day) + '. The clock kept running.'
              : 'No reply yet. ' + c.assignee + ' has been told; if they miss the date it moves to ' + deputy + ' automatically.';
      const replyBy = dec ? dec.by + ' · ' + f(dec.day) : c.status === 'asked' ? q.by + ' · ' + f(q.day) : answered ? q.by + ' · ' + f(q.day) + ', you · ' + f(q.answer.day) : 'the ' + P + '-day clock started ' + f(c.raisedDay);
      return {
        id: c.id, sortDay: c.raisedDay, title: c.title, status, overdue: c.overdue,
        canReply: c.status === 'asked', replyTo: q ? q.by : '',
        submitted: 'You raised this ' + f(c.raisedDay) + ' · ' + c.from,
        clock, steps, reply, replyBy,
        outcome: sh ? sh.outcome : b && b.expected ? 'expected ' + b.expected : 'pending',
        outcomeNote: sh ? sh.outcomeNote : b ? 'will be measured ' + OUTCOME_DAYS + ' days after launch' : 'measured ' + OUTCOME_DAYS + ' days after launch'
      };
    }

    // An idea I co-signed, as a row in My cases.
    cosignRow(i, S, handle) {
      const f = d => this.fmtDay(d, S);
      const P = PROMISE_DAYS, cs = i.cosigners.find(x => x.name === handle), since = cs ? cs.day : 0;
      const waiting = i.status === 'Awaiting decision', late = waiting && i.wait > P, ap = i.approved;
      const raised = -(i.wait || 0), lead = i.team[0] === '—' ? 'the proposer' : i.team[0];
      return {
        id: i.id, sortDay: since, title: i.title, status: i.status, overdue: late,
        submitted: 'You co-signed this ' + f(since) + ' · ' + handle,
        clock: ap ? 'Approved ' + f(ap.day) + ' by ' + ap.by + '.' + (i.team[0] !== '—' ? ' ' + i.team.filter(n => n !== 'Anonymous').join(', ') + ' are on it.' : '')
          : waiting ? i.wait + ' days waiting' + (late ? ' — ' + (i.wait - P) + ' days past the promise. Escalated one level up.' : '. Answer owed by ' + f(raised + P) + '.')
            : i.status === 'Shipped' ? 'Shipped. ' + (i.expected || '') : i.status + '. ' + (i.expected || ''),
        steps: [
          ['Sent', f(raised), 'done'],
          ['Read by a human', f(raised + 1), 'done'],
          ap ? ['Decided', f(ap.day), 'done'] : waiting ? (late ? ['Decided', 'overdue', 'late'] : ['Decided', 'due ' + f(raised + P), 'now']) : ['Decided', '—', i.status === 'Unfunded' ? 'todo' : 'done'],
          i.status === 'Shipped' ? ['Shipped', 'live', 'done'] : ['Shipped', '—', 'todo']
        ],
        reply: i.teamNote, replyBy: lead + ' · proposer',
        outcome: ap ? 'approved' : i.status === 'Shipped' ? i.expected : 'pending',
        outcomeNote: i.upside && i.upside !== 'not modelled' ? i.upside + ' / yr expected' + (ap || i.status === 'Shipped' ? '' : ' if approved') : 'upside not modelled yet'
      };
    }

    // View model for the input sheet. Returns a closed sheet when none is open.
    sheetVals(S, who) {
      const sh = this.state.sheet;
      const none = { open: false, eyebrow: '', title: '', sub: '', hasOptions: false, options: [], hasText: false, text: '', onText: () => {}, textLabel: '', placeholder: '',
        hasPeople: false, people: [], primaryLabel: '', primaryStyle: this.btn('disabled'), onConfirm: () => {}, onCancel: () => this.closeSheet(), note: '' };
      if (!sh) return none;
      const c = S.cases.find(x => x.id === sh.id), i = S.ideas.find(x => x.id === sh.id);
      const text = (sh.text || '').trim();
      const optStyle = on => ({ display: 'block', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', border: '1px solid ' + (on ? INK : '#e6e5e0'), background: on ? '#1a1a17' : '#faf9f7' });
      const optLabel = on => ({ fontSize: '12.5px', fontWeight: 700, color: on ? '#fff' : '#141414', lineHeight: 1.35 });
      const optSub = on => ({ fontSize: '11px', color: on ? '#c9c8c0' : '#8c8c88', marginTop: '3px', lineHeight: 1.4 });
      const options = list => list.map(o => ({ label: o.label, sub: o.sub || '', style: optStyle(sh.picked === o.id), labelStyle: optLabel(sh.picked === o.id), subStyle: optSub(sh.picked === o.id), onSel: () => this.patchSheet({ picked: o.id }) }));
      const chip = on => ({ display: 'inline-flex', alignItems: 'center', gap: '7px', borderRadius: '999px', padding: '6px 11px 6px 6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
        border: '1px solid ' + (on ? INK : '#e6e5e0'), background: on ? '#1a1a17' : '#faf9f7', color: on ? '#fff' : '#141414' });
      const ini = on => ({ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: '9px', background: on ? '#fff' : INK, color: on ? INK : '#fff' });
      const people = names => names.map(n => { const on = sh.people.indexOf(n) >= 0; return { name: n, ini: this.ini(n), style: chip(on), iniStyle: ini(on),
        onSel: () => this.patchSheet({ people: on ? sh.people.filter(x => x !== n) : sh.people.concat([n]) }) }; });
      const onText = e => this.patchSheet({ text: e.target.value });
      const done = (msg, extra) => { this.setState(Object.assign({ sheet: null }, extra || {})); this.toast(msg); };
      const base = Object.assign({}, none, { open: true, onText });

      if (sh.kind === 'no' && c) {
        const ok = !!sh.picked;
        return Object.assign(base, {
          eyebrow: 'No, and why', title: c.title, sub: c.from + ' is told today. A no with a reason beats silence; pick the one that is true.',
          hasOptions: true, options: options([
            { id: 'not now', label: 'Not now', sub: 'a real no from you — say why below' },
            { id: 'wrong department', label: 'Wrong department', sub: 'it belongs to someone else — consider handing it over instead' },
            { id: 'not responsible', label: 'Nobody owns this', sub: 'the map has no entry — it goes back to the department head' },
            { id: 'no time', label: 'No time this quarter', sub: 'you would take it, the plan is full' },
            { id: 'is it important', label: 'Does not rank', sub: 'against what the team has on, it is not the next thing' }
          ]),
          hasText: true, text: sh.text, textLabel: 'One line for ' + c.from + ' (optional)', placeholder: 'e.g. Q4 at the earliest — the fixture team is on the 4-series until then',
          primaryLabel: ok ? 'Send the no' : 'Pick a reason', primaryStyle: this.btn(ok ? 'primary' : 'disabled'),
          onConfirm: () => { if (!ok) return; this.act.decide(c.id, 'no', sh.picked, text); done('Answered “no” in ' + c.clock + ' days — ' + sh.picked + '. ' + c.from + ' has been told.'); }
        });
      }
      if (sh.kind === 'ask' && c) {
        const ok = text.length >= 4;
        return Object.assign(base, {
          eyebrow: 'Ask one question', title: c.title, sub: 'One question, not a form. The clock pauses until ' + c.from + ' answers; it lands in their My cases.',
          hasText: true, text: sh.text, textLabel: 'Your question', placeholder: 'e.g. Which belt size — the 40 mm or the 60 mm?',
          primaryLabel: ok ? 'Send the question' : 'Type the question', primaryStyle: this.btn(ok ? 'primary' : 'disabled'),
          onConfirm: () => { if (!ok) return; this.act.ask(c.id, text); done('Question sent to ' + c.from + '. The clock is paused at ' + c.clock + ' d.'); }
        });
      }
      if (sh.kind === 'reply' && c && c.question) {
        const ok = text.length >= 2;
        return Object.assign(base, {
          eyebrow: 'Answer ' + c.question.by, title: '“' + (c.question.text || 'One question.') + '”', sub: 'Your answer goes straight back; the clock on ' + c.question.by + ' starts again the moment you send it.',
          hasText: true, text: sh.text, textLabel: 'Your answer', placeholder: 'Short is fine.',
          primaryLabel: ok ? 'Send the answer' : 'Type your answer', primaryStyle: this.btn(ok ? 'accent' : 'disabled'),
          onConfirm: () => { if (!ok) return; this.act.answer(c.id, text); done('Answered. ' + c.question.by + '’s clock is running again.'); }
        });
      }
      if (sh.kind === 'hand' && c) {
        const route = c.route;
        const cands = [];
        const add = (name, sub) => { if (name && name !== who.name && !cands.some(x => x.id === name)) cands.push({ id: name, label: name, sub }); };
        if (route) {
          if (route.owner.name !== who.name) add(route.owner.name, 'the map’s owner · ' + route.owner.role + ', ' + this.deptName(route.owner.dept));
          add(route.deputy, route.owner.name === who.name ? 'your deputy for this row' : 'deputy on this row');
          add((route.buddy || '').split(' · ')[0], 'buddy for this row · ' + ((route.buddy || '').split(' · ')[1] || ''));
        }
        BUDDIES.forEach(b => add(b.name, 'your buddy in ' + b.dept + ' · ' + b.note));
        const ok = !!sh.picked;
        return Object.assign(base, {
          eyebrow: 'Hand over', title: c.title, sub: 'Sideways, not up. Whoever you pick gets it in their inbox with the clock still running; ' + c.from + ' is told who has it now.',
          hasOptions: true, options: options(cands),
          hasText: true, text: sh.text, textLabel: 'Why them (optional)', placeholder: 'e.g. Quality owns the gauge — we only see the symptom',
          primaryLabel: ok ? 'Hand to ' + sh.picked : 'Pick a person', primaryStyle: this.btn(ok ? 'accent' : 'disabled'),
          onConfirm: () => { if (!ok) return; this.act.hand(c.id, sh.picked, text); done('Handed to ' + sh.picked + '. Both of you and ' + c.from + ' have been told. The clock keeps running.'); }
        });
      }
      if (sh.kind === 'assign' && i) {
        const funded = i.status === 'Unfunded';
        const names = [];
        const add = n => { if (n && n !== '—' && n !== 'Anonymous' && names.indexOf(n) < 0) names.push(n); };
        i.team.forEach(add);
        const p = S.problems.find(x => x.id === i.problem);
        ROUTES.filter(r => p && p.depts.indexOf(r.owner.dept) >= 0).forEach(r => { add(r.owner.name); add(r.deputy); });
        BUDDIES.forEach(b => add(b.name));
        const ok = sh.people.length > 0;
        return Object.assign(base, {
          eyebrow: funded ? 'Fund a trial' : 'Approve and assign', title: i.title,
          sub: (funded ? 'A trial needs people more than money. ' : 'Approving stops the clock; naming the team is what makes it real. ') + 'Pick who runs it — they are told today, and the proposer is credited.',
          hasPeople: true, people: people(names),
          hasText: true, text: sh.text, textLabel: 'One line to the team (optional)', placeholder: funded ? 'e.g. Four weeks, one site, measure the wait before and after' : 'e.g. Start with the two pilot sites; report on Thursday',
          primaryLabel: ok ? (funded ? 'Fund it with ' : 'Approve with ') + sh.people.length + (sh.people.length === 1 ? ' person' : ' people') : 'Pick at least one person',
          primaryStyle: this.btn(ok ? 'accent' : 'disabled'),
          onConfirm: () => { if (!ok) return; (funded ? this.act.fund : this.act.approve)(i.id, sh.people, text); done((funded ? 'Trial funded. ' : 'Approved. ') + sh.people.join(', ') + (sh.people.length === 1 ? ' has' : ' have') + ' been told; the clock is stopped.'); }
        });
      }
      if (sh.kind === 'askIdea' && i) {
        const to = i.team[0] === '—' ? 'the proposer' : i.team[0];
        const ok = text.length >= 4;
        return Object.assign(base, {
          eyebrow: 'Ask a question', title: i.title, sub: 'Goes to ' + to + '. It shows under the idea for everyone, so the answer is asked once.',
          hasText: true, text: sh.text, textLabel: 'Your question', placeholder: 'e.g. What happened at the two pilot sites when a purchase went wrong?',
          primaryLabel: ok ? 'Ask ' + to : 'Type the question', primaryStyle: this.btn(ok ? 'primary' : 'disabled'),
          onConfirm: () => { if (!ok) return; this.act.askIdea(i.id, text); done('Question posted under “' + i.title + '”. ' + to + ' has been told.'); }
        });
      }
      return none;
    }

    renderVals() {
      const s = this.state;
      const S = this.reduce();
      const role = ROLES.find(r => r.id === s.role) || ROLES[2];
      const who = role.who;
      const isEmployee = s.role === 'employee', isLead = s.role === 'lead', isManager = s.role === 'manager';
      const demo = s.demo;
      const view = VIEWS[s.tab] || VIEWS.overview;

      // Demo data on/off: one switch, every list reads through it.
      // Cases and ideas come from the store (seed + events); with demo data
      // off only what was created in this browser remains.
      const D = {
        problems: demo ? S.problems : [], ideas: demo ? S.ideas : [], initiatives: demo ? INITIATIVES : [],
        outcomes: demo ? OUTCOMES : [],
        cases: demo ? S.cases : S.cases.filter(c => !c.seed), waitingOn: demo ? WAITING_ON : [], buddies: BUDDIES, stall: demo ? STALL : []
      };
      const dash = v => demo ? v : '—';
      const cnt = n => n ? String(n) : '';

      // ── counts: everything below is counted from js/data.js ──
      const N = {
        people: DEPTS.reduce((a, d) => a + d.people, 0),
        problems: D.problems.length, ideas: D.ideas.length, initiatives: D.initiatives.length,
        signals: D.problems.reduce((a, p) => a + p.signals.length, 0),
        awaiting: D.ideas.filter(i => i.status === 'Awaiting decision').length,
        noOwner: D.ideas.filter(i => i.team.length === 1 && i.team[0] === '—').length,
        funded: D.ideas.filter(i => ['In trial', 'Building', 'Shipped'].indexOf(i.status) >= 0).length,
        shippedIdeas: D.ideas.filter(i => i.status === 'Shipped').length,
        shippedTeams: D.initiatives.filter(t => t.status === 'Shipped').length,
        teamsInMotion: D.initiatives.filter(t => t.people > 0 && t.status !== 'Shipped').length,
        overdueIdeas: D.ideas.filter(i => i.status === 'Awaiting decision' && i.wait > PROMISE_DAYS).length
      };

      // ── rail ──
      const openCases = D.cases.filter(c => c.assignee === who.name && c.open);
      const deskCases = D.cases.filter(c => c.assignee === who.name && (c.open || c.status === 'asked'));
      const mineCases = D.cases.filter(c => c.from === who.handle);
      const mineCount = mineCases.length + D.ideas.filter(i => i.cosigners.some(x => x.name === who.handle)).length;
      const navDefs = isEmployee
        ? [['mine', 'My cases', cnt(mineCount)], ['problems', 'Problems', cnt(N.problems)], ['ideas', 'Ideas', cnt(N.ideas)], ['progress', 'Progress', '']]
        : isLead
          ? [['inbox', 'Inbox', cnt(openCases.length)], ['problems', 'Problems', cnt(N.problems)], ['ideas', 'Ideas', cnt(N.ideas)],
            ['network', 'Collaboration', cnt(N.initiatives)], ['progress', 'Progress', '']]
          : [['overview', 'Overview', ''], ['problems', 'Problems', cnt(N.problems)], ['ideas', 'Ideas', cnt(N.ideas)],
            ['network', 'Collaboration', cnt(N.initiatives)], ['progress', 'Progress', '']];
      const navItems = navDefs.map(([id, label, count]) => ({
        label, count, onSel: () => this.setState({ tab: id, pop: null, menu: false }), style: this.navStyle(s.tab === id), countStyle: this.countStyle(s.tab === id)
      }));

      const scopeItems = [{ id: 'All', name: 'All departments', people: N.people }].concat(DEPTS).map(d => {
        const id = d.id || 'All', active = s.dept === id;
        return { label: d.name, people: fmt(d.people),
          onSel: () => this.setState({ dept: id, menu: false }), style: this.scopeStyle(active), countStyle: this.countStyle(active) };
      });

      const sorts = [['people', 'Most people'], ['trend', 'Getting worse'], ['age', 'Longest open']].map(([id, label]) => ({
        label, onSel: () => this.set('sort', id), style: this.chip(s.sort === id)
      }));

      const openIdea = id => () => this.setState({ tab: 'ideas', iid: id, pop: null, q: '' });
      const openProblem = id => () => this.setState({ tab: 'problems', pid: id, pop: null, q: '' });
      const openInitiative = id => () => this.setState({ tab: 'network', tid: id, pop: null, q: '' });
      const openCase = id => () => this.setState({ tab: 'inbox', cid: id, pop: null, q: '' });

      // ── problems ──
      const decorateIdea = i => ({
        id: i.id, title: i.title, criteria: this.criteriaTags(i.criteria), status: i.status, effort: i.effort, expected: i.expected,
        expectedShort: i.expected, proposedBy: i.proposedBy,
        problemTitle: (PROBLEMS.find(p => p.id === i.problem) || {}).title || '—',
        statusStyle: this.statusStyle(i.status),
        rowStyle: this.row(s.iid === i.id), markStyle: this.mark(s.iid === i.id), onOpen: openIdea(i.id)
      });

      const ideaPool = D.ideas.filter(i => this.matches((PROBLEMS.find(p => p.id === i.problem) || { depts: [] }).depts));
      const ideas = ideaPool.slice().sort((a, b) => this.criteriaCount(b.criteria) - this.criteriaCount(a.criteria) || b.wait - a.wait).map(decorateIdea);

      const problemPool = D.problems.filter(p => this.matches(p.depts));
      const sorted = problemPool.slice().sort((a, b) => {
        if (s.sort === 'people') return b.people - a.people;
        if (s.sort === 'trend') return (b.spark[6] - b.spark[0]) - (a.spark[6] - a.spark[0]);
        return (b.months || 0) - (a.months || 0);
      });

      const decorateProblem = p => ({
        id: p.id, title: p.title, sub: p.sub, people: p.people, peopleLabel: p.people + ' ppl', trend: p.trend, age: p.age,
        trendStyle: this.trendStyle(p.trend), ownerLabel: this.ownerLabel(p.owner), ownerStyle: this.ownerStyle(p.owner),
        deptLabel: this.deptLabel(p.depts), source: p.months >= 9 ? 'found in interviews' : 'reported in the app',
        bars: this.bars(p.spark, p.trend === 'Improving' ? '#c9c8c1' : undefined),
        rowStyle: this.row(s.pid === p.id), markStyle: this.mark(s.pid === p.id), onOpen: openProblem(p.id)
      });

      const problems = sorted.map(decorateProblem);
      const sp0 = sorted.some(p => p.id === s.pid) ? sorted.find(p => p.id === s.pid) : sorted[0];
      const sp = sp0 ? {
        eyebrow: 'Selected problem',
        title: sp0.title, detail: sp0.detail, people: sp0.people, timeLost: sp0.timeLost, signals: sp0.signals,
        linked: sp0.ideas.map(id => D.ideas.find(i => i.id === id)).filter(Boolean).map(i => ({
          title: i.title, status: i.status, statusStyle: this.statusStyle(i.status), onOpen: openIdea(i.id)
        }))
      } : {
        eyebrow: 'Nothing selected',
        title: 'No problem to show',
        detail: demo ? 'No problems are recorded for this department yet. Clear the scope to see the rest of the company.'
          : 'Nothing has been raised yet. The first forwarded thread or typed problem opens a case here.',
        people: '0', timeLost: '—', signals: [], linked: []
      };

      // ── ideas ──
      const si0 = ideas.some(i => i.id === s.iid) ? ideaPool.find(i => i.id === s.iid) : (ideaPool[0] || null);
      const sip = si0 ? (D.problems.find(p => p.id === si0.problem) || {}) : {};
      const decidable = si0 && si0.status === 'Awaiting decision';
      const fundable = si0 && si0.status === 'Unfunded';
      const cosigned = !!si0 && si0.cosigners.some(x => x.name === who.handle);
      const si = si0 ? {
        title: si0.title, status: si0.status, statusStyle: this.statusStyle(si0.status),
        waitLabel: si0.wait ? 'waiting ' + si0.wait + ' days' : si0.status === 'Shipped' ? 'live' : 'no owner assigned',
        rationale: si0.rationale, upside: si0.upside, effort: si0.effort,
        problemTitle: sip.title || '—', problemSub: sip.sub || '',
        onOpenProblem: sip.id ? openProblem(sip.id) : () => {},
        cosigners: si0.cosigners.length, cosignLabel: si0.cosigners.length ? si0.cosigners.length + (si0.cosigners.length === 1 ? ' co-signer' : ' co-signers') : '',
        primaryBtnLabel: isEmployee ? (cosigned ? 'Co-signed ✓' : 'Co-sign this idea') : decidable ? 'Approve and assign' : fundable ? 'Fund a trial' : 'Open the trial',
        onPrimary: () => {
          if (isEmployee) { this.act.cosign(si0.id); this.toast(cosigned ? 'Co-sign withdrawn from “' + si0.title + '”.' : 'You co-signed “' + si0.title + '”. Credit follows your handle.'); }
          else if (decidable || fundable) this.openSheet('assign', si0.id, { people: si0.team.filter(n => n !== '—' && n !== 'Anonymous') });
          else this.toast('Opened ' + si0.title + '.');
        },
        primaryBtnStyle: { flex: 1, textAlign: 'center', background: (decidable || fundable) && !isEmployee ? this.accent() : cosigned ? '#f0efea' : INK, color: cosigned ? '#5b5b5b' : (decidable || fundable) && !isEmployee ? '#1a1a17' : '#fff', borderRadius: '10px',
          padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' },
        onAsk: () => this.openSheet('askIdea', si0.id),
        hasThread: si0.thread.length > 0,
        thread: si0.thread.map(t => ({ text: '“' + t.text + '”', by: t.by + ' · ' + this.fmtDay(t.day, S), ini: this.ini(t.by) })),
        approvedNote: si0.approved ? (si0.approved.funded ? 'Trial funded ' : 'Approved ') + this.fmtDay(si0.approved.day, S) + ' by ' + si0.approved.by + (si0.approved.note ? ' — “' + si0.approved.note + '”' : '') : '',
        team: si0.team.map(n => ({ name: n === '—' ? 'Nobody assigned' : n, ini: this.ini(n) })), teamNote: si0.teamNote
      } : {
        title: 'No idea to show', status: '', statusStyle: {}, waitLabel: '',
        rationale: demo ? 'No ideas are tied to problems in this department yet.' : 'Ideas appear here as step three of a case — once a problem exists, whoever raised it (or anyone else) can propose the fix.',
        upside: '—', effort: '—', problemTitle: '—', problemSub: '', onOpenProblem: () => {},
        primaryBtnLabel: 'Nothing to decide', onPrimary: () => {}, primaryBtnStyle: { flex: 1, textAlign: 'center', background: '#f0efea', color: '#a0a099', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 700 },
        onAsk: () => {}, team: [], teamNote: '', cosigners: 0, cosignLabel: '', hasThread: false, thread: [], approvedNote: ''
      };

      // ── collaboration ──
      const activeIds = D.initiatives.filter(t => this.matches(t.depts)).map(t => t.id);
      const initiatives = D.initiatives.map(t => ({
        id: t.id, name: t.name, status: t.status, statusStyle: this.statusStyle(t.status),
        deptLabel: t.depts.map(d => this.deptName(d)).join(' × '),
        peopleLabel: t.people ? t.people + ' people' : 'nobody assigned',
        rowStyle: this.row(s.tid === t.id), markStyle: this.mark(s.tid === t.id),
        onOpen: openInitiative(t.id)
      })).filter(t => activeIds.indexOf(t.id) >= 0);

      const st0 = D.initiatives.find(t => t.id === s.tid) || D.initiatives[0];
      const st = st0 ? {
        name: st0.name, status: st0.status, statusStyle: this.statusStyle(st0.status), stage: st0.stage, why: st0.why,
        depts: st0.depts.map(d => ({ name: this.deptName(d) })),
        members: st0.members.map(m => ({ name: m.name, role: m.role, ini: this.ini(m.name) }))
      } : { name: 'No cross-team work yet', status: '', statusStyle: {}, stage: '', why: 'the first case that needs two departments will appear here', depts: [], members: [] };

      const waiting = D.ideas.filter(i => i.status === 'Awaiting decision').sort((a, b) => b.wait - a.wait);
      const decisions = waiting.map(i => ({
        title: i.title, days: i.wait + ' days', blocker: i.blocker || i.teamNote, upside: i.upside,
        dueLabel: i.wait > PROMISE_DAYS ? (i.wait - PROMISE_DAYS) + ' days past the promise · escalated one level up' : 'answer owed in ' + (PROMISE_DAYS - i.wait) + ' days',
        dueStyle: { fontFamily: MONO, fontSize: '11px', fontWeight: 600, lineHeight: 1.4, color: i.wait > 14 ? this.accent() : '#c9c8c0' },
        dayStyle: { fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: i.wait > 20 ? '#1a1a17' : '#d6d5cd',
          background: i.wait > 20 ? this.accent() : '#33332e', borderRadius: '6px', padding: '4px 8px', whiteSpace: 'nowrap' },
        onOpen: openIdea(i.id)
      }));

      const GCOLS = 4, GCELLW = 145, GCELLH = 230, GPADX = 20, GPADY = 60;
      const clusterCenter = idx => ({ x: GPADX + (idx % GCOLS) * GCELLW + GCELLW / 2, y: GPADY + Math.floor(idx / GCOLS) * GCELLH + GCELLH / 2 });
      const clusters = [], nodes = [], edges = [];

      D.initiatives.forEach((t, idx) => {
        const c = clusterCenter(idx);
        const rel = this.matches(t.depts);
        const active = s.tid === t.id;
        const op = active ? 1 : rel ? 0.85 : 0.22;
        const look = this.edgeLook(t.status);
        const members = t.members.filter(m => m.name !== '—');
        const count = members.length;
        const ringR = count <= 1 ? 0 : count <= 4 ? 30 : 38;

        clusters.push({
          rx: c.x - 62, ry: c.y - 92, rw: 124, rh: 156,
          fill: active ? '#fff' : '#faf9f7', stroke: active ? INK : '#eeede8', op,
          labelX: c.x, labelY: c.y - 74, label: t.name,
          metaX: c.x, metaY: c.y + 68, meta: count ? (count + (count === 1 ? ' person' : ' people')) : 'nobody assigned',
          onSel: () => this.set('tid', t.id)
        });

        const pts = members.map((m, i) => {
          const a = (-90 + i * (360 / Math.max(count, 1))) * Math.PI / 180;
          return { m, x: c.x + ringR * Math.cos(a), y: c.y + ringR * Math.sin(a) };
        });

        for (let a = 0; a < pts.length; a++) {
          for (let b = a + 1; b < pts.length; b++) {
            edges.push({ d: 'M ' + pts[a].x + ' ' + pts[a].y + ' L ' + pts[b].x + ' ' + pts[b].y,
              stroke: look.stroke, dash: look.dash, w: 1.6, op, onOpen: () => this.set('tid', t.id) });
          }
        }

        if (!count) {
          nodes.push({ ini: '?', x: c.x, y: c.y, r: 16, fill: '#f4f3f0', textFill: '#a0a099', op, title: '', meta: '', onSel: () => this.set('tid', t.id) });
        } else {
          pts.forEach(p => {
            nodes.push({ ini: this.ini(p.m.name), x: p.x, y: p.y, r: 15, fill: active ? INK : '#fff', textFill: active ? '#fff' : '#141414',
              op, title: p.m.name, meta: p.m.role, onSel: () => this.set('tid', t.id) });
          });
        }
      });

      // ── manager overview ──
      const delta = up => ({ fontSize: '11.5px', fontWeight: 700, color: up ? '#116634' : this.accentInk(),
        background: up ? '#dcf3e3' : this.accentSoft(), borderRadius: '6px', padding: '3px 7px', display: demo ? 'inline' : 'none' });

      const kpi = (label, value, d, up, sub, spark) => ({
        label, value: dash(value), delta: d, deltaStyle: delta(up), sub: demo ? sub : 'measured in pilot',
        bars: demo ? this.bars(spark) : this.flatBars()
      });
      const M = METRICS;
      const was = str => parseInt(String(str).replace(/[^\d]/g, ''), 10);
      const kpis = [
        kpi('Idea → decision', M.ideaToDecision.now, M.ideaToDecision.was, true, 'median to the decision itself, last 30 days — the first answer comes sooner', M.ideaToDecision.spark),
        kpi('Shipped this year', String(N.shippedTeams), M.shippedWas, N.shippedTeams >= was(M.shippedWas), M.stoppedEarly + ' stopped early, on purpose', M.shippedSpark),
        kpi('Value booked', M.valueBooked.now, M.valueBooked.delta, true, M.valueBooked.sub, M.valueBooked.spark),
        kpi('Waiting days saved', M.waitingDaysSaved.now, 'vs old route', true, 'across ' + N.ideas + ' ideas, since the clock came in', M.waitingDaysSaved.spark),
        kpi('Ideas with no owner', String(N.noOwner), M.noOwnerWas, N.noOwner <= was(M.noOwnerWas), 'of ' + N.ideas + ' in play · ' + N.teamsInMotion + ' teams in motion', M.noOwnerSpark)
      ];

      const stallMax = Math.max.apply(null, [1].concat(D.stall.map(x => x.days)));
      const stall = D.stall.map((x, i) => ({
        reason: x.reason, days: x.days + ' d', share: '', note: x.note,
        barStyle: { height: '10px', borderRadius: '999px', width: Math.round(x.days / stallMax * 100) + '%', background: i < 2 ? this.accent() : INK }
      }));

      const live = type => s.log.events.filter(e => e.type === type).length;
      const ledger = {
        firstAnswer: dash(LEDGER.firstAnswer), firstAnswerWas: demo ? LEDGER.firstAnswerWas : 'measured in pilot',
        withinPromise: dash(LEDGER.withinPromise), withinPromiseWas: demo ? LEDGER.withinPromiseWas : 'measured in pilot',
        overrides: dash(live(E.ROUTE_OVERRIDDEN) ? ((parseFloat(LEDGER.overrides) || 0) + live(E.ROUTE_OVERRIDDEN)) + '%' : LEDGER.overrides), overridesNote: demo ? LEDGER.overridesNote : 'every overruled proposal is logged — this number is the map’s accuracy',
        escalated: dash(String(LEDGER.escalated)), handedOver: dash(String(LEDGER.handedOver + live(E.CASE_HANDED)))
      };

      // ── employee: my cases + intake ──
      const stepTone = { done: INK, now: this.accent(), late: this.accent(), todo: '#dedcd5' };
      const mine = mineCases.map(c => this.mineRow(c, S))
        .concat(D.ideas.filter(i => i.cosigners.some(x => x.name === who.handle)).map(i => this.cosignRow(i, S, who.handle)))
        .sort((a, b) => b.sortDay - a.sortDay);
      const myIdeas = mine.map(m => ({
        canReply: !!m.canReply, replyLabel: 'Answer ' + m.replyTo, onReply: () => this.openSheet('reply', m.id),
        title: m.title, submitted: m.submitted, status: m.status, statusStyle: this.statusStyle(m.status),
        clock: m.clock,
        clockStyle: { fontSize: '12px', fontWeight: 600, lineHeight: 1.5, marginTop: '13px', padding: '9px 11px', borderRadius: '9px',
          background: m.overdue ? this.accentSoft() : '#faf9f7', border: '1px solid ' + (m.overdue ? '#f7d6c5' : '#eeede8'),
          color: m.overdue ? this.accentInk() : '#5b5b5b' },
        reply: m.reply, replyBy: m.replyBy, outcome: m.outcome, outcomeNote: m.outcomeNote,
        steps: m.steps.map(([label, when, tone]) => ({
          label, when,
          barStyle: { height: '4px', borderRadius: '999px', background: stepTone[tone] },
          labelStyle: { fontSize: '11.5px', fontWeight: 700, marginTop: '7px', lineHeight: 1.3, color: tone === 'todo' ? '#a0a099' : tone === 'done' ? INK : this.accentInk() }
        }))
      }));

      const proposal = this.propose(s.draft);
      const pr = proposal && proposal.route;
      const intake = {
        draft: s.draft,
        onDraft: e => this.set('draft', e.target.value),
        hasProposal: !!pr,
        noMatch: !!proposal && !pr,
        matched: pr ? pr.type : '',
        ownerName: pr ? pr.owner.name : '', ownerIni: pr ? this.ini(pr.owner.name) : '?',
        ownerRole: pr ? pr.owner.role + ' · ' + this.deptName(pr.owner.dept) : '',
        deputy: pr ? pr.deputy : '', buddy: pr ? pr.buddy : '', wait: pr ? pr.wait : '',
        confidence: pr ? proposal.confidence + '%' : '',
        confStyle: { fontFamily: MONO, fontSize: '10.5px', fontWeight: 700, borderRadius: '6px', padding: '3px 7px',
          background: pr && proposal.confidence >= 78 ? '#dcf3e3' : this.accentSoft(), color: pr && proposal.confidence >= 78 ? '#116634' : this.accentInk() },
        sendLabel: pr ? 'Send to ' + pr.owner.name : 'Send — a human will route it',
        sendStyle: { flex: 1, textAlign: 'center', background: s.draft.trim().length >= 8 ? this.accent() : '#33332e', color: s.draft.trim().length >= 8 ? '#1a1a17' : '#7d7c73',
          borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 800, cursor: s.draft.trim().length >= 8 ? 'pointer' : 'default' },
        onSend: () => {
          if (s.draft.trim().length < 8) return;
          const owner = pr ? pr.owner.name : 'Triage desk';
          const due = this.todayPlus(S.day + PROMISE_DAYS);
          this.act.raise({ title: s.draft.trim(), body: '', routeId: pr ? pr.id : null, assignee: owner, fromDept: who.line, reason: pr ? 'triage' : 'not responsible' });
          this.set('draft', '');
          this.toast('Sent to ' + owner + '. Answer owed by ' + due + '.');
        },
        onWrong: () => this.toast('Noted — a human routes it instead, and the override is logged against the map.')
      };

      const buddies = D.buddies.map(b => ({ name: b.name, ini: b.ini, dept: b.dept, note: b.note,
        onSel: () => this.toast('Opens a direct line to ' + b.name + ' (' + b.dept + ') — sideways, not up the tree.') }));

      const promises = [
        { n: PROMISE_DAYS + ' d', label: 'to a yes, a no or a question — from a named person, not a form' },
        { n: OUTCOME_DAYS + ' d', label: 'after launch, the outcome is measured and published back to you' },
        { n: '100%', label: 'of shipped work names everyone who contributed, anonymous handles included' }
      ];

      const myStats = [
        { v: String(mine.length), l: 'problems and ideas you raised' },
        { v: String(mine.filter(m => m.status === 'Shipped').length), l: 'shipped, credited to you' },
        { v: String(mine.filter(m => m.status === 'Building' || m.status === 'In trial').length), l: 'being built right now' },
        { v: demo ? METRICS.you.medianWait : '—', l: 'your median wait for a reply' }
      ];

      // ── team leader: inbox ──
      // Live cases first (oldest clock on top), then the ones paused on a question.
      const inboxSorted = deskCases.slice().sort((a, b) => (a.open === b.open ? 0 : a.open ? -1 : 1) || b.clock - a.clock || b.age - a.age);
      const decorateCase = c => {
        const paused = c.status === 'asked';
        const late = c.clock > PROMISE_DAYS, soon = c.clock >= PROMISE_DAYS - 2 && !late;
        return {
          id: c.id, title: c.title, from: c.from + ' · ' + c.fromDept, age: c.clock + ' d', reason: paused ? 'waiting on ' + c.from : c.reason, reasonStyle: paused ? this.pill('#f0efea', '#5b5b5b', 600) : this.reasonStyle(c.reason),
          clock: paused ? 'clock paused' : late ? (c.clock - PROMISE_DAYS) + ' d past the promise' : (PROMISE_DAYS - c.clock) + ' d left',
          clockStyle: { fontFamily: MONO, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', borderRadius: '6px', padding: '4px 8px',
            background: paused ? 'transparent' : late ? this.accent() : soon ? this.accentSoft() : '#f0efea', color: paused ? '#a0a099' : late ? '#1a1a17' : soon ? this.accentInk() : '#5b5b5b',
            border: paused ? '1px dashed #dedcd5' : 'none' },
          rowStyle: Object.assign(this.row(s.cid === c.id), paused ? { opacity: 0.72 } : {}), markStyle: this.mark(s.cid === c.id),
          // Opening a case is the "read by a human" moment the sender's tracker shows.
          onOpen: () => { if (c.read === null) this.act.read(c.id); this.set('cid', c.id); }
        };
      };
      const inbox = inboxSorted.map(decorateCase);
      const sc0 = inboxSorted.some(c => c.id === s.cid) ? inboxSorted.find(c => c.id === s.cid) : inboxSorted[0];
      const scRoute = sc0 ? sc0.route : null;
      const scMine = !!scRoute && scRoute.owner.name === who.name;
      const handTo = scRoute ? (scMine ? scRoute.deputy : scRoute.owner.name) : 'the triage desk';
      const sc = sc0 ? {
        title: sc0.title, body: sc0.body, from: sc0.from, fromDept: sc0.fromDept, fromIni: this.ini(sc0.from),
        age: sc0.clock + ' days open', reason: sc0.reason, reasonStyle: this.reasonStyle(sc0.reason), upside: sc0.upside,
        routeEyebrow: !scRoute ? 'The map has no entry for this' : scMine ? 'The map says this is yours' : 'The map proposes another owner',
        routeType: scRoute ? scRoute.type : 'no matching route — a human triages it',
        routeOwner: !scRoute ? 'Triage desk' : scMine ? 'You · ' + scRoute.owner.role : scRoute.owner.name + ' · ' + scRoute.owner.role + ', ' + this.deptName(scRoute.owner.dept),
        routeDeputy: scRoute ? scRoute.deputy : '—', routeBuddy: scRoute ? scRoute.buddy : '—',
        handLabel: scMine ? 'Hand to ' + handTo : 'Pass to ' + handTo,
        canAct: sc0.open,
        paused: sc0.status === 'asked',
        pausedNote: sc0.status === 'asked' ? 'Waiting for ' + sc0.from + ' to answer. The clock is paused at ' + sc0.clock + (sc0.clock === 1 ? ' day' : ' days') + '; it resumes when they reply.' : '',
        hasQuestion: !!sc0.question,
        question: sc0.question ? '“' + (sc0.question.text || 'One question.') + '”' : '',
        questionBy: sc0.question ? 'you asked ' + this.fmtDay(sc0.question.day, S) : '',
        hasAnswer: !!(sc0.question && sc0.question.answer),
        answer: sc0.question && sc0.question.answer ? '“' + sc0.question.answer.text + '”' : '',
        answerBy: sc0.question && sc0.question.answer ? sc0.from + ' answered ' + this.fmtDay(sc0.question.answer.day, S) : '',
        handedNote: sc0.handed.length ? 'Came to you from ' + sc0.handed[sc0.handed.length - 1].from + ' ' + this.fmtDay(sc0.handed[sc0.handed.length - 1].day, S) + (sc0.handed[sc0.handed.length - 1].why ? ' — “' + sc0.handed[sc0.handed.length - 1].why + '”' : '') + '.' : '',
        onYes: () => { this.act.decide(sc0.id, 'yes'); this.toast('Answered “yes” in ' + sc0.clock + ' days. ' + sc0.from + ' has been told; the clock is stopped.'); },
        onNo: () => this.openSheet('no', sc0.id),
        onHand: () => this.openSheet('hand', sc0.id, { picked: handTo }),
        onAsk: () => this.openSheet('ask', sc0.id)
      } : {
        title: demo ? 'Inbox empty' : 'Nothing addressed to you yet', body: demo ? 'Nothing is waiting on you. That is the goal by the end of every day.' : 'When someone on your team, or in a neighbouring one, raises a problem the map routes to you, it lands here with a ' + PROMISE_DAYS + '-day clock.',
        from: '', fromDept: '', fromIni: '', age: '', reason: '', reasonStyle: {}, upside: '',
        routeEyebrow: '', routeType: '', routeOwner: '', routeDeputy: '', routeBuddy: '', handLabel: '',
        canAct: false, paused: false, pausedNote: '', hasQuestion: false, question: '', questionBy: '', hasAnswer: false, answer: '', answerBy: '', handedNote: '',
        onYes: () => {}, onNo: () => {}, onHand: () => {}, onAsk: () => {}
      };

      const cleared = D.cases.map(c => ({ c, did: NHStore.actedBy(c, who.name) })).filter(x => x.did === 'decided' || x.did === 'handed').map(({ c, did }) => ({
        title: c.title,
        what: did === 'decided' && c.decided ? 'Decided · ' + c.decided.answer + (c.decided.reason && c.decided.answer === 'no' ? ' · ' + c.decided.reason : '') : 'Handed over · ' + c.assignee,
        style: this.pill(did === 'handed' ? '#f0efea' : INK, did === 'handed' ? '#5b5b5b' : '#fff', 600)
      }));

      const overdueCases = openCases.filter(c => c.overdue).length;
      const inboxStats = [
        { v: String(deskCases.length), l: openCases.length === deskCases.length ? 'open, addressed to you' : 'open, addressed to you · ' + (deskCases.length - openCases.length) + ' paused' },
        { v: String(overdueCases), l: 'past the ' + PROMISE_DAYS + '-day promise', hot: overdueCases > 0 },
        { v: dash(METRICS.lead.medianAnswer), l: 'your median time to answer' },
        { v: dash(METRICS.lead.withinPromise), l: 'answered within the promise, Q3' }
      ].map(x => ({ v: x.v, l: x.l, vStyle: { fontSize: '19px', fontWeight: 800, letterSpacing: '-0.025em', color: x.hot ? this.accentInk() : '#141414' } }));

      const myDeptName = this.deptName(role.dept);
      const deptOfPerson = name => { const r = ROUTES.find(x => x.owner.name === name); return r ? this.deptName(r.owner.dept) : (BUDDIES.find(b => b.name === name) || {}).dept || '—'; };
      const liveWaiting = D.cases
        .filter(c => (c.open || c.status === 'asked') && c.assignee !== who.name && c.fromDept.indexOf(myDeptName) === 0)
        .map(c => ({ title: c.title, owner: c.assignee, dept: deptOfPerson(c.assignee), age: c.clock, promised: PROMISE_DAYS, paused: c.status === 'asked' }));
      const waitingOn = liveWaiting.concat(D.waitingOn).map(w => ({
        title: w.title, owner: w.owner + ' · ' + w.dept, age: w.age + ' d',
        state: w.paused ? 'paused · they asked the sender a question' : w.age > w.promised ? (w.age - w.promised) + ' d past the promise · escalated' : 'answer owed in ' + (w.promised - w.age) + ' d',
        stateStyle: { fontFamily: MONO, fontSize: '10.5px', fontWeight: 600, color: w.age > w.promised ? this.accentInk() : '#a0a099' }
      }));

      // ── top bar: search, decisions popover, user menu ──
      const q = s.q.trim().toLowerCase();
      const hit = t => q.length >= 2 && (t || '').toLowerCase().indexOf(q) >= 0;
      const people = {};
      INITIATIVES.forEach(t => t.members.forEach(m => { if (!m.name.startsWith('Anonymous')) people[m.name] = { name: m.name, meta: m.role, tid: t.id }; }));
      BUDDIES.forEach(b => { people[b.name] = people[b.name] || { name: b.name, meta: b.dept }; });
      const results = [];
      if (demo) {
        PROBLEMS.filter(p => hit(p.title) || hit(p.sub)).slice(0, 4).forEach(p => results.push({ kind: 'Problem', title: p.title, meta: p.people + ' people · ' + p.trend, onOpen: openProblem(p.id) }));
        IDEAS.filter(i => hit(i.title)).slice(0, 4).forEach(i => results.push({ kind: 'Idea', title: i.title, meta: i.status + ' · ' + this.criteriaTags(i.criteria).map(t => t.label).join(' · '), onOpen: openIdea(i.id) }));
        INITIATIVES.filter(t => hit(t.name)).slice(0, 3).forEach(t => results.push({ kind: 'Team', title: t.name, meta: t.status, onOpen: openInitiative(t.id) }));
        if (isLead) openCases.filter(c => hit(c.title)).slice(0, 3).forEach(c => results.push({ kind: 'Case', title: c.title, meta: c.clock + ' d · ' + c.from, onOpen: openCase(c.id) }));
      }
      Object.keys(people).filter(n => hit(n)).slice(0, 3).forEach(n => {
        const p = people[n];
        results.push({ kind: 'Person', title: p.name, meta: p.meta, onOpen: p.tid ? openInitiative(p.tid) : () => this.setState({ pop: null, q: '' }) });
      });
      const searchResults = results.slice(0, 8).map(r => Object.assign(r, {
        kindStyle: { fontFamily: MONO, fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a0a099', minWidth: '52px' }
      }));

      const overdueMine = mine.filter(m => m.overdue);
      const dropItems = isManager
        ? decisions.map(d => ({ title: d.title, meta: d.days + ' · ' + (d.upside || '') + ' upside', hot: parseInt(d.days) > PROMISE_DAYS, onOpen: d.onOpen }))
        : isLead
          ? inboxSorted.filter(c => c.clock >= PROMISE_DAYS - 2).map(c => ({ title: c.title, meta: c.clock + ' d · ' + c.from, hot: c.clock > PROMISE_DAYS, onOpen: openCase(c.id) }))
          : overdueMine.map(m => ({ title: m.title, meta: m.clock, hot: true, onOpen: () => this.setState({ tab: 'mine', pop: null }) }));
      const dropCount = dropItems.length;
      const decisionBtnLabel = !demo && !dropCount ? 'Nothing waiting'
        : isManager ? dropCount + (dropCount === 1 ? ' decision waiting' : ' decisions waiting')
          : isLead ? dropCount + ' need an answer this week'
            : dropCount + (dropCount === 1 ? ' answer overdue to you' : ' answers overdue to you');
      const dropdown = dropItems.map(d => ({
        title: d.title, meta: d.meta, onOpen: d.onOpen,
        dotStyle: { width: '6px', height: '6px', borderRadius: '50%', flex: 'none', marginTop: '6px', background: d.hot ? this.accent() : '#c9c8c0' }
      }));

      const pop = name => () => this.setState({ pop: s.pop === name ? null : name });

      // ── dev panel ──
      const roles = ROLES.map(r => ({
        label: r.label, onSel: () => this.setRole(r.id),
        style: { textAlign: 'center', padding: '7px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: s.role === r.id ? 700 : 600, cursor: 'pointer',
          background: s.role === r.id ? '#f4f3f0' : 'transparent', color: s.role === r.id ? '#1a1a17' : '#a3a29a' }
      }));

      const fnl = (n, label, sub, w, note, gate) => ({
        n: dash(n), label, sub: demo ? sub : '', note: demo ? note : '', w: { width: demo ? w : '0%' },
        fill: { height: '12px', borderRadius: '999px', background: gate ? this.accent() : INK },
        noteStyle: { fontSize: '11.5px', color: this.accentInk(), marginTop: '6px', lineHeight: 1.5, display: note && demo ? 'block' : 'none' }
      });

      // ── progress: stalled + contributors, counted from the rows ──
      const stalled = D.ideas
        .filter(i => i.status === 'Awaiting decision' || i.status === 'Unfunded')
        .sort((a, b) => (b.wait || 0) - (a.wait || 0) || (a.status === 'Unfunded' ? 1 : -1))
        .map(i => ({
          title: i.title, days: i.wait ? i.wait + ' days' : 'no owner',
          at: i.wait ? (i.blocker || i.teamNote) : i.teamNote,
          style: i.wait ? this.pill(this.accentSoft(), this.accentInk()) : this.pill(INK, '#fff')
        }));

      const tally = {};
      const person = (name, dept) => { if (!name || name === '—') return null; const k = name.trim(); if (!tally[k]) tally[k] = { name: k, dept: dept || '', signals: 0, ideas: 0, shipped: 0, building: 0, awaiting: 0 }; if (dept && !tally[k].dept) tally[k].dept = dept; return tally[k]; };
      D.problems.forEach(p => p.signals.forEach(sg => {
        const parts = sg.by.split(' · '); const r = person(parts[0], (parts[1] || '').replace(/,.*$/, '')); if (r) r.signals++;
      }));
      D.ideas.forEach(i => {
        const parts = i.proposedBy.split(', '); const r = /^\d+ people/.test(i.proposedBy) ? null : person(parts[0], parts[1]); if (r) r.ideas++;
      });
      D.initiatives.forEach(t => t.members.forEach(m => {
        const r = person(m.name, /^proposed/.test(m.role) ? '' : m.role); if (!r) return;
        if (t.status === 'Shipped') r.shipped++; else if (t.status === 'Awaiting decision') r.awaiting++; else if (t.people > 0) r.building++;
      }));
      const contributors = Object.keys(tally).map(k => tally[k])
        .filter(r => r.signals + r.ideas > 0 && !r.name.startsWith('Anonymous') || r.name === who.handle)
        .sort((a, b) => (b.signals + b.ideas + b.shipped) - (a.signals + a.ideas + a.shipped))
        .slice(0, 5)
        .map(r => ({
          name: r.name, ini: this.ini(r.name), dept: r.dept || '—',
          raised: r.signals + (r.signals === 1 ? ' signal' : ' signals') + ' · ' + r.ideas + (r.ideas === 1 ? ' idea' : ' ideas'),
          credit: r.shipped ? r.shipped + ' shipped' : r.building ? r.building + ' building' : r.awaiting ? 'awaiting decision' : 'no team yet'
        }));

      const mv = (label, now, was, spark) => ({ label, now: dash(now), was: demo ? was : 'measured in pilot', bars: demo ? this.bars(spark) : this.flatBars() });

      const sheet = this.sheetVals(S, who);

      return {
        sheet, sheetOpen: sheet.open,
        replyBtn: this.btn('accent'),
        // rail + shell
        navItems, scopeItems, sorts,
        viewTitle: view.title, viewSub: view.sub.replace('{signals}', demo ? fmt(METRICS.signals) : '0'),
        scoped: s.dept !== 'All', scopeLabel: this.deptName(s.dept),
        clearScope: () => this.set('dept', 'All'),
        clearScopeStyle: { fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c9c8c0', cursor: 'pointer', display: s.dept === 'All' ? 'none' : 'inline' },
        isOverview: s.tab === 'overview', isProblems: s.tab === 'problems', isIdeas: s.tab === 'ideas',
        isNetwork: s.tab === 'network', isProgress: s.tab === 'progress', isMine: s.tab === 'mine', isInbox: s.tab === 'inbox',
        isManager, isLead, isEmployee, demo, noDemo: !demo,
        goProblems: () => this.set('tab', 'problems'), goIdeas: () => this.set('tab', 'ideas'), goNetwork: () => this.set('tab', 'network'),
        problemCountLabel: N.problems ? 'All ' + N.problems + ' →' : 'All →', ideaCountLabel: N.ideas ? 'All ' + N.ideas + ' →' : 'All →',

        // shell: mobile drawer
        railClass: 'nh-rail' + (s.menu ? ' nh-open' : ''),
        menuOpen: s.menu, toggleMenu: () => this.setState({ menu: !s.menu, pop: null }), closeMenu: () => this.set('menu', false),

        // top bar
        q: s.q, onQ: e => this.setState({ q: e.target.value, pop: 'search' }),
        onQFocus: () => this.set('pop', 'search'),
        searchOpen: s.pop === 'search' && q.length >= 2, searchResults, noResults: searchResults.length === 0,
        searchWrapStyle: { flex: '1 1 90px', minWidth: 0, maxWidth: '340px', position: 'relative', display: 'flex', alignItems: 'center', gap: '8px',
          background: s.pop === 'search' ? '#fff' : '#f4f3f0', border: '1px solid ' + (s.pop === 'search' ? INK : '#e6e5e0'), borderRadius: '9px', padding: '7px 10px', boxSizing: 'border-box' },
        decisionBtnLabel, decisionShort: !demo && !dropCount ? '0' : String(dropCount), dropdown, noDropdown: dropdown.length === 0,
        dropdownEmpty: isManager ? 'Nothing is waiting on you.' : isLead ? 'Nothing in your inbox is close to its deadline.' : 'Everything you sent has been answered on time.',
        dropdownTitle: isManager ? 'Waiting on a decision' : isLead ? 'Answer owed this week' : 'Answers owed to you',
        toggleDecisions: pop('decisions'), decisionsOpen: s.pop === 'decisions',
        decisionBtnStyle: { display: 'flex', alignItems: 'center', gap: '7px', background: s.pop === 'decisions' ? '#33332e' : '#1a1a17', color: '#fff', borderRadius: '9px', padding: '8px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
        decisionDotStyle: { width: '6px', height: '6px', borderRadius: '50%', background: dropCount ? this.accent() : '#5b5b5b', flex: 'none' },
        goDecisions: () => this.setState(isManager ? { tab: 'ideas', iid: waiting.length ? waiting[0].id : 'i1', pop: null } : isLead ? { tab: 'inbox', pop: null } : { tab: 'mine', pop: null }),
        who: { name: who.name, ini: who.ini, line: who.line, role: role.label, handle: who.handle || 'posts under your name', scope: role.dept === 'All' ? 'All departments' : this.deptName(role.dept) },
        toggleMe: pop('me'), meOpen: s.pop === 'me',
        avatarStyle: { width: '28px', height: '28px', borderRadius: '50%', background: INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: MONO, fontSize: '10px', flex: 'none', cursor: 'pointer', outline: s.pop === 'me' ? '2px solid ' + this.accent() : 'none', outlineOffset: '2px' },
        popOpen: !!s.pop, closePop: () => this.setState({ pop: null }),
        toast: s.toast, hasToast: !!s.toast,

        // dev panel
        roles, dev: s.dev, toggleDev: () => this.setState({ dev: !s.dev, pop: null }),
        toggleDemo: () => this.setState({ demo: !s.demo, dev: false }), resetDemo: () => this.resetDemo(),
        demoLabel: demo ? 'Demo data on' : 'Demo data off',
        copySnippet: () => this.copySnippet(),
        newCount: (n => n ? n + (n === 1 ? ' new case this session' : ' new cases this session') : 'nothing new this session')(S.cases.filter(c => !c.seed).length),
        demoTrack: { width: '30px', height: '17px', borderRadius: '999px', padding: '2px', boxSizing: 'border-box', background: demo ? this.accent() : '#4a4a44', cursor: 'pointer', display: 'flex', justifyContent: demo ? 'flex-end' : 'flex-start' },
        devBtnStyle: { display: 'flex', alignItems: 'center', gap: '7px', background: s.dev ? '#fbfbf9' : '#2e2e28', color: s.dev ? '#1a1a17' : '#c9c8c0', border: '1px solid ' + (s.dev ? '#fbfbf9' : '#3d3d38'), borderRadius: '9px', padding: '7px 11px', fontFamily: MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' },
        devStatus: role.label + ' · demo ' + (demo ? 'on' : 'off'),

        // overview
        kpis, decisions, noDecisions: decisions.length === 0, stall, noStall: stall.length === 0, ledger,
        nextCall: demo ? METRICS.nextCall : 'not scheduled yet',
        nextCallNote: demo ? 'Agenda is built from the items above — nothing else on it.' : 'The first decision call is booked when the first item passes its ' + PROMISE_DAYS + ' days.',
        movement: [
          mv('Time to decision', M.ideaToDecision.now, M.ideaToDecision.was, M.ideaToDecision.spark),
          mv('Ideas shipped / yr', String(N.shippedTeams), M.shippedWas, M.shippedSpark),
          mv('Value from ideas', M.valueBooked.now, M.valueBooked.was, M.valueBooked.spark),
          mv('People who raised something', M.contributing.now, M.contributing.was, M.contributing.spark)
        ],
        legendAccentStyle: { width: '20px', height: '3px', borderRadius: '2px', background: this.accent() },
        unansweredStyle: { fontSize: '22px', fontWeight: 800, color: demo ? this.accentInk() : '#141414', letterSpacing: '-0.025em' },
        showQuotes: this.props.showQuotes !== false,

        // problems / ideas / collaboration
        problems, topProblems: problems.slice(0, 5), sp, noProblems: problems.length === 0,
        emptyProblemTitle: demo ? 'Nobody in ' + (s.dept === 'All' ? 'the company' : this.deptName(s.dept)) + ' has named a problem yet' : 'No problems recorded yet',
        emptyProblemSub: demo ? 'Either nothing here is broken, or nobody has said so yet. Silence from a whole department is usually the second one.'
          : 'Problems arrive two ways: a forwarded email thread, or one field in the app. The first interview round clusters them into root problems.',
        discovery: (() => {
          const done = demo ? METRICS.discovery.interviewed : 0, pct = Math.round(done / N.people * 100);
          return { done: fmt(done) + ' of ' + fmt(N.people) + ' interviewed', w: { width: pct + '%', height: '7px', borderRadius: '999px', background: INK },
            note: demo ? METRICS.discovery.note : 'Round 1 not started' };
        })(),
        discoveryRound: 'Discovery round ' + (demo ? METRICS.discovery.round : 1),
        ideas, topIdeas: ideas.slice(0, 5), si, noIdeas: ideas.length === 0,
        initiatives, st, nodes, edges, clusters, noInitiatives: initiatives.length === 0,

        // employee
        myIdeas, noMine: myIdeas.length === 0, promises, myStats, intake, buddies,
        handle: who.handle || who.name,
        submitBtnStyle: { display: 'block', textAlign: 'center', marginTop: '16px', background: this.accent(), color: '#1a1a17', borderRadius: '10px', padding: '11px 14px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' },

        // team leader
        inbox, noInbox: inbox.length === 0, sc, cleared, hasCleared: cleared.length > 0, inboxStats, waitingOn, noWaitingOn: waitingOn.length === 0,
        actYes: { flex: 1, textAlign: 'center', background: INK, color: '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' },
        actNo: { flex: 1, textAlign: 'center', background: '#faf9f7', border: '1px solid #e6e5e0', borderRadius: '10px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 700, color: '#5b5b5b', cursor: 'pointer' },
        actHand: { flex: 1, textAlign: 'center', background: this.accent(), color: '#1a1a17', borderRadius: '10px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' },

        // progress
        funnel: (() => {
          const top = Math.max(1, N.signals);
          const w = x => Math.round(x / top * 100) + '%';
          return [
            fnl(String(N.signals), 'Said out loud', 'quotes kept from interviews and the app', w(N.signals), ''),
            fnl(String(N.problems), 'Clustered into root problems', 'duplicates merged, named plainly', w(N.problems), ''),
            fnl(String(N.ideas), 'Answered with an idea', 'employees proposed the fix themselves', w(N.ideas), ''),
            fnl(String(N.funded), 'Given a team and a budget', (N.ideas - N.funded) + ' ideas stopped here', w(N.funded), 'This is the hierarchy gate. It is the narrowest point in the system and the only one leadership controls directly.', true),
            fnl(String(N.shippedIdeas), 'Shipped', (N.funded - N.shippedIdeas) + ' still in trial or being built', w(N.shippedIdeas), '')
          ];
        })(),
        funnelTotals: N.signals ? N.signals + ' in · ' + N.shippedIdeas + ' out' : 'nothing in yet',
        outcomes: D.outcomes.map(o => ({
          title: o.title, promised: o.promised, actual: o.actual, verdict: o.verdict,
          style: o.verdict === 'Short' ? this.pill(this.accentSoft(), this.accentInk()) : o.verdict === 'Beat it' ? this.pill('#dcf3e3', '#116634') : this.pill('#f0efea', '#5b5b5b', 600)
        })),
        noOutcomes: D.outcomes.length === 0,
        stalled: stalled, noStalled: stalled.length === 0,
        answered: {
          replied: demo ? METRICS.answered.replied : '—', median: demo ? METRICS.answered.median : '—',
          credited: demo ? fmt(METRICS.answered.credited) : '0',
          unanswered: String(N.overdueIdeas + D.cases.filter(c => c.overdue).length)
        },
        contributors, noContributors: contributors.length === 0
      };
    }
  }

  return Component;
};
