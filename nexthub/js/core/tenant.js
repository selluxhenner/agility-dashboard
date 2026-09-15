// Resolve the current company.
//   1. ?company=<slug> in the URL   2. the slug saved in the session   3. none -> back to /login.html
// Also applies branding (name, logo) to [data-company-name] / [data-company-logo] elements.
window.NHTenant = (function () {
  function slugFromUrl() { return new URLSearchParams(location.search).get('company'); }
  function find(slug) { return (window.NH_COMPANIES || []).find(c => c.slug === slug) || null; }
  function findByEmail(email) {
    const domain = String(email || '').split('@')[1];
    if (!domain) return null;
    return (window.NH_COMPANIES || []).find(c => c.users.some(u => u.email.endsWith('@' + domain))) || null;
  }
  return { slugFromUrl, find, findByEmail };
})();
