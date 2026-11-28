// rpcd plugin for SSH keys on Router access: Dropbear's authorized_keys
// (/etc/dropbear/authorized_keys) and TCP ports in use, so the page can
// refuse a taken port. UCI for dropbear itself goes through uci's usual
// calls; this object only touches the keys file. set_keys refuses an empty
// file while PasswordAuth is off (lockout guard).
'use strict';

import { readfile, writefile, rename, mkdir, stat } from 'fs';
import { cursor } from 'uci';

const KEYS = '/etc/dropbear/authorized_keys';
const KEYS_DIR = '/etc/dropbear';
const MAX_BYTES = 65536;

function fail(error) {
	return { error };
}

// /proc/net/tcp and tcp6: local port in hex after the address's colon
function tcp_ports() {
	const seen = {};
	for (let file in [ '/proc/net/tcp', '/proc/net/tcp6' ]) {
		for (let line in split(readfile(file) ?? '', '\n')) {
			const f = split(trim(line), /[ \t]+/);
			const m = match(f[1] ?? '', /:([0-9A-Fa-f]{4})$/);
			if (m)
				seen[hex(m[1])] = true;
		}
	}
	return sort(map(keys(seen), (p) => +p), (a, b) => a - b);
}

function password_auth_on() {
	const c = cursor();
	let v = null;
	c.foreach('dropbear', 'dropbear', (s) => {
		if (v == null)
			v = s.PasswordAuth;
	});
	if (v == null || v == '')
		return true;
	return !(v == '0' || v == 'off' || v == 'false' || v == 'no');
}

function read_keys() {
	const st = stat(KEYS);
	if (st == null)
		return '';
	return readfile(KEYS) ?? '';
}

function public_key_lines(text) {
	const out = [];
	for (let line in split(text ?? '', '\n')) {
		const t = trim(line);
		if (t == '' || ord(t, 0) == 0x23)
			continue;
		if (match(t, /BEGIN\s+.*PRIVATE\s+KEY/i))
			continue;
		const f = split(t, /[ \t]+/);
		if (length(f) >= 2 && match(f[0], /^ssh-|^ecdsa-|^sk-/))
			push(out, t);
	}
	return out;
}

function set_keys(req) {
	const a = req.args ?? {};
	const text = a.text;
	const before = a.before;
	if (type(text) != 'string')
		return fail('text');
	if (length(text) > MAX_BYTES)
		return fail('size');
	if (match(text, /BEGIN\s+.*PRIVATE\s+KEY/i))
		return fail('private key');
	const current = read_keys();
	if (type(before) == 'string' && before != current)
		return fail('changed on the router since this page read it');
	const lines = public_key_lines(text);
	if (length(lines) == 0 && !password_auth_on())
		return fail('add an SSH key before removing the last one while password logins are off');
	const body = length(lines) == 0 ? '' : join('\n', lines) + '\n';
	mkdir(KEYS_DIR);
	if (!writefile(`${KEYS}.tmp`, body) || !rename(`${KEYS}.tmp`, KEYS))
		return fail('write');
	return { saved: true };
}

return {
	'milkflint.ssh': {
		keys: {
			call: function() {
				return { text: read_keys(), tcp_ports: tcp_ports() };
			}
		},
		set_keys: {
			args: { text: '', before: '' },
			call: set_keys
		}
	}
};
