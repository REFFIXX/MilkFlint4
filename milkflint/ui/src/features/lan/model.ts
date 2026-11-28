// The LAN page's settings: the router's own address and network size, and
// the DHCP server's pool (first address, how many, lease time), with the UCI
// changes that make them. Plain functions, so ui/tests can run them.
import { intToIp, ipToInt } from '@/lib/api/network';
import type { Change } from '@/lib/api/uci';

export const prefixes = ['24', '23', '22', '16'] as const;

export const leaseTimes = [
  { value: '1h', label: '1 hour' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '1 day' },
  { value: '7d', label: '1 week' },
] as const;

export interface LanForm {
  ipaddr: string;
  prefix: string;
  dhcp: boolean;
  start: string;
  limit: string;
  leasetime: string;
  /** network.lan.ipaddr holds address/prefix (no netmask option) */
  cidrStyle: boolean;
}

export function netmaskOf(prefix: number): string {
  return intToIp(prefix === 0 ? 0 : (2 ** 32 - 2 ** (32 - prefix)) >>> 0);
}

/** How many addresses a network of this prefix has for devices and the router. */
export function hostCount(prefix: number): number {
  return 2 ** (32 - prefix) - 2;
}

/** First and last address the DHCP server hands out. */
export function range(f: LanForm): { first: string; last: string } | undefined {
  const ip = ipToInt(f.ipaddr);
  const start = Number(f.start);
  const limit = Number(f.limit);
  if (ip === undefined || !Number.isInteger(start) || !Number.isInteger(limit)) return undefined;
  const size = 2 ** (32 - Number(f.prefix));
  const base = Math.floor(ip / size) * size;
  return { first: intToIp(base + start), last: intToIp(base + start + limit - 1) };
}

/** A lease time as words: the list's label, or what OpenWrt has ("2h") when it's another. */
export function leaseLabel(value: string): string {
  return leaseTimes.find((t) => t.value === value)?.label ?? value;
}

export function validate(f: LanForm): Partial<Record<keyof LanForm, string>> {
  const e: Partial<Record<keyof LanForm, string>> = {};
  const ip = ipToInt(f.ipaddr);
  const size = 2 ** (32 - Number(f.prefix));
  if (ip === undefined) e.ipaddr = 'Enter an IPv4 address, e.g. 192.168.1.1.';
  else {
    const host = ip % size;
    const first = Math.floor(ip / 16777216);
    const second = Math.floor(ip / 65536) % 256;
    const isPrivate = first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
    if (!isPrivate) e.ipaddr = 'Use a private address (10.x, 172.16–31.x or 192.168.x).';
    else if (host === 0 || host === size - 1) e.ipaddr = 'That’s the network or broadcast address, not usable by the router.';
  }
  const start = Number(f.start);
  const limit = Number(f.limit);
  if (!Number.isInteger(start) || start < 1 || start >= size - 1) e.start = `Use 1 to ${String(size - 2)}.`;
  if (!Number.isInteger(limit) || limit < 1 || start + limit > size - 1)
    e.limit = 'The range would run past the end of the network.';
  return e;
}

export function toChanges(f: LanForm, before: LanForm): Change[] {
  const changes: Change[] = [];
  if (f.ipaddr !== before.ipaddr || f.prefix !== before.prefix) {
    changes.push(
      f.cidrStyle
        ? { op: 'set', config: 'network', section: 'lan', values: { ipaddr: `${f.ipaddr}/${f.prefix}` } }
        : { op: 'set', config: 'network', section: 'lan', values: { ipaddr: f.ipaddr, netmask: netmaskOf(Number(f.prefix)) } },
    );
  }
  changes.push({
    op: 'set',
    config: 'dhcp',
    section: 'lan',
    values: { ignore: f.dhcp ? '0' : '1', start: f.start, limit: f.limit, leasetime: f.leasetime },
  });
  return changes;
}

/** Whether saving moves the router to another address (or network size): this page then loses it. */
export function moves(f: LanForm, before: LanForm): boolean {
  return f.ipaddr !== before.ipaddr || f.prefix !== before.prefix;
}

/** What's under More settings, as one line: the network size and, with DHCP on, the pool and lease time. */
export function moreSummary(f: LanForm): string {
  const size = `/${f.prefix} network`;
  if (!f.dhcp) return size;
  const r = range(f);
  return `${size} · ${f.limit} addresses${r === undefined ? '' : ` from ${r.first}`} · lease ${leaseLabel(f.leasetime)}`;
}

export type LanTab = 'settings' | 'addresses' | 'connections';

export const lanTabs: readonly { id: LanTab; label: string }[] = [
  { id: 'settings', label: 'Settings' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'connections', label: 'Connections' },
];

/** Whether a lease row matches the search box. */
export function leaseMatches(
  row: { address: string; mac?: string | undefined; name?: string | undefined; duid?: string | undefined },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  return q === '' || [row.address, row.mac, row.name, row.duid].some((v) => v?.toLowerCase().includes(q) === true);
}

/** Whether a connection row matches the search box. */
export function connectionMatches(
  row: { src: string; dst: string; proto: string; sport: number | null; dport: number | null; state: string | null },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const ports = [row.sport, row.dport].filter((p): p is number => p !== null).map(String);
  return [row.src, row.dst, row.proto, row.state, ...ports].some((v) => v?.toLowerCase().includes(q) === true);
}

export type ConnSort = 'bytes' | 'packets' | 'proto' | 'src';

/** Sort connections for the live table (largest first for counters). */
export function sortConnections<T extends { bytes: number | null; packets: number | null; proto: string; src: string }>(
  rows: readonly T[],
  sort: ConnSort,
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case 'bytes':
        return (b.bytes ?? 0) - (a.bytes ?? 0);
      case 'packets':
        return (b.packets ?? 0) - (a.packets ?? 0);
      case 'proto': {
        const byProto = a.proto.localeCompare(b.proto);
        return byProto !== 0 ? byProto : (b.bytes ?? 0) - (a.bytes ?? 0);
      }
      case 'src': {
        const bySrc = a.src.localeCompare(b.src);
        return bySrc !== 0 ? bySrc : (b.bytes ?? 0) - (a.bytes ?? 0);
      }
      default: {
        const _exhaustive: never = sort;
        return _exhaustive;
      }
    }
  });
  return copy;
}
