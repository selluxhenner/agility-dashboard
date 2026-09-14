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

  class Component extends DCLogic {
    constructor(props) {
      super(props);
      const role = ROLES.find(r => r.id === (props.defaultRole || 'manager')) || ROLES[2];
      this.state = {
        role: role.id, tab: props.defaultView || role.home, dept: role.dept,
        pid: 'p1', iid: 'i1', tid: 't3', cid: 'c1', sort: 'people',
        demo: props.demoData !== false, dev: false,
        q: '', pop: null, draft: '', sent: [], cases: {}, toast: null,
        mobile: false, menu: false
      };
      this.onKey = this.onKey.bind(this);
      this.onMedia = this.onMedia.bind(this);
    }

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
        this.setState({ pop: null, q: '', menu: false });
      }
    }

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

    pill(bg, fg, weight) {
      return { background: bg, color: fg, borderRadius: '7px', padding: '4px 9px', fontSize: '11px', fontWeight: weight || 700, whiteSpace: 'nowrap', letterSpacing: '0.01em' };
    }

    statusStyle(s) {
      if (s === 'Awaiting decision' || s === 'Sent') return this.pill(this.accentSoft(), this.accentInk());
      if (s === 'Shipped') return this.pill(INK, '#fff');
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
    deptLabel(ids) { return ids.length > 3 ? ids.slice(0, 3).map(i => this.deptName(i)).join(' · ') + ' +' + (ids.length - 3) : ids.map(i => this.deptName(i)).join(' · '); }

    matches(depts) { return this.state.dept === 'All' || depts.indexOf(this.state.dept) >= 0; }

    edgeLook(status) {
      if (status === 'Shipped') return { stroke: INK, dash: '0' };
      if (status === 'Awaiting decision') return { stroke: this.accent(), dash: '0' };
      if (status === 'Proposed') return { stroke: '#b9b9b4', dash: '7 7' };
      return { stroke: '#8c8c88', dash: '0' };
    }

    // ── routing: propose (never decide) the owning row for a piece of text ──
    propose(text) {
      const t = (text || '').toLowerCase();
      if (t.trim().length < 8) return null;
      let best = null, bestHits = 0;
      ROUTES.forEach(r => {
        const hits = r.keys.filter(k => t.indexOf(k) >= 0).length;
        if (hits > bestHits) { best = r; bestHits = hits; }
      });
      if (!best) return { route: null, confidence: 0 };
      return { route: best, confidence: bestHits >= 3 ? 91 : bestHits === 2 ? 78 : 62 };
    }

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
      this.setState({ sent: [], cases: {}, draft: '', q: '', pop: null, dev: false });
      this.toast('Demo state reset');
    }

    renderVals() {
      const s = this.state;
      const role = ROLES.find(r => r.id === s.role) || ROLES[2];
      const who = role.who;
      const isEmployee = s.role === 'employee', isLead = s.role === 'lead', isManager = s.role === 'manager';
      const demo = s.demo;
      const view = VIEWS[s.tab] || VIEWS.overview;

      // Demo data on/off: one switch, every list reads through it.
      const D = {
        problems: demo ? PROBLEMS : [], ideas: demo ? IDEAS : [], initiatives: demo ? INITIATIVES : [],
        mine: demo ? s.sent.concat(MY_IDEAS) : s.sent, outcomes: demo ? OUTCOMES : [],
        cases: demo ? CASES : [], waitingOn: demo ? WAITING_ON : [], buddies: BUDDIES, stall: demo ? STALL : []
      };
      const dash = v => demo ? v : '—';
      const cnt = n => demo && n ? String(n) : '';

      // ── rail ──
      const openCases = D.cases.filter(c => !s.cases[c.id]);
      const navDefs = isEmployee
        ? [['mine', 'My cases', cnt(D.mine.length)], ['problems', 'Problems', cnt(38)], ['ideas', 'Ideas', cnt(147)], ['progress', 'Progress', '']]
        : isLead
          ? [['inbox', 'Inbox', cnt(openCases.length)], ['problems', 'Problems', cnt(38)], ['ideas', 'Ideas', cnt(147)],
            ['network', 'Collaboration', cnt(8)], ['progress', 'Progress', '']]
          : [['overview', 'Overview', ''], ['problems', 'Problems', cnt(38)], ['ideas', 'Ideas', cnt(147)],
            ['network', 'Collaboration', cnt(8)], ['progress', 'Progress', '']];
      const navItems = navDefs.map(([id, label, count]) => ({
        label, count, onSel: () => this.setState({ tab: id, pop: null, menu: false }), style: this.navStyle(s.tab === id), countStyle: this.countStyle(s.tab === id)
      }));

      const scopeItems = [{ id: 'All', name: 'All departments', people: '1,840' }].concat(DEPTS).map(d => {
        const id = d.id || 'All', active = s.dept === id;
        return { label: d.name, people: typeof d.people === 'number' ? String(d.people) : d.people,
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
        id: i.id, title: i.title, score: i.score, status: i.status, effort: i.effort, expected: i.expected,
        expectedShort: i.expected, proposedBy: i.proposedBy,
        problemTitle: (PROBLEMS.find(p => p.id === i.problem) || {}).title || '—',
        statusStyle: this.statusStyle(i.status),
        scoreStyle: { fontFamily: MONO, fontSize: '15px', fontWeight: 800, color: i.score >= 80 ? '#fff' : '#5b5b5b',
          background: i.score >= 80 ? INK : '#f0efea', borderRadius: '9px', padding: '7px 9px', minWidth: '38px', textAlign: 'center', flex: 'none' },
        rowStyle: this.row(s.iid === i.id), markStyle: this.mark(s.iid === i.id), onOpen: openIdea(i.id)
      });

      const ideaPool = D.ideas.filter(i => this.matches((PROBLEMS.find(p => p.id === i.problem) || { depts: [] }).depts));
      const ideas = ideaPool.slice().sort((a, b) => b.score - a.score).map(decorateIdea);

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
      const sp0 = sorted.some(p => p.id === s.pid) ? PROBLEMS.find(p => p.id === s.pid) : sorted[0];
      const sp = sp0 ? {
        eyebrow: 'Selected problem',
        title: sp0.title, detail: sp0.detail, people: sp0.people, timeLost: sp0.timeLost, signals: sp0.signals,
        linked: sp0.ideas.map(id => IDEAS.find(i => i.id === id)).filter(Boolean).map(i => ({
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
      const si0 = ideas.some(i => i.id === s.iid) ? IDEAS.find(i => i.id === s.iid) : (ideaPool[0] || null);
      const sip = si0 ? (PROBLEMS.find(p => p.id === si0.problem) || {}) : {};
      const decidable = si0 && si0.status === 'Awaiting decision';
      const si = si0 ? {
        title: si0.title, status: si0.status, statusStyle: this.statusStyle(si0.status),
        waitLabel: si0.wait ? 'waiting ' + si0.wait + ' days' : si0.status === 'Shipped' ? 'live' : 'no owner assigned',
        rationale: si0.rationale, upside: si0.upside, effort: si0.effort,
        problemTitle: sip.title || '—', problemSub: sip.sub || '',
        onOpenProblem: sip.id ? openProblem(sip.id) : () => {},
        primaryBtnLabel: isEmployee ? 'Co-sign this idea' : decidable ? 'Approve and assign' : si0.status === 'Unfunded' ? 'Fund a trial' : 'Open the trial',
        onPrimary: () => this.toast(isEmployee ? 'You co-signed “' + si0.title + '”. Credit follows your handle.'
          : decidable ? 'Approved. ' + si0.team[0] + ' has been told and the clock is stopped.' : 'Opened ' + si0.title + '.'),
        primaryBtnStyle: { flex: 1, textAlign: 'center', background: decidable && !isEmployee ? this.accent() : INK, color: '#fff', borderRadius: '10px',
          padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' },
        onAsk: () => this.toast('Your question goes to ' + (si0.team[0] === '—' ? 'the proposer' : si0.team[0]) + '. The clock pauses until they answer.'),
        team: si0.team.map(n => ({ name: n === '—' ? 'Nobody assigned' : n, ini: this.ini(n) })), teamNote: si0.teamNote
      } : {
        title: 'No idea to show', status: '', statusStyle: {}, waitLabel: '',
        rationale: demo ? 'No ideas are tied to problems in this department yet.' : 'Ideas appear here as step three of a case — once a problem exists, whoever raised it (or anyone else) can propose the fix.',
        upside: '—', effort: '—', problemTitle: '—', problemSub: '', onOpenProblem: () => {},
        primaryBtnLabel: 'Nothing to decide', onPrimary: () => {}, primaryBtnStyle: { flex: 1, textAlign: 'center', background: '#f0efea', color: '#a0a099', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 700 },
        onAsk: () => {}, team: [], teamNote: ''
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
        dueLabel: i.wait > 14 ? (i.wait - 14) + ' days past the promise · escalated one level up' : 'answer owed in ' + (14 - i.wait) + ' days',
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
      const kpis = [
        kpi('Idea → decision', '11d', 'was 34d', true, 'median, last 90 days', [0.95, 1, 0.9, 0.6, 0.45, 0.35, 0.3]),
        kpi('Shipped this year', '23', 'was 6', true, '38 stopped early, on purpose', [0.25, 0.3, 0.22, 0.5, 0.7, 0.85, 1]),
        kpi('Value booked', '€1.42M', '+€1.15M', true, '€880k of it recurring', [0.18, 0.2, 0.19, 0.45, 0.62, 0.82, 1]),
        kpi('Waiting days saved', '1,240 d', 'vs old route', true, 'across 147 ideas, since the clock came in', [0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1]),
        kpi('Ideas with no owner', '14', 'was 9', false, 'of 147 in play · 6 teams in motion', [0.4, 0.42, 0.5, 0.55, 0.62, 0.7, 0.8])
      ];

      const stallMax = Math.max.apply(null, [1].concat(D.stall.map(x => x.days)));
      const stall = D.stall.map((x, i) => ({
        reason: x.reason, days: x.days + ' d', share: Math.round(x.share * 100) + '%', note: x.note,
        barStyle: { height: '10px', borderRadius: '999px', width: Math.round(x.days / stallMax * 100) + '%', background: i < 2 ? this.accent() : INK }
      }));

      const ledger = {
        firstAnswer: dash(LEDGER.firstAnswer), firstAnswerWas: demo ? LEDGER.firstAnswerWas : 'measured in pilot',
        withinPromise: dash(LEDGER.withinPromise), withinPromiseWas: demo ? LEDGER.withinPromiseWas : 'measured in pilot',
        overrides: dash(LEDGER.overrides), overridesNote: demo ? LEDGER.overridesNote : 'every overruled proposal is logged — this number is the map’s accuracy',
        escalated: dash(LEDGER.escalated), handedOver: dash(LEDGER.handedOver)
      };

      // ── employee: my cases + intake ──
      const stepTone = { done: INK, now: this.accent(), late: this.accent(), todo: '#dedcd5' };
      const myIdeas = D.mine.map(m => ({
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
          const owner = pr ? pr.owner.name : 'the triage desk';
          const due = this.todayPlus(14);
          const entry = {
            title: s.draft.trim(), submitted: 'You raised this today · ' + who.handle, status: 'Sent', overdue: false,
            clock: 'Sent to ' + owner + '. They owe you a yes, a no or a question by ' + due + '.',
            steps: [['Sent', 'today', 'done'], ['Read by a human', 'pending', 'now'], ['Decided', 'due ' + due, 'todo'], ['Shipped', '—', 'todo']],
            reply: 'No reply yet. ' + owner + ' has been told; if they miss the date it moves to ' + (pr ? pr.deputy : 'their deputy') + ' automatically.',
            replyBy: 'the 14-day clock started today',
            outcome: 'pending', outcomeNote: 'measured 90 days after launch'
          };
          this.setState({ sent: [entry].concat(s.sent), draft: '' });
          this.toast('Sent to ' + owner + '. Answer owed by ' + due + '.');
        },
        onWrong: () => this.toast('Noted — a human routes it instead, and the override is logged against the map.')
      };

      const buddies = D.buddies.map(b => ({ name: b.name, ini: b.ini, dept: b.dept, note: b.note,
        onSel: () => this.toast('Opens a direct line to ' + b.name + ' (' + b.dept + ') — sideways, not up the tree.') }));

      const promises = [
        { n: '14 d', label: 'to a yes, a no or a question — from a named person, not a form' },
        { n: '90 d', label: 'after launch, the outcome is measured and published back to you' },
        { n: '100%', label: 'of shipped work names everyone who contributed, anonymous handles included' }
      ];

      const myStats = demo
        ? [{ v: '7', l: 'problems you raised' }, { v: '3', l: 'ideas you sent' }, { v: '1', l: 'shipped, credited to you' }, { v: '4 d', l: 'your median wait for a reply' }]
        : [{ v: String(s.sent.length), l: 'problems you raised' }, { v: '0', l: 'ideas you sent' }, { v: '0', l: 'shipped, credited to you' }, { v: '—', l: 'your median wait for a reply' }];

      // ── team leader: inbox ──
      const inboxSorted = openCases.slice().sort((a, b) => b.age - a.age);
      const decorateCase = c => {
        const late = c.age > 14, soon = c.age >= 10 && !late;
        return {
          id: c.id, title: c.title, from: c.from + ' · ' + c.fromDept, age: c.age + ' d', reason: c.reason, reasonStyle: this.reasonStyle(c.reason),
          clock: late ? (c.age - 14) + ' d past the promise' : (14 - c.age) + ' d left',
          clockStyle: { fontFamily: MONO, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', borderRadius: '6px', padding: '4px 8px',
            background: late ? this.accent() : soon ? this.accentSoft() : '#f0efea', color: late ? '#1a1a17' : soon ? this.accentInk() : '#5b5b5b' },
          rowStyle: this.row(s.cid === c.id), markStyle: this.mark(s.cid === c.id), onOpen: () => this.set('cid', c.id)
        };
      };
      const inbox = inboxSorted.map(decorateCase);
      const sc0 = inboxSorted.some(c => c.id === s.cid) ? CASES.find(c => c.id === s.cid) : inboxSorted[0];
      const scRoute = sc0 ? ROUTES.find(r => r.id === sc0.routeId) : null;
      const scMine = scRoute && scRoute.owner.name === who.name;
      const act = (id, status, msg) => () => { this.setState({ cases: Object.assign({}, s.cases, { [id]: status }) }); this.toast(msg); };
      const sc = sc0 ? {
        title: sc0.title, body: sc0.body, from: sc0.from, fromDept: sc0.fromDept, fromIni: this.ini(sc0.from),
        age: sc0.age + ' days open', reason: sc0.reason, reasonStyle: this.reasonStyle(sc0.reason), upside: sc0.upside,
        routeEyebrow: scMine ? 'The map says this is yours' : 'The map proposes another owner',
        routeType: scRoute ? scRoute.type : '—',
        routeOwner: scMine ? 'You · ' + scRoute.owner.role : scRoute.owner.name + ' · ' + scRoute.owner.role + ', ' + this.deptName(scRoute.owner.dept),
        routeDeputy: scRoute.deputy, routeBuddy: scRoute.buddy,
        handLabel: scMine ? 'Hand to ' + scRoute.deputy : 'Pass to ' + scRoute.owner.name,
        onYes: act(sc0.id, 'decided', 'Answered “yes” in ' + sc0.age + ' days. ' + sc0.from + ' has been told; the clock is stopped.'),
        onNo: act(sc0.id, 'decided', 'Answered “no” with your reason. ' + sc0.from + ' has been told — a no in ' + sc0.age + ' days beats silence.'),
        onHand: act(sc0.id, 'handed', 'Handed to ' + (scMine ? scRoute.deputy : scRoute.owner.name) + '. Both of you and ' + sc0.from + ' have been told. The clock keeps running.'),
        onAsk: act(sc0.id, 'asked', 'One question sent to ' + sc0.from + '. The clock pauses until they answer.')
      } : {
        title: demo ? 'Inbox empty' : 'Nothing addressed to you yet', body: demo ? 'Nothing is waiting on you. That is the goal by the end of every day.' : 'When someone on your team, or in a neighbouring one, raises a problem the map routes to you, it lands here with a 14-day clock.',
        from: '', fromDept: '', fromIni: '', age: '', reason: '', reasonStyle: {}, upside: '',
        routeEyebrow: '', routeType: '', routeOwner: '', routeDeputy: '', routeBuddy: '', handLabel: '',
        onYes: () => {}, onNo: () => {}, onHand: () => {}, onAsk: () => {}
      };

      const cleared = D.cases.filter(c => s.cases[c.id]).map(c => ({
        title: c.title, what: CASE_ACTIONS[s.cases[c.id]], style: this.pill(s.cases[c.id] === 'asked' ? '#f0efea' : INK, s.cases[c.id] === 'asked' ? '#5b5b5b' : '#fff', 600)
      }));

      const overdueCases = openCases.filter(c => c.age > 14).length;
      const inboxStats = [
        { v: String(openCases.length), l: 'open, addressed to you' },
        { v: String(overdueCases), l: 'past the 14-day promise', hot: overdueCases > 0 },
        { v: dash('3 d'), l: 'your median time to answer' },
        { v: dash('9 / 11'), l: 'answered within the promise, Q3' }
      ].map(x => ({ v: x.v, l: x.l, vStyle: { fontSize: '19px', fontWeight: 800, letterSpacing: '-0.025em', color: x.hot ? this.accentInk() : '#141414' } }));

      const waitingOn = D.waitingOn.map(w => ({
        title: w.title, owner: w.owner + ' · ' + w.dept, age: w.age + ' d',
        state: w.age > w.promised ? (w.age - w.promised) + ' d past the promise · escalated' : 'answer owed in ' + (w.promised - w.age) + ' d',
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
        IDEAS.filter(i => hit(i.title)).slice(0, 4).forEach(i => results.push({ kind: 'Idea', title: i.title, meta: i.status + ' · score ' + i.score, onOpen: openIdea(i.id) }));
        INITIATIVES.filter(t => hit(t.name)).slice(0, 3).forEach(t => results.push({ kind: 'Team', title: t.name, meta: t.status, onOpen: openInitiative(t.id) }));
        if (isLead) CASES.filter(c => hit(c.title) && !s.cases[c.id]).slice(0, 3).forEach(c => results.push({ kind: 'Case', title: c.title, meta: c.age + ' d · ' + c.from, onOpen: openCase(c.id) }));
      }
      Object.keys(people).filter(n => hit(n)).slice(0, 3).forEach(n => {
        const p = people[n];
        results.push({ kind: 'Person', title: p.name, meta: p.meta, onOpen: p.tid ? openInitiative(p.tid) : () => this.setState({ pop: null, q: '' }) });
      });
      const searchResults = results.slice(0, 8).map(r => Object.assign(r, {
        kindStyle: { fontFamily: MONO, fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a0a099', minWidth: '52px' }
      }));

      const overdueMine = D.mine.filter(m => m.overdue);
      const dropItems = isManager
        ? decisions.map(d => ({ title: d.title, meta: d.days + ' · ' + (d.upside || '') + ' upside', hot: parseInt(d.days) > 14, onOpen: d.onOpen }))
        : isLead
          ? inboxSorted.filter(c => c.age >= 10).map(c => ({ title: c.title, meta: c.age + ' d · ' + c.from, hot: c.age > 14, onOpen: openCase(c.id) }))
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

      const mv = (label, now, was, spark) => ({ label, now: dash(now), was: demo ? was : 'measured in pilot', bars: demo ? this.bars(spark) : this.flatBars() });

      return {
        // rail + shell
        navItems, scopeItems, sorts,
        viewTitle: view.title, viewSub: view.sub,
        scoped: s.dept !== 'All', scopeLabel: this.deptName(s.dept),
        clearScope: () => this.set('dept', 'All'),
        clearScopeStyle: { fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c9c8c0', cursor: 'pointer', display: s.dept === 'All' ? 'none' : 'inline' },
        isOverview: s.tab === 'overview', isProblems: s.tab === 'problems', isIdeas: s.tab === 'ideas',
        isNetwork: s.tab === 'network', isProgress: s.tab === 'progress', isMine: s.tab === 'mine', isInbox: s.tab === 'inbox',
        isManager, isLead, isEmployee, demo, noDemo: !demo,
        goProblems: () => this.set('tab', 'problems'), goIdeas: () => this.set('tab', 'ideas'), goNetwork: () => this.set('tab', 'network'),
        problemCountLabel: demo ? 'All 38 →' : 'All →', ideaCountLabel: demo ? 'All 147 →' : 'All →',

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
        demoTrack: { width: '30px', height: '17px', borderRadius: '999px', padding: '2px', boxSizing: 'border-box', background: demo ? this.accent() : '#4a4a44', cursor: 'pointer', display: 'flex', justifyContent: demo ? 'flex-end' : 'flex-start' },
        devBtnStyle: { display: 'flex', alignItems: 'center', gap: '7px', background: s.dev ? '#fbfbf9' : '#2e2e28', color: s.dev ? '#1a1a17' : '#c9c8c0', border: '1px solid ' + (s.dev ? '#fbfbf9' : '#3d3d38'), borderRadius: '9px', padding: '7px 11px', fontFamily: MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' },
        devStatus: role.label + ' · demo ' + (demo ? 'on' : 'off'),

        // overview
        kpis, decisions, noDecisions: decisions.length === 0, stall, noStall: stall.length === 0, ledger,
        nextCall: demo ? 'Thursday 14:00 · 25 min' : 'not scheduled yet',
        nextCallNote: demo ? 'Agenda is built from the items above — nothing else on it.' : 'The first decision call is booked when the first item passes its 14 days.',
        movement: [
          mv('Idea → decision', '11 days', 'was 34', [0.95, 1, 0.9, 0.6, 0.45, 0.35, 0.3]),
          mv('Ideas shipped / yr', '23', 'was 6', [0.25, 0.3, 0.22, 0.5, 0.7, 0.85, 1]),
          mv('Value from ideas', '€1.42M', 'was €270k', [0.18, 0.2, 0.19, 0.45, 0.62, 0.82, 1]),
          mv('People contributing', '64%', 'was 21%', [0.2, 0.22, 0.21, 0.4, 0.52, 0.6, 0.64])
        ],
        legendAccentStyle: { width: '20px', height: '3px', borderRadius: '2px', background: this.accent() },
        unansweredStyle: { fontSize: '22px', fontWeight: 800, color: demo ? this.accentInk() : '#141414', letterSpacing: '-0.025em' },
        showQuotes: this.props.showQuotes !== false,

        // problems / ideas / collaboration
        problems, topProblems: problems.slice(0, 5), sp, noProblems: problems.length === 0,
        emptyProblemTitle: demo ? 'Nobody in ' + (s.dept === 'All' ? 'the company' : this.deptName(s.dept)) + ' has named a problem yet' : 'No problems recorded yet',
        emptyProblemSub: demo ? 'Either nothing here is broken, or nobody has said so yet. Silence from a whole department is usually the second one.'
          : 'Problems arrive two ways: a forwarded email thread, or one field in the app. The first interview round clusters them into root problems.',
        discovery: demo ? { done: '1,180 of 1,840 interviewed', w: { width: '64%', height: '7px', borderRadius: '999px', background: INK }, note: '64% coverage · Production and Field Service still under 50%' }
          : { done: '0 of 1,840 interviewed', w: { width: '0%', height: '7px', borderRadius: '999px', background: INK }, note: 'Round 1 not started' },
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
        funnel: [
          fnl('412', 'Said out loud', 'signals from interviews and the app', '100%', ''),
          fnl('38', 'Clustered into root problems', 'duplicates merged, named plainly', '82%', ''),
          fnl('147', 'Answered with an idea', 'employees proposed the fix themselves', '64%', ''),
          fnl('61', 'Given a team and a budget', '86 ideas stopped here', '34%', 'This is the hierarchy gate. It is the narrowest point in the system and the only one leadership controls directly.', true),
          fnl('23', 'Shipped', '38 stopped early on purpose', '18%', '')
        ],
        funnelTotals: demo ? '412 in · 23 out' : 'nothing in yet',
        outcomes: D.outcomes.map(o => ({
          title: o.title, promised: o.promised, actual: o.actual, verdict: o.verdict,
          style: o.verdict === 'Short' ? this.pill(this.accentSoft(), this.accentInk()) : o.verdict === 'Beat it' ? this.pill('#dcf3e3', '#116634') : this.pill('#f0efea', '#5b5b5b', 600)
        })),
        noOutcomes: D.outcomes.length === 0,
        stalled: demo ? [
          { title: 'Team-level spend authority up to €5k', days: '41 days', at: 'waiting on CFO signature', style: this.pill(this.accentSoft(), this.accentInk()) },
          { title: 'One measurement record, one place', days: '8 days', at: 'waiting on IT capacity', style: this.pill(this.accentSoft(), this.accentInk()) },
          { title: 'Protect one day a fortnight for improvement', days: 'no owner', at: 'needs a board decision', style: this.pill(INK, '#fff') },
          { title: 'Blameless review, separate from ownership', days: 'no owner', at: 'nobody assigned in 9 weeks', style: this.pill(INK, '#fff') }
        ] : [],
        noStalled: !demo,
        answered: demo ? { replied: '91%', median: '6d', credited: '214', unanswered: '23' } : { replied: '—', median: '—', credited: '0', unanswered: '0' },
        contributors: demo ? [
          { name: 'H. Sander', ini: 'HS', dept: 'Quality', raised: '9 signals · 3 ideas', credit: '2 shipped' },
          { name: 'Anonymous #4471', ini: '?', dept: 'Production', raised: '7 signals · 2 ideas', credit: '1 shipped' },
          { name: 'N. Kaya', ini: 'NK', dept: 'Sales', raised: '6 signals · 4 ideas', credit: '2 shipped' },
          { name: 'C. Ilg', ini: 'CI', dept: 'Ops & Admin', raised: '5 signals · 1 idea', credit: 'awaiting decision' },
          { name: 'D. Ferraro', ini: 'DF', dept: 'Field Service', raised: '4 signals · 2 ideas', credit: '1 building' }
        ] : [],
        noContributors: !demo
      };
    }
  }

  return Component;
};
