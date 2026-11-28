// First-seen merge and 30-day forget for milkflint.devices.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  forgetStale,
  formatFirstSeen,
  mergeFirstSeen,
  RETAIN_SECONDS,
} from '../src/features/clients/first-seen.ts';

const NOW = 1_700_000_000;
const MAC_A = 'aa:bb:cc:dd:ee:01';
const MAC_B = 'aa:bb:cc:dd:ee:02';

test('a new MAC gets first-seen and last-seen at now', () => {
  const next = mergeFirstSeen({}, [MAC_A], NOW);
  assert.deepEqual(next[MAC_A], { firstSeen: NOW, lastSeen: NOW });
});

test('seeing a known MAC refreshes last-seen and keeps first-seen', () => {
  const store = { [MAC_A]: { firstSeen: NOW - 1000, lastSeen: NOW - 500 } };
  const next = mergeFirstSeen(store, [MAC_A], NOW);
  assert.deepEqual(next[MAC_A], { firstSeen: NOW - 1000, lastSeen: NOW });
});

test('MACs are stored lower-case', () => {
  const next = mergeFirstSeen({}, ['AA:BB:CC:DD:EE:01'], NOW);
  assert.ok(next[MAC_A] !== undefined);
  assert.equal(next['AA:BB:CC:DD:EE:01'], undefined);
});

test('invalid MACs are ignored', () => {
  const next = mergeFirstSeen({}, ['not-a-mac', MAC_A], NOW);
  assert.deepEqual(Object.keys(next), [MAC_A]);
});

test('devices silent longer than 30 days are forgotten', () => {
  const store = {
    [MAC_A]: { firstSeen: NOW - RETAIN_SECONDS - 10, lastSeen: NOW - RETAIN_SECONDS - 1 },
    [MAC_B]: { firstSeen: NOW - 100, lastSeen: NOW - 10 },
  };
  assert.deepEqual(forgetStale(store, NOW), {
    [MAC_B]: { firstSeen: NOW - 100, lastSeen: NOW - 10 },
  });
  const merged = mergeFirstSeen(store, [], NOW);
  assert.deepEqual(Object.keys(merged), [MAC_B]);
});

test('a device seen again inside the window stays', () => {
  const store = {
    [MAC_A]: { firstSeen: NOW - RETAIN_SECONDS + 60, lastSeen: NOW - RETAIN_SECONDS + 60 },
  };
  const next = mergeFirstSeen(store, [MAC_A], NOW);
  assert.deepEqual(next[MAC_A], { firstSeen: NOW - RETAIN_SECONDS + 60, lastSeen: NOW });
});

test('formatFirstSeen uses relative words inside the retain window', () => {
  assert.equal(formatFirstSeen(undefined), undefined);
  assert.equal(formatFirstSeen(NOW, NOW), 'just now');
  assert.equal(formatFirstSeen(NOW - 120, NOW), '2 min ago');
  assert.equal(formatFirstSeen(NOW - 7200, NOW), '2 h ago');
  assert.equal(formatFirstSeen(NOW - 86400, NOW), '1 day ago');
  assert.equal(formatFirstSeen(NOW - 3 * 86400, NOW), '3 days ago');
});
