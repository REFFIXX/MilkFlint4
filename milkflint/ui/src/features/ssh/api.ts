// Dropbear UCI + authorized_keys for Router access. Keys go through
// milkflint.ssh (file ACL + lockout checks on the router); settings use
// normal uci changes, then dropbear is restarted.
import { z } from 'zod';
import { getConfig, type Section } from '@/lib/api/uci';
import { call } from '@/lib/ubus';
import {
  dropbearSection,
  formOf,
  keysFile,
  parseAuthorizedKeys,
  type SshForm,
  type SshKey,
} from './model';

const execResult = z.object({ code: z.number(), stdout: z.string().optional(), stderr: z.string().optional() }).loose();

const keysReply = z
  .object({
    text: z.string(),
    tcp_ports: z.array(z.number()).optional(),
    error: z.string().optional(),
  })
  .loose();

export interface SshData {
  form: SshForm;
  section: Section;
  keys: SshKey[];
  keysText: string;
  /** TCP ports something listens on (Dropbear's own included). */
  tcpPorts: number[];
  interfaces: Section[];
}

export async function loadSsh(): Promise<SshData> {
  const [dropbear, network, keys] = await Promise.all([
    getConfig('dropbear'),
    getConfig('network'),
    call('milkflint.ssh', 'keys', {}, keysReply),
  ]);
  if (keys.error !== undefined && keys.error !== '') throw new Error(keys.error);
  const section = dropbearSection(dropbear);
  if (section === undefined) throw new Error('Dropbear has no settings: /etc/config/dropbear is missing its section.');
  const keysText = keys.text;
  return {
    form: formOf(section),
    section,
    keys: await parseAuthorizedKeys(keysText),
    keysText,
    tcpPorts: keys.tcp_ports ?? [],
    interfaces: network.filter((s) => s['.type'] === 'interface'),
  };
}

export async function saveAuthorizedKeys(keys: readonly SshKey[], before: string): Promise<void> {
  const reply = await call(
    'milkflint.ssh',
    'set_keys',
    { text: keysFile(keys), before },
    z.object({ saved: z.boolean().optional(), error: z.string().optional() }).loose(),
  );
  if (reply.error !== undefined && reply.error !== '') throw new Error(reply.error);
  if (reply.saved !== true) throw new Error('The router did not save the SSH keys.');
}

export async function restartDropbear(): Promise<void> {
  const r = await call('file', 'exec', { command: '/etc/init.d/dropbear', params: ['restart'] }, execResult);
  if (r.code === 0) return;
  const said = (r.stderr ?? r.stdout ?? '').trim();
  throw new Error(`dropbear’s restart failed: ${said === '' ? `exit ${String(r.code)}` : said}`);
}
