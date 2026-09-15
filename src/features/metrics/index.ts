// Wait ledger: pure functions over cases + events. Nothing here touches React or the database.
//   medianHoursToFirstResponse, pctWithinPromise(days), stallReasons, movementSinceBaseline (to come).

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const a = [...values].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function pctWithin(values: readonly number[], limit: number): number | null {
  if (values.length === 0) return null;
  return Math.round((values.filter((v) => v <= limit).length / values.length) * 100);
}
