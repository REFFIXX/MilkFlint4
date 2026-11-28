// rpcd plugin for the "data-statistics" feature: nlbwmon's traffic
// accounting per device, its accounting periods, and optional 24 h samples
// in /tmp (milkflint.datastats.history).
'use strict';

import { popen, access, readfile } from 'fs';
import { cursor } from 'uci';

const HISTORY_STATE = '/tmp/milkflint/usage-history.json';

function nlbw(args) {
	const fd = popen(`nlbw ${args} 2>/dev/null`, 'r');
	if (!fd)
		return null;
	const out = fd.read('all');
	fd.close();
	return out;
}

function read_history() {
	try {
		return json(readfile(HISTORY_STATE) ?? 'null');
	}
	catch (e) {
		return null;
	}
}

return {
	'milkflint.traffic': {
		// accounting periods with data, newest first (YYYY-MM-DD start dates);
		// none while it's off (milkflint.datastats.enabled: nlbwmon is stopped)
		periods: {
			call: function() {
				const enabled = cursor().get('milkflint', 'datastats', 'enabled') != '0';
				if (!access('/usr/sbin/nlbw', 'x'))
					return { installed: false, enabled, periods: [] };
				const out = nlbw('-c list') ?? '';
				return { installed: true, enabled, periods: sort(filter(split(trim(out), '\n'), (l) => match(l, /^\d{4}-\d{2}-\d{2}$/)), (a, b) => (a > b) ? -1 : ((a < b) ? 1 : 0)) };
			}
		},
		// traffic per device (mac) or per protocol (layer7) in a period
		usage: {
			args: { period: '', group: 'mac' },
			call: function(req) {
				const group = (req.args.group == 'layer7') ? 'layer7' : 'mac,ip';
				let args = `-c json -g ${group} -o -rx_bytes`;
				if (match(req.args.period ?? '', /^\d{4}-\d{2}-\d{2}$/))
					args += ` -t ${req.args.period}`;
				let parsed = null;
				try {
					parsed = json(nlbw(args) ?? 'null');
				}
				catch (e) {
					parsed = null;
				}
				return parsed ?? { columns: [], data: [] };
			}
		},
		// last-24h samples (absolute nlbwmon counters per MAC); empty while off
		history: {
			args: { hours: 24 },
			call: function(req) {
				const on = cursor().get('milkflint', 'datastats', 'history') == '1';
				const hours = int(req.args.hours ?? 24);
				const span = (hours == 1 || hours == 4 || hours == 8 || hours == 24) ? hours * 3600 : 24 * 3600;
				const now = time();
				const state = on ? read_history() : null;
				const since = now - span;
				const samples = filter(state?.samples ?? [], (s) => (s?.t ?? 0) >= since);
				return {
					enabled: on,
					now,
					interval: state?.interval ?? 300,
					since,
					samples
				};
			}
		}
	}
};
