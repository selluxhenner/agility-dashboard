// NextHub dashboard — component logic.
//
// The dc-runtime (support.js) evaluates the page's <script data-dc-script>
// with `DCLogic` in scope and expects it to yield a `Component` class.
// `DCLogic` only exists once the runtime has loaded React, so this file
// exposes a factory; the one-line script in index.html calls it at boot.
//
// Data constants (DEPTS, PROBLEMS, IDEAS, ...) come from js/data.js.

window.createDashboardComponent = function (DCLogic) {

  class Component extends DCLogic {
    constructor(props) {
      super(props);
      this.state = { tab: props.defaultView || 'overview', dept: 'All', role: 'CEO', pid: 'p1', iid: 'i1', tid: 't3', sort: 'people' };
    }

    accent() { return this.props.accent || '#ff5a1f'; }
    accentInk() { return '#b23c07'; }
    accentSoft() { return '#ffe7dc'; }

    set(k, v) { this.setState({ [k]: v }); }

    pill(bg, fg, weight) {
      return { background: bg, color: fg, borderRadius: '7px', padding: '4px 9px', fontSize: '11px', fontWeight: weight || 700, whiteSpace: 'nowrap', letterSpacing: '0.01em' };
    }

    statusStyle(s) {
      if (s === 'Awaiting decision') return this.pill(this.accentSoft(), this.accentInk());
      if (s === 'Shipped') return this.pill(INK, '#fff');
      if (s === 'In trial' || s === 'Building') return this.pill('#ecebe6', '#3d3d3a');
      return this.pill('transparent', MUTE, 600);
    }

    trendStyle(t) {
      if (t === 'Worsening') return this.pill(this.accentSoft(), this.accentInk());
      if (t === 'Improving') return this.pill('#dcf3e3', '#116634');
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

    countStyle(active) {
      return { fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: active ? '#e4e3db' : '#a3a29a' };
    }

    row(active) {
      return { display: 'flex', gap: '13px', alignItems: 'stretch', padding: '13px 0 12px', borderTop: '1px solid #f0efea', cursor: 'pointer',
        background: active ? '#faf9f7' : 'transparent' };
    }

    mark(active) {
      return { width: '3px', borderRadius: '999px', flex: 'none', background: active ? INK : 'transparent', marginLeft: active ? '0' : '0' };
    }

    bars(spark, color) {
      return spark.map((v, i) => ({ style: { flex: 1, minWidth: '4px', height: (4 + v * 20) + 'px', borderRadius: '2px',
        background: color || (i < 3 ? '#dedcd5' : INK) } }));
    }

    ini(name) { return name === 'Anonymous' || name === '—' ? '?' : name.split(' ').map(w => w[0]).join('').slice(0, 2); }

    deptName(id) { const d = DEPTS.find(x => x.id === id); return d ? d.name : id; }
    deptLabel(ids) { return ids.length > 3 ? ids.slice(0, 3).map(i => this.deptName(i)).join(' · ') + ' +' + (ids.length - 3) : ids.map(i => this.deptName(i)).join(' · '); }

    matches(depts) { return this.state.dept === 'All' || depts.indexOf(this.state.dept) >= 0; }

    edgeLook(status) {
      if (status === 'Shipped') return { stroke: INK, dash: '0' };
      if (status === 'Awaiting decision') return { stroke: this.accent(), dash: '0' };
      if (status === 'Proposed') return { stroke: '#b9b9b4', dash: '7 7' };
      return { stroke: '#8c8c88', dash: '0' };
    }

    renderVals() {
      const s = this.state;
      const view = VIEWS[s.tab] || VIEWS.overview;

      const roles = ['Board', 'CEO', 'Manager', 'Employee'].map(r => ({
        label: r, onSel: () => this.setState({ role: r, tab: r === 'Employee' ? 'mine' : (s.tab === 'mine' ? 'overview' : s.tab) }),
        style: { textAlign: 'center', padding: '7px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: s.role === r ? 700 : 600, cursor: 'pointer',
          background: s.role === r ? '#f4f3f0' : 'transparent', color: s.role === r ? '#1a1a17' : '#a3a29a' }
      }));

      const navDefs = s.role === 'Employee'
        ? [['mine', 'My ideas', '3'], ['problems', 'Problems', '38'], ['ideas', 'Ideas', '147'], ['progress', 'Progress', '']]
        : [['overview', 'Overview', ''], ['problems', 'Problems', '38'], ['ideas', 'Ideas', '147'],
          ['network', 'Collaboration', '8'], ['progress', 'Progress', '']];
      const navItems = navDefs.map(([id, label, count]) => ({
        label, count, onSel: () => this.set('tab', id), style: this.navStyle(s.tab === id), countStyle: this.countStyle(s.tab === id)
      }));

      const scopeItems = [{ id: 'All', name: 'All departments', people: '1,840' }].concat(DEPTS).map(d => {
        const id = d.id || 'All', active = s.dept === id;
        return { label: d.name, people: typeof d.people === 'number' ? String(d.people) : d.people,
          onSel: () => this.set('dept', id), style: this.scopeStyle(active), countStyle: this.countStyle(active) };
      });

      const sorts = [['people', 'Most people'], ['trend', 'Getting worse'], ['age', 'Longest open']].map(([id, label]) => ({
        label, onSel: () => this.set('sort', id), style: this.chip(s.sort === id)
      }));

      const openIdea = id => () => this.setState({ tab: 'ideas', iid: id });
      const openProblem = id => () => this.setState({ tab: 'problems', pid: id });

      const decorateIdea = i => ({
        id: i.id, title: i.title, score: i.score, status: i.status, effort: i.effort, expected: i.expected,
        expectedShort: i.expected, proposedBy: i.proposedBy,
        problemTitle: (PROBLEMS.find(p => p.id === i.problem) || {}).title || '—',
        statusStyle: this.statusStyle(i.status),
        scoreStyle: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 800, color: i.score >= 80 ? '#fff' : '#5b5b5b',
          background: i.score >= 80 ? INK : '#f0efea', borderRadius: '9px', padding: '7px 9px', minWidth: '38px', textAlign: 'center', flex: 'none' },
        rowStyle: this.row(s.iid === i.id), markStyle: this.mark(s.iid === i.id), onOpen: openIdea(i.id)
      });

      const ideaPool = IDEAS.filter(i => this.matches((PROBLEMS.find(p => p.id === i.problem) || { depts: [] }).depts));
      const ideas = ideaPool.slice().sort((a, b) => b.score - a.score).map(decorateIdea);

      const problemPool = PROBLEMS.filter(p => this.matches(p.depts));
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
        title: 'No problem to show', detail: 'No problems are recorded for this department yet. Clear the scope to see the rest of the company.',
        people: '0', timeLost: '—', signals: [], linked: []
      };

      const si0 = IDEAS.find(i => i.id === s.iid) || IDEAS[0];
      const sip = PROBLEMS.find(p => p.id === si0.problem) || {};
      const decidable = si0.status === 'Awaiting decision';
      const si = {
        title: si0.title, status: si0.status, statusStyle: this.statusStyle(si0.status),
        waitLabel: si0.wait ? 'waiting ' + si0.wait + ' days' : si0.status === 'Shipped' ? 'live' : 'no owner assigned',
        rationale: si0.rationale, upside: si0.upside, effort: si0.effort,
        problemTitle: sip.title || '—', problemSub: sip.sub || '',
        onOpenProblem: sip.id ? openProblem(sip.id) : () => {},
        primaryBtnLabel: decidable ? 'Approve and assign' : si0.status === 'Unfunded' ? 'Fund a trial' : 'Open the trial',
        primaryBtnStyle: { flex: 1, textAlign: 'center', background: decidable ? this.accent() : INK, color: '#fff', borderRadius: '10px',
          padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' },
        team: si0.team.map(n => ({ name: n === '—' ? 'Nobody assigned' : n, ini: this.ini(n) })), teamNote: si0.teamNote
      };

      const activeIds = INITIATIVES.filter(t => this.matches(t.depts)).map(t => t.id);
      const initiatives = INITIATIVES.map(t => ({
        id: t.id, name: t.name, status: t.status, statusStyle: this.statusStyle(t.status),
        deptLabel: t.depts.map(d => this.deptName(d)).join(' × '),
        peopleLabel: t.people ? t.people + ' people' : 'nobody assigned',
        rowStyle: this.row(s.tid === t.id), markStyle: this.mark(s.tid === t.id),
        onOpen: () => this.setState({ tab: 'network', tid: t.id })
      })).filter(t => activeIds.indexOf(t.id) >= 0);

      const st0 = INITIATIVES.find(t => t.id === s.tid) || INITIATIVES[0];
      const st = {
        name: st0.name, status: st0.status, statusStyle: this.statusStyle(st0.status), stage: st0.stage, why: st0.why,
        depts: st0.depts.map(d => ({ name: this.deptName(d) })),
        members: st0.members.map(m => ({ name: m.name, role: m.role, ini: this.ini(m.name) }))
      };

      const waiting = IDEAS.filter(i => i.status === 'Awaiting decision').sort((a, b) => b.wait - a.wait);
      const decisions = waiting.map(i => ({
        title: i.title, days: i.wait + ' days', blocker: i.blocker || i.teamNote, upside: i.upside,
        dueLabel: i.wait > 14 ? (i.wait - 14) + ' days past the promise · escalated one level up' : 'answer owed in ' + (14 - i.wait) + ' days',
        dueStyle: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 600, lineHeight: 1.4,
          color: i.wait > 14 ? this.accent() : '#c9c8c0' },
        dayStyle: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 700, color: i.wait > 20 ? '#1a1a17' : '#d6d5cd',
          background: i.wait > 20 ? this.accent() : '#33332e', borderRadius: '6px', padding: '4px 8px', whiteSpace: 'nowrap' },
        onOpen: openIdea(i.id)
      }));

      const GCOLS = 4, GCELLW = 145, GCELLH = 230, GPADX = 20, GPADY = 60;
      const clusterCenter = idx => ({ x: GPADX + (idx % GCOLS) * GCELLW + GCELLW / 2, y: GPADY + Math.floor(idx / GCOLS) * GCELLH + GCELLH / 2 });

      const clusters = [];
      const nodes = [];
      const edges = [];

      INITIATIVES.forEach((t, idx) => {
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
            edges.push({
              d: 'M ' + pts[a].x + ' ' + pts[a].y + ' L ' + pts[b].x + ' ' + pts[b].y,
              stroke: look.stroke, dash: look.dash, w: 1.6, op, onOpen: () => this.set('tid', t.id)
            });
          }
        }

        if (!count) {
          nodes.push({ ini: '?', x: c.x, y: c.y, r: 16, fill: '#f4f3f0', textFill: '#a0a099', op,
            title: '', meta: '', onSel: () => this.set('tid', t.id) });
        } else {
          pts.forEach(p => {
            nodes.push({
              ini: this.ini(p.m.name), x: p.x, y: p.y, r: 15,
              fill: active ? INK : '#fff', textFill: active ? '#fff' : '#141414',
              op, title: p.m.name, meta: p.m.role, onSel: () => this.set('tid', t.id)
            });
          });
        }
      });

      const delta = up => ({ fontSize: '11.5px', fontWeight: 700, color: up ? '#116634' : this.accentInk(),
        background: up ? '#dcf3e3' : this.accentSoft(), borderRadius: '6px', padding: '3px 7px' });

      const kpis = [
        { label: 'Idea → decision', value: '11d', delta: 'was 34d', deltaStyle: delta(true), sub: 'median, last 90 days',
          bars: this.bars([0.95, 1, 0.9, 0.6, 0.45, 0.35, 0.3]) },
        { label: 'Shipped this year', value: '23', delta: 'was 6', deltaStyle: delta(true), sub: '38 stopped early, on purpose',
          bars: this.bars([0.25, 0.3, 0.22, 0.5, 0.7, 0.85, 1]) },
        { label: 'Value booked', value: '€1.42M', delta: '+€1.15M', deltaStyle: delta(true), sub: '€880k of it recurring',
          bars: this.bars([0.18, 0.2, 0.19, 0.45, 0.62, 0.82, 1]) },
        { label: 'Waiting days saved', value: '1,240 d', delta: 'vs old route', deltaStyle: delta(true), sub: 'across 147 ideas, since the clock came in',
          bars: this.bars([0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1]) },
        { label: 'Ideas with no owner', value: '14', delta: 'was 9', deltaStyle: delta(false), sub: 'of 147 in play · 6 teams in motion',
          bars: this.bars([0.4, 0.42, 0.5, 0.55, 0.62, 0.7, 0.8]) }
      ];

      const stepTone = { done: INK, now: this.accent(), late: this.accent(), todo: '#dedcd5' };
      const myIdeas = MY_IDEAS.map(m => ({
        title: m.title, submitted: m.submitted, status: m.status, statusStyle: this.statusStyle(m.status),
        clock: m.clock,
        clockStyle: { fontSize: '12px', fontWeight: 600, lineHeight: 1.5, marginTop: '13px', padding: '9px 11px', borderRadius: '9px',
          background: m.overdue ? this.accentSoft() : '#faf9f7', border: '1px solid ' + (m.overdue ? '#f7d6c5' : '#eeede8'),
          color: m.overdue ? this.accentInk() : '#5b5b5b' },
        reply: m.reply, replyBy: m.replyBy, outcome: m.outcome, outcomeNote: m.outcomeNote,
        steps: m.steps.map(([label, when, tone]) => ({
          label, when,
          barStyle: { height: '4px', borderRadius: '999px', background: stepTone[tone] },
          labelStyle: { fontSize: '11.5px', fontWeight: 700, marginTop: '7px', lineHeight: 1.3,
            color: tone === 'todo' ? '#a0a099' : tone === 'done' ? INK : this.accentInk() }
        }))
      }));

      const promises = [
        { n: '14 d', label: 'to a yes, a no or a question — from a named person, not a form' },
        { n: '90 d', label: 'after launch, the outcome is measured and published back to you' },
        { n: '100%', label: 'of shipped work names everyone who contributed, anonymous handles included' }
      ];

      const myStats = [
        { v: '7', l: 'problems you raised' }, { v: '3', l: 'ideas you sent' },
        { v: '1', l: 'shipped, credited to you' }, { v: '4 d', l: 'your median wait for a reply' }
      ];

      const outcomes = OUTCOMES.map(o => ({
        title: o.title, promised: o.promised, actual: o.actual, verdict: o.verdict,
        style: o.verdict === 'Short' ? this.pill(this.accentSoft(), this.accentInk())
          : o.verdict === 'Beat it' ? this.pill('#dcf3e3', '#116634') : this.pill('#f0efea', '#5b5b5b', 600)
      }));

      const movement = [
        { label: 'Idea → decision', now: '11 days', was: 'was 34', bars: this.bars([0.95, 1, 0.9, 0.6, 0.45, 0.35, 0.3]) },
        { label: 'Ideas shipped / yr', now: '23', was: 'was 6', bars: this.bars([0.25, 0.3, 0.22, 0.5, 0.7, 0.85, 1]) },
        { label: 'Value from ideas', now: '€1.42M', was: 'was €270k', bars: this.bars([0.18, 0.2, 0.19, 0.45, 0.62, 0.82, 1]) },
        { label: 'People contributing', now: '64%', was: 'was 21%', bars: this.bars([0.2, 0.22, 0.21, 0.4, 0.52, 0.6, 0.64]) }
      ];

      const fnl = (n, label, sub, w, note, gate) => ({
        n, label, sub, note, w: { width: w },
        fill: { height: '12px', borderRadius: '999px', background: gate ? this.accent() : INK },
        noteStyle: { fontSize: '11.5px', color: this.accentInk(), marginTop: '6px', lineHeight: 1.5, display: note ? 'block' : 'none' }
      });

      return {
        roles, navItems, scopeItems, sorts, movement, kpis, decisions, clusters,
        viewTitle: view.title, viewSub: view.sub,
        scoped: s.dept !== 'All', scopeLabel: this.deptName(s.dept),
        clearScope: () => this.set('dept', 'All'),
        clearScopeStyle: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#c9c8c0', cursor: 'pointer', display: s.dept === 'All' ? 'none' : 'inline' },
        decisionBtnLabel: s.role === 'Employee' ? '1 answer overdue to you' : waiting.length + ' decisions waiting',
        decisionBtnStyle: { display: 'flex', alignItems: 'center', gap: '7px', background: '#1a1a17', color: '#fff', borderRadius: '9px',
          padding: '8px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
        decisionDotStyle: { width: '6px', height: '6px', borderRadius: '50%', background: this.accent(), flex: 'none' },
        legendAccentStyle: { width: '20px', height: '3px', borderRadius: '2px', background: this.accent() },
        unansweredStyle: { fontSize: '22px', fontWeight: 800, color: this.accentInk(), letterSpacing: '-0.025em' },
        showQuotes: this.props.showQuotes !== false,
        goDecisions: () => this.setState(s.role === 'Employee' ? { tab: 'mine' } : { tab: 'ideas', iid: waiting.length ? waiting[0].id : 'i1' }),
        isOverview: s.tab === 'overview', isProblems: s.tab === 'problems', isIdeas: s.tab === 'ideas',
        isNetwork: s.tab === 'network', isProgress: s.tab === 'progress',
        funnel: [
          fnl('412', 'Said out loud', 'signals from interviews and the app', '100%', ''),
          fnl('38', 'Clustered into root problems', 'duplicates merged, named plainly', '82%', ''),
          fnl('147', 'Answered with an idea', 'employees proposed the fix themselves', '64%', ''),
          fnl('61', 'Given a team and a budget', '86 ideas stopped here', '34%', 'This is the hierarchy gate. It is the narrowest point in the system and the only one leadership controls directly.', true),
          fnl('23', 'Shipped', '38 stopped early on purpose', '18%', '')
        ],
        stalled: [
          { title: 'Team-level spend authority up to €5k', days: '41 days', at: 'waiting on CFO signature', style: this.pill(this.accentSoft(), this.accentInk()) },
          { title: 'One measurement record, one place', days: '8 days', at: 'waiting on IT capacity', style: this.pill(this.accentSoft(), this.accentInk()) },
          { title: 'Protect one day a fortnight for improvement', days: 'no owner', at: 'needs a board decision', style: this.pill(INK, '#fff') },
          { title: 'Blameless review, separate from ownership', days: 'no owner', at: 'nobody assigned in 9 weeks', style: this.pill(INK, '#fff') }
        ],
        contributors: [
          { name: 'H. Sander', ini: 'HS', dept: 'Quality', raised: '9 signals · 3 ideas', credit: '2 shipped' },
          { name: 'Anonymous #4471', ini: '?', dept: 'Production', raised: '7 signals · 2 ideas', credit: '1 shipped' },
          { name: 'N. Kaya', ini: 'NK', dept: 'Sales', raised: '6 signals · 4 ideas', credit: '2 shipped' },
          { name: 'C. Ilg', ini: 'CI', dept: 'Ops & Admin', raised: '5 signals · 1 idea', credit: 'awaiting decision' },
          { name: 'D. Ferraro', ini: 'DF', dept: 'Field Service', raised: '4 signals · 2 ideas', credit: '1 building' }
        ],
        isBoard: s.role !== 'Employee',
        isMine: s.tab === 'mine',
        myIdeas, promises, myStats, outcomes,
        submitBtnStyle: { display: 'block', textAlign: 'center', marginTop: '16px', background: this.accent(), color: '#1a1a17',
          borderRadius: '10px', padding: '11px 14px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' },
        problems, topProblems: problems.slice(0, 5), sp,
        ideas, topIdeas: ideas.slice(0, 5), si,
        initiatives, st, nodes, edges,
        noProblems: problems.length === 0,
        emptyProblemTitle: 'Nobody in ' + (s.dept === 'All' ? 'the company' : this.deptName(s.dept)) + ' has named a problem yet',
        goProblems: () => this.set('tab', 'problems'),
        goIdeas: () => this.set('tab', 'ideas'),
        goNetwork: () => this.set('tab', 'network')
      };
    }
  }

  return Component;
};
