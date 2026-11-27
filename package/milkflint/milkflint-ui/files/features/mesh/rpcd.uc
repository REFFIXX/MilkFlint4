// Mesh status: wrap mesh11sd's JSON status for the MilkFlint mesh page,
// plus a safe reload after UCI changes to mesh11sd.setup.
'use strict';

import { access, popen } from 'fs';
import { cursor } from 'uci';
import { connect } from 'ubus';

function mesh11sd_running() {
	const bus = connect();
	const svc = bus?.call('service', 'list', { name: 'mesh11sd' });
	bus?.disconnect();
	for (let name, inst in svc?.mesh11sd?.instances ?? {})
		if (inst?.running)
			return true;
	return false;
}

function status_json() {
	const bus = connect();
	let st = null;
	try {
		st = bus?.call('mesh11sd', 'status', {});
	}
	catch (e) {
		st = null;
	}
	bus?.disconnect();
	if (st != null)
		return st;
	const p = popen('mesh11sd status 2>/dev/null || true', 'r');
	if (!p)
		return null;
	const text = trim(p.read('all') ?? '');
	p.close();
	if (text == '')
		return null;
	try {
		return json(text);
	}
	catch (e) {
		return null;
	}
}

function peers_from(st) {
	const out = [];
	if (st == null)
		return out;
	// Prefer an explicit peers/nodes array when present.
	for (let list in [ st.peers, st.nodes, st.mesh_nodes ]) {
		if (type(list) != 'array')
			continue;
		for (let n in list) {
			if (type(n) != 'object')
				continue;
			push(out, {
				id: n.id ?? n.node_id ?? n.mac ?? n.hostname ?? '?',
				hostname: n.hostname ?? n.name ?? null,
				role: n.role ?? n.node_type ?? n.portal_type ?? null,
				mac: n.mac ?? n.node_mac ?? null,
				signal: n.signal ?? n.rssi ?? null,
				metric: n.metric ?? n.airtime_metric ?? n.mpath_metric ?? null
			});
		}
		if (length(out) > 0)
			return out;
	}
	// Fall back to mpath / interfaces maps from mesh11sd status.
	const ifaces = st.interfaces ?? st.mesh_interfaces ?? {};
	for (let ifname, info in ifaces) {
		const paths = info?.mesh_paths ?? info?.stations ?? info?.peers ?? {};
		if (type(paths) == 'array') {
			for (let n in paths) {
				if (type(n) != 'object')
					continue;
				push(out, {
					id: n.mac ?? n.dst ?? `${ifname}-${length(out)}`,
					hostname: n.hostname ?? null,
					role: n.mp_flags != null ? `flags ${n.mp_flags}` : null,
					mac: n.mac ?? n.dst ?? null,
					signal: n.signal ?? null,
					metric: n.metric ?? n.airtime_metric ?? null
				});
			}
			continue;
		}
		for (let mac, n in paths) {
			if (type(n) != 'object')
				continue;
			push(out, {
				id: mac,
				hostname: n.hostname ?? null,
				role: n.mp_flags != null ? `flags ${n.mp_flags}` : null,
				mac,
				signal: n.signal ?? null,
				metric: n.metric ?? n.airtime_metric ?? null
			});
		}
	}
	return out;
}

function local_role(st) {
	const c = cursor();
	c.load('mesh11sd');
	const portal = c.get('mesh11sd', 'setup', 'portal_detect') ?? '1';
	const auto = c.get('mesh11sd', 'setup', 'auto_config') ?? '0';
	const code = st?.this_node?.portal_type
		?? st?.portal_type
		?? st?.get_portal_type
		?? st?.node_type
		?? null;
	return {
		portalDetect: portal,
		autoConfig: auto,
		portalType: code,
		hostname: st?.this_node?.hostname ?? st?.hostname ?? null,
		meshId: c.get('mesh11sd', 'setup', 'auto_mesh_id') ?? null
	};
}

return {
	'milkflint.mesh': {
		status: {
			call: function() {
				const installed = access('/usr/sbin/mesh11sd', 'x') == true
					|| access('/etc/init.d/mesh11sd', 'x') == true;
				const st = installed ? status_json() : null;
				return {
					installed,
					running: mesh11sd_running(),
					local: local_role(st),
					peers: peers_from(st),
					raw: st
				};
			}
		},
		reload: {
			call: function() {
				system('/etc/init.d/mesh11sd reload >/dev/null 2>&1 || mesh11sd config_reload >/dev/null 2>&1 || true');
				return { reloaded: true };
			}
		}
	}
};
