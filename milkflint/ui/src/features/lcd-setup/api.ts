// milkflint.lcd on the router, and a reload of the front-panel service after save.
import { z } from 'zod';
import { getConfig, type Section } from '@/lib/api/uci';
import { call } from '@/lib/ubus';
import { parseLcd, type LcdForm } from './model';

const execResult = z.object({ code: z.number(), stdout: z.string().optional(), stderr: z.string().optional() }).loose();

export interface LcdData {
  form: LcdForm;
  sections: Section[];
}

/** Load milkflint.lcd (or defaults when the section is missing). */
export async function loadLcd(): Promise<LcdData> {
  const sections = await getConfig('milkflint').catch((): Section[] => []);
  const section = sections.find((s) => s['.type'] === 'lcd' || s['.name'] === 'lcd');
  return { form: parseLcd(section), sections };
}

/** Ask the init script to reload the LCD loop (falls back to restart). */
export async function reloadLcd(): Promise<void> {
  const r = await call('file', 'exec', { command: '/etc/init.d/milkflint4-lcd-splash', params: ['reload'] }, execResult);
  if (r.code === 0) return;
  const again = await call('file', 'exec', { command: '/etc/init.d/milkflint4-lcd-splash', params: ['restart'] }, execResult);
  if (again.code === 0) return;
  const said = (again.stderr ?? again.stdout ?? r.stderr ?? r.stdout ?? '').trim();
  throw new Error(`LCD reload failed: ${said === '' ? `exit ${String(again.code)}` : said}`);
}
