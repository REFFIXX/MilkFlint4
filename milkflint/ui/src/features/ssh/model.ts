// SSH (Dropbear) settings and authorized_keys as the Router access page
// edits them. UCI lives in /etc/config/dropbear (primary @dropbear[0]);
// keys in /etc/dropbear/authorized_keys. Lockout guards keep password
// logins available until at least one public key is present.
import { bool, type Change, type Section, str } from '@/lib/api/uci';

export const KEYS_PATH = '/etc/dropbear/authorized_keys';

export interface SshForm {
  enabled: boolean;
  port: string;
  /** Logical interface (lan, wan…); '' means any address. */
  iface: string;
  passwordAuth: boolean;
  rootPasswordAuth: boolean;
  gatewayPorts: boolean;
}

export interface SshKey {
  /** Stable id for React lists: index in the file as saved. */
  id: string;
  line: string;
  type: string;
  bits: number | undefined;
  /** OpenSSH-style SHA256 fingerprint, or '' until hashed. */
  fingerprint: string;
  comment: string;
}

export type SshErrors = Partial<Record<'port' | 'passwordAuth' | 'keys', string>>;

const PUB_TYPES = new Set([
  'ssh-ed25519',
  'ssh-rsa',
  'ssh-dss',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'sk-ssh-ed25519@openssh.com',
  'sk-ecdsa-sha2-nistp256@openssh.com',
]);

const PRIVATE_MARK = /BEGIN\s+(?:OPENSSH|RSA|DSA|EC|ENCRYPTED)?\s*PRIVATE\s+KEY/i;

/** Dropbear's first instance; undefined when the config is missing. */
export function dropbearSection(sections: readonly Section[]): Section | undefined {
  return sections.find((s) => s['.type'] === 'dropbear');
}

export function formOf(section: Section | undefined): SshForm {
  return {
    enabled: bool(section, 'enable', true),
    port: str(section, 'Port') ?? '22',
    iface: str(section, 'Interface') ?? '',
    passwordAuth: bool(section, 'PasswordAuth', true),
    rootPasswordAuth: bool(section, 'RootPasswordAuth', true),
    gatewayPorts: bool(section, 'GatewayPorts', false),
  };
}

/** Port 1–65535, and not already taken by something else on the router. */
export function validatePort(port: string, taken: readonly number[], current?: number): string | undefined {
  if (!/^\d+$/.test(port)) return 'A port from 1 to 65535.';
  const n = Number(port);
  if (n < 1 || n > 65535) return 'A port from 1 to 65535.';
  if (taken.includes(n) && n !== current) return 'Something on the router already uses this TCP port.';
  return undefined;
}

/** Turning off password logins needs at least one key. */
export function canDisablePasswordAuth(keyCount: number): boolean {
  return keyCount > 0;
}

/** Removing the last key is refused when password authentication is off. */
export function canRemoveKey(keyCount: number, passwordAuth: boolean): boolean {
  return passwordAuth || keyCount > 1;
}

export function looksLikePrivateKey(text: string): boolean {
  return PRIVATE_MARK.test(text);
}

/** One OpenSSH public key line: type, base64 blob, optional comment. */
export function parsePublicKeyLine(raw: string): { type: string; blob: string; comment: string; line: string } | undefined {
  const line = raw.trim().replace(/\s+/g, ' ');
  if (line === '' || line.startsWith('#')) return undefined;
  if (looksLikePrivateKey(line)) return undefined;
  const parts = line.split(' ');
  const type = parts[0] ?? '';
  const blob = parts[1] ?? '';
  if (!PUB_TYPES.has(type) || !/^[A-Za-z0-9+/=]+$/.test(blob) || blob.length < 32) return undefined;
  return {
    type,
    blob,
    comment: parts.slice(2).join(' '),
    line: `${type} ${blob}${parts.length > 2 ? ` ${parts.slice(2).join(' ')}` : ''}`,
  };
}

function decodeBlob(blob: string): Uint8Array | undefined {
  try {
    const bin = atob(blob);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return undefined;
  }
}

function readString(buf: Uint8Array, offset: { i: number }): Uint8Array | undefined {
  if (offset.i + 4 > buf.length) return undefined;
  const b0 = buf[offset.i] ?? 0;
  const b1 = buf[offset.i + 1] ?? 0;
  const b2 = buf[offset.i + 2] ?? 0;
  const b3 = buf[offset.i + 3] ?? 0;
  const len = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  offset.i += 4;
  if (offset.i + len > buf.length) return undefined;
  const slice = buf.subarray(offset.i, offset.i + len);
  offset.i += len;
  return slice;
}

function mpintBits(n: Uint8Array): number {
  let i = 0;
  while (i < n.length && n[i] === 0) i++;
  if (i >= n.length) return 0;
  let bits = (n.length - i) * 8;
  let lead = n[i] ?? 0;
  while (lead > 0 && (lead & 0x80) === 0) {
    bits--;
    lead <<= 1;
  }
  return bits;
}

/** Key size in bits when the type's wire format is known. */
export function keyBits(type: string, blob: string): number | undefined {
  if (type === 'ssh-ed25519' || type === 'sk-ssh-ed25519@openssh.com') return 256;
  if (type === 'ecdsa-sha2-nistp256' || type === 'sk-ecdsa-sha2-nistp256@openssh.com') return 256;
  if (type === 'ecdsa-sha2-nistp384') return 384;
  if (type === 'ecdsa-sha2-nistp521') return 521;
  const buf = decodeBlob(blob);
  if (buf === undefined) return undefined;
  const offset = { i: 0 };
  const algo = readString(buf, offset);
  if (algo === undefined) return undefined;
  if (type === 'ssh-rsa' || type === 'ssh-dss') {
    const first = readString(buf, offset);
    const second = readString(buf, offset);
    if (first === undefined || second === undefined) return undefined;
    return mpintBits(type === 'ssh-rsa' ? second : first);
  }
  return undefined;
}

function b64NoPad(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '');
}

/** OpenSSH SHA256 fingerprint of the key blob (`SHA256:…`). */
export async function fingerprintOf(blob: string): Promise<string | undefined> {
  const buf = decodeBlob(blob);
  if (buf === undefined) return undefined;
  const copy = new Uint8Array(buf);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', copy));
  return `SHA256:${b64NoPad(digest)}`;
}

/** Parse authorized_keys text into rows (fingerprints filled asynchronously). */
export async function parseAuthorizedKeys(text: string): Promise<SshKey[]> {
  const lines = text.split(/\r?\n/);
  const out: SshKey[] = [];
  let n = 0;
  for (const raw of lines) {
    const parsed = parsePublicKeyLine(raw);
    if (parsed === undefined) continue;
    const fingerprint = (await fingerprintOf(parsed.blob)) ?? '';
    out.push({
      id: String(n++),
      line: parsed.line,
      type: parsed.type,
      bits: keyBits(parsed.type, parsed.blob),
      fingerprint,
      comment: parsed.comment,
    });
  }
  return out;
}

/** Serialize keys back to authorized_keys (one public key per line). */
export function keysFile(keys: readonly SshKey[]): string {
  if (keys.length === 0) return '';
  return `${keys.map((k) => k.line).join('\n')}\n`;
}

export function validateSsh(form: SshForm, keyCount: number, taken: readonly number[], savedPort?: number): SshErrors {
  const e: SshErrors = {};
  const portErr = validatePort(form.port, taken, savedPort);
  if (portErr !== undefined) e.port = portErr;
  if (!form.passwordAuth && !canDisablePasswordAuth(keyCount)) {
    e.passwordAuth = 'Add an SSH key before turning off password logins, or you could lock yourself out.';
  }
  return e;
}

/** UCI changes for the primary dropbear instance; only options that differ. */
export function toChanges(form: SshForm, section: Section): Change[] {
  const name = section['.name'];
  const saved = formOf(section);
  const values: Record<string, string> = {};
  const unset: string[] = [];

  if (form.enabled !== saved.enabled) values['enable'] = form.enabled ? '1' : '0';
  if (form.port !== saved.port) values['Port'] = form.port;
  if (form.iface !== saved.iface) {
    if (form.iface === '') unset.push('Interface');
    else values['Interface'] = form.iface;
  }
  if (form.passwordAuth !== saved.passwordAuth) values['PasswordAuth'] = form.passwordAuth ? '1' : '0';
  if (form.rootPasswordAuth !== saved.rootPasswordAuth) values['RootPasswordAuth'] = form.rootPasswordAuth ? '1' : '0';
  if (form.gatewayPorts !== saved.gatewayPorts) {
    if (form.gatewayPorts) values['GatewayPorts'] = '1';
    else unset.push('GatewayPorts');
  }

  const changes: Change[] = [];
  if (Object.keys(values).length > 0) changes.push({ op: 'set', config: 'dropbear', section: name, values });
  if (unset.length > 0) changes.push({ op: 'unset', config: 'dropbear', section: name, options: unset });
  return changes;
}

/** Logical network interfaces Dropbear can bind to (any = ''). */
export function interfaceChoices(network: readonly Section[]): { value: string; label: string }[] {
  const names = network
    .filter((s) => s['.type'] === 'interface' && s['.name'] !== 'loopback')
    .map((s) => s['.name'])
    .sort((a, b) => a.localeCompare(b));
  return [{ value: '', label: 'Any' }, ...names.map((n) => ({ value: n, label: n }))];
}
