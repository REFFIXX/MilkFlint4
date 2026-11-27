import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readForm, toChanges, validateSelection, type RoamingForm } from '../src/features/wifi-roaming/model.ts';
import { section } from './uci-fixture.ts';

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

const wireless = [
  section('wifi-iface', 'wifinet0', { mode: 'ap', ssid: 'A', device: 'radio0', nasid: '4f57' }),
  section('wifi-iface', 'wifinet1', { mode: 'ap', ssid: 'B', device: 'radio1', nasid: '4f57' }),
];

test('802.11r does not write a shared nasid; clears mobility-domain nasid leftovers', () => {
  const changes = toChanges(form, wireless, []);
  const sets = changes.filter((c) => c.op === 'set' && c.config === 'wireless');
  for (const c of sets) {
    if (c.op === 'set') assert.equal(c.values['nasid'], undefined);
    if (c.op === 'set') assert.equal(c.values['mobility_domain'], '4f57');
  }
  const unsets = changes.filter((c) => c.op === 'unset' && c.config === 'wireless');
  assert.equal(unsets.length, 2);
  for (const c of unsets) {
    assert.ok(c.op === 'unset' && c.options.includes('nasid'));
  }
});

test('persists apply-all in milkflint.roaming', () => {
  const changes = toChanges(form, wireless, []);
  const meta = changes.find((c) => c.config === 'milkflint' && (c.op === 'add' || c.op === 'set'));
  assert.ok(meta !== undefined);
  if (meta?.op === 'add' || meta?.op === 'set') {
    assert.equal(meta.values['apply_all'], '1');
  }
});

test('selected SSIDs persist when apply-all is off', () => {
  const partial: RoamingForm = { ...form, applyAll: false, selected: ['wifinet1'] };
  const changes = toChanges(partial, wireless, []);
  const meta = changes.find((c) => c.config === 'milkflint' && c.op === 'add');
  assert.ok(meta?.op === 'add');
  if (meta?.op === 'add') {
    assert.equal(meta.values['apply_all'], '0');
    assert.deepEqual(meta.values['iface'], ['wifinet1']);
  }
  const sets = changes.filter((c) => c.op === 'set' && c.config === 'wireless');
  assert.equal(sets.length, 1);
  assert.ok(sets[0]?.op === 'set' && sets[0].section === 'wifinet1');
});

test('readForm restores apply-all and selected ifaces', () => {
  const milkflint = [section('roaming', 'roaming', { apply_all: '0', iface: ['wifinet1'] })];
  const got = readForm(wireless, [], milkflint);
  assert.equal(got.applyAll, false);
  assert.deepEqual(got.selected, ['wifinet1']);
});

test('readForm keeps an intentionally empty iface list empty', () => {
  const milkflint = [section('roaming', 'roaming', { apply_all: '0' })];
  const got = readForm(wireless, [], milkflint);
  assert.equal(got.applyAll, false);
  assert.deepEqual(got.selected, []);
  assert.match(validateSelection(got) ?? '', /Select at least one/);
});
