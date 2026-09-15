// Login state for the static demo: { companySlug, userId, role } in localStorage['nexthub.session.v1'].
// Real auth replaces this file only - pages call NHSession.require(...) and never read storage themselves.
window.NHSession = (function () {
  const KEY = 'nexthub.session.v1';
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function set(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function clear() { localStorage.removeItem(KEY); }
  function login(company, user) { set({ companySlug: company.slug, userId: user.id, role: user.role }); }
  // Guard for app pages: no session -> app/login.html; wrong role -> role home. `appBase` = path to /app/ from the page.
  function require(allowedRoles, appBase) {
    const s = get();
    appBase = appBase || './';
    if (!s) { location.replace(appBase + 'login.html'); return null; }
    if (allowedRoles && !allowedRoles.includes(s.role)) { location.replace(appBase + window.NHRoles.ROLE_HOME[s.role]); return null; }
    return s;
  }
  return { get, set, clear, login, require };
})();
