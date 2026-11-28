// milkflint.devices: first-seen / last-seen persisted on the router.
import { z } from 'zod';
import { call } from '@/lib/ubus';
import { macKey, type FirstSeenStore } from './first-seen';

const sighting = z.object({
  mac: z.string(),
  first_seen: z.number(),
  last_seen: z.number(),
});

const reply = z
  .object({
    now: z.number().optional(),
    retain: z.number().optional(),
    devices: z.array(sighting).optional(),
    error: z.string().optional(),
  })
  .loose();

function toStore(devices: z.output<typeof sighting>[] | undefined): FirstSeenStore {
  const out: Record<string, { firstSeen: number; lastSeen: number }> = {};
  for (const d of devices ?? []) {
    out[macKey(d.mac)] = { firstSeen: d.first_seen, lastSeen: d.last_seen };
  }
  return out;
}

/** Refresh last-seen for online MACs and return the whole store (after 30-day forget). */
export async function syncFirstSeen(seen: readonly string[]): Promise<FirstSeenStore> {
  const r = await call('milkflint.devices', 'sync', { seen: [...seen] }, reply).catch(() => undefined);
  if (r?.error !== undefined || r === undefined) return {};
  return toStore(r.devices);
}
