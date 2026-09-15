// The three roles. One global, no modules (no build step) - same convention as the demo (NHStore, DCLogic).
window.NHRoles = (function () {
  const ROLES = ['manager', 'leader', 'member'];

  // Where each role lands after login (relative to /app/).
  const ROLE_HOME = {
    manager: 'manager.html', // Overview
    leader: 'leader.html',   // Inbox
    member: 'team.html',     // My cases
  };

  // Who may open which page. Anything not listed = any signed-in role.
  const PAGE_ACCESS = {
    'manager.html':          ['manager'],
    'leader.html':           ['leader', 'manager'],
    'settings/index.html':   ['manager'],
    'settings/members.html': ['manager'],
    'settings/routing.html': ['manager'],
  };

  // Left rail, filtered by role in shell.js.
  const NAV = [
    { label: 'Overview',      href: 'manager.html',        roles: ['manager'] },
    { label: 'Inbox',         href: 'leader.html',         roles: ['leader', 'manager'] },
    { label: 'My cases',      href: 'team.html',           roles: ['member', 'leader', 'manager'] },
    { label: 'Problems',      href: 'problems.html',       roles: ['member', 'leader', 'manager'] },
    { label: 'Ideas',         href: 'ideas.html',          roles: ['member', 'leader', 'manager'] },
    { label: 'Collaboration', href: 'collaboration.html',  roles: ['member', 'leader', 'manager'] },
    { label: 'Progress',      href: 'progress.html',       roles: ['member', 'leader', 'manager'] },
    { label: 'Settings',      href: 'settings/index.html', roles: ['manager'] },
  ];

  return { ROLES, ROLE_HOME, PAGE_ACCESS, NAV };
})();
