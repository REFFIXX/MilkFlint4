// rpcd plugin for the "startup" feature: init.d services (enable at boot,
// start order, running, Start/Restart/Reload/Stop) and /etc/rc.local, as
// LuCI's System → Startup does. Actions run only named scripts under
// /etc/init.d; rc.local is read and written as a whole file.
'use strict';

import { lsdir, popen, readfile, rename, stat, writefile } from 'fs';

const INITD = '/etc/init.d';
const RCD = '/etc/rc.d';
const RC_LOCAL = '/etc/rc.local';
const MAX_RC = 65536;
const ACTIONS = [ 'enable', 'disable', 'start', 'stop', 'restart', 'reload' ];

const fail = (error, x) => ({ ok: false, error, ...(x ?? {}) });

function name_ok(v) {
	return type(v) == 'string' && match(v, /^[a-zA-Z0-9_.+-]+$/) != null && length(v) <= 64 &&
		index(v, '/') < 0 && index(v, '..') < 0;
}

function run(cmd) {
	const fd = popen(cmd + ' 2>/dev/null', 'r');
	if (!fd)
		return { code: 127, out: '' };
	const out = fd.read('all') ?? '';
	const code = fd.close();
	return { code: type(code) == 'int' ? code : 0, out };
}

// START / STOP from the script's top-level assignments (procd /etc/rc.common).
function start_stop(path) {
	const text = readfile(path) ?? '';
	const sm = match(text, /(^|\n)START=([0-9]+)/);
	const tm = match(text, /(^|\n)STOP=([0-9]+)/);
	return {
		start: sm ? +sm[2] : null,
		stop: tm ? +tm[2] : null
	};
}

// S??name links in /etc/rc.d: enabled at boot, with the start priority in the name.
function enabled_starts() {
	const out = {};
	for (let f in lsdir(RCD) ?? []) {
		const m = match(f, /^S([0-9][0-9])(.+)$/);
		if (m)
			out[m[2]] = +m[1];
	}
	return out;
}

// Whether the service is running: prefer the init script's `running` (procd),
// then ubus service list, then pidof on the script name.
function is_running(name) {
	const path = `${INITD}/${name}`;
	if (stat(path)?.type != 'file')
		return false;
	const r = run(`${path} running`);
	if (r.code == 0)
		return true;
	try {
		const svc = json(run(`ubus call service list '{"name":"${name}"}'`).out || '{}');
		for (let n, inst in svc?[name]?.instances ?? {})
			if (inst.running == true)
				return true;
	}
	catch (e) {
		// no service object or bad JSON
	}
	return run(`pidof ${name}`).code == 0;
}

function list_services() {
	const enabled = enabled_starts();
	const out = [];
	for (let name in lsdir(INITD) ?? []) {
		if (!name_ok(name))
			continue;
		const path = `${INITD}/${name}`;
		const st = stat(path);
		if (st?.type != 'file')
			continue;
		const ss = start_stop(path);
		// LuCI Startup hides scripts with START ≥ 100 (or none): same cut.
		const start = enabled[name] ?? ss.start;
		if (start == null || start >= 100)
			continue;
		push(out, {
			name,
			start,
			stop: ss.stop,
			enabled: enabled[name] != null,
			running: is_running(name)
		});
	}
	sort(out, (a, b) => a.start != b.start ? a.start - b.start : (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
	return { services: out };
}

function do_action(req) {
	const a = req.args ?? {};
	const name = a.name;
	const action = a.action;
	if (!name_ok(name))
		return fail('name');
	if (type(action) != 'string' || index(ACTIONS, action) < 0)
		return fail('action');
	const path = `${INITD}/${name}`;
	if (stat(path)?.type != 'file')
		return fail('missing');
	const r = run(`${path} ${action}`);
	return {
		ok: r.code == 0,
		code: r.code,
		running: (action == 'enable' || action == 'disable') ? is_running(name) : is_running(name),
		enabled: enabled_starts()[name] != null
	};
}

function get_rc_local() {
	const data = readfile(RC_LOCAL);
	return { data: data == null ? '' : data };
}

function set_rc_local(req) {
	const a = req.args ?? {};
	let text = a.data;
	if (type(text) != 'string')
		return fail('data');
	if (length(text) > MAX_RC)
		return fail('size');
	if (index(text, chr(0)) >= 0)
		return fail('nul');
	// Normalise to Unix newlines and a trailing newline, as LuCI does.
	text = replace(text, /\r\n/g, '\n');
	text = replace(text, /\r/g, '\n');
	if (length(text) == 0 || substr(text, -1) != '\n')
		text += '\n';
	if (!writefile(`${RC_LOCAL}.tmp`, text) || !rename(`${RC_LOCAL}.tmp`, RC_LOCAL))
		return fail('write');
	return { saved: true };
}

return {
	'milkflint.startup': {
		list: { call: list_services },
		action: {
			args: { name: '', action: '' },
			call: do_action
		},
		rc_local: { call: get_rc_local },
		set_rc_local: {
			args: { data: '' },
			call: set_rc_local
		}
	}
};
