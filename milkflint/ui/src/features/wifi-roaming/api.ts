import { z } from 'zod';
import { call, exec } from '@/lib/ubus';

const statusSchema = z.object({
  wpadFull: z.boolean().optional(),
  usteerRunning: z.boolean().optional(),
  ftIfaces: z.array(z.string()).optional(),
  neighbors: z
    .array(
      z.object({
        // rpcd emits null when usteer omits a field — accept nullish, not only missing.
        bssid: z.string().nullish(),
        ssid: z.string().nullish(),
        freq: z.number().nullish(),
        signal: z.number().nullish(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});
export type RoamingStatus = z.output<typeof statusSchema>;

export function getRoamingStatus(): Promise<RoamingStatus> {
  return call('milkflint.roaming', 'status', {}, statusSchema).catch(() => ({
    wpadFull: undefined,
    usteerRunning: false,
    ftIfaces: [],
    neighbors: [],
    error: 'status unavailable',
  }));
}

/** Reload wireless + usteer after a roaming save so FT/k/v take effect. */
export function reloadRoaming(): Promise<void> {
  return exec('milkflint.roaming', 'reload').catch(() => undefined);
}
