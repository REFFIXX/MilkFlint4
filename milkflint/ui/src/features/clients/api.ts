// Every device the router knows of, from what it already keeps: DHCP leases,
// the neighbour table, the host hints, the Wi-Fi stations and the DHCP host
// sections (names and reserved addresses). First-seen comes from
// milkflint.devices; live speed from Wi-Fi station byte counters between polls
// (the same math as Home).
import { getHostHints, getLeases, getNeighbors, hintName, inSubnet, ipToInt, isReachable, prefixLength } from '@/lib/api/network';
import { getConfig, list, type Section, str } from '@/lib/api/uci';
import { bandOf, getAccessPoints, stationSnr } from '@/lib/api/wireless';
import { syncFirstSeen } from './devices-api';
import { macKey, type FirstSeenStore } from './first-seen';
import { trafficRate } from './speed';

export interface Device {
  mac: string;
  name: string | undefined;
  ip: string | undefined;
  wifi:
    | {
        band: string | undefined;
        ssid: string | undefined;
        signal: number | undefined;
        snr: number | undefined;
        rate: number | undefined;
        connected: number | undefined;
        /** station tx bytes (device download), for live rate between polls */
        txBytes: number | undefined;
        rxBytes: number | undefined;
      }
    | undefined;
  online: boolean;
  /** seconds left on its DHCP lease */
  leaseExpires: number | undefined;
  reservation: Section | undefined;
  /** epoch seconds: first time milkflint.devices saw this MAC */
  firstSeen: number | undefined;
  /** live download bit/s since the previous poll (Wi-Fi) */
  down: number | undefined;
  /** live upload bit/s since the previous poll (Wi-Fi) */
  up: number | undefined;
}

export interface ClientsData {
  devices: Device[];
  routerIp: string;
  prefix: number;
}

export interface ClientsCounters {
  at: number;
  stations: Map<string, { tx: number | undefined; rx: number | undefined }>;
}

function sumBytes(a: number | undefined, b: number | undefined): number | undefined {
  return a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);
}

export async function loadClients(prev?: ClientsCounters): Promise<{ data: ClientsData; counters: ClientsCounters }> {
  const [leases, hints, neighbors, aps, dhcp, network] = await Promise.all([
    getLeases().catch(() => []),
    getHostHints().catch(() => ({})),
    getNeighbors().catch(() => []),
    getAccessPoints().catch(() => []),
    getConfig('dhcp'),
    getConfig('network'),
  ]);
  const lan = network.find((s) => s['.name'] === 'lan');
  const routerIp = str(lan, 'ipaddr')?.split('/')[0] ?? '192.168.1.1';
  const prefix =
    str(lan, 'ipaddr')?.includes('/') === true ? Number(str(lan, 'ipaddr')?.split('/')[1]) : prefixLength(str(lan, 'netmask'));

  const devices = new Map<string, Device>();
  const get = (mac: string): Device => {
    const key = macKey(mac);
    let d = devices.get(key);
    if (d === undefined) {
      d = {
        mac: key,
        name: undefined,
        ip: undefined,
        wifi: undefined,
        online: false,
        leaseExpires: undefined,
        reservation: undefined,
        firstSeen: undefined,
        down: undefined,
        up: undefined,
      };
      devices.set(key, d);
    }
    return d;
  };

  for (const n of neighbors) {
    if (!inSubnet(n.ip, routerIp, prefix) || n.ip === routerIp) continue;
    const d = get(n.mac);
    d.ip = n.ip;
    if (isReachable(n)) d.online = true;
  }
  for (const [mac, h] of Object.entries(hints)) {
    const d = devices.get(macKey(mac));
    if (d !== undefined) d.name = hintName(h) ?? d.name;
  }
  for (const l of leases) {
    const d = get(l.macaddr);
    d.name = l.hostname ?? d.name;
    d.ip = l.ipaddr ?? d.ip;
    d.leaseExpires = l.expires;
  }
  for (const ap of aps) {
    for (const s of ap.stations) {
      const d = get(s.mac);
      d.online = true;
      const link = {
        band: bandOf(ap.info?.frequency),
        ssid: ap.ssid,
        signal: s.signal_avg ?? s.signal,
        snr: stationSnr(s, ap.info?.noise),
        rate: s.tx?.rate === undefined ? undefined : s.tx.rate * 1000,
        connected: s.connected_time,
        txBytes: s.tx?.bytes,
        rxBytes: s.rx?.bytes,
      };
      // Same MAC on several radios (MLO / multi-AP): keep the strongest link
      // for display, but sum byte counters so live rates stay sane across polls.
      if (d.wifi === undefined) {
        d.wifi = link;
        continue;
      }
      const stronger = (link.signal ?? -200) > (d.wifi.signal ?? -200);
      d.wifi = {
        ...(stronger ? link : d.wifi),
        txBytes: sumBytes(d.wifi.txBytes, link.txBytes),
        rxBytes: sumBytes(d.wifi.rxBytes, link.rxBytes),
      };
    }
  }
  for (const host of dhcp.filter((s) => s['.type'] === 'host')) {
    for (const mac of list(host, 'mac')) {
      const d = get(mac);
      d.reservation = host;
      d.name = str(host, 'name') ?? d.name;
      d.ip = str(host, 'ip') ?? d.ip;
    }
  }

  const now = performance.now();
  const seconds = prev === undefined ? 0 : (now - prev.at) / 1000;
  for (const d of devices.values()) {
    if (d.wifi === undefined) continue;
    d.down = trafficRate(prev?.stations.get(d.mac)?.tx, d.wifi.txBytes, seconds);
    d.up = trafficRate(prev?.stations.get(d.mac)?.rx, d.wifi.rxBytes, seconds);
  }

  const onlineMacs = [...devices.values()].filter((d) => d.online).map((d) => d.mac);
  const firstSeen: FirstSeenStore = await syncFirstSeen(onlineMacs).catch(() => ({}));
  for (const d of devices.values()) {
    d.firstSeen = firstSeen[d.mac]?.firstSeen;
  }

  const sorted = [...devices.values()].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return (ipToInt(a.ip ?? '') ?? 1e10) - (ipToInt(b.ip ?? '') ?? 1e10);
  });
  return {
    data: { devices: sorted, routerIp, prefix },
    counters: {
      at: now,
      stations: new Map(sorted.map((d) => [d.mac, { tx: d.wifi?.txBytes, rx: d.wifi?.rxBytes }])),
    },
  };
}
