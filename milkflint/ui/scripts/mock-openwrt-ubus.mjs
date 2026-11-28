#!/usr/bin/env node
/**
 * Simulated OpenWrt 25.x ubus/uhttpd for local MilkFlint UI testing.
 * Serves JSON-RPC at /ubus with wireless, usteer, mesh11sd, milkflint.*, and
 * enough system/network stubs so every sidebar page can load.
 *
 *   node scripts/mock-openwrt-ubus.mjs
 *   MILKFLINT_VM=http://127.0.0.1:8088 pnpm exec vite
 */
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.MOCK_UBUS_PORT ?? 8088);
const NOW = () => Math.floor(Date.now() / 1000);

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
      auto_mesh_id: 'MilkFlintLab',
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
    mode: { '.type': 'mode', '.name': 'mode', '.index': 2, mode: 'router' },
    datastats: { '.type': 'datastats', '.name': 'datastats', '.index': 3, enabled: '1', history: '0' },
    roaming: { '.type': 'roaming', '.name': 'roaming', '.index': 4, apply_all: '1' },
    steering: { '.type': 'steering', '.name': 'steering', '.index': 5, layout: 'auto', rss: '1' },
    wifi: { '.type': 'wifi', '.name': 'wifi', '.index': 6 },
  },
  network: {
    loopback: {
      '.type': 'interface',
      '.name': 'loopback',
      '.index': 0,
      device: 'lo',
      proto: 'static',
      ipaddr: '127.0.0.1',
      netmask: '255.0.0.0',
    },
    lan: {
      '.type': 'interface',
      '.name': 'lan',
      '.index': 1,
      device: 'br-lan',
      proto: 'static',
      ipaddr: '192.168.1.1',
      netmask: '255.255.255.0',
      ip6assign: '60',
    },
    wan: {
      '.type': 'interface',
      '.name': 'wan',
      '.index': 2,
      device: 'eth1',
      proto: 'dhcp',
    },
    wan6: {
      '.type': 'interface',
      '.name': 'wan6',
      '.index': 3,
      device: 'eth1',
      proto: 'dhcpv6',
    },
  },
  dhcp: {
    lan: {
      '.type': 'dhcp',
      '.name': 'lan',
      '.index': 0,
      interface: 'lan',
      start: '100',
      limit: '150',
      leasetime: '12h',
    },
  },
  firewall: {
    defaults: {
      '.type': 'defaults',
      '.name': 'defaults',
      '.index': 0,
      syn_flood: '1',
      input: 'REJECT',
      output: 'ACCEPT',
      forward: 'REJECT',
      flow_offloading: '1',
      flow_offloading_hw: '1',
      flow_offloading_bridge: '0',
    },
    lan: {
      '.type': 'zone',
      '.name': 'lan',
      '.index': 1,
      name: 'lan',
      network: 'lan',
      input: 'ACCEPT',
      output: 'ACCEPT',
      forward: 'ACCEPT',
    },
    wan: {
      '.type': 'zone',
      '.name': 'wan',
      '.index': 2,
      name: 'wan',
      network: ['wan', 'wan6'],
      input: 'REJECT',
      output: 'ACCEPT',
      forward: 'REJECT',
      masq: '1',
    },
    lan_wan: { '.type': 'forwarding', '.name': 'lan_wan', '.index': 3, src: 'lan', dest: 'wan' },
  },
  sqm: {
    eth1: {
      '.type': 'queue',
      '.name': 'eth1',
      '.index': 0,
      enabled: '1',
      interface: 'eth1',
      download: '900000',
      upload: '90000',
      qdisc: 'cake',
      script: 'piece_of_cake.qos',
      linklayer: 'ethernet',
      overhead: '44',
      iqdisc_opts: 'nat dual-dsthost ingress',
      eqdisc_opts: 'nat dual-srchost',
    },
  },
  system: {
    '@system[0]': {
      '.type': 'system',
      '.name': '@system[0]',
      '.index': 0,
      hostname: 'MilkFlint-Sim',
      timezone: 'UTC',
    },
  },
  luci: {},
  dropbear: {
    main: { '.type': 'dropbear', '.name': 'main', '.index': 0, Port: '22', PasswordAuth: 'on' },
  },
  upnpd: {
    config: { '.type': 'upnpd', '.name': 'config', '.index': 0, enabled: '0' },
  },
  uhttpd: {
    main: {
      '.type': 'uhttpd',
      '.name': 'main',
      '.index': 0,
      listen_http: '0.0.0.0:80',
      listen_https: '0.0.0.0:443',
      redirect_https: '0',
      home: '/www',
      rfc1918_filter: '1',
    },
  },
  banip: {
    global: { '.type': 'banip', '.name': 'global', '.index': 0, ban_enabled: '0' },
  },
  adguardhome: {
    config: { '.type': 'adguardhome', '.name': 'config', '.index': 0, enabled: '0' },
  },
};

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
const staged = {};
const sessions = new Set();
let usteerRunning = false;
let meshRunning = false;
let homeWidgets = null;
let themeSettings = { theme: 'monokai-milk', custom: [] };
let cpuTick = 0;

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

function statsPayload() {
  cpuTick += 1;
  const base = 8_000_000 + cpuTick * 50_000;
  const idle = Math.floor(base * 0.82);
  return {
    cpu: [
      { name: 'cpu', total: base, idle, softirq: Math.floor(base * 0.04) },
      { name: 'cpu0', total: Math.floor(base / 4), idle: Math.floor(idle / 4), softirq: 1000 },
      { name: 'cpu1', total: Math.floor(base / 4), idle: Math.floor(idle / 4), softirq: 800 },
      { name: 'cpu2', total: Math.floor(base / 4), idle: Math.floor(idle / 4), softirq: 900 },
      { name: 'cpu3', total: Math.floor(base / 4), idle: Math.floor(idle / 4), softirq: 700 },
    ],
    temperatures: [
      { name: 'cpu-thermal', celsius: 54 + (cpuTick % 5) },
      { name: 'sim-phy0', celsius: 62, wiphy: 'phy0' },
      { name: 'sim-phy1', celsius: 58, wiphy: 'phy1' },
      { name: 'sim-eth1', celsius: 49, port: 'eth1' },
    ],
    conntrack: { count: 420 + (cpuTick % 40), max: 65536 },
  };
}

function interfaceDump() {
  return {
    interface: [
      {
        interface: 'loopback',
        up: true,
        proto: 'static',
        device: 'lo',
        l3_device: 'lo',
        'ipv4-address': [{ address: '127.0.0.1', mask: 8 }],
        route: [],
      },
      {
        interface: 'lan',
        up: true,
        uptime: 3600,
        proto: 'static',
        device: 'br-lan',
        l3_device: 'br-lan',
        'ipv4-address': [{ address: '192.168.1.1', mask: 24 }],
        'ipv6-address': [{ address: 'fd00:milk:flint::1', mask: 64 }],
        route: [],
        'dns-server': [],
      },
      {
        interface: 'wan',
        up: true,
        uptime: 3500,
        proto: 'dhcp',
        device: 'eth1',
        l3_device: 'eth1',
        'ipv4-address': [{ address: '203.0.113.47', mask: 24 }],
        route: [{ target: '0.0.0.0', mask: 0, nexthop: '203.0.113.1' }],
        'dns-server': ['1.1.1.1', '9.9.9.9'],
      },
      {
        interface: 'wan6',
        up: true,
        uptime: 3500,
        proto: 'dhcpv6',
        device: 'eth1',
        l3_device: 'eth1',
        'ipv6-address': [{ address: '2001:db8:47::2', mask: 64 }],
        'ipv6-prefix': [{ address: '2001:db8:47::', mask: 56 }],
        route: [{ target: '::', mask: 0, nexthop: 'fe80::1' }],
        'dns-server': ['2606:4700:4700::1111'],
      },
    ],
  };
}

function deviceStatus() {
  return {
    lo: { type: 'Network device', up: true, statistics: { rx_bytes: 0, tx_bytes: 0 } },
    eth0: {
      type: 'Network device',
      up: true,
      carrier: true,
      speed: '1000F',
      'link-supported': ['1000baseT-F'],
      statistics: { rx_bytes: 1e9, tx_bytes: 2e8, rx_packets: 1e6, tx_packets: 5e5 },
    },
    eth1: {
      type: 'Network device',
      up: true,
      carrier: true,
      speed: '10000F',
      'link-supported': ['1000baseT-F', '2500baseT-F', '10000baseT-F'],
      statistics: { rx_bytes: 8e9, tx_bytes: 1e9, rx_packets: 4e6, tx_packets: 9e5 },
    },
    'phy0-ap0': {
      type: 'Network device',
      up: true,
      carrier: true,
      statistics: { rx_bytes: 2e8, tx_bytes: 5e8 },
    },
    'phy1-ap0': {
      type: 'Network device',
      up: true,
      carrier: true,
      statistics: { rx_bytes: 4e8, tx_bytes: 9e8 },
    },
    'phy2-ap0': {
      type: 'Network device',
      up: true,
      carrier: true,
      statistics: { rx_bytes: 1e8, tx_bytes: 3e8 },
    },
    'br-lan': {
      type: 'Bridge',
      up: true,
      'bridge-members': ['eth0', 'phy0-ap0', 'phy1-ap0', 'phy2-ap0'],
      statistics: { rx_bytes: 3e9, tx_bytes: 6e9 },
    },
    lan1: {
      type: 'Network device',
      devtype: 'dsa',
      up: true,
      carrier: true,
      speed: '1000F',
      statistics: { rx_bytes: 1e8, tx_bytes: 2e7 },
    },
    lan2: { type: 'Network device', devtype: 'dsa', up: true, carrier: false, statistics: { rx_bytes: 0, tx_bytes: 0 } },
    lan3: { type: 'Network device', devtype: 'dsa', up: true, carrier: false, statistics: { rx_bytes: 0, tx_bytes: 0 } },
    lan4: { type: 'Network device', devtype: 'dsa', up: true, carrier: false, statistics: { rx_bytes: 0, tx_bytes: 0 } },
  };
}

function wirelessDevices() {
  const ap = (section, ifname, ssid) => ({
    section,
    ifname,
    config: { mode: 'ap', ssid, network: ['lan'], encryption: 'sae-mixed' },
  });
  return {
    radio0: {
      up: true,
      disabled: false,
      config: { band: '2g', channel: '1', htmode: 'HE20', country: 'US', txpower: '20' },
      iwinfo: { phy: 'phy0', htmodes: ['HT20', 'HE20'] },
      interfaces: [ap('wifinet0', 'phy0-ap0', 'MilkFlint')],
    },
    radio1: {
      up: true,
      disabled: false,
      config: { band: '5g', channel: '36', htmode: 'HE80', country: 'US', txpower: '23' },
      iwinfo: { phy: 'phy1', htmodes: ['VHT80', 'HE80'] },
      interfaces: [ap('wifinet1', 'phy1-ap0', 'MilkFlint')],
    },
    radio2: {
      up: true,
      disabled: false,
      config: { band: '6g', channel: '37', htmode: 'EHT160', country: 'US', txpower: '18' },
      iwinfo: { phy: 'phy2', htmodes: ['HE160', 'EHT160'] },
      interfaces: [ap('wifinet2', 'phy2-ap0', 'MilkFlint')],
    },
  };
}

function sensorHistory() {
  const names = ['cpu-thermal', 'sim-phy0', 'sim-phy1', 'sim-eth1'];
  const now = NOW();
  return {
    now,
    interval: 10,
    samples: Array.from({ length: 60 }, (_, i) => ({
      t: now - (59 - i) * 10,
      c: Object.fromEntries(names.map((n, k) => [n, 48 + k * 4 + Math.sin(i / 8) * 2])),
    })),
  };
}

function modeStatus() {
  return {
    now: NOW(),
    mode: 'router',
    handmade: false,
    switching: false,
    last: null,
    wan_port: 'eth1',
    lan: { proto: 'static', ipaddr: '192.168.1.1', netmask: '255.255.255.0', gateway: null, dns: [] },
    lan_now: { up: true, ipaddr: '192.168.1.1', prefix: 24, gateway: null, dns: [] },
    uplink: { up: true, ipaddr: '203.0.113.47', prefix: 24, gateway: '203.0.113.1', dns: ['1.1.1.1'] },
    router_address: '192.168.1.1',
    firewall_defaults: 'defaults',
    bridge_offload: false,
    bridge_offload_available: true,
  };
}

/** Soft stubs that still satisfy common zod status shapes. */
function milkflintStub(object, method, params = {}) {
  const key = `${object} ${method}`;
  switch (key) {
    case 'milkflint stats':
      return statsPayload();
    case 'milkflint sqm_status':
      return {
        qdiscs: [
          {
            kind: 'cake',
            dev: 'ifb4eth1',
            handle: '1:',
            root: true,
            bytes: 12_000_000 + cpuTick * 80_000,
            packets: 90_000 + cpuTick * 40,
            drops: 2,
            backlog: 0,
            options: { bandwidth: 900_000_000, diffserv: 'diffserv3', overhead: 44 },
            tins: [
              { sent_bytes: 2e6, avg_delay_us: 120, base_delay_us: 40, drops: 0 },
              { sent_bytes: 8e6, avg_delay_us: 800, base_delay_us: 200, drops: 1 },
              { sent_bytes: 2e6, avg_delay_us: 400, base_delay_us: 100, drops: 1 },
            ],
          },
          {
            kind: 'cake',
            dev: 'eth1',
            handle: '2:',
            root: true,
            bytes: 1_500_000 + cpuTick * 20_000,
            packets: 20_000 + cpuTick * 10,
            drops: 0,
            backlog: 0,
            options: { bandwidth: 90_000_000, overhead: 44 },
            tins: [{ sent_bytes: 1.5e6, avg_delay_us: 300, base_delay_us: 80, drops: 0 }],
          },
        ],
        steering: { cpus: 4, napi: [0], rps: [0, 1, 2, 3] },
      };
    case 'milkflint pipeline':
      return {
        cpu: statsPayload().cpu,
        rss: {
          dev: 'eth1',
          rings: 4,
          table: [64, 64, 64, 64],
          hash: 'toeplitz',
        },
        rings: [0, 1, 2, 3].map((ring) => ({
          ring,
          irq: { irq: 100 + ring, cpus: [ring], count: 10_000 + cpuTick * 20 + ring },
          thread: {
            name: `napi/mtk_eth-${ring + 1}`,
            cpus: [ring],
            time: 5_000 + cpuTick * 10 + ring * 3,
            wait: 1000,
            runs: 200 + cpuTick,
          },
        })),
        tx: {
          irq: { irq: 99, cpus: [0], count: 8_000 + cpuTick * 5 },
          thread: { name: 'napi/mtk_eth-0', cpus: [0], time: 2_000 + cpuTick * 4, wait: 500, runs: 100 },
        },
        eth_threads: [],
        wifi: {
          irqs: [{ name: 'mt7996', irq: 200, cpus: [2], count: 50_000 + cpuTick * 30 }],
          threads: [
            { name: 'napi/phy0-0', cpus: [1], time: 3_000 + cpuTick * 6, wait: 800, runs: 150 },
            { name: 'napi/phy1-0', cpus: [2], time: 4_000 + cpuTick * 8, wait: 900, runs: 180 },
            { name: 'napi/phy2-0', cpus: [3], time: 2_500 + cpuTick * 5, wait: 700, runs: 120 },
            { name: 'mt76-tx', cpus: [1, 2, 3], time: 1_500 + cpuTick * 3, wait: 400, runs: 90 },
          ],
        },
        rps: [
          { dev: 'eth1', queues: [[0], [1], [2], [3]] },
          { dev: 'eth0', queues: [[0, 1, 2, 3]] },
        ],
        xps: [],
      };
    case 'milkflint neighbors':
      return { neighbors: [] };
    case 'milkflint.devices sync':
    case 'milkflint.devices get':
      return { now: NOW(), retain: 30 * 24 * 3600, devices: [] };
    case 'milkflint.lan connections':
      return {
        count: 12,
        max: 65_536,
        by_proto: [
          { proto: 'tcp', count: 8 },
          { proto: 'udp', count: 4 },
        ],
        hosts: [{ ip: '192.168.1.120', connections: 5, bytes: 48_000 }],
        connections: [
          {
            family: 'ipv4',
            proto: 'tcp',
            src: '192.168.1.120',
            dst: '1.1.1.1',
            sport: 54321,
            dport: 443,
            state: 'ESTABLISHED',
            packets: 120,
            bytes: 48_000,
          },
        ],
      };
    case 'milkflint.home get':
      return homeWidgets ? { widgets: homeWidgets } : {};
    case 'milkflint.home set':
      homeWidgets = params.widgets ?? null;
      return { saved: true };
    case 'milkflint.sensors history':
      return sensorHistory();
    case 'milkflint.mode status':
      return modeStatus();
    case 'milkflint.mode switch':
      return { started: true, at: NOW(), seconds: 30 };
    case 'milkflint.dns status':
      return { installed: true, running: true };
    case 'milkflint.adminpassword status':
      return { set: true };
    case 'milkflint.https status':
      return {
        tls: true,
        generator: true,
        own: true,
        cert: null,
        running: true,
        https: ['0.0.0.0:443'],
        redirect: false,
      };
    case 'milkflint.https renew':
      return { renewing: true };
    case 'milkflint.logs status':
      return { kinds: ['system', 'kernel', 'wifi'], sizes: {} };
    case 'milkflint.logs read':
      return { lines: ['sim: mock log line 1', 'sim: mock log line 2'], truncated: false };
    case 'milkflint.upgrade check':
      return { available: false, current: '25.12-SNAPSHOT', latest: null };
    case 'milkflint.themes get':
      return themeSettings;
    case 'milkflint.themes set':
      themeSettings = {
        theme: typeof params.theme === 'string' ? params.theme : themeSettings.theme,
        custom: Array.isArray(params.custom) ? params.custom : themeSettings.custom,
      };
      return { saved: true };
    case 'milkflint.startup list':
      return {
        services: [
          { name: 'firewall', start: 19, stop: 90, enabled: true, running: true },
          { name: 'network', start: 20, stop: 90, enabled: true, running: true },
          { name: 'dnsmasq', start: 19, stop: 110, enabled: true, running: true },
          { name: 'odhcpd', start: 35, stop: 85, enabled: true, running: true },
          { name: 'dropbear', start: 50, stop: 10, enabled: true, running: true },
          { name: 'uhttpd', start: 50, stop: 10, enabled: true, running: true },
          { name: 'rpcd', start: 12, stop: 89, enabled: true, running: true },
          { name: 'cron', start: 50, stop: 90, enabled: true, running: true },
        ],
      };
    case 'milkflint.startup action':
      return { ok: true, code: 0, running: params.action !== 'stop', enabled: params.action !== 'disable' };
    case 'milkflint.startup rc_local':
      return {
        data: '#!/bin/sh\n# Put your custom commands here that should be executed once\n# the system init finished. By default this file does nothing.\n\nexit 0\n',
      };
    case 'milkflint.startup set_rc_local':
      return { saved: true };
    case 'milkflint.adguardhome status':
      return {
        installed: true,
        enabled: false,
        configured: false,
        mode: 'router',
        running: false,
        state: 'off',
        version: '0.107.80-r1',
      };
    case 'milkflint.adguardhome insights':
      return { queries: [], top: [] };
    case 'milkflint.banip status':
      return {
        installed: true,
        enabled: false,
        mode: 'router',
        state: 'off',
        table: false,
        elements: 0,
        version: '1.9.1-r2',
        drops: { step: 300, end: NOW(), counted: [], logged: [], flood: [], hour: 0, day: 0, source: 'counters' },
        now: NOW(),
      };
    case 'milkflint.banip config':
      return {
        installed: true,
        enabled: false,
        mode: 'router',
        options: {},
        milkflint: {},
        custom: { state: 'builtin', loads: true, own: [] },
        catalogue: [],
        runtime: null,
        install: null,
        tools: { msmtp: false, conntrack: true, curl: true, wget: true },
        memory: { total_kb: 2_000_000, available_kb: 1_200_000 },
        cpus: 4,
      };
    case 'milkflint.banip list_get':
      return { entries: [], total: 0 };
    case 'milkflint.banip search':
      return { hits: [] };
    case 'milkflint.banip lookup':
      return { found: false };
    case 'milkflint.banip survey':
      return { entries: [], total: 0, offset: 0 };
    case 'milkflint.banip report':
      return { generated: NOW(), summary: {} };
    case 'milkflint.banip drops':
      return { entries: [], total: 0 };
    case 'milkflint.banip log':
      return { lines: [] };
    case 'milkflint.banip feed_test':
      return { ok: true, count: 0 };
    case 'milkflint.banip mail_get':
      return { enabled: false };
    case 'milkflint.vpn status':
      return { installed: true, now: NOW(), interfaces: [] };
    case 'milkflint.traffic periods':
      return { installed: true, enabled: true, periods: [] };
    case 'milkflint.traffic usage':
      return { columns: ['mac', 'ip', 'conns', 'rx_bytes', 'rx_pkts', 'tx_bytes', 'tx_pkts'], data: [] };
    case 'milkflint.traffic history': {
      const hours = Number(params.hours ?? 24);
      const span = hours === 1 || hours === 4 || hours === 8 || hours === 24 ? hours * 3600 : 24 * 3600;
      const now = NOW();
      return { enabled: false, now, interval: 300, since: now - span, samples: [] };
    }
    case 'milkflint.devicecontrol status':
      return {
        now: NOW(),
        offset: 0,
        paused: {},
        extra: {},
        ready: true,
        today: null,
        seen: {},
        clock: { ntp: true, synced: true, stratum: 2, at: NOW() - 60, uptime: 3600 },
        adguard: { installed: true, enabled: false, state: null },
      };
    case 'milkflint.netquality status': {
      const now = NOW();
      return {
        enabled: true,
        now,
        interval: 60,
        targets: {
          gateway: '203.0.113.1',
          internet: '1.1.1.1',
          dns_server: '1.1.1.1',
          dns_domain: 'example.com',
          dns_servers: [{ key: '1.1.1.1', host: '1.1.1.1', addr: '1.1.1.1' }],
          routes: [
            { key: 'uk', label: 'UK', host: 'london.example', addr: '198.51.100.10' },
            { key: 'eu', label: 'Europe', host: 'frankfurt.example', addr: '198.51.100.20' },
            { key: 'us', label: 'US', host: 'ashburn.example', addr: '198.51.100.30' },
          ],
        },
        gateway_answers: true,
        samples: Array.from({ length: 5 }, (_, i) => ({
          t: now - (4 - i) * 60,
          gateway: 2 + i * 0.2,
          internet: 12 + i,
          dns: 8 + i * 0.5,
          dns_servers: { '1.1.1.1': 8 + i * 0.5 },
          routes: { uk: 20 + i, eu: 28 + i, us: 90 + i },
        })),
      };
    }
    case 'milkflint.netquality history': {
      const now = NOW();
      const step = Number(params.step ?? 60);
      const span = Number(params.span ?? 3600);
      const start = now - span;
      const n = Math.min(60, Math.floor(span / step));
      return {
        now,
        start,
        step,
        days: 7,
        buckets: Array.from({ length: n }, (_, i) => ({
          i,
          internet: [12 + (i % 5), 40, 0, 10],
          dns: [8, 20, 0, 10],
          gateway: [2, 5, 0, 10],
          routes: { uk: [20, 50, 0, 5], eu: [28, 60, 0, 5], us: [90, 140, 0, 5] },
          dns_servers: { '1.1.1.1': [8, 20, 0, 10] },
        })),
      };
    }
    case 'milkflint.tuning status':
      return {
        radios: [
          { phy: 'phy0', low: 5000, high: 12000, threshold: 15000 },
          { phy: 'phy1', low: 5000, high: 12000, threshold: 15000 },
          { phy: 'phy2', low: 5000, high: 12000, threshold: 15000 },
        ],
        steering: {
          cpus: 4,
          ethernet: [0],
          wifi: [1, 2, 3],
          rps: [0, 1, 2, 3],
          realtime: false,
        },
        gro: [
          {
            dev: 'eth1',
            mode: 'fraglist',
            auto: 'fraglist',
            udp: true,
            max: 65536,
            whole: true,
            offload: true,
            now: { gro: true, list: true, udp: true, max: 65536 },
          },
        ],
        kernel: { hz: 1000, waits: true },
        knobs: {
          rx_delay: 0,
          cake_ecn: 0,
          cake_l4s: null,
          cake_loaded: true,
          wifi_retries: 4,
          wifi_vo_aggr: false,
        },
        wed: { wanted: false, loaded: false, active: false },
      };
    case 'milkflint.wifiscan results':
      return { scanning: false, radios: {}, results: [] };
    case 'milkflint.radarscan status':
      return { running: false, phy: null };
    case 'milkflint.radarscan reports':
      return { reports: [] };
    case 'milkflint.radarscan stop':
      return { stopping: true };
    case 'milkflint.upnp mappings':
      return { mappings: [] };
    case 'milkflint.bench status':
    case 'milkflint.bench create':
    case 'milkflint.bench rotate':
    case 'milkflint.bench coordinate':
      return { now: Date.now(), bench: null };
    case 'milkflint.bench close':
      return { closed: true };
    case 'milkflint.bench runs':
      return { runs: [] };
    case 'milkflint.bench run_get':
      return { error: 'No such run' };
    case 'milkflint.bench run_delete':
      return { deleted: true };
    default:
      if (object.startsWith('milkflint')) {
        // Prefer empty success over hard fail for unknown methods.
        return {};
      }
      return undefined;
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
      localtime: NOW(),
      uptime: 3600 + (cpuTick % 100),
      load: [12000, 9000, 7000],
      memory: {
        total: 2_048_000_000,
        free: 900_000_000,
        shared: 1_000_000,
        buffered: 80_000_000,
        available: 1_200_000_000,
        cached: 220_000_000,
      },
      root: { total: 120_000_000, free: 90_000_000, used: 30_000_000, avail: 90_000_000 },
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
    Object.assign((staged[c][params.section].values ??= {}), params.values ?? {});
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

  if (object === 'network.interface' && method === 'dump') return ok(interfaceDump());
  if (object === 'network.device' && method === 'status') return ok(deviceStatus());
  if (object === 'luci-rpc' && method === 'getWirelessDevices') return ok(wirelessDevices());
  if (object === 'luci-rpc' && method === 'getDHCPLeases') {
    return ok({
      dhcp_leases: [
        { hostname: 'phone-sim', macaddr: 'aa:bb:cc:11:22:33', ipaddr: '192.168.1.120', expires: 3600 },
        { hostname: 'laptop-sim', macaddr: 'aa:bb:cc:44:55:66', ipaddr: '192.168.1.121', expires: 7200 },
      ],
      dhcp6_leases: [],
    });
  }
  if (object === 'luci-rpc' && method === 'getHostHints') {
    return ok({
      'aa:bb:cc:11:22:33': { name: 'phone-sim', ipaddrs: ['192.168.1.120'] },
      'aa:bb:cc:44:55:66': { name: 'laptop-sim', ipaddrs: ['192.168.1.121'] },
    });
  }
  if (object === 'luci' && method === 'getBuiltinEthernetPorts') {
    return ok({
      result: [
        { role: 'wan', device: 'eth1' },
        { role: 'lan', device: 'lan1' },
        { role: 'lan', device: 'lan2' },
        { role: 'lan', device: 'lan3' },
        { role: 'lan', device: 'lan4' },
      ],
    });
  }

  if (object === 'iwinfo' && method === 'info') {
    return ok({
      phy: 'phy0',
      ssid: 'MilkFlint',
      bssid: '94:83:c4:00:11:22',
      country: 'US',
      mode: 'Master',
      channel: 36,
      frequency: 5180,
      txpower: 23,
      quality: 70,
      quality_max: 70,
      noise: -92,
      htmode: 'HE80',
    });
  }
  if (object === 'iwinfo' && method === 'assoclist') {
    return ok({
      results: [
        {
          mac: 'aa:bb:cc:11:22:33',
          signal: -55,
          noise: -92,
          connected_time: 1200,
          authorized: true,
          rx: { bytes: 1e8, packets: 1e5, rate: 400_000, mhz: 80, nss: 2 },
          tx: { bytes: 4e8, packets: 3e5, rate: 800_000, mhz: 80, nss: 2 },
        },
        {
          mac: 'aa:bb:cc:44:55:66',
          signal: -62,
          noise: -92,
          connected_time: 800,
          authorized: true,
          rx: { bytes: 5e7, packets: 5e4, rate: 200_000, mhz: 80, nss: 2 },
          tx: { bytes: 9e7, packets: 8e4, rate: 350_000, mhz: 80, nss: 2 },
        },
      ],
    });
  }
  if (object === 'iwinfo' && method === 'scan') {
    return ok({ results: [] });
  }

  if (object === 'file' && method === 'read') {
    if (params.path === '/etc/crontabs/root') return ok({ data: '' });
    return ok({ data: '' });
  }
  if (object === 'file' && method === 'exec') return ok({ code: 0, stdout: '', stderr: '' });
  if (object === 'file' && method === 'stat')
    return ok({ type: 'file', size: 0, mode: 420, atime: NOW(), mtime: NOW(), ctime: NOW() });
  if (object === 'file' && method === 'list') return ok({ entries: [] });
  if (object === 'file' && method === 'write') return ok({});

  if (object === 'service' && (method === 'list' || method === 'status')) return ok({});
  if (object === 'rc' && method === 'list') return ok({});

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

  if (object === 'milkflint.roaming' && method === 'reload') {
    return ok({ reloaded: true });
  }

  if (object === 'milkflint.mesh' && method === 'status') {
    const setup = configs.mesh11sd.setup ?? {};
    return ok({
      installed: true,
      running: meshRunning || setup.enabled !== '0',
      local: {
        portalDetect: String(setup.portal_detect ?? '1'),
        autoConfig: String(setup.auto_config ?? '0'),
        portalType: 'MRP',
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

  const stub = milkflintStub(object, method, params);
  if (stub !== undefined) return ok(stub);

  if (
    object.startsWith('milkflint.') ||
    object === 'luci' ||
    object === 'luci-rpc' ||
    object === 'iwinfo' ||
    object.startsWith('network')
  ) {
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
  console.log('Login: any password · board: MilkFlint 25.12 simulated · all sidebar pages stubbed');
});
