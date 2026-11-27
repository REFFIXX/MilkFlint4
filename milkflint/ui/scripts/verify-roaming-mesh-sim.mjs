#!/usr/bin/env node
/** End-to-end UCI/ubus verification against the mock OpenWrt simulator. */
const UBUS = process.env.MILKFLINT_VM ?? 'http://127.0.0.1:8088';

async function call(session, object, method, params = {}) {
  const res = await fetch(`${UBUS}/ubus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'call', params: [session, object, method, params] }),
  });
  const body = await res.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  const [code, data] = body.result;
  if (code !== 0) throw new Error(`${object}.${method} status ${code}`);
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const NULL = '00000000000000000000000000000000';

const login = await call(NULL, 'session', 'login', { username: 'root', password: 'demo' });
const sid = login.ubus_rpc_session;
assert(sid?.length === 32, 'session id');

const board = await call(sid, 'system', 'board', {});
assert(/^25\./.test(board.release.version) || /milkflint/i.test(board.release.distribution), '25.x / MilkFlint gate');

// --- Roaming apply ---
await call(sid, 'uci', 'set', {
  config: 'wireless',
  section: 'wifinet0',
  values: { ieee80211r: '1', ieee80211k: '1', bss_transition: '1', mobility_domain: '4f57', ft_over_ds: '1' },
});
await call(sid, 'uci', 'set', {
  config: 'wireless',
  section: 'wifinet1',
  values: { ieee80211r: '1', ieee80211k: '1', bss_transition: '1', mobility_domain: '4f57', ft_over_ds: '1' },
});
await call(sid, 'uci', 'set', { config: 'usteer', section: 'usteer', values: { disabled: '0' } });
await call(sid, 'uci', 'apply', { rollback: false });

const wireless = await call(sid, 'uci', 'get', { config: 'wireless' });
assert(wireless.values.wifinet0.ieee80211r === '1', 'FT on wifinet0');
assert(wireless.values.wifinet0.mobility_domain === '4f57', 'mobility domain');
assert(wireless.values.wifinet0.nasid === undefined, 'no shared nasid');

const roaming = await call(sid, 'milkflint.roaming', 'status', {});
assert(roaming.wpadFull === true, 'wpad full');
assert(roaming.usteerRunning === true, 'usteer running after enable');
assert(roaming.ftIfaces.includes('wifinet0'), 'ft ifaces');
assert(roaming.neighbors.length >= 1, 'usteer neighbors simulated');

// --- Mesh apply ---
await call(sid, 'uci', 'set', {
  config: 'mesh11sd',
  section: 'setup',
  values: {
    auto_config: '1',
    portal_detect: '1',
    auto_mesh_id: 'MilkFlintLab',
    mesh_gate_base_ssid: 'MilkLab',
    mesh_gate_encryption: '1',
    mesh_gate_key: 'supersecret',
  },
});
await call(sid, 'uci', 'set', { config: 'milkflint', section: 'mesh', values: { role: 'main-auto' } });
await call(sid, 'uci', 'apply', { rollback: false });
await call(sid, 'milkflint.mesh', 'reload', {});

const mesh = await call(sid, 'uci', 'get', { config: 'mesh11sd' });
assert(mesh.values.setup.auto_config === '1', 'mesh auto_config');
assert(mesh.values.setup.portal_detect === '1', 'portal_detect 1');
assert(mesh.values.setup.auto_mesh_id === 'MilkFlintLab', 'mesh id');

const meshStatus = await call(sid, 'milkflint.mesh', 'status', {});
assert(meshStatus.installed === true, 'mesh installed');
assert(meshStatus.peers.length >= 1, 'peers appear when auto_config on');

console.log(
  JSON.stringify(
    {
      ok: true,
      board: board.release,
      roaming: { ftIfaces: roaming.ftIfaces, neighbors: roaming.neighbors.length, usteer: roaming.usteerRunning },
      mesh: { id: mesh.values.setup.auto_mesh_id, peers: meshStatus.peers.map((p) => p.hostname) },
    },
    null,
    2,
  ),
);
