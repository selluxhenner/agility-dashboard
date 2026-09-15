// Demo tenants. In the static version "company-specific" = ?company=<slug> + this table.
// Users here are demo logins only (no passwords - any password works in the demo; see core/session.js).
window.NH_COMPANIES = [
  {
    slug: 'acme',
    name: 'Acme Maschinenbau GmbH',
    logo: 'assets/brand/logo.png',
    anonymousHandles: true,
    users: [
      { id: 'u1', name: 'B. Hartmann', email: 'b.hartmann@acme.example', role: 'manager', dept: 'Betriebsleitung' },
      { id: 'u2', name: 'T. Vogel',    email: 't.vogel@acme.example',    role: 'leader',  dept: 'Production' },
      { id: 'u3', name: 'J. Schmidt',  email: 'j.schmidt@acme.example',  role: 'member',  dept: 'Production, Line 3', handle: 'Anonymous #4471' },
    ],
  },
];
