// VPN client Soon items: named profiles, sites that go direct, and handshake
// stale / dead-tunnel copy.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BYPASS_DOMAIN_LIMIT,
  isBypassDomain,
  normalizeBypassDomain,
  parseBypassDomains,
} from '../src/features/vpn-client/bypass.ts';
import {
  deadTunnelCopy,
  deadTunnelEffect,
  HANDSHAKE_STALE_SECONDS,
  handshakeAge,
  isHandshakeFresh,
  isHandshakeStale,
} from '../src/features/vpn-client/handshake.ts';
import {
  activateProfile,
  applyProfile,
  defaultProfileName,
  deleteProfile,
  migrateFromConfig,
  newProfileId,
  profileFromForm,
  renameProfile,
  syncActiveProfile,
  upsertProfile,
} from '../src/features/vpn-client/profiles.ts';
import { blankForm, type ClientData, type ClientForm, toChanges, wanted } from '../src/features/vpn-client/model.ts';
import { CLIENT_BYPASS4, CLIENT_BYPASS_DHCP, CLIENT_BYPASS_RULE4 } from '../src/features/vpn-client/sections.ts';
import { ipToInt } from '../src/lib/api/network.ts';
import type { Wanted } from '../src/lib/api/owned.ts';

const get = (w: readonly Wanted[], name: string): Wanted => {
  const s = w.find((x) => x.name === name);
  assert.ok(s !== undefined, `${name} is wanted`);
  return s;
};

const KEY = `${'a'.repeat(42)}A=`;
const OTHER = `${'b'.repeat(42)}E=`;

const form = (over: Partial<ClientForm> = {}): ClientForm => ({
  enabled: true,
  privateKey: KEY,
  addresses: ['10.64.12.7/32'],
  mtu: '',
  publicKey: OTHER,
  presharedKey: '',
  endpointHost: 'us.vpn.example.com',
  endpointPort: '51820',
  keepalive: '25',
  who: 'all',
  macs: [],
  guests: [],
  killSwitch: true,
  useVpnDns: true,
  dns: ['10.64.0.1'],
  shaper: false,
  downMbit: '',
  upMbit: '',
  bypassDomains: [],
  ...over,
});

const data = (f: ClientForm = form(), over: Partial<ClientData> = {}): ClientData => ({
  installed: true,
  exists: false,
  form: f,
  peerSection: 'wg_out_server',
  present: { network: [], firewall: [], sqm: [], milkflint: [] },
  presentDhcp: [],
  wanZone: 'wan',
  lanZone: 'lan',
  guestZones: [],
  devices: [],
  sqm: true,
  wanRates: { down: 500, up: 100 },
  lan: { ip: ipToInt('192.168.1.1') ?? 0, prefix: 24 },
  taken: [],
  ...over,
});

test('handshake: fresh under 180s, stale at or after, never when zero', () => {
  const now = 1_000_000;
  assert.equal(isHandshakeFresh({ latest_handshake: now - 30 }, now), true);
  assert.equal(isHandshakeFresh({ latest_handshake: now - HANDSHAKE_STALE_SECONDS }, now), false);
  assert.equal(isHandshakeStale({ latest_handshake: now - HANDSHAKE_STALE_SECONDS }, now), true);
  assert.equal(isHandshakeStale({ latest_handshake: 0 }, now), true);
  assert.equal(isHandshakeStale(undefined, now), true);
  assert.equal(handshakeAge({ latest_handshake: now - 40 }, now), 40);
  assert.equal(handshakeAge({ latest_handshake: 0 }, now), undefined);
});

test('dead tunnel: kill switch blocks; off goes direct; off or fresh is none', () => {
  assert.equal(deadTunnelEffect(true, true, true), 'block');
  assert.equal(deadTunnelEffect(true, false, true), 'direct');
  assert.equal(deadTunnelEffect(true, true, false), 'none');
  assert.equal(deadTunnelEffect(false, true, true), 'none');
  assert.match(deadTunnelCopy(true).text, /no internet or DNS/);
  assert.match(deadTunnelCopy(false).text, /go out directly/);
});

test('bypass domains: normalize, parse, reject junk, cap later in validate', () => {
  assert.equal(normalizeBypassDomain(' HTTPS://Netflix.COM/path '), 'netflix.com');
  assert.equal(normalizeBypassDomain('cdn.example.org.'), 'cdn.example.org');
  assert.equal(isBypassDomain('netflix.com'), true);
  assert.equal(isBypassDomain('not a domain'), false);
  assert.equal(isBypassDomain(''), false);
  const parsed = parseBypassDomains('netflix.com, Netflix.com\nexample.org bad..host');
  assert.deepEqual(parsed.domains, ['netflix.com', 'example.org']);
  assert.deepEqual(parsed.invalid, ['bad..host']);
  assert.ok(BYPASS_DOMAIN_LIMIT >= 16);
});

test('bypass domains: wanted writes fw4 sets, dhcp fill, and mark-clear rules', () => {
  const f = form({ bypassDomains: ['netflix.com', 'example.org'] });
  const w = wanted(f, data(f));
  assert.equal(get(w, CLIENT_BYPASS4).config, 'firewall');
  assert.equal(get(w, CLIENT_BYPASS4).type, 'ipset');
  assert.equal(get(w, CLIENT_BYPASS_RULE4).values['ipset'], `${CLIENT_BYPASS4} dest`);
  assert.equal(get(w, CLIENT_BYPASS_RULE4).values['set_xmark'], '0x0/0xf0000000');
  assert.equal(get(w, CLIENT_BYPASS_DHCP).config, 'dhcp');
  assert.deepEqual(get(w, CLIENT_BYPASS_DHCP).values['domain'], ['netflix.com', 'example.org']);
  assert.deepEqual(get(w, 'vpn_client').values['bypass_domain'], ['netflix.com', 'example.org']);
  // clearing the list removes the sections
  const cleared = toChanges(
    form({ bypassDomains: [] }),
    data(form({ bypassDomains: ['netflix.com'] }), {
      exists: true,
      present: {
        network: [],
        firewall: [
          { '.name': CLIENT_BYPASS4, '.type': 'ipset', name: CLIENT_BYPASS4 },
          { '.name': CLIENT_BYPASS_RULE4, '.type': 'rule' },
        ],
        sqm: [],
        milkflint: [],
      },
      presentDhcp: [{ '.name': CLIENT_BYPASS_DHCP, '.type': 'ipset', domain: ['netflix.com'] }],
    }),
  );
  assert.ok(cleared.some((c) => c.op === 'delete' && 'section' in c && c.section === CLIENT_BYPASS_DHCP));
});

test('profiles: migrate single config, activate, rename, delete, sync', () => {
  const empty = { active: undefined, profiles: [] };
  const migrated = migrateFromConfig(empty, form());
  assert.equal(migrated.profiles.length, 1);
  assert.equal(migrated.active, migrated.profiles[0]?.id);
  assert.equal(migrated.profiles[0]?.endpointHost, 'us.vpn.example.com');
  assert.ok(migrated.profiles[0]?.name.length);

  // blank tunnel stays empty
  assert.deepEqual(migrateFromConfig(empty, blankForm({ wanRates: undefined, sqm: false })), empty);
  // already has profiles: no second migrate
  assert.equal(migrateFromConfig(migrated, form({ endpointHost: 'fr.vpn.example.com' })).profiles.length, 1);

  const fr = profileFromForm(
    form({ endpointHost: 'fr.vpn.example.com', privateKey: KEY }),
    'France',
    newProfileId(migrated.profiles),
  );
  let store = upsertProfile(migrated, fr);
  assert.equal(store.profiles.length, 2);
  store = activateProfile(store, fr.id);
  assert.equal(store.active, fr.id);
  const applied = applyProfile(form(), fr);
  assert.equal(applied.endpointHost, 'fr.vpn.example.com');
  store = syncActiveProfile(
    store,
    form({ endpointHost: 'fr2.vpn.example.com', privateKey: KEY, publicKey: OTHER, addresses: ['10.1.0.2/32'], dns: [] }),
  );
  assert.equal(store.profiles.find((p) => p.id === fr.id)?.endpointHost, 'fr2.vpn.example.com');
  store = renameProfile(store, fr.id, 'Paris');
  assert.equal(store.profiles.find((p) => p.id === fr.id)?.name, 'Paris');
  store = deleteProfile(store, fr.id);
  assert.equal(store.profiles.length, 1);
  assert.notEqual(store.active, fr.id);
});

test('default profile name from endpoint, unique among taken', () => {
  assert.equal(defaultProfileName('usa.mullvad.net'), 'Usa');
  assert.equal(defaultProfileName(''), 'VPN');
  assert.equal(defaultProfileName('usa.mullvad.net', ['Usa']), 'Usa 2');
});
