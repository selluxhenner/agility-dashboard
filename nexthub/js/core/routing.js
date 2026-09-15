// Routing table matcher: free text -> proposed route (owner, deputy, buddy) by keyword hits on ROUTES[].keys.
window.NHRouting = (function () {
  function propose(text, routes) {
    const words = String(text || '').toLowerCase();
    let best = null, bestHits = 0;
    for (const r of routes || []) {
      const hits = (r.keys || []).filter(k => words.includes(k.toLowerCase())).length;
      if (hits > bestHits) { best = r; bestHits = hits; }
    }
    return best;
  }
  return { propose };
})();
