// rpcd plugin for the LAN page: a readable slice of live conntrack (top
// flows, counts by protocol, bytes by LAN host) without dumping the whole
// table to the browser.
'use strict';

import { readfile } from 'fs';

const TOP = 80;
const HOST_TOP = 40;

function num(v) {
	const n = +v;
	return (n == n) ? n : null;
}

function parse_line(line) {
	const fam = match(line, /^(ipv4|ipv6)\s+\d+\s+(\S+)/);
	if (!fam)
		return null;
	const proto = lc(fam[2]);
	const ends = match(line, /\ssrc=([0-9a-fA-F.:]+)\s+dst=([0-9a-fA-F.:]+)/);
	if (!ends)
		return null;
	const ports = match(line, /\ssport=(\d+)\s+dport=(\d+)/);
	const packets = match(line, /\spackets=(\d+)/);
	const bytes = match(line, /\sbytes=(\d+)/);
	const state = match(line, /\s([A-Z_]{3,})\s+src=/);
	return {
		family: fam[1],
		proto,
		src: ends[1],
		dst: ends[2],
		sport: ports ? +ports[1] : null,
		dport: ports ? +ports[2] : null,
		state: state ? state[1] : null,
		packets: packets ? +packets[1] : null,
		bytes: bytes ? +bytes[1] : null
	};
}

function is_lan(ip) {
	if (match(ip, /^10\./) != null)
		return true;
	if (match(ip, /^192\.168\./) != null)
		return true;
	if (match(ip, /^172\.(1[6-9]|2[0-9]|3[01])\./) != null)
		return true;
	if (match(ip, /^f[cd]/i) != null)
		return true;
	if (match(ip, /^fe80:/i) != null)
		return true;
	return false;
}

function connections() {
	const text = readfile('/proc/net/nf_conntrack') ?? '';
	const by_proto = {};
	const by_host = {};
	const rows = [];
	let count = 0;
	for (let line in split(text, '\n')) {
		if (line == '')
			continue;
		count++;
		const row = parse_line(line);
		if (row == null)
			continue;
		by_proto[row.proto] = (by_proto[row.proto] ?? 0) + 1;
		const host = is_lan(row.src) ? row.src : (is_lan(row.dst) ? row.dst : null);
		if (host != null) {
			const h = by_host[host] ?? { ip: host, connections: 0, bytes: 0 };
			h.connections++;
			h.bytes += row.bytes ?? 0;
			by_host[host] = h;
		}
		push(rows, row);
	}
	const top = slice(sort(rows, (a, b) => (b.bytes ?? 0) - (a.bytes ?? 0)), 0, TOP);
	const hosts = slice(
		sort(map(keys(by_host), (ip) => by_host[ip]), (a, b) => b.bytes - a.bytes || b.connections - a.connections),
		0, HOST_TOP
	);
	const protos = sort(
		map(keys(by_proto), (p) => ({ proto: p, count: by_proto[p] })),
		(a, b) => b.count - a.count
	);
	return {
		count,
		max: num(readfile('/proc/sys/net/netfilter/nf_conntrack_max')),
		by_proto: protos,
		hosts,
		connections: top
	};
}

return {
	'milkflint.lan': {
		connections: { call: connections }
	}
};
