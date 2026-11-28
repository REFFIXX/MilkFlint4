// Dead-tunnel fallthrough for the VPN client (ui feature "vpn"):
// when wg_out is enabled, the peer's handshake is stale, and the kill switch
// is off, insert a higher-priority main-table rule for the tunnel mark so
// marked devices go out directly until a handshake returns. With the kill
// switch on, leave routing alone so traffic stays in the silent tunnel (no
// internet). The milkflint-vpn init runs check() on a timer.
'use strict';

import { access, writefile, unlink, popen } from 'fs';
import { cursor } from 'uci';

export const MARK = '0x10000000/0xf0000000';
export const PRIORITY = '999';
export const STALE = 180;
export const FLAG = '/tmp/milkflint-vpn-fallthrough';

function output(cmd) {
	const p = popen(cmd, 'r');
	if (!p)
		return '';
	const out = p.read('all') ?? '';
	p.close();
	return out;
}

function run(cmd) {
	output(cmd);
}

export function handshake_age() {
	const line = split(output('/usr/bin/wg show wg_out dump 2>/dev/null'), '\n');
	for (let row in line) {
		const f = split(row, '\t');
		// peer line: 9 fields; handshake is field 6 (0-based 5)
		if (length(f) == 9)
			return +f[5];
	}
	return 0;
}

export function kill_switch_on(c) {
	c ??= cursor();
	const r = c.get_all('network', 'wg_out_kill');
	return r != null && r.disabled != '1';
}

export function client_enabled(c) {
	c ??= cursor();
	const iface = c.get_all('network', 'wg_out');
	return iface != null && iface.disabled != '1' && iface.proto == 'wireguard';
}

function rule_present(family) {
	const cmd = family == 'inet6' ? 'ip -6 rule' : 'ip rule';
	const text = output(`${cmd} show 2>/dev/null`);
	return index(text, `priority ${PRIORITY}`) >= 0 && index(text, 'lookup main') >= 0;
}

function add_rules() {
	if (!rule_present('inet'))
		run(`ip rule add fwmark ${MARK} lookup main priority ${PRIORITY}`);
	if (!rule_present('inet6'))
		run(`ip -6 rule add fwmark ${MARK} lookup main priority ${PRIORITY}`);
	writefile(FLAG, '1\n');
}

function del_rules() {
	run(`ip rule del fwmark ${MARK} lookup main priority ${PRIORITY} 2>/dev/null`);
	run(`ip -6 rule del fwmark ${MARK} lookup main priority ${PRIORITY} 2>/dev/null`);
	// try twice: duplicate adds can leave two
	run(`ip rule del fwmark ${MARK} lookup main priority ${PRIORITY} 2>/dev/null`);
	run(`ip -6 rule del fwmark ${MARK} lookup main priority ${PRIORITY} 2>/dev/null`);
	unlink(FLAG);
}

/**
 * Apply or clear fallthrough. Returns 'direct' | 'block' | 'none'.
 */
export function check() {
	const c = cursor();
	if (!client_enabled(c)) {
		del_rules();
		return 'none';
	}
	const now = time();
	const hs = handshake_age();
	const stale = hs <= 0 || (now - hs) >= STALE;
	if (!stale) {
		del_rules();
		return 'none';
	}
	if (kill_switch_on(c)) {
		del_rules();
		return 'block';
	}
	add_rules();
	return 'direct';
};

export function clear() {
	del_rules();
};

export function active() {
	return access(FLAG) == true;
};
