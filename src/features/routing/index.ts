// Routing table matcher: free text -> the route (owner, deputy, buddy) with the most keyword hits.
export type RouteRow = { id: string; keys: string[] };

export function proposeRoute<R extends RouteRow>(text: string, routes: readonly R[]): R | null {
  const words = text.toLowerCase();
  let best: R | null = null;
  let bestHits = 0;
  for (const r of routes) {
    const hits = r.keys.filter((k) => words.includes(k.toLowerCase())).length;
    if (hits > bestHits) {
      best = r;
      bestHits = hits;
    }
  }
  return best;
}
