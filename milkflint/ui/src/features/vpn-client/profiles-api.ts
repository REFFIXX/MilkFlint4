// milkflint.vpn profiles: named WireGuard configs kept in
// /etc/milkflint/vpn-profiles.json.
import { z } from 'zod';
import { call } from '@/lib/ubus';
import { migrateFromConfig, type ProfileFields, type ProfileStore, type VpnProfile } from './profiles';

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  private_key: z.string(),
  addresses: z.array(z.string()),
  mtu: z.string(),
  public_key: z.string(),
  preshared_key: z.string(),
  endpoint_host: z.string(),
  endpoint_port: z.string(),
  keepalive: z.string(),
  dns: z.array(z.string()),
});

const storeSchema = z.object({
  active: z.string().nullable().optional(),
  profiles: z.array(profileSchema).optional(),
  error: z.string().optional(),
});

function fromWire(p: z.output<typeof profileSchema>): VpnProfile {
  return {
    id: p.id,
    name: p.name,
    privateKey: p.private_key,
    addresses: p.addresses,
    mtu: p.mtu,
    publicKey: p.public_key,
    presharedKey: p.preshared_key,
    endpointHost: p.endpoint_host,
    endpointPort: p.endpoint_port,
    keepalive: p.keepalive,
    dns: p.dns,
  };
}

function toWire(p: VpnProfile): z.input<typeof profileSchema> {
  return {
    id: p.id,
    name: p.name,
    private_key: p.privateKey,
    addresses: p.addresses,
    mtu: p.mtu,
    public_key: p.publicKey,
    preshared_key: p.presharedKey,
    endpoint_host: p.endpointHost,
    endpoint_port: p.endpointPort,
    keepalive: p.keepalive,
    dns: p.dns,
  };
}

function fromReply(r: z.output<typeof storeSchema>): ProfileStore {
  return {
    active: r.active ?? undefined,
    profiles: (r.profiles ?? []).map(fromWire),
  };
}

/** Load profiles; empty store when the plugin isn't there yet. */
export async function loadProfiles(): Promise<ProfileStore> {
  try {
    const r = await call('milkflint.vpn', 'profiles', {}, storeSchema);
    if (r.error !== undefined) return { active: undefined, profiles: [] };
    return fromReply(r);
  } catch {
    return { active: undefined, profiles: [] };
  }
}

/** Persist the whole store (after migrate / rename / activate / sync). */
export async function saveProfiles(store: ProfileStore): Promise<ProfileStore> {
  const r = await call(
    'milkflint.vpn',
    'set_profiles',
    {
      active: store.active ?? null,
      profiles: store.profiles.map(toWire),
    },
    storeSchema,
  );
  if (r.error !== undefined) throw new Error(`Couldn’t save VPN profiles (${r.error}).`);
  return fromReply(r);
}

/**
 * Ensure an existing single tunnel becomes the first profile when the store
 * is still empty, then persist.
 */
export async function ensureMigrated(form: ProfileFields): Promise<ProfileStore> {
  const loaded = await loadProfiles();
  const migrated = migrateFromConfig(loaded, form);
  if (migrated.profiles.length === loaded.profiles.length) return loaded;
  return saveProfiles(migrated);
}
