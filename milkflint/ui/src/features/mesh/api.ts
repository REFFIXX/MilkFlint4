import { z } from 'zod';
import { call, exec } from '@/lib/ubus';

const peerSchema = z.object({
  id: z.string().optional(),
  hostname: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  mac: z.string().nullable().optional(),
  signal: z.number().nullable().optional(),
  metric: z.number().nullable().optional(),
});

const statusSchema = z.object({
  installed: z.boolean().optional(),
  running: z.boolean().optional(),
  local: z
    .object({
      portalDetect: z.string().nullable().optional(),
      autoConfig: z.string().nullable().optional(),
      portalType: z.string().nullable().optional(),
      hostname: z.string().nullable().optional(),
      meshId: z.string().nullable().optional(),
    })
    .optional(),
  peers: z.array(peerSchema).optional(),
  error: z.string().optional(),
});
export type MeshStatus = z.output<typeof statusSchema>;
export type MeshPeer = z.output<typeof peerSchema>;

export function getMeshStatus(): Promise<MeshStatus> {
  return call('milkflint.mesh', 'status', {}, statusSchema).catch(() => ({
    installed: false,
    running: false,
    peers: [],
    error: 'status unavailable',
  }));
}

export function reloadMesh(): Promise<void> {
  return exec('milkflint.mesh', 'reload').catch(() => undefined);
}
