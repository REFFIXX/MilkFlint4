// Named WireGuard profiles (USA / France…): credentials for one peer at a
// time. The active profile's keys and endpoint are what network.wg_out holds;
// the rest live in /etc/milkflint/vpn-profiles.json so an upgrade keeps them.
import type { ClientForm } from './model';

export interface VpnProfile {
  id: string;
  name: string;
  privateKey: string;
  addresses: string[];
  mtu: string;
  publicKey: string;
  presharedKey: string;
  endpointHost: string;
  endpointPort: string;
  keepalive: string;
  dns: string[];
}

export interface ProfileStore {
  active: string | undefined;
  profiles: VpnProfile[];
}

/** Fields a profile carries into / out of the page form. */
export type ProfileFields = Pick<
  ClientForm,
  'privateKey' | 'addresses' | 'mtu' | 'publicKey' | 'presharedKey' | 'endpointHost' | 'endpointPort' | 'keepalive' | 'dns'
>;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** A short id for a new profile (router-side also accepts these). */
export function newProfileId(existing: readonly { id: string }[] = []): string {
  for (let n = 0; n < 32; n++) {
    let id = 'p';
    for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)] ?? '0';
    if (!existing.some((p) => p.id === id)) return id;
  }
  return `p${String(Date.now())}`;
}

/** A display name from the endpoint host, or "VPN" when empty. */
export function defaultProfileName(endpointHost: string, taken: readonly string[] = []): string {
  const host = endpointHost.trim();
  let base = 'VPN';
  if (host !== '') {
    const label = host.replace(/\.(wg|wireguard)\b/i, '').split('.')[0] ?? host;
    base = label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : 'VPN';
  }
  if (!taken.some((n) => n.toLowerCase() === base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const n = `${base} ${String(i)}`;
    if (!taken.some((t) => t.toLowerCase() === n.toLowerCase())) return n;
  }
  return `${base} ${String(Date.now())}`;
}

export function fieldsOf(f: ProfileFields): ProfileFields {
  return {
    privateKey: f.privateKey,
    addresses: [...f.addresses],
    mtu: f.mtu,
    publicKey: f.publicKey,
    presharedKey: f.presharedKey,
    endpointHost: f.endpointHost,
    endpointPort: f.endpointPort,
    keepalive: f.keepalive,
    dns: [...f.dns],
  };
}

export function profileFromForm(f: ProfileFields, name: string, id: string): VpnProfile {
  return { id, name: name.trim() === '' ? 'VPN' : name.trim(), ...fieldsOf(f) };
}

/** Apply a profile's tunnel fields onto the form (keeps who / kill switch / …). */
export function applyProfile<T extends ProfileFields>(form: T, profile: VpnProfile): T {
  return {
    ...form,
    privateKey: profile.privateKey,
    addresses: [...profile.addresses],
    mtu: profile.mtu,
    publicKey: profile.publicKey,
    presharedKey: profile.presharedKey,
    endpointHost: profile.endpointHost,
    endpointPort: profile.endpointPort,
    keepalive: profile.keepalive,
    dns: [...profile.dns],
  };
}

/** Write the form's tunnel fields back into the active profile. */
export function syncActiveProfile(store: ProfileStore, form: ProfileFields): ProfileStore {
  if (store.active === undefined) return store;
  const profiles = store.profiles.map((p) => (p.id === store.active ? { ...p, ...fieldsOf(form), name: p.name } : p));
  return { ...store, profiles };
}

/**
 * Migrate a single wg_out config into the first profile when the store is
 * empty. Keeps upgrades config-safe: existing tunnels become "the" profile.
 */
export function migrateFromConfig(store: ProfileStore, form: ProfileFields): ProfileStore {
  if (store.profiles.length > 0) return store;
  const blank =
    form.privateKey === '' &&
    form.publicKey === '' &&
    form.endpointHost.trim() === '' &&
    form.addresses.every((a) => a.trim() === '');
  if (blank) return store;
  const id = newProfileId();
  const name = defaultProfileName(form.endpointHost);
  return { active: id, profiles: [profileFromForm(form, name, id)] };
}

export function renameProfile(store: ProfileStore, id: string, name: string): ProfileStore {
  const n = name.trim();
  if (n === '') return store;
  return { ...store, profiles: store.profiles.map((p) => (p.id === id ? { ...p, name: n } : p)) };
}

export function deleteProfile(store: ProfileStore, id: string): ProfileStore {
  const profiles = store.profiles.filter((p) => p.id !== id);
  const active = store.active === id ? profiles[0]?.id : store.active;
  return { active, profiles };
}

export function activateProfile(store: ProfileStore, id: string): ProfileStore {
  if (!store.profiles.some((p) => p.id === id)) return store;
  return { ...store, active: id };
}

export function upsertProfile(store: ProfileStore, profile: VpnProfile): ProfileStore {
  const i = store.profiles.findIndex((p) => p.id === profile.id);
  const profiles = i < 0 ? [...store.profiles, profile] : store.profiles.map((p, n) => (n === i ? profile : p));
  const active = store.active ?? profile.id;
  return { active, profiles };
}

export function activeProfile(store: ProfileStore): VpnProfile | undefined {
  return store.profiles.find((p) => p.id === store.active) ?? store.profiles[0];
}
