#!/usr/bin/env node
/**
 * High-res MilkFlint4 0.5a forum screenshots: serve built UI + rich ubus mock
 * shaped like a busy GL-BE14000 on Monokai milk, capture with Playwright.
 *
 * Run from milkflint/ui after `pnpm package` (copies dist → package/.../htdocs):
 *   node scripts/forum-screenshots.mjs
 * Optional: FORUM_SHOTS_OUT=/path/to/dir  FORUM_SHOTS_PORT=5299
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HTDOCS = fileURLToPath(new URL('../../../package/milkflint/milkflint-ui/htdocs/', import.meta.url));
const OUT = process.env.FORUM_SHOTS_OUT || path.join(process.cwd(), 'forum-shots');
const PORT = Number(process.env.FORUM_SHOTS_PORT || 5299);
const SESSION = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const NOW = Math.floor(Date.now() / 1000);

if (!fs.existsSync(path.join(HTDOCS, 'index.html'))) {
  console.error(
    `Built UI not found at ${HTDOCS}\nRun \`pnpm package\` from milkflint/ui first (copies dist/ into the OpenWrt package htdocs).`,
  );
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
};

function ok(data) {
  return [0, data ?? {}];
}

function uci(sections) {
  return {
    values: Object.fromEntries(
      sections.map(([name, type, options], i) => [
        name,
        { '.anonymous': false, '.type': type, '.name': name, '.index': i, ...options },
      ]),
    ),
  };
}

const GUESTS = [
  { id: 'guest', label: 'Visitors', ssid: 'MilkFlint-Guest', key: 'welcome-guests', subnet: 9 },
  { id: 'guest2', label: 'Kids', ssid: 'Kids-WiFi', key: 'K7#pQ2!vLm9', subnet: 10 },
];

const CLIENTS = [
  { mac: '5c:e9:1e:00:00:a0', name: 'lounge-apple-tv-4k', band: '5 GHz', gen: 6 },
  { mac: '5c:e9:1e:00:01:a1', name: "Sam’s MacBook Pro (16-inch, 2024)", band: '6 GHz', gen: 7 },
  { mac: '5c:e9:1e:00:02:a2', name: undefined, band: '5 GHz', gen: 6 },
  { mac: '5c:e9:1e:00:03:a3', name: 'DESKTOP-7Q2LX9K', band: '2.4 GHz', gen: 4 },
  { mac: '5c:e9:1e:00:04:a4', name: 'Samsung-Galaxy-S24-Ultra', band: '6 GHz', gen: 7 },
  { mac: '5c:e9:1e:00:05:a5', name: 'kitchen-echo-show-8', band: '2.4 GHz', gen: 4 },
  { mac: '5c:e9:1e:00:06:a6', name: 'iPad-Air-11-inch', band: '5 GHz', gen: 6 },
  { mac: '5c:e9:1e:00:07:a7', name: 'PlayStation-5', band: '5 GHz', gen: 6 },
];

function wave(i, period, low, high) {
  return low + ((Math.sin((i / period) * Math.PI * 2) + 1) / 2) * (high - low);
}

function handle(object, method, params) {
  const key = `${object} ${method}`;

  if (key === 'session login') {
    return ok({ ubus_rpc_session: SESSION, data: { username: 'root' } });
  }
  if (key === 'session access') return ok({ 'access-group': ['milkflint-ui'] });
  if (key === 'milkflint.adminpassword status') return ok({ set: true });
  if (key === 'milkflint.themes get') return ok({ theme: 'monokai-milk', custom: [] });
  if (key === 'milkflint.themes set') return ok({ saved: true });
  if (key === 'milkflint.startup list')
    return ok({
      services: [
        { name: 'network', start: 20, stop: 90, enabled: true, running: true },
        { name: 'cron', start: 50, stop: 90, enabled: true, running: true },
      ],
    });
  if (key === 'milkflint.startup action') return ok({ ok: true, code: 0, running: true, enabled: true });
  if (key === 'milkflint.startup rc_local') return ok({ data: '#!/bin/sh\n\nexit 0\n' });
  if (key === 'milkflint.startup set_rc_local') return ok({ saved: true });
  if (key === 'milkflint.home get') return ok({});
  if (key === 'milkflint.home set') return ok({ saved: true });

  if (key === 'system board') {
    return ok({
      hostname: 'MilkFlint4',
      model: 'GL.iNet GL-BE14000',
      board_name: 'glinet,gl-be14000',
      kernel: '6.18.64',
      system: 'ARMv8 Processor rev 0',
      rootfs_type: 'squashfs',
      release: {
        distribution: 'MilkFlint4',
        version: '0.5a',
        revision: 'r33311-981c978eff',
        description: 'MilkFlint4 0.5a',
      },
    });
  }

  if (key === 'system info') {
    return ok({
      localtime: NOW,
      uptime: 259_200,
      load: [0.42 * 65536, 0.38 * 65536, 0.31 * 65536],
      memory: {
        total: 2_097_152_000,
        free: 820_000_000,
        shared: 12_000_000,
        buffered: 90_000_000,
        available: 1_200_000_000,
        cached: 380_000_000,
      },
      root: { total: 448 * 1024 * 1024, free: 210 * 1024 * 1024, used: 238 * 1024 * 1024, avail: 210 * 1024 * 1024 },
      tmp: { total: 512 * 1024 * 1024, free: 480 * 1024 * 1024, used: 32 * 1024 * 1024, avail: 480 * 1024 * 1024 },
      swap: { total: 0, free: 0 },
    });
  }

  if (key === 'milkflint stats') {
    return ok({
      cpu: [
        { name: 'cpu0', total: 100_000, idle: 62_000, softirq: 8_000 },
        { name: 'cpu1', total: 100_000, idle: 71_000, softirq: 5_000 },
        { name: 'cpu2', total: 100_000, idle: 55_000, softirq: 12_000 },
        { name: 'cpu3', total: 100_000, idle: 68_000, softirq: 6_000 },
      ],
      temperatures: [
        { name: 'cpu-thermal', celsius: 52 },
        { name: 'mt7996-phy0', celsius: 58, wiphy: 'phy0' },
        { name: 'mt7996-phy1', celsius: 61, wiphy: 'phy1' },
        { name: 'mt7996-phy2', celsius: 55, wiphy: 'phy2' },
        { name: 'rtl8261-wan', celsius: 48, port: 'wan' },
        { name: 'yt9224-lan2', celsius: 46, port: 'lan2' },
      ],
      conntrack: { count: 1842, max: 262144 },
    });
  }

  if (key === 'milkflint sqm_status') {
    const tin = (rate) => ({
      threshold_rate: rate,
      sent_bytes: Math.round(rate * 12.5),
      backlog_bytes: 0,
      target_us: 5000,
      peak_delay_us: 2800,
      avg_delay_us: 900,
      base_delay_us: 400,
      sent_packets: 12000,
      drops: 2,
      ecn_mark: 14,
      ack_drops: 0,
      sparse_flows: 18,
      bulk_flows: 3,
    });
    return ok({
      queues: [
        {
          kind: 'cake_mq',
          dev: 'ifb4wan',
          handle: '1:',
          root: true,
          bytes: 9.2e9,
          packets: 6.1e6,
          drops: 12,
          backlog: 0,
          options: { bandwidth: 2_350_000_000, diffserv: 'diffserv3', overhead: 44 },
          capacity_estimate: 2_350_000_000,
          memory_used: 2_400_000,
          active_queues: 4,
          tins: [tin(1_200_000_000), tin(800_000_000), tin(200_000_000)],
        },
        {
          kind: 'cake',
          dev: 'wan',
          handle: '2:',
          root: true,
          bytes: 1.1e9,
          packets: 1.8e6,
          drops: 1,
          backlog: 0,
          options: { bandwidth: 120_000_000, diffserv: 'diffserv3', overhead: 44 },
          capacity_estimate: 120_000_000,
          memory_used: 480_000,
          tins: [tin(80_000_000), tin(30_000_000), tin(8_000_000)],
        },
      ],
    });
  }

  if (key === 'milkflint.tuning status') {
    return ok({
      radios: [
        { phy: 'phy0', low: 1500, high: 5000, threshold: 2500 },
        { phy: 'phy1', low: 1500, high: 5000, threshold: 2500 },
        { phy: 'phy2', low: 1500, high: 5000, threshold: 2500 },
      ],
      steering: { cpus: 4, ethernet: [0, 1, 2, 3], wifi: [0, 1, 2, 3], rps: [], realtime: true },
      gro: [
        {
          dev: 'wan',
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
        rx_delay: 20,
        cake_ecn: 0,
        cake_l4s: 0,
        cake_loaded: true,
        wifi_retries: 7,
        wifi_vo_aggr: false,
        wifi_muru_mimo_ul: false,
        wifi_muru_ofdma_ul: false,
      },
      wed: { wanted: true, loaded: true, active: true },
    });
  }

  if (key === 'uci get') {
    const config = params.config;
    if (config === 'milkflint') {
      return ok(
        uci([
          ['mode', 'mode', { mode: 'router' }],
          ['wifi', 'wifi', { wed: '1', muru_mimo_ul: '0', muru_ofdma_ul: '0' }],
          ['cake', 'cake', { multi_queue: '1' }],
          ['steering', 'steering', { rss: '1' }],
          ['datastats', 'datastats', { enabled: '1' }],
          ...GUESTS.map((g) => [g.id, 'guest_network', { label: g.label }]),
        ]),
      );
    }
    if (config === 'network') {
      return ok(
        uci([
          ['lan', 'interface', { device: 'br-lan', proto: 'static', ipaddr: '192.168.1.1/24' }],
          ['wan', 'interface', { device: 'wan', proto: 'dhcp' }],
          ['wan6', 'interface', { device: 'wan', proto: 'dhcpv6' }],
          ['br_lan', 'device', { name: 'br-lan', type: 'bridge', ports: ['lan2', 'lan3', 'lan4', 'lan5', 'lan6', 'lan7', 'lan8', 'lan9', 'sfp'] }],
          ...GUESTS.flatMap((g) => [
            [`${g.id}_dev`, 'device', { type: 'bridge', name: `br-${g.id}` }],
            [g.id, 'interface', { device: `br-${g.id}`, proto: 'static', ipaddr: `192.168.${g.subnet}.1/24` }],
          ]),
        ]),
      );
    }
    if (config === 'wireless') {
      return ok(
        uci([
          ['radio0', 'wifi-device', { type: 'mac80211', path: 'platform/soc/18000000.wifi', band: '2g', channel: '6', htmode: 'HE40', country: 'US', cell_density: '0', mu_beamformer: '1', he_mu_beamformer: '1' }],
          ['default_radio0', 'wifi-iface', { device: 'radio0', mode: 'ap', network: ['lan'], ssid: 'MilkFlint', encryption: 'sae-mixed', key: 'secret-home-key', ieee80211w: '1' }],
          // ch 36 @ 80 MHz sits cleanly in US 5150–5250 (max_bw 80); 6 GHz ch 5 @ 80
          ['radio1', 'wifi-device', { type: 'mac80211', path: 'platform/soc/18000000.wifi+1', band: '5g', channel: '36', htmode: 'EHT80', country: 'US', cell_density: '0', mu_beamformer: '1', he_mu_beamformer: '1' }],
          ['default_radio1', 'wifi-iface', { device: 'radio1', mode: 'ap', network: ['lan'], ssid: 'MilkFlint-5G', encryption: 'sae-mixed', key: 'secret-home-key', ieee80211w: '1' }],
          ['radio2', 'wifi-device', { type: 'mac80211', path: 'platform/soc/18000000.wifi+2', band: '6g', channel: '5', htmode: 'EHT80', country: 'US', cell_density: '0', mu_beamformer: '1', he_mu_beamformer: '1' }],
          ['default_radio2', 'wifi-iface', { device: 'radio2', mode: 'ap', network: ['lan'], ssid: 'MilkFlint-6G', encryption: 'sae', key: 'secret-home-key', ieee80211w: '2' }],
          ...GUESTS.map((g, i) => [
            `guest_ap${i}`,
            'wifi-iface',
            { device: 'radio1', mode: 'ap', network: [g.id], ssid: g.ssid, encryption: 'sae-mixed', key: g.key, isolate: '1' },
          ]),
        ]),
      );
    }
    if (config === 'sqm') {
      return ok(
        uci([
          [
            'wan',
            'queue',
            {
              enabled: '1',
              interface: 'wan',
              download: '2350000',
              upload: '120000',
              qdisc: 'cake',
              script: 'piece_of_cake.qos',
              linklayer: 'ethernet',
              overhead: '44',
              use_mq: '1',
              use_mq_egress: '0',
              qdisc_advanced: '1',
              qdisc_really_really_advanced: '1',
              iqdisc_opts: 'nat dual-dsthost no-split-gso',
              eqdisc_opts: 'nat dual-srchost',
            },
          ],
        ]),
      );
    }
    if (config === 'firewall') {
      // Busy Flint 4: OpenWrt builtins (Allow-Ping off), guest zones, DNS intercept,
      // device-control pause, custom rules, port forwards — so Rules + Zones look full.
      return ok(
        uci([
          ['defaults', 'defaults', { synflood_protect: '1', flow_offloading: '1', flow_offloading_hw: '1', input: 'REJECT', output: 'ACCEPT', forward: 'REJECT' }],
          ['lan_zone', 'zone', { name: 'lan', network: ['lan'], input: 'ACCEPT', output: 'ACCEPT', forward: 'ACCEPT' }],
          ['wan_zone', 'zone', { name: 'wan', network: ['wan', 'wan6'], input: 'REJECT', output: 'ACCEPT', forward: 'REJECT', masq: '1', mtu_fix: '1' }],
          ...GUESTS.flatMap((g) => [
            [g.id, 'zone', { name: g.id, network: [g.id], input: 'REJECT', output: 'ACCEPT', forward: 'REJECT' }],
            [`${g.id}_wan`, 'forwarding', { src: g.id, dest: 'wan' }],
            [`${g.id}_dns`, 'rule', { name: `Allow-DNS-${g.label}`, src: g.id, dest_port: '53', proto: 'tcp udp', target: 'ACCEPT' }],
            [`${g.id}_dhcp`, 'rule', { name: `Allow-DHCP-${g.label}`, src: g.id, dest_port: '67', proto: 'udp', target: 'ACCEPT', family: 'ipv4' }],
          ]),
          ['lan_wan', 'forwarding', { src: 'lan', dest: 'wan' }],
          // OpenWrt standard (Allow-Ping disabled — MilkFlint stealth)
          ['allow_dhcp_renew', 'rule', { name: 'Allow-DHCP-Renew', src: 'wan', proto: 'udp', dest_port: '68', target: 'ACCEPT', family: 'ipv4' }],
          ['allow_ping', 'rule', { name: 'Allow-Ping', src: 'wan', proto: 'icmp', icmp_type: 'echo-request', family: 'ipv4', target: 'ACCEPT', enabled: '0' }],
          ['allow_igmp', 'rule', { name: 'Allow-IGMP', src: 'wan', proto: 'igmp', family: 'ipv4', target: 'ACCEPT' }],
          ['allow_dhcpv6', 'rule', { name: 'Allow-DHCPv6', src: 'wan', proto: 'udp', dest_port: '546', family: 'ipv6', target: 'ACCEPT' }],
          ['allow_mld', 'rule', { name: 'Allow-MLD', src: 'wan', proto: 'icmp', src_ip: 'fe80::/10', icmp_type: '130/0', family: 'ipv6', target: 'ACCEPT' }],
          [
            'allow_icmpv6_input',
            'rule',
            {
              name: 'Allow-ICMPv6-Input',
              src: 'wan',
              proto: 'icmp',
              family: 'ipv6',
              target: 'ACCEPT',
              limit: '1000/sec',
              icmp_type: ['destination-unreachable', 'packet-too-big', 'time-exceeded', 'bad-header', 'unknown-header-type', 'router-solicitation', 'neighbour-solicitation', 'router-advertisement', 'neighbour-advertisement'],
            },
          ],
          [
            'allow_icmpv6_forward',
            'rule',
            {
              name: 'Allow-ICMPv6-Forward',
              src: 'wan',
              dest: '*',
              proto: 'icmp',
              family: 'ipv6',
              target: 'ACCEPT',
              limit: '1000/sec',
              icmp_type: ['destination-unreachable', 'packet-too-big', 'time-exceeded', 'bad-header', 'unknown-header-type'],
            },
          ],
          ['allow_ipsec_esp', 'rule', { name: 'Allow-IPSec-ESP', src: 'wan', dest: 'lan', proto: 'esp', target: 'ACCEPT' }],
          ['allow_isakmp', 'rule', { name: 'Allow-ISAKMP', src: 'wan', dest: 'lan', dest_port: '500', proto: 'udp', target: 'ACCEPT' }],
          // DNS intercept (MilkFlint)
          ['milkflint_dns_intercept', 'redirect', { name: 'Intercept DNS (MilkFlint)', src: 'lan', src_dport: '53', proto: 'tcp udp', target: 'DNAT', family: 'any' }],
          ['milkflint_dns_intercept_guest', 'redirect', { name: 'Intercept DNS Guest (MilkFlint)', src: 'guest', src_dport: '53', proto: 'tcp udp', target: 'DNAT', family: 'any' }],
          ['milkflint_dns_intercept_guest2', 'redirect', { name: 'Intercept DNS Guest2 (MilkFlint)', src: 'guest2', src_dport: '53', proto: 'tcp udp', target: 'DNAT', family: 'any' }],
          // Device control
          ['devctl_paused', 'ipset', { name: 'devctl_paused', family: 'any', match: ['src_mac'], timeout: '0' }],
          ['devctl_extra', 'ipset', { name: 'devctl_extra', family: 'any', match: ['src_mac'], timeout: '0' }],
          ['devctl_pause', 'rule', { name: 'Device control: paused', src: '*', dest: 'wan', ipset: 'devctl_paused', proto: 'all', target: 'REJECT' }],
          ['devctl_kids_always', 'rule', { name: 'Kids — always off', src: 'lan', dest: 'wan', src_mac: CLIENTS[5].mac, proto: 'all', target: 'REJECT', enabled: '0' }],
          [
            'devctl_kids_w1',
            'rule',
            {
              name: 'Kids — school nights',
              src: 'lan',
              dest: 'wan',
              src_mac: CLIENTS[5].mac,
              proto: 'all',
              target: 'REJECT',
              start_time: '21:00:00',
              stop_time: '07:00:00',
              weekdays: 'mon tue wed thu fri',
            },
          ],
          // Custom rules / forwards that look impressive
          ['rule_nas', 'rule', { name: 'NAS — Synology DSM', src: 'wan', dest: 'lan', dest_ip: '192.168.1.20', dest_port: '5001', proto: 'tcp', target: 'ACCEPT' }],
          ['rule_ssh_sam', 'rule', { name: 'SSH — Sam’s MacBook', src: 'wan', dest: 'lan', dest_ip: '192.168.1.117', dest_port: '22', proto: 'tcp', target: 'ACCEPT' }],
          ['rule_block_iot', 'rule', { name: 'Kitchen Echo — no WAN at night', src: 'lan', dest: 'wan', src_mac: CLIENTS[5].mac, proto: 'all', target: 'REJECT', start_time: '23:00:00', stop_time: '06:30:00' }],
          ['fwd_plex', 'redirect', { name: 'Plex', src: 'wan', src_dport: '32400', dest: 'lan', dest_ip: '192.168.1.100', dest_port: '32400', proto: 'tcp', target: 'DNAT' }],
          ['fwd_game', 'redirect', { name: 'PlayStation Network', src: 'wan', src_dport: '3478-3480', dest: 'lan', dest_ip: '192.168.1.219', dest_port: '3478-3480', proto: 'udp', target: 'DNAT' }],
          ['fwd_https_sam', 'redirect', { name: 'Home lab HTTPS', src: 'wan', src_dport: '443', dest: 'lan', dest_ip: '192.168.1.117', dest_port: '8443', proto: 'tcp', target: 'DNAT' }],
        ]),
      );
    }
    if (config === 'dhcp') {
      return ok(
        uci([
          ['lan', 'dhcp', { interface: 'lan', start: '100', limit: '150', leasetime: '12h' }],
          ['tv', 'host', { name: 'lounge-apple-tv-4k', mac: ['5c:e9:1e:00:00:a0'], ip: '192.168.1.100' }],
          ['sam', 'host', { name: "Sam’s MacBook Pro (16-inch, 2024)", mac: ['5c:e9:1e:00:01:a1'], ip: '192.168.1.117' }],
          ['ps5', 'host', { name: 'PlayStation-5', mac: ['5c:e9:1e:00:07:a7'], ip: '192.168.1.219' }],
          ['nas', 'host', { name: 'synology-nas', mac: ['5c:e9:1e:10:00:01'], ip: '192.168.1.20' }],
          ['echo', 'host', { name: 'kitchen-echo-show-8', mac: ['5c:e9:1e:00:05:a5'], ip: '192.168.1.185' }],
        ]),
      );
    }
    if (config === 'upnpd') {
      return ok(uci([['config', 'upnpd', { enabled: '1', external_iface: 'wan', internal_iface: 'lan' }]]));
    }
    return ok({ values: {} });
  }

  if (key === 'uci changes') return ok({ changes: {} });

  if (key === 'network.interface dump') {
    return ok({
      interface: [
        { interface: 'lan', up: true, proto: 'static', 'ipv4-address': [{ address: '192.168.1.1', mask: 24 }], device: 'br-lan' },
        {
          interface: 'wan',
          up: true,
          proto: 'dhcp',
          'ipv4-address': [{ address: '203.0.113.47', mask: 24 }],
          'ipv6-address': [{ address: '2001:db8:85a3::47', mask: 64 }],
          device: 'wan',
          route: [{ target: '0.0.0.0', mask: 0, nexthop: '203.0.113.1' }],
        },
        ...GUESTS.map((g) => ({
          interface: g.id,
          up: true,
          proto: 'static',
          'ipv4-address': [{ address: `192.168.${g.subnet}.1`, mask: 24 }],
          device: `br-${g.id}`,
        })),
      ],
    });
  }

  if (key === 'network.device status') {
    const wifi = Object.fromEntries(
      ['phy0-ap0', 'phy1-ap0', 'phy1-ap1', 'phy1-ap2', 'phy2-ap0'].map((d) => [
        d,
        { type: 'Network device', up: true, carrier: true, speed: '10000F', macaddr: '94:83:c4:aa:bb:01' },
      ]),
    );
    return ok({
      wan: { type: 'Network device', up: true, carrier: true, speed: '10000F', macaddr: '94:83:c4:12:34:56' },
      'br-lan': { type: 'Bridge', up: true, bridge_members: ['lan2', 'lan3', 'lan4', 'lan5', 'lan6', 'lan7', 'lan8', 'lan9', 'sfp'] },
      lan2: { type: 'Network device', up: true, carrier: true, speed: '2500F' },
      lan3: { type: 'Network device', up: true, carrier: true, speed: '2500F' },
      lan4: { type: 'Network device', up: true, carrier: false },
      lan5: { type: 'Network device', up: true, carrier: true, speed: '1000F' },
      ...wifi,
    });
  }

  if (key === 'luci getBuiltinEthernetPorts') {
    return ok({
      result: [
        { device: 'wan', role: 'wan' },
        { device: 'lan2', role: 'lan' },
        { device: 'lan3', role: 'lan' },
        { device: 'lan4', role: 'lan' },
        { device: 'lan5', role: 'lan' },
        { device: 'lan6', role: 'lan' },
        { device: 'lan7', role: 'lan' },
        { device: 'lan8', role: 'lan' },
        { device: 'lan9', role: 'lan' },
        { device: 'sfp', role: 'lan' },
      ],
    });
  }

  if (key === 'luci-rpc getWirelessDevices') {
    const iface = (section, ifname, ssid, net) => ({
      section,
      ifname,
      config: { mode: 'ap', ssid, network: [net], encryption: ssid.includes('6G') ? 'sae' : 'sae-mixed' },
    });
    const ht = {
      '2g': ['HT20', 'HT40', 'HE20', 'HE40'],
      '5g': ['HT20', 'HT40', 'VHT20', 'VHT40', 'VHT80', 'VHT160', 'HE20', 'HE40', 'HE80', 'HE160', 'EHT20', 'EHT40', 'EHT80', 'EHT160'],
      '6g': ['HE20', 'HE40', 'HE80', 'HE160', 'EHT20', 'EHT40', 'EHT80', 'EHT160', 'EHT320'],
    };
    return ok({
      radio0: {
        up: true,
        disabled: false,
        config: { band: '2g', channel: '6', htmode: 'HE40', country: 'US' },
        iwinfo: { phy: 'phy0', htmodes: ht['2g'], channel: 6, frequency: 2437, txpower: 20, noise: -92 },
        interfaces: [iface('default_radio0', 'phy0-ap0', 'MilkFlint', 'lan')],
      },
      radio1: {
        up: true,
        disabled: false,
        config: { band: '5g', channel: '36', htmode: 'EHT80', country: 'US' },
        iwinfo: { phy: 'phy1', htmodes: ht['5g'], channel: 36, frequency: 5180, txpower: 20, noise: -92 },
        interfaces: [
          iface('default_radio1', 'phy1-ap0', 'MilkFlint-5G', 'lan'),
          ...GUESTS.map((g, i) => iface(`guest_ap${i}`, `phy1-ap${i + 1}`, g.ssid, g.id)),
        ],
      },
      radio2: {
        up: true,
        disabled: false,
        config: { band: '6g', channel: '5', htmode: 'EHT80', country: 'US' },
        iwinfo: { phy: 'phy2', htmodes: ht['6g'], channel: 5, frequency: 5975, txpower: 20, noise: -92 },
        interfaces: [iface('default_radio2', 'phy2-ap0', 'MilkFlint-6G', 'lan')],
      },
    });
  }

  if (key === 'iwinfo assoclist') {
    const on = {
      'phy0-ap0': CLIENTS.filter((c) => c.band === '2.4 GHz'),
      'phy1-ap0': CLIENTS.filter((c) => c.band === '5 GHz'),
      'phy2-ap0': CLIENTS.filter((c) => c.band === '6 GHz'),
      'phy1-ap1': [CLIENTS[5]],
    }[String(params.device)] ?? [];
    return ok({
      results: on.map((c, i) => ({
        mac: c.mac,
        signal: -42 - i * 5,
        noise: -92,
        connected_time: 90_000 - i * 8000,
        authorized: true,
        rx: { bytes: 1.2e9 / (i + 1), packets: 9e5, rate: c.gen >= 7 ? 2_400_000 : 1_200_000, mhz: c.band === '2.4 GHz' ? 40 : 80, nss: 2 },
        tx: { bytes: 4.8e9 / (i + 1), packets: 3e6, rate: c.gen >= 7 ? 2_881_000 : 2_401_000, mhz: c.band === '2.4 GHz' ? 40 : 80, nss: 2 },
      })),
    });
  }

  if (key === 'iwinfo info') {
    const device = String(params.device ?? '');
    const byPhy = {
      phy0: { phy: 'phy0', ssid: 'MilkFlint', channel: 6, frequency: 2437, htmode: 'HE40', bitrate: 573_000 },
      phy1: { phy: 'phy1', ssid: 'MilkFlint-5G', channel: 36, frequency: 5180, htmode: 'EHT80', bitrate: 2_401_000 },
      phy2: { phy: 'phy2', ssid: 'MilkFlint-6G', channel: 5, frequency: 5975, htmode: 'EHT80', bitrate: 2_881_000 },
    };
    const phy = device.startsWith('phy2') ? 'phy2' : device.startsWith('phy1') ? 'phy1' : 'phy0';
    const base = byPhy[phy];
    return ok({
      ...base,
      mode: 'Master',
      txpower: 20,
      quality: 70,
      quality_max: 70,
      signal: -40,
      noise: -92,
      encryption: { enabled: true, wpa: phy === 'phy2' ? [3] : [2, 3], authentication: ['psk'], ciphers: ['ccmp'] },
    });
  }

  if (key === 'luci-rpc getDHCPLeases') {
    return ok({
      dhcp_leases: CLIENTS.map((c, i) => ({
        macaddr: c.mac,
        ipaddr: `192.168.1.${100 + i * 17}`,
        hostname: c.name ?? '*',
        expires: NOW + 20_000,
      })),
      dhcp6_leases: [],
    });
  }

  if (key === 'luci-rpc getHostHints') {
    return ok(Object.fromEntries(CLIENTS.filter((c) => c.name).map((c) => [c.mac, { name: c.name }])));
  }

  if (key === 'milkflint neighbors') {
    return ok({
      neighbors: [
        { mac: '5c:e9:1e:10:00:01', ip: '192.168.1.20', device: 'lan2', state: 'reachable' },
        { mac: '5c:e9:1e:10:00:02', ip: '192.168.1.21', device: 'lan3', state: 'stale' },
      ],
    });
  }

  if (key === 'milkflint.sensors history' || key === 'milkflint.sensorshistory') {
    // actual object is milkflint.sensors / history
  }
  if (object === 'milkflint.sensors' && method === 'history') {
    const names = ['cpu-thermal', 'mt7996-phy0', 'mt7996-phy1', 'mt7996-phy2', 'rtl8261-wan'];
    return ok({
      now: NOW,
      interval: 10,
      samples: Array.from({ length: 360 }, (_, i) => ({
        t: NOW - (359 - i) * 10,
        c: Object.fromEntries(names.map((n, k) => [n, 48 + k * 3 + Math.sin(i / (7 + k)) * 2])),
      })),
    });
  }

  if (key === 'milkflint.banip status') {
    const slots = Array.from({ length: 12 }, (_, i) => 40 + ((i * 37) % 160));
    return ok({
      installed: true,
      version: '1.9.1-r5',
      enabled: true,
      mode: 'router',
      state: 'protecting',
      table: true,
      elements: 187_432,
      drops: { step: 300, end: NOW - 300, counted: slots, logged: slots.map((n) => n - 10), flood: slots.map(() => 0), hour: 1834, day: 40321, source: 'counters' },
      now: NOW,
    });
  }

  if (key === 'milkflint.adguardhome status') {
    return ok({
      installed: true,
      enabled: true,
      configured: true,
      mode: 'router',
      running: true,
      state: 'active',
      stats: { queries: 148_213, blocked: 29_934, hours: 24, avg_ms: 12.4 },
    });
  }

  if (key === 'milkflint.vpn status') {
    return ok({
      installed: true,
      now: NOW,
      interfaces: [
        {
          name: 'wg_out',
          public_key: 'Zx8cV7bN6mQ5wE4rT3yU2iO1pA0sD9fG8hJ7kL6zX5c=',
          listen_port: null,
          fwmark: '0x200',
          peers: [
            {
              public_key: 'pIa0uK1vPn2sErVeR3kEy4fOr5tEsTs6aBcDeFgHiJk=',
              endpoint: '198.51.100.10:1337',
              allowed_ips: ['0.0.0.0/0', '::/0'],
              latest_handshake: NOW - 38,
              rx_bytes: 912_345_678_901,
              tx_bytes: 45_678_901_234,
              keepalive: 25,
            },
          ],
        },
      ],
    });
  }

  if (key === 'milkflint.traffic periods') return ok({ installed: true, enabled: true, periods: ['2026-11'] });
  if (key === 'milkflint.traffic usage') {
    return ok({
      columns: ['mac', 'ip', 'conns', 'rx_bytes', 'rx_pkts', 'tx_bytes', 'tx_pkts'],
      data: CLIENTS.map((c, i) => [
        c.mac,
        `192.168.1.${100 + i * 17}`,
        9000 - i * 900,
        Math.round(612e9 / (i + 1) ** 1.5),
        400_000_000,
        Math.round(41e9 / (i + 1) ** 1.5),
        90_000_000,
      ]),
    });
  }

  if (key === 'milkflint.devicecontrol status') {
    return ok({
      now: NOW,
      offset: 0,
      paused: {},
      extra: {},
      ready: true,
      today: { since: NOW - 55_800, midnight: NOW - 55_800, devices: { [CLIENTS[1].mac]: [812_000_000, 40_000_000] } },
      seen: {},
      clock: { ntp: true, synced: true, stratum: 2, at: NOW - 600, uptime: 90_000 },
      adguard: { installed: true, enabled: true, state: 'active' },
    });
  }

  if (key === 'file read') {
    if (params.path === '/etc/crontabs/root') return ok({ data: '34 3,15 * * * /usr/libexec/milkflint/banip-action reload\n' });
    return ok({ data: '' });
  }

  if (key === 'file exec') {
    const cmd = String(params.command ?? '');
    if (cmd.includes('nft')) {
      // Minimal fw4-shaped counters so the Rules table shows hit counts
      const named = [
        'Allow-DHCP-Renew',
        'Allow-IGMP',
        'Allow-DHCPv6',
        'NAS — Synology DSM',
        'SSH — Sam’s MacBook',
        'Device control: paused',
        'Kids — school nights',
        'Plex',
        'PlayStation Network',
        'Home lab HTTPS',
        'Intercept DNS (MilkFlint)',
      ];
      const nftables = named.map((name, i) => ({
        rule: {
          table: 'fw4',
          chain: name.includes('Plex') || name.includes('PlayStation') || name.includes('HTTPS') || name.includes('Intercept') ? 'dstnat_wan' : 'input_wan',
          comment: `!fw4: ${name}`,
          expr: [{ counter: { packets: 1200 + i * 340, bytes: 80_000 + i * 12_000 } }],
        },
      }));
      return ok({ code: 0, stdout: JSON.stringify({ nftables }) });
    }
    if (cmd.includes('fw4')) return ok({ code: 0, stdout: '', stderr: '' });
    return ok({ code: 0, stdout: '', stderr: '' });
  }

  if (key === 'milkflint.upnp mappings') {
    return ok({
      mappings: [
        {
          proto: 'tcp',
          ext_port: 32400,
          int_addr: '192.168.1.100',
          int_port: 32400,
          remaining: 7200,
          description: 'Plex Media Server',
        },
        {
          proto: 'udp',
          ext_port: 3074,
          int_addr: '192.168.1.219',
          int_port: 3074,
          remaining: 3600,
          description: 'PlayStation Network',
        },
      ],
    });
  }

  if (key === 'milkflint neighbors') return ok({ neighbors: [] });

  if (key === 'milkflint.wifi regulatory') {
    const rule = (start, end, max_bw = 160, dfs = false) => ({
      start,
      end,
      max_bw,
      eirp: 30,
      indoor_only: false,
      dfs,
      no_ir: false,
      auto_bw: false,
    });
    return ok({
      dfs_region: 'FCC',
      rules: [
        rule(2400, 2483.5, 40),
        rule(5150, 5250, 80),
        rule(5250, 5350, 80, true),
        rule(5470, 5725, 160, true),
        rule(5725, 5850, 80),
        rule(5925, 7125, 320),
      ],
    });
  }
  if (key === 'milkflint.wifi countries') {
    return ok({ countries: ['US', 'GB', 'DE', 'DK', 'JP'] });
  }
  if (key === 'milkflint.wifi dfs' || key === 'milkflint.wifi radar') {
    return ok({ dfs: [], cacMs: {} });
  }

  if (key === 'iwinfo freqlist') {
    const ch = (channel, mhz, active = false) => ({ channel, mhz, restricted: false, active });
    const twoG = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((c) => ch(c, 2407 + 5 * c, c === 6));
    const fiveG = [];
      for (let c = 36; c <= 64; c += 4) fiveG.push(ch(c, 5000 + 5 * c, c === 36));
      for (let c = 100; c <= 144; c += 4) fiveG.push(ch(c, 5000 + 5 * c));
    for (let c = 149; c <= 165; c += 4) fiveG.push(ch(c, 5000 + 5 * c));
    const sixG = [];
    for (let c = 1; c <= 233; c += 4) sixG.push(ch(c, 5955 + 5 * (c - 1), c === 5));
    const dev = String(params.device ?? '');
    const results = dev.includes('phy0') ? twoG : dev.includes('phy2') ? sixG : fiveG;
    return ok({ results });
  }
  if (key === 'iwinfo txpowerlist') {
    return ok({
      results: [10, 14, 17, 20, 23].map((dbm) => ({ dbm, mw: Math.round(10 ** (dbm / 10)), active: dbm === 20 })),
    });
  }
  if (key === 'iwinfo countrylist') {
    return ok({
      results: [
        { code: 'US', country: 'United States' },
        { code: 'GB', country: 'United Kingdom' },
        { code: 'DE', country: 'Germany' },
        { code: 'DK', country: 'Denmark' },
      ],
    });
  }
  if (key === 'iwinfo survey') return ok({ results: [] });

  // Soft-fail unknown methods so pages still render
  console.warn('unhandled', key, params);
  return [6, {}]; // NOT_FOUND-ish but some callers catch
}

function handleRpc(body) {
  const items = Array.isArray(body) ? body : [body];
  return items.map((req) => {
    const [, object, method, params = {}] = req.params ?? [];
    let result;
    try {
      result = handle(object, method, params);
      // NOT_FOUND -> empty success for resilience on screenshot pages
      if (result[0] === 6) result = ok({});
    } catch (e) {
      console.error(e);
      result = [1, {}];
    }
    return { jsonrpc: '2.0', id: req.id, result };
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/ubus') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const out = handleRpc(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(body) ? out : out[0]));
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    return;
  }

  let urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '/milkflint.html') urlPath = '/milkflint/index.html';
  if (urlPath.startsWith('/milkflint/')) urlPath = urlPath.slice('/milkflint'.length);
  const file = path.join(HTDOCS, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(HTDOCS) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
console.log(`demo on http://127.0.0.1:${PORT}/milkflint/`);

const browser = await chromium.launch({
  headless: true,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'],
});

/**
 * MilkFlint themes key off data-theme + data-darkmode (not class="dark").
 * Seed localStorage before first paint so apply() picks Monokai milk.
 */
async function preparePage(scheme) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: scheme === 'dark' ? 'dark' : 'light',
  });
  await page.addInitScript(
    ({ sid, scheme: s }) => {
      localStorage.setItem('milkflint.theme-id', 'monokai-milk');
      localStorage.setItem('milkflint.theme', s);
      sessionStorage.setItem(
        'milkflint.session',
        JSON.stringify({ id: sid, username: 'root', adminPassword: 'set' }),
      );
    },
    { sid: SESSION, scheme },
  );
  return page;
}

async function assertMonokai(page, scheme) {
  const info = await page.evaluate((wantDark) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'monokai-milk');
    root.setAttribute('data-darkmode', wantDark ? 'true' : 'false');
    root.classList.remove('dark');
    const cs = getComputedStyle(root);
    return {
      theme: root.getAttribute('data-theme'),
      darkmode: root.getAttribute('data-darkmode'),
      // shadcn/tailwind tokens used by monokai-milk (not --mf-color-*)
      primary: cs.getPropertyValue('--primary').trim(),
      background: cs.getPropertyValue('--background').trim(),
      sidebar: cs.getPropertyValue('--sidebar').trim(),
    };
  }, scheme === 'dark');
  if (info.theme !== 'monokai-milk') throw new Error(`theme attr ${info.theme}`);
  if (info.darkmode !== (scheme === 'dark' ? 'true' : 'false')) {
    throw new Error(`darkmode attr ${info.darkmode}`);
  }
  console.log('theme', scheme, info);
  return info;
}

async function shot(page, name, hash, { wait = 2500, fullPage = true, settle, scheme = 'light' } = {}) {
  await page.goto(`http://127.0.0.1:${PORT}/milkflint/${hash}`, { waitUntil: 'networkidle' });
  if (settle) await settle(page);
  await page.waitForTimeout(wait);
  await assertMonokai(page, scheme);
  await page.waitForTimeout(300);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage, type: 'png' });
  console.log('wrote', file, fs.statSync(file).size);
  return file;
}

async function expandExpert(page, { scrollToMimo = true } = {}) {
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) =>
      /show expert options/i.test(el.textContent || ''),
    );
    if (!b) return false;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return true;
  });
  if (!opened) throw new Error('Show expert options button not found');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some((el) => /hide expert options/i.test(el.textContent || '')),
  );
  await page.waitForTimeout(400);
  if (scrollToMimo) {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(
        (e) =>
          e.childNodes.length &&
          [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === 'Uplink MU-MIMO'),
      );
      el?.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(400);
}

const shots = [];

// --- Light Monokai milk (soft milk + pink / cyan / green) ---
const light = await preparePage('light');
await light.goto(`http://127.0.0.1:${PORT}/milkflint/#/dashboard`, { waitUntil: 'networkidle' });
await light.waitForTimeout(2500);
shots.push(await shot(light, 'milkflint4-0.5a-home-monokai.png', '#/dashboard', { wait: 3500, scheme: 'light' }));

await light.goto(`http://127.0.0.1:${PORT}/milkflint/#/tuning`, { waitUntil: 'networkidle' });
await light.waitForTimeout(2000);
await expandExpert(light, { scrollToMimo: true });
await assertMonokai(light, 'light');
await light.waitForTimeout(500);
const tuningUl = path.join(OUT, 'milkflint4-0.5a-tuning-ul-mimo.png');
await light.screenshot({ path: tuningUl, fullPage: false, type: 'png' });
console.log('wrote', tuningUl, fs.statSync(tuningUl).size);
shots.push(tuningUl);
await light.evaluate(() => window.scrollTo(0, 0));
await light.waitForTimeout(400);
const tuningFull = path.join(OUT, 'milkflint4-0.5a-tuning-expert-full.png');
await light.screenshot({ path: tuningFull, fullPage: true, type: 'png' });
console.log('wrote', tuningFull, fs.statSync(tuningFull).size);
shots.push(tuningFull);

shots.push(await shot(light, 'milkflint4-0.5a-wifi.png', '#/wifi', { wait: 3000, scheme: 'light' }));
shots.push(await shot(light, 'milkflint4-0.5a-sqm.png', '#/sqm', { wait: 3000, scheme: 'light' }));
shots.push(await shot(light, 'milkflint4-0.5a-devices.png', '#/clients', { wait: 3000, scheme: 'light' }));
shots.push(await shot(light, 'milkflint4-0.5a-firewall.png', '#/firewall', { wait: 3500, scheme: 'light' }));
shots.push(await shot(light, 'milkflint4-0.5a-firewall-zones.png', '#/firewall/zones', { wait: 3000, scheme: 'light' }));
shots.push(await shot(light, 'milkflint4-0.5a-port-forwards.png', '#/port-forwards', { wait: 3000, scheme: 'light' }));
shots.push(await shot(light, 'milkflint4-0.5a-themes.png', '#/themes', { wait: 2500, scheme: 'light' }));

// Light 4K hero
const cinemaLight = await preparePage('light');
await cinemaLight.setViewportSize({ width: 1920, height: 1080 });
await cinemaLight.goto(`http://127.0.0.1:${PORT}/milkflint/#/dashboard`, { waitUntil: 'networkidle' });
await cinemaLight.waitForTimeout(3500);
await assertMonokai(cinemaLight, 'light');
const heroLight = path.join(OUT, 'milkflint4-0.5a-home-hero-4k.png');
await cinemaLight.screenshot({ path: heroLight, fullPage: false, type: 'png' });
console.log('wrote', heroLight, fs.statSync(heroLight).size);
shots.push(heroLight);
await cinemaLight.close();
await light.close();

// --- Dark Monokai milk (charcoal + Monokai Pro pink / cyan / green) ---
const dark = await preparePage('dark');
shots.push(
  await shot(dark, 'milkflint4-0.5a-home-monokai-dark.png', '#/dashboard', { wait: 3500, scheme: 'dark' }),
);
await dark.goto(`http://127.0.0.1:${PORT}/milkflint/#/tuning`, { waitUntil: 'networkidle' });
await dark.waitForTimeout(2000);
await expandExpert(dark, { scrollToMimo: true });
await assertMonokai(dark, 'dark');
await dark.waitForTimeout(500);
const tuningDark = path.join(OUT, 'milkflint4-0.5a-tuning-ul-mimo-dark.png');
await dark.screenshot({ path: tuningDark, fullPage: false, type: 'png' });
console.log('wrote', tuningDark, fs.statSync(tuningDark).size);
shots.push(tuningDark);
await dark.evaluate(() => window.scrollTo(0, 0));
await dark.waitForTimeout(400);
const tuningFullDark = path.join(OUT, 'milkflint4-0.5a-tuning-expert-full-dark.png');
await dark.screenshot({ path: tuningFullDark, fullPage: true, type: 'png' });
console.log('wrote', tuningFullDark, fs.statSync(tuningFullDark).size);
shots.push(tuningFullDark);

shots.push(await shot(dark, 'milkflint4-0.5a-wifi-dark.png', '#/wifi', { wait: 3000, scheme: 'dark' }));
shots.push(await shot(dark, 'milkflint4-0.5a-sqm-dark.png', '#/sqm', { wait: 3000, scheme: 'dark' }));
shots.push(await shot(dark, 'milkflint4-0.5a-devices-dark.png', '#/clients', { wait: 3000, scheme: 'dark' }));
shots.push(await shot(dark, 'milkflint4-0.5a-firewall-dark.png', '#/firewall', { wait: 3500, scheme: 'dark' }));
shots.push(await shot(dark, 'milkflint4-0.5a-firewall-zones-dark.png', '#/firewall/zones', { wait: 3000, scheme: 'dark' }));
shots.push(await shot(dark, 'milkflint4-0.5a-port-forwards-dark.png', '#/port-forwards', { wait: 3000, scheme: 'dark' }));
shots.push(await shot(dark, 'milkflint4-0.5a-themes-dark.png', '#/themes', { wait: 2500, scheme: 'dark' }));

const cinemaDark = await preparePage('dark');
await cinemaDark.setViewportSize({ width: 1920, height: 1080 });
await cinemaDark.goto(`http://127.0.0.1:${PORT}/milkflint/#/dashboard`, { waitUntil: 'networkidle' });
await cinemaDark.waitForTimeout(3500);
await assertMonokai(cinemaDark, 'dark');
const heroDark = path.join(OUT, 'milkflint4-0.5a-home-hero-4k-dark.png');
await cinemaDark.screenshot({ path: heroDark, fullPage: false, type: 'png' });
console.log('wrote', heroDark, fs.statSync(heroDark).size);
shots.push(heroDark);
await cinemaDark.close();
await dark.close();

await browser.close();
server.close();
console.log('DONE', shots.length);
