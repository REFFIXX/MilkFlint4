// rpcd plugin for the VPN pages (Remote access, VPN client): WireGuard's
// live state, new keys, the public key of a private one, the UDP ports
// in use, and named VPN-client profiles. Keys only travel through pipes,
// never on a command line, and the state it returns has no private or
// preshared keys. ubus object "milkflint.vpn".
'use strict';

import { access, popen, readfile, writefile, rename, mkdir, unlink } from 'fs';
import { cursor } from 'uci';

const WG = '/usr/bin/wg';
const DIR = '/etc/milkflint';
const PROFILES = `${DIR}/vpn-profiles.json`;
const MAX_PROFILES = 32;
const MAX_BYTES = 131072;
const STALE = 180;
const FALLTHROUGH = '/tmp/milkflint-vpn-fallthrough';

function output(cmd) {
	const p = popen(cmd, 'r');
	if (!p)
		return '';
	const out = p.read('all') ?? '';
	p.close();
	return out;
}

// 32 bytes in base64: 43 characters, the last of them only one of 16, then '='
function is_key(s) {
	return type(s) == 'string' && match(s, /^[A-Za-z0-9+\/]{42}[AEIMQUYcgkosw048]=$/) != null;
}

function new_key(cmd) {
	const k = trim(output(`${WG} ${cmd} 2>/dev/null`));
	return is_key(k) ? k : null;
}

// rpcd runs one call at a time, so one file for the answer is enough; it
// only ever holds a public key
function public_key(private_key) {
	const out = '/tmp/milkflint-wg.pub';
	const p = popen(`${WG} pubkey > ${out} 2>/dev/null`, 'w');
	if (!p)
		return null;
	p.write(private_key + '\n');
	p.close();
	const k = trim(readfile(out) ?? '');
	unlink(out);
	return is_key(k) ? k : null;
}

function installed() {
	return access(WG, 'x') == true;
}

// /proc/net/udp and udp6: "sl local_address rem_address st ...", the local
// port in hex after the address's colon
function udp_ports() {
	const seen = {};
	for (let file in [ '/proc/net/udp', '/proc/net/udp6' ]) {
		for (let line in split(readfile(file) ?? '', '\n')) {
			const f = split(trim(line), /[ \t]+/);
			const m = match(f[1] ?? '', /:([0-9A-Fa-f]{4})$/);
			if (m)
				seen[hex(m[1])] = true;
		}
	}
	return sort(map(keys(seen), (p) => +p), (a, b) => a - b);
}

function read_json(path) {
	try {
		return json(readfile(path) ?? 'null');
	}
	catch (e) {
		return null;
	}
}

function as_list(v) {
	return (type(v) == 'array') ? v : (v != null && v != '') ? [ v ] : [];
}

function profile_ok(p) {
	if (type(p) != 'object')
		return null;
	if (type(p.id) != 'string' || !match(p.id, /^[a-z0-9_-]{1,32}$/))
		return null;
	if (type(p.name) != 'string' || length(p.name) < 1 || length(p.name) > 64)
		return null;
	const out = {
		id: p.id,
		name: p.name,
		private_key: (type(p.private_key) == 'string') ? p.private_key : '',
		addresses: filter(map(as_list(p.addresses), (a) => trim(`${a}`)), (a) => a != ''),
		mtu: (type(p.mtu) == 'string') ? p.mtu : '',
		public_key: (type(p.public_key) == 'string') ? p.public_key : '',
		preshared_key: (type(p.preshared_key) == 'string') ? p.preshared_key : '',
		endpoint_host: (type(p.endpoint_host) == 'string') ? p.endpoint_host : '',
		endpoint_port: (type(p.endpoint_port) == 'string') ? p.endpoint_port : '51820',
		keepalive: (type(p.keepalive) == 'string') ? p.keepalive : '25',
		dns: filter(map(as_list(p.dns), (a) => trim(`${a}`)), (a) => a != '')
	};
	return out;
}

function load_profiles() {
	const data = read_json(PROFILES);
	const raw = (type(data) == 'object' && type(data.profiles) == 'array') ? data.profiles : [];
	const profiles = [];
	const seen = {};
	for (let p in raw) {
		const ok = profile_ok(p);
		if (ok == null || seen[ok.id])
			continue;
		seen[ok.id] = true;
		push(profiles, ok);
		if (length(profiles) >= MAX_PROFILES)
			break;
	}
	let active = (type(data) == 'object' && type(data.active) == 'string') ? data.active : null;
	if (active != null && !seen[active])
		active = length(profiles) ? profiles[0].id : null;
	else if (active == null && length(profiles))
		active = profiles[0].id;
	return { active, profiles };
}

function save_profiles(active, profiles) {
	const text = sprintf('%J', { active, profiles });
	if (length(text) > MAX_BYTES)
		return { error: 'size' };
	mkdir(DIR);
	if (!writefile(`${PROFILES}.tmp`, text) || !rename(`${PROFILES}.tmp`, PROFILES))
		return { error: 'write' };
	return null;
}

function wg_dump() {
	const by_name = {};
	const order = [];
	for (let line in split(output(`${WG} show all dump 2>/dev/null`), '\n')) {
		const f = split(line, '\t');
		if (length(f) == 5) {
			by_name[f[0]] = {
				name: f[0],
				public_key: f[2],
				listen_port: (+f[3] > 0) ? +f[3] : null,
				fwmark: (f[4] == 'off') ? null : f[4],
				peers: []
			};
			push(order, f[0]);
		}
		else if (length(f) == 9 && by_name[f[0]]) {
			push(by_name[f[0]].peers, {
				public_key: f[1],
				endpoint: (f[3] == '(none)') ? null : f[3],
				allowed_ips: (f[4] == '(none)') ? [] : split(f[4], ','),
				latest_handshake: +f[5],
				rx_bytes: +f[6],
				tx_bytes: +f[7],
				keepalive: (f[8] == 'off') ? null : +f[8]
			});
		}
	}
	return { by_name, order };
}

function client_status(now, by_name) {
	const c = cursor();
	const iface = c.get_all('network', 'wg_out');
	const enabled = iface != null && iface.disabled != '1' && iface.proto == 'wireguard';
	const kill_switch = c.get('network', 'wg_out_kill') != null && c.get('network', 'wg_out_kill', 'disabled') != '1';
	const store = load_profiles();
	let profile = null;
	if (store.active != null) {
		for (let p in store.profiles) {
			if (p.id == store.active) {
				profile = p.name;
				break;
			}
		}
	}
	const peer = by_name['wg_out']?.peers?.[0];
	const hs = peer?.latest_handshake ?? 0;
	const connected = enabled && hs > 0 && (now - hs) < STALE;
	const stale = enabled && (!peer || hs <= 0 || (now - hs) >= STALE);
	const fallthrough = access(FALLTHROUGH) == true;
	return {
		enabled,
		kill_switch,
		connected,
		stale,
		handshake_age: (hs > 0) ? (now - hs) : null,
		profile,
		fallthrough
	};
}

return {
	'milkflint.vpn': {
		// `wg show all dump`: an interface's line has 5 fields (name, private
		// key, public key, port, fwmark), a peer's 9 (name, public key,
		// preshared key, endpoint, allowed IPs, latest handshake, rx, tx,
		// keepalive). `client` summarises the VPN client's dead-tunnel state.
		status: {
			call: function() {
				const now = time();
				if (!installed())
					return { installed: false, now, interfaces: [], client: null };
				const dump = wg_dump();
				return {
					installed: true,
					now,
					interfaces: map(dump.order, (n) => dump.by_name[n]),
					client: client_status(now, dump.by_name)
				};
			}
		},
		// a new key pair, and a preshared key to go with it
		keys: {
			call: function() {
				if (!installed())
					return { error: 'not installed' };
				const private_key = new_key('genkey');
				const preshared_key = new_key('genpsk');
				const pub = (private_key == null) ? null : public_key(private_key);
				if (pub == null || preshared_key == null)
					return { error: 'wg failed' };
				return { private_key, public_key: pub, preshared_key };
			}
		},
		pubkey: {
			args: { private_key: '' },
			call: function(req) {
				if (!installed() || !is_key(req.args.private_key))
					return { public_key: null };
				return { public_key: public_key(req.args.private_key) };
			}
		},
		udp_ports: {
			call: function() {
				return { ports: udp_ports() };
			}
		},
		profiles: {
			call: function() {
				const store = load_profiles();
				return { active: store.active, profiles: store.profiles };
			}
		},
		set_profiles: {
			args: { active: '', profiles: [] },
			call: function(req) {
				const raw = req.args?.profiles;
				if (type(raw) != 'array' || length(raw) > MAX_PROFILES)
					return { error: 'profiles' };
				const profiles = [];
				const seen = {};
				for (let p in raw) {
					const ok = profile_ok(p);
					if (ok == null)
						return { error: 'profile' };
					if (seen[ok.id])
						return { error: 'id' };
					seen[ok.id] = true;
					push(profiles, ok);
				}
				let active = req.args?.active;
				if (active == '' || active == null)
					active = length(profiles) ? profiles[0].id : null;
				else if (type(active) != 'string' || !seen[active])
					return { error: 'active' };
				const err = save_profiles(active, profiles);
				if (err != null)
					return err;
				return { active, profiles };
			}
		}
	}
};
