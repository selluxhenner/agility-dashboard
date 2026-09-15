// The authenticated app chrome, shared by every page under /app/.
// mount(): NHSession.require(PAGE_ACCESS[page]) -> resolve tenant -> inject partials (rail, topbar, sheet, devpanel)
// -> render NAV filtered by role -> mark the active link -> apply company branding.
// Partials are fetched from <root>/partials/*.html (needs HTTP, not file://).
window.NHShell = (function () {
  async function partial(name, root) {
    const r = await fetch(root + 'partials/' + name + '.html');
    return r.text();
  }
  async function mount(opts) {
    // opts: { root: '../', page: 'team.html' }   root = path from this page to the site root
    const roles = window.NHRoles;
    const session = window.NHSession.require(roles.PAGE_ACCESS[opts.page] || null, opts.root + 'app/');
    if (!session) return null;
    const company = window.NHTenant.find(session.companySlug);
    const user = company && company.users.find(u => u.id === session.userId);
    return { session, company, user, nav: roles.NAV.filter(n => n.roles.includes(session.role)) };
  }
  return { mount, partial };
})();
