import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toChanges, type RoamingForm } from '../src/features/wifi-roaming/model.ts';
import type { Section } from '../src/lib/api/uci.ts';

const form: RoamingForm = {
  applyAll: true,
  selected: ['wifinet0', 'wifinet1'],
  ieee80211r: true,
  mobilityDomain: '4f57',
  ftOverDs: true,
  ieee80211k: true,
  bssTransition: true,
  usteer: false,
};

const wireless: Section[] = [
  { '.type': 'wifi-iface', '.name': 'wifinet0', '.index': 0, mode: 'ap', ssid: 'A', device: 'radio0', nasid: '4f57' },
  { '.type': 'wifi-iface', '.name': 'wifinet1', '.index': 1, mode: 'ap', ssid: 'B', device: 'radio1', nasid: '4f57' },
];

test('802.11r does not write a shared nasid; clears mobility-domain nasid leftovers', () => {
  const changes = toChanges(form, wireless, []);
  const sets = changes.filter((c) => c.op === 'set' && c.config === 'wireless');
  for (const c of sets) {
    if (c.op === 'set') assert.equal(c.values.nasid, undefined);
    if (c.op === 'set') assert.equal(c.values.mobility_domain, '4f57');
  }
  const unsets = changes.filter((c) => c.op === 'unset');
  assert.equal(unsets.length, 2);
  for (const c of unsets) {
    assert.ok(c.op === 'unset' && c.options.includes('nasid'));
  }
});
