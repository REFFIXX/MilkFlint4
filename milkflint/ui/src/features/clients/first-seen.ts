// First-seen / last-seen for devices: the shape milkflint.devices keeps in
// /etc/milkflint/devices.json, and the merge + 30-day forget the router (and
// these helpers) apply when All devices refreshes.

/** How long a device may stay offline before its first-seen record is forgotten. */
export const RETAIN_SECONDS = 30 * 24 * 3600;

export interface DeviceSighting {
  mac: string;
  firstSeen: number;
  lastSeen: number;
}

export type FirstSeenStore = Readonly<Record<string, { firstSeen: number; lastSeen: number }>>;

/** Normalise a MAC the way the store keys them. */
export function macKey(mac: string): string {
  return mac.trim().toLowerCase();
}

/**
 * Refresh last-seen for every MAC in `seen` (online now), set first-seen the
 * first time a MAC appears, and drop anyone whose last-seen is older than
 * {@link RETAIN_SECONDS}.
 */
export function mergeFirstSeen(
  store: FirstSeenStore,
  seen: readonly string[],
  now: number,
  retainSeconds = RETAIN_SECONDS,
): FirstSeenStore {
  const next: Record<string, { firstSeen: number; lastSeen: number }> = { ...store };
  for (const mac of seen) {
    const key = macKey(mac);
    if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(key)) continue;
    const held = next[key];
    next[key] = held === undefined ? { firstSeen: now, lastSeen: now } : { firstSeen: held.firstSeen, lastSeen: now };
  }
  return forgetStale(next, now, retainSeconds);
}

/** Drop devices whose last-seen is older than the retain window. */
export function forgetStale(store: FirstSeenStore, now: number, retainSeconds = RETAIN_SECONDS): FirstSeenStore {
  const out: Record<string, { firstSeen: number; lastSeen: number }> = {};
  for (const [mac, e] of Object.entries(store)) {
    if (now - e.lastSeen <= retainSeconds) out[mac] = e;
  }
  return out;
}

/** A first-seen time as a short absolute date, for the device sheet. */
export function formatFirstSeen(epochSeconds: number | undefined, now = Date.now() / 1000): string | undefined {
  if (epochSeconds === undefined || epochSeconds <= 0) return undefined;
  const age = Math.max(0, now - epochSeconds);
  if (age < 60) return 'just now';
  if (age < 3600) return `${String(Math.floor(age / 60))} min ago`;
  if (age < 86400) return `${String(Math.floor(age / 3600))} h ago`;
  if (age < RETAIN_SECONDS) {
    const days = Math.floor(age / 86400);
    return days === 1 ? '1 day ago' : `${String(days)} days ago`;
  }
  return new Date(epochSeconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
