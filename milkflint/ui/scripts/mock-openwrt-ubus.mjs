#!/usr/bin/env node
/**
 * Simulated OpenWrt 25.x ubus/uhttpd for local MilkFlint UI testing.
 * Serves JSON-RPC at /ubus with wireless, usteer, mesh11sd, and milkflint.* status.
 *
 *   node scripts/mock-openwrt-ubus.mjs
 *   MILKFLINT_VM=http://127.0.0.1:8088 pnpm exec vite
 */
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.MOCK_UBUS_PORT ?? 8088);

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
const configs = {
  wireless: {
    radio0: {
      '.type': 'wifi-device',
      '.name': 'radio0',
      '.index': 0,
      type: 'mac80211',
      channel: '1',
      band: '2g',
      path: 'simulated/phy0',
      htmode: 'HE20',
      country: 'US',
      disabled: '0',
    },
    radio1: {
      '.type': 'wifi-device',
      '.name': 'radio1',
      '.index': 1,
      type: 'mac80211',
      channel: '36',
      band: '5g',
      path: 'simulated/phy1',
      htmode: 'HE80',
      country: 'US',
      disabled: '0',
    },
    radio2: {
      '.type': 'wifi-device',
      '.name': 'radio2',
      '.index': 2,
      type: 'mac80211',
      channel: '37',
      band: '6g',
      path: 'simulated/phy2',
      htmode: 'EHT160',
      country: 'US',
      disabled: '0',
    },
    wifinet0: {
      '.type': 'wifi-iface',
      '.name': 'wifinet0',
      '.index': 3,
      device: 'radio0',
      mode: 'ap',
      network: 'lan',
      ssid: 'MilkFlint',
      encryption: 'sae-mixed',
      key: 'milkflint-demo',
      ieee80211r: '0',
      ieee80211k: '0',
      bss_transition: '0',
    },
    wifinet1: {
      '.type': 'wifi-iface',
      '.name': 'wifinet1',
      '.index': 4,
      device: 'radio1',
      mode: 'ap',
      network: 'lan',
      ssid: 'MilkFlint',
      encryption: 'sae-mixed',
      key: 'milkflint-demo',
      ieee80211r: '0',
      ieee80211k: '0',
      bss_transition: '0',
    },
    wifinet2: {
      '.type': 'wifi-iface',
      '.name': 'wifinet2',
      '.index': 5,
      device: 'radio2',
      mode: 'ap',
      network: 'lan',
      ssid: 'MilkFlint',
      encryption: 'sae',
      key: 'milkflint-demo',
      ieee80211r: '0',
      ieee80211k: '0',
      bss_transition: '0',
    },
  },
  usteer: {
    usteer: {
      '.type': 'usteer',
      '.name': 'usteer',
      '.index': 0,
      disabled: '1',
    },
  },
  mesh11sd: {
    setup: {
      '.type': 'mesh11sd',
      '.name': 'setup',
      '.index': 0,
      enabled: '1',
      auto_config: '0',
      portal_detect: '1',
      auto_mesh_id: 'MilkFlint',
      auto_mesh_band: '2g',
      mesh_gate_base_ssid: 'MilkFlint',
      mesh_gate_encryption: '4',
      ssid_suffix_enable: '1',
      mesh_gate_enable: '1',
    },
  },
  milkflint: {
    defaults: { '.type': 'defaults', '.name': 'defaults', '.index': 0 },
    mesh: { '.type': 'mesh', '.name': 'mesh', '.index': 1, role: 'main-auto' },
  },
};

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
const staged = {};
const sessions = new Set();
let usteerRunning = false;
let meshRunning = false;

function ok(data) {
  return [0, data ?? {}];
}

function sessionId() {
  return randomBytes(16).toString('hex');
}

function deepClone(v) {
  return structuredClone(v);
}

function ensureConfig(name) {
  configs[name] ??= {};
  return configs[name];
}

function applyStaged(config) {
  const changes = staged[config];
  if (!changes) return;
  const cfg = ensureConfig(config);
  for (const [section, ops] of Object.entries(changes)) {
    if (ops.__delete) {
      delete cfg[section];
      continue;
    }
    if (ops.__add) {
      cfg[section] = {
        '.type': ops.__add.type,
        '.name': section,
        '.index': Object.keys(cfg).length,
        ...ops.__add.values,
      };
      continue;
    }
    cfg[section] ??= { '.type': section, '.name': section, '.index': Object.keys(cfg).length };
    for (const [k, v] of Object.entries(ops.values ?? {})) cfg[section][k] = v;
    for (const opt of ops.unset ?? []) delete cfg[section][opt];
  }
  delete staged[config];
  if (config === 'usteer') {
    const disabled = cfg.usteer?.disabled;
    usteerRunning = disabled === '0' || disabled === false;
  }
  if (config === 'mesh11sd') {
    meshRunning = cfg.setup?.enabled !== '0' && cfg.setup?.auto_config !== '0';
  }
}

function handleCall(session, object, method, params = {}) {
  if (object === 'session' && method === 'login') {
    const id = sessionId();
    sessions.add(id);
    return ok({ ubus_rpc_session: id, data: { username: params.username ?? 'root' } });
  }
  if (object === 'session' && method === 'access') {
    if (session === '00000000000000000000000000000000' || !sessions.has(session)) {
      return { error: { code: -32002, message: 'Access denied' } };
    }
    return ok({});
  }
  if (object === 'session' && method === 'destroy') {
    sessions.delete(session);
    return ok({});
  }

  if (session !== '00000000000000000000000000000000' && !sessions.has(session)) {
    return { error: { code: -32002, message: 'Access denied' } };
  }

  if (object === 'milkflint.adminpassword' && method === 'status') {
    return ok({ set: true });
  }

  if (object === 'milkflint.mode' && method === 'status') {
    return ok({ mode: 'router', switching: false });
  }

  if (object === 'system' && method === 'board') {
    return ok({
      hostname: 'MilkFlint-Sim',
      model: 'QEMU Standard PC (simulated Flint 4)',
      board_name: 'qemu-x86-64',
      kernel: '6.12.0',
      system: 'x86_64',
      release: {
        distribution: 'MilkFlint',
        version: '25.12-SNAPSHOT',
        revision: 'r99999-sim',
        description: 'MilkFlint 1.x (OpenWrt 25.12 simulated)',
      },
    });
  }

  if (object === 'system' && method === 'info') {
    return ok({
      localtime: Math.floor(Date.now() / 1000),
      uptime: 3600,
      load: [65536, 65536, 65536],
      memory: { total: 2e9, free: 1e9, shared: 0, buffered: 1e8, available: 1.2e9, cached: 2e8 },
    });
  }

  if (object === 'uci' && method === 'get') {
    const cfg = ensureConfig(params.config);
    return ok({ values: deepClone(cfg) });
  }

  if (object === 'uci' && method === 'changes') {
    const out = {};
    for (const [c, ch] of Object.entries(staged)) if (Object.keys(ch).length) out[c] = ch;
    return ok({ changes: out });
  }

  if (object === 'uci' && method === 'revert') {
    delete staged[params.config];
    return ok({});
  }

  if (object === 'uci' && method === 'set') {
    const c = params.config;
    staged[c] ??= {};
    staged[c][params.section] ??= { values: {} };
    Object.assign(staged[c][params.section].values ??= {}, params.values ?? {});
    return ok({});
  }

  if (object === 'uci' && method === 'delete') {
    const c = params.config;
    staged[c] ??= {};
    if (params.options?.length) {
      staged[c][params.section] ??= { values: {}, unset: [] };
      staged[c][params.section].unset = [...new Set([...(staged[c][params.section].unset ?? []), ...params.options])];
    } else {
      staged[c][params.section] = { __delete: true };
    }
    return ok({});
  }

  if (object === 'uci' && method === 'add') {
    const c = params.config;
    const name = params.name ?? `cfg${randomBytes(3).toString('hex')}`;
    staged[c] ??= {};
    staged[c][name] = { __add: { type: params.type, values: params.values ?? {} } };
    return ok({ section: name });
  }

  if (object === 'uci' && method === 'apply') {
    for (const c of Object.keys(staged)) applyStaged(c);
    return ok({});
  }

  if (object === 'uci' && method === 'confirm') return ok({});
  if (object === 'uci' && method === 'rollback') {
    for (const c of Object.keys(staged)) delete staged[c];
    return ok({});
  }

  if (object === 'milkflint.roaming' && method === 'status') {
    const wireless = configs.wireless;
    const ftIfaces = Object.values(wireless)
      .filter((s) => s['.type'] === 'wifi-iface' && (s.ieee80211r === '1' || s.ieee80211r === true))
      .map((s) => s['.name']);
    return ok({
      wpadFull: true,
      usteerRunning,
      ftIfaces,
      neighbors: usteerRunning
        ? [
            { bssid: 'aa:bb:cc:dd:ee:01', ssid: 'MilkFlint', signal: -62, freq: 2412 },
            { bssid: 'aa:bb:cc:dd:ee:02', ssid: 'MilkFlint', signal: -71, freq: 5180 },
          ]
        : [],
    });
  }

  if (object === 'milkflint.mesh' && method === 'status') {
    const setup = configs.mesh11sd.setup ?? {};
    return ok({
      installed: true,
      running: meshRunning || setup.enabled !== '0',
      local: {
        portalDetect: String(setup.portal_detect ?? '1'),
        autoConfig: String(setup.auto_config ?? '0'),
        portalType: setup.portal_detect === '0' ? 'MRP' : 'MRP',
        hostname: 'MilkFlint-Sim',
        meshId: setup.auto_mesh_id ?? null,
      },
      peers:
        setup.auto_config !== '0'
          ? [
              {
                id: 'peer-1',
                hostname: 'AP-Living',
                role: 'MPE',
                mac: '94:83:c4:11:22:33',
                signal: -58,
                metric: 120,
              },
              {
                id: 'peer-2',
                hostname: 'AP-Office',
                role: 'MPE',
                mac: '94:83:c4:44:55:66',
                signal: -67,
                metric: 210,
              },
            ]
          : [],
    });
  }

  if (object === 'milkflint.mesh' && method === 'reload') {
    meshRunning = configs.mesh11sd.setup?.auto_config !== '0';
    return ok({ reloaded: true });
  }

  // Soft-ok stubs so other pages don't explode if navigated.
  if (object.startsWith('milkflint.') || object === 'luci' || object === 'luci-rpc' || object === 'iwinfo' || object === 'network.interface') {
    return ok({});
  }

  console.warn(`unhandled ${object}.${method}`, params);
  return ok({});
}

function dispatch(body) {
  const items = Array.isArray(body) ? body : [body];
  return items.map((req) => {
    const id = req.id ?? 0;
    try {
      const [session, object, method, params] = req.params ?? [];
      const result = handleCall(session, object, method, params ?? {});
      if (result?.error) return { jsonrpc: '2.0', id, error: result.error };
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      console.error(err);
      return { jsonrpc: '2.0', id, error: { code: -32000, message: String(err) } };
    }
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url?.startsWith('/ubus') && req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const out = dispatch(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(body) ? out : out[0]));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, usteerRunning, meshRunning }));
    return;
  }
  res.writeHead(404);
  res.end('mock openwrt ubus — POST /ubus');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock OpenWrt ubus on http://127.0.0.1:${PORT}/ubus`);
  console.log('Login: any password · board: MilkFlint 25.12 simulated · wifi/mesh seeded');
});
