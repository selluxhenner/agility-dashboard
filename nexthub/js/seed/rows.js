// Seed data per company: DEPTS, ROUTES, PROBLEMS, IDEAS, INITIATIVES, CASES, METRICS.
// Port of ../js/data.js, keyed by company slug so each tenant has its own rows.
// Rows never change at runtime - everything that happens in the browser is an event (core/store.js).
window.NH_SEED = {
  acme: {
    DEPTS: [], ROUTES: [], PROBLEMS: [], IDEAS: [], INITIATIVES: [], CASES: [], METRICS: {},
  },
};
