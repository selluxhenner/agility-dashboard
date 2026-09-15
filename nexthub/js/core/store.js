// Event log + reducer. Port of ../js/store.js, with the log keyed per company:
//   localStorage['nexthub.events.v1.<slug>'] = { events: [], day: 0 }
// reduce(seed, log) -> { cases, ideas, problems, day } with current status, assignee, clock, history.
// Never store display text as state: store facts (who, which day, which route); build sentences at render time.
window.NHStore = (function () {
  function key(slug) { return 'nexthub.events.v1.' + slug; }
  function empty() { return { events: [], day: 0 }; }
  function load(slug) { try { return JSON.parse(localStorage.getItem(key(slug))) || empty(); } catch (e) { return empty(); } }
  function save(slug, log) { localStorage.setItem(key(slug), JSON.stringify(log)); }
  function append(slug, event) { const log = load(slug); log.events.push(event); save(slug, log); return log; }
  function reset(slug) { localStorage.removeItem(key(slug)); }
  // TODO: port the reducer from the demo. Until then, pass the seed through.
  function reduce(seed, log) { return { cases: seed.CASES, ideas: seed.IDEAS, problems: seed.PROBLEMS, day: log.day }; }
  return { load, save, append, reset, reduce };
})();
