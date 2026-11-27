import { z } from 'zod';
import { call } from '@/lib/ubus';

const statusSchema = z.object({
  wpadFull: z.boolean().optional(),
  usteerRunning: z.boolean().optional(),
  ftIfaces: z.array(z.string()).optional(),
  neighbors: z
    .array(
      z.object({
        bssid: z.string().optional(),
        ssid: z.string().optional(),
        freq: z.number().optional(),
        signal: z.number().optional(),
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
