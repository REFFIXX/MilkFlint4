// SSH (Dropbear) model: public-key parse, lockout guards, port checks, and
// UCI changes that only touch what the form changed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Section } from '../src/lib/api/uci.ts';
import {
  canDisablePasswordAuth,
  canRemoveKey,
  dropbearSection,
  formOf,
  keyBits,
  keysFile,
  looksLikePrivateKey,
  parseAuthorizedKeys,
  parsePublicKeyLine,
  toChanges,
  validatePort,
  validateSsh,
} from '../src/features/ssh/model.ts';

// Real keys from ssh-keygen (ed25519 + rsa 2048)
const ED25519 = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDkMKdmhMuEP8E/YnnrMkNttih48Q24+yO8GM3BfrHqy milkflint-test';
const ED25519_FP = 'SHA256:8vPwbCuZ2NOsZBCGPreRVHkeGoiwjuDPWSLwgDlP/b0';
const RSA =
  'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCPb6TNcbpNX5XpeZItrEfpuXyARYcwKGcljM9XWitUCsIbzdgIEjqUPnpeTLl6CjwieoIbUpWAXNRcNrCCZjnSgXctI8UhrYyo3c/KTOCEE0VqZ2bADuwbhnRF/x19Y0EN6t1x4iGYXZTmdQOkMe9jmSShru4DFSihXJaW0LTphovnF7fKg/mjK8XZBlF0PDdlZFjrAVGim5Dn1Vn497dgs3HBWQBdWf0OH/rx6SGAv9cXy6Wl1O3nVmtfgE69HY7Ow0+dZ23Xyucm13dVJJMLy5IwkSJJlY+zKSx/B+YSSmDXP+uKWrgrRiGQt56BoFd705qLdI4f2qB8/PZBNIb/ rsa-test';

test('parsePublicKeyLine: type, comment, rejects private and junk', () => {
  const ok = parsePublicKeyLine(`  ${ED25519}  `);
  assert.ok(ok);
  assert.equal(ok.type, 'ssh-ed25519');
  assert.equal(ok.comment, 'milkflint-test');
  assert.equal(parsePublicKeyLine('# comment only'), undefined);
  assert.equal(parsePublicKeyLine('not-a-key AAAA'), undefined);
  assert.equal(
    parsePublicKeyLine('-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----'),
    undefined,
  );
});

test('looksLikePrivateKey catches PEM private keys', () => {
  assert.equal(looksLikePrivateKey('ssh-ed25519 AAAA comment'), false);
  assert.equal(looksLikePrivateKey('-----BEGIN RSA PRIVATE KEY-----\nMIIE'), true);
  assert.equal(looksLikePrivateKey('-----BEGIN OPENSSH PRIVATE KEY-----'), true);
});

test('key bits: ed25519 is 256, rsa is 2048', () => {
  const ed = parsePublicKeyLine(ED25519);
  const rsa = parsePublicKeyLine(RSA);
  assert.ok(ed && rsa);
  assert.equal(keyBits(ed.type, ed.blob), 256);
  assert.equal(keyBits(rsa.type, rsa.blob), 2048);
});

test('parseAuthorizedKeys matches OpenSSH SHA256 fingerprint and round-trips', async () => {
  const keys = await parseAuthorizedKeys(`${ED25519}\n# skip\n\n${RSA}\n`);
  assert.equal(keys.length, 2);
  assert.equal(keys[0]?.fingerprint, ED25519_FP);
  assert.equal(keys[0]?.bits, 256);
  assert.equal(keys[1]?.type, 'ssh-rsa');
  assert.equal(keys[1]?.bits, 2048);
  const text = keysFile(keys);
  assert.ok(text.includes('milkflint-test'));
  assert.ok(text.includes('rsa-test'));
  assert.ok(text.endsWith('\n'));
});

test('lockout guards: password off needs a key; last key needs password on', () => {
  assert.equal(canDisablePasswordAuth(0), false);
  assert.equal(canDisablePasswordAuth(1), true);
  assert.equal(canRemoveKey(1, false), false);
  assert.equal(canRemoveKey(1, true), true);
  assert.equal(canRemoveKey(2, false), true);
});

test('validatePort: range and taken', () => {
  assert.equal(validatePort('22', []), undefined);
  assert.equal(validatePort('0', []), 'A port from 1 to 65535.');
  assert.equal(validatePort('65536', []), 'A port from 1 to 65535.');
  assert.equal(validatePort('abc', []), 'A port from 1 to 65535.');
  assert.equal(validatePort('443', [443, 80]), 'Something on the router already uses this TCP port.');
  assert.equal(validatePort('22', [22], 22), undefined, 'keeping the current Dropbear port is fine');
});

test('validateSsh refuses password-off with zero keys', () => {
  const form = {
    enabled: true,
    port: '22',
    iface: '',
    passwordAuth: false,
    rootPasswordAuth: false,
    gatewayPorts: false,
  };
  assert.equal(validateSsh(form, 0, []).passwordAuth !== undefined, true);
  assert.equal(validateSsh(form, 1, []).passwordAuth, undefined);
});

test('formOf and toChanges only write what changed', () => {
  const section = {
    '.type': 'dropbear',
    '.name': 'cfg01',
    enable: '1',
    Port: '22',
    PasswordAuth: '1',
    RootPasswordAuth: '1',
  } as Section;
  assert.deepEqual(formOf(section), {
    enabled: true,
    port: '22',
    iface: '',
    passwordAuth: true,
    rootPasswordAuth: true,
    gatewayPorts: false,
  });
  assert.deepEqual(toChanges(formOf(section), section), []);
  const next = { ...formOf(section), port: '2222', passwordAuth: false, iface: 'lan', gatewayPorts: true };
  assert.deepEqual(toChanges(next, section), [
    {
      op: 'set',
      config: 'dropbear',
      section: 'cfg01',
      values: { Port: '2222', Interface: 'lan', PasswordAuth: '0', GatewayPorts: '1' },
    },
  ]);
  const withIface = { ...section, Interface: 'lan' } as unknown as Section;
  assert.deepEqual(toChanges({ ...formOf(withIface), iface: '' }, withIface), [
    { op: 'unset', config: 'dropbear', section: 'cfg01', options: ['Interface'] },
  ]);
});

test('dropbearSection picks the first dropbear instance', () => {
  assert.equal(dropbearSection([]), undefined);
  const s = dropbearSection([
    { '.type': 'dropbear', '.name': 'cfg01', Port: '22' },
    { '.type': 'dropbear', '.name': 'cfg02', Port: '2222' },
  ]);
  assert.equal(s?.['.name'], 'cfg01');
});
