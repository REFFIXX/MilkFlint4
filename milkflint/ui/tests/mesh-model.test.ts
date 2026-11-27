import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstBootScript, portalDetectFor, type MeshForm, validateForm } from '../src/features/mesh/model.ts';

const base: MeshForm = {
  enabled: true,
  autoConfig: false,
  role: 'peer',
  autoMeshId: 'MilkFlint',
  autoMeshKey: '',
  band: '2g',
  gateSsid: 'MilkFlint',
  gateEncryption: '1',
  gateKey: 'secretkey',
  ssidSuffix: true,
};

test('ordinary peer and main-auto both use portal_detect=1', () => {
  assert.equal(portalDetectFor('peer'), '1');
  assert.equal(portalDetectFor('main-auto'), '1');
  assert.equal(portalDetectFor('main-fixed'), '0');
});

test('encrypted gate requires a key', () => {
  assert.equal(validateForm({ ...base, gateKey: '' }), 'Gate key is required for this encryption mode.');
  assert.equal(validateForm({ ...base, gateKey: 'short' }), 'Gate key must be at least 8 characters.');
  assert.equal(validateForm(base), undefined);
  assert.equal(validateForm({ ...base, gateEncryption: '4', gateKey: '' }), undefined);
});

test('first-boot script stays in confidence-test mode', () => {
  const script = firstBootScript(base);
  assert.match(script, /^uci set mesh11sd\.setup\.auto_config='0'$/m);
  assert.doesNotMatch(script, /^uci set mesh11sd\.setup\.auto_config='1'$/m);
  assert.match(script, /^uci set mesh11sd\.setup\.portal_detect='1'$/m);
  assert.doesNotMatch(script, /portal_detect='5'/);
  assert.match(script, /^uci set milkflint\.mesh\.role='peer'$/m);
});
