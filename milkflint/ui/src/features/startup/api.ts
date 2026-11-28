// milkflint.startup: init.d services and /etc/rc.local on the router.
import { z } from 'zod';
import { call } from '@/lib/ubus';
import type { ServiceAction, StartupService } from './model';

const serviceSchema = z.object({
  name: z.string(),
  start: z.number(),
  stop: z.number().nullable().optional(),
  enabled: z.boolean(),
  running: z.boolean(),
});

const listReply = z.object({ services: z.array(serviceSchema) });

const actionReply = z
  .object({
    ok: z.boolean(),
    code: z.number().optional(),
    error: z.string().optional(),
    running: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
  .loose();

const rcLocalReply = z.object({ data: z.string() });

const saveReply = z
  .object({
    saved: z.boolean().optional(),
    ok: z.boolean().optional(),
    error: z.string().optional(),
  })
  .loose();

export async function listServices(): Promise<StartupService[]> {
  const r = await call('milkflint.startup', 'list', {}, listReply);
  return r.services.map((s) => ({
    name: s.name,
    start: s.start,
    stop: s.stop ?? null,
    enabled: s.enabled,
    running: s.running,
  }));
}

export async function serviceAction(name: string, action: ServiceAction): Promise<void> {
  const r = await call('milkflint.startup', 'action', { name, action }, actionReply);
  if (r.ok) return;
  const said = typeof r.error === 'string' && r.error !== '' ? r.error : `exit ${String(r.code ?? '?')}`;
  throw new Error(`/etc/init.d/${name} ${action} failed: ${said}`);
}

export async function getRcLocal(): Promise<string> {
  return (await call('milkflint.startup', 'rc_local', {}, rcLocalReply)).data;
}

export async function setRcLocal(data: string): Promise<void> {
  const r = await call('milkflint.startup', 'set_rc_local', { data }, saveReply);
  if (r.saved === true || r.ok === true) return;
  throw new Error(typeof r.error === 'string' && r.error !== '' ? r.error : 'Could not save /etc/rc.local');
}
