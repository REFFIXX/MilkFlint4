// apk version helpers shared by AdGuard Home and banIP Updates cards.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PACKAGE_FEED_READY, compareVersions, parseApkVersion, versionLabel } from '../src/lib/apk-version.ts';

test('parseApkVersion: upstream and -rN release', () => {
  assert.deepEqual(parseApkVersion('0.107.80-r1'), { raw: '0.107.80-r1', upstream: '0.107.80', release: 1 });
  assert.deepEqual(parseApkVersion('1.9.2-r1001'), { raw: '1.9.2-r1001', upstream: '1.9.2', release: 1001 });
  assert.deepEqual(parseApkVersion('0.107.80'), { raw: '0.107.80', upstream: '0.107.80', release: undefined });
  assert.equal(parseApkVersion(null), undefined);
  assert.equal(parseApkVersion(''), undefined);
  assert.deepEqual(parseApkVersion('not-a-version'), {
    raw: 'not-a-version',
    upstream: 'not-a-version',
    release: undefined,
  });
});

test('versionLabel: as AdGuard Home / banIP name them', () => {
  assert.equal(versionLabel('1.0.0-r1'), 'v1.0.0');
  assert.equal(versionLabel('0.107.80-r1'), 'v0.107.80');
  assert.equal(versionLabel('0.107.80-r3'), 'v0.107.80 (build 3)');
  assert.equal(versionLabel('1.9.2-r1001'), 'v1.9.2 (build 1001)');
  assert.equal(versionLabel(null), 'unknown');
  assert.equal(versionLabel('odd'), 'odd');
});

test('compareVersions: apk order, numbers as numbers', () => {
  assert.ok(compareVersions('1.0.0-r1', '0.107.80-r1') > 0);
  assert.ok(compareVersions('0.107.80-r1', '0.107.79-r3') > 0);
  assert.ok(compareVersions('0.107.79-r3', '0.107.79-r1') > 0);
  assert.ok(compareVersions('0.107.100-r1', '0.107.99-r1') > 0);
  assert.ok(compareVersions('1.9.2-r1001', '1.9.1-r2') > 0);
  assert.equal(compareVersions('1.0.0-r1', '1.0.0-r1'), 0);
});

test('PACKAGE_FEED_READY stays off until MilkFlint4 ships its own feed', () => {
  assert.equal(PACKAGE_FEED_READY, false);
});
