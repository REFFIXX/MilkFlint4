// Roaming status: full wpad present?, usteer running?, FT-capable ifaces,
// and a best-effort neighbor list from usteer.
'use strict';

import { access, popen } from 'fs';
import { cursor } from 'uci';
import { connect } from 'ubus';

function usteer_running() {
	const bus = connect();
	const svc = bus?.call('service', 'list', { name: 'usteer' });
	bus?.disconnect();
	for (let name, inst in svc?.usteer?.instances ?? {})
		if (inst?.running)
			return true;
	return false;
}

function ft_ifaces() {
	const c = cursor();
	c.load('wireless');
	const out = [];
	c.foreach('wireless', 'wifi-iface', (s) => {
		if (s.mode && s.mode != 'ap')
			return;
		if (s.ieee80211r == '1' || s.ieee80211r == 'true')
			push(out, s['.name']);
	});
	return out;
}

function neighbors() {
	const out = [];
	const p = popen("ubus call usteer remote_hosts '{}' 2>/dev/null || true", 'r');
	if (!p)
		return out;
	const text = trim(p.read('all') ?? '');
	p.close();
	if (text == '')
		return out;
	let data;
	try {
		data = json(text);
	}
	catch (e) {
		return out;
	}
	// remote_hosts is typically a map of bssid → { ssid, signal, freq, … }
	for (let bssid, info in data ?? {}) {
		if (type(info) != 'object')
			continue;
		push(out, {
			bssid,
			ssid: info.ssid ?? info.network ?? null,
			freq: info.freq ?? info.frequency ?? null,
			signal: info.signal ?? info.rssi ?? null
		});
		if (length(out) >= 24)
			break;
	}
	return out;
}

return {
	'milkflint.roaming': {
		status: {
			call: function() {
				return {
					wpadFull: access('/usr/sbin/wpad', 'x') == true,
					usteerRunning: usteer_running(),
					ftIfaces: ft_ifaces(),
					neighbors: neighbors()
				};
			}
		}
	}
};
