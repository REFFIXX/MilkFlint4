// rpcd plugin for All devices: first-seen / last-seen per MAC, kept in one
// small JSON file that an upgrade and a backup keep (the package's conffiles).
// `sync` refreshes last-seen for devices that are online now, records first-seen
// the first time a MAC appears, and forgets anyone not seen for 30 days.
'use strict';

import { readfile, writefile, rename, mkdir, access } from 'fs';

const DIR = '/etc/milkflint';
const FILE = `${DIR}/devices.json`;
const RETAIN = 30 * 24 * 3600;
const MAX_DEVICES = 512;
const MAX_BYTES = 65536;

const read_json = (path) => {
	try {
		return json(readfile(path) ?? 'null');
	}
	catch (e) {
		return null;
	}
};

const mac_ok = (v) => type(v) == 'string' && match(lc(v), /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/) != null;

function load_store() {
	const data = read_json(FILE);
	const raw = (type(data) == 'object' && type(data.devices) == 'object') ? data.devices : {};
	const out = {};
	for (let mac in raw) {
		if (!mac_ok(mac))
			continue;
		const e = raw[mac];
		if (type(e) != 'object' || type(e.first_seen) != 'int' || type(e.last_seen) != 'int')
			continue;
		if (e.first_seen <= 0 || e.last_seen <= 0 || e.last_seen < e.first_seen)
			continue;
		out[lc(mac)] = { first_seen: e.first_seen, last_seen: e.last_seen };
	}
	return out;
}

function save_store(devices) {
	const text = sprintf('%J', { devices });
	if (length(text) > MAX_BYTES)
		return { error: 'size' };
	mkdir(DIR);
	if (!writefile(`${FILE}.tmp`, text) || !rename(`${FILE}.tmp`, FILE))
		return { error: 'write' };
	return null;
}

function list_of(devices) {
	const out = [];
	for (let mac in devices)
		push(out, { mac, first_seen: devices[mac].first_seen, last_seen: devices[mac].last_seen });
	return out;
}

function sync(req) {
	const now = time();
	const seen = req.args?.seen;
	if (type(seen) != 'array' || length(seen) > MAX_DEVICES)
		return { error: 'seen' };
	const devices = load_store();
	for (let mac in seen) {
		if (!mac_ok(mac))
			return { error: 'mac' };
		const key = lc(mac);
		const held = devices[key];
		if (held == null)
			devices[key] = { first_seen: now, last_seen: now };
		else
			devices[key] = { first_seen: held.first_seen, last_seen: now };
	}
	const kept = {};
	for (let mac in devices) {
		if (now - devices[mac].last_seen <= RETAIN)
			kept[mac] = devices[mac];
	}
	if (length(keys(kept)) > MAX_DEVICES)
		return { error: 'size' };
	const err = save_store(kept);
	if (err != null)
		return err;
	return { now, retain: RETAIN, devices: list_of(kept) };
}

function get() {
	const now = time();
	const devices = load_store();
	const kept = {};
	let changed = false;
	for (let mac in devices) {
		if (now - devices[mac].last_seen <= RETAIN)
			kept[mac] = devices[mac];
		else
			changed = true;
	}
	if (changed || (access(FILE) && length(keys(kept)) != length(keys(devices)))) {
		const err = save_store(kept);
		if (err != null)
			return err;
	}
	return { now, retain: RETAIN, devices: list_of(kept) };
}

return {
	'milkflint.devices': {
		get: { call: get },
		sync: { args: { seen: [] }, call: sync }
	}
};
