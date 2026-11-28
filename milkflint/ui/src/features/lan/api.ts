// Live leases and conntrack for the LAN page's Addresses and Connections tabs.
import { z } from 'zod';
import { getAllLeases, getHostHints, hintName, type Lease, type Lease6 } from '@/lib/api/network';
import { call } from '@/lib/ubus';

export interface LanLease {
  family: 'ipv4' | 'ipv6';
  address: string;
  mac: string | undefined;
  name: string | undefined;
  /** seconds left on the lease; undefined when unknown */
  expires: number | undefined;
  duid: string | undefined;
}

export interface LanConnection {
  family: string;
  proto: string;
  src: string;
  dst: string;
  sport: number | null;
  dport: number | null;
  state: string | null;
  packets: number | null;
  bytes: number | null;
}

export interface ConnHost {
  ip: string;
  connections: number;
  bytes: number;
}

export interface LanConnections {
  count: number;
  max: number | null;
  byProto: { proto: string; count: number }[];
  hosts: ConnHost[];
  connections: LanConnection[];
}

const connectionSchema = z.object({
  family: z.string(),
  proto: z.string(),
  src: z.string(),
  dst: z.string(),
  sport: z.number().nullable().optional(),
  dport: z.number().nullable().optional(),
  state: z.string().nullable().optional(),
  packets: z.number().nullable().optional(),
  bytes: z.number().nullable().optional(),
});

const connectionsReply = z
  .object({
    count: z.number(),
    max: z.number().nullable().optional(),
    by_proto: z.array(z.object({ proto: z.string(), count: z.number() })).optional(),
    hosts: z.array(z.object({ ip: z.string(), connections: z.number(), bytes: z.number() })).optional(),
    connections: z.array(connectionSchema).optional(),
  })
  .loose();

function lease4(l: Lease, names: Map<string, string>): LanLease {
  const mac = l.macaddr.toLowerCase();
  return {
    family: 'ipv4',
    address: l.ipaddr ?? '—',
    mac,
    name: l.hostname !== undefined && l.hostname !== '' ? l.hostname : names.get(mac),
    expires: l.expires,
    duid: undefined,
  };
}

function lease6(l: Lease6, names: Map<string, string>): LanLease {
  const mac = l.macaddr?.toLowerCase();
  return {
    family: 'ipv6',
    address: l.ip6addr ?? '—',
    mac,
    name: l.hostname !== undefined && l.hostname !== '' ? l.hostname : mac === undefined ? undefined : names.get(mac),
    expires: l.expires,
    duid: l.duid,
  };
}

/** IPv4 + IPv6 leases, with host-hint names filled in when the lease has none. */
export async function loadLanLeases(): Promise<LanLease[]> {
  const [{ v4, v6 }, hints] = await Promise.all([getAllLeases(), getHostHints().catch(() => ({}))]);
  const names = new Map(
    Object.entries(hints).flatMap(([mac, h]) => {
      const n = hintName(h);
      return n === undefined ? [] : [[mac.toLowerCase(), n] as const];
    }),
  );
  return [...v4.map((l) => lease4(l, names)), ...v6.map((l) => lease6(l, names))];
}

/** Live conntrack summary from milkflint.lan. */
export async function loadLanConnections(): Promise<LanConnections> {
  const r = await call('milkflint.lan', 'connections', {}, connectionsReply);
  return {
    count: r.count,
    max: r.max ?? null,
    byProto: r.by_proto ?? [],
    hosts: r.hosts ?? [],
    connections: (r.connections ?? []).map((c) => ({
      family: c.family,
      proto: c.proto,
      src: c.src,
      dst: c.dst,
      sport: c.sport ?? null,
      dport: c.dport ?? null,
      state: c.state ?? null,
      packets: c.packets ?? null,
      bytes: c.bytes ?? null,
    })),
  };
}
