// Wait ledger: pure functions over reduced cases + events.
//   medianHoursToFirstResponse, pctWithinPromise(days), stallReasons, movementSinceBaseline.
// Figures with no underlying rows fall back to seed.METRICS ("measured in pilot" when demo data is off).
window.NHMetrics = (function () {
  function median(xs) {
    const a = xs.slice().sort((x, y) => x - y);
    if (!a.length) return null;
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  return { median };
})();
