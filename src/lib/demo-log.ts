// Browser persistence for the demo event log and the dev-panel settings. localStorage only -
// nothing leaves the machine. Keyed per company so two tenants never share a log.
// Later a backend just becomes another place the same events come from.
import { emptyLog, type EventLog } from "@/features/cases/events";
import type { Role } from "@/config/roles";

export type DemoPrefs = { role?: Role; leadAs?: string | null; demo?: boolean; dept?: string };

const logKey = (slug: string) => "nexthub." + slug + ".log.v1";
const prefsKey = (slug: string) => "nexthub." + slug + ".prefs.v1";

function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ }
}
function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function loadLog(slug: string): EventLog {
  const cur = read<EventLog>(logKey(slug));
  return cur && Array.isArray(cur.events) ? { events: cur.events, day: cur.day | 0 } : emptyLog();
}
export const saveLog = (slug: string, log: EventLog) => write(logKey(slug), log);
export function resetLog(slug: string): EventLog { remove(logKey(slug)); return emptyLog(); }

export const loadPrefs = (slug: string): DemoPrefs => read<DemoPrefs>(prefsKey(slug)) ?? {};
export const savePrefs = (slug: string, p: DemoPrefs) => write(prefsKey(slug), p);
