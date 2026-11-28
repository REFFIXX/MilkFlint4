// Live speed formatting and byte→bit/s math for All devices.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displaySpeed, formatLiveSpeed, MIN_RATE_SECONDS, trafficRate } from '../src/features/clients/speed.ts';
import { formatBitrate } from '../src/lib/format.ts';

test('trafficRate needs a usable interval and non-decreasing counters', () => {
  assert.equal(trafficRate(undefined, 1000, 1), undefined);
  assert.equal(trafficRate(1000, undefined, 1), undefined);
  assert.equal(trafficRate(1000, 2000, MIN_RATE_SECONDS - 0.1), undefined);
  assert.equal(trafficRate(2000, 1000, 1), undefined);
  assert.equal(trafficRate(1000, 2000, 1), 8000);
  assert.equal(trafficRate(0, 1_250_000, 1), 10_000_000);
});

test('formatLiveSpeed shows down and up, or whichever is known', () => {
  assert.equal(formatLiveSpeed(undefined, undefined, formatBitrate), undefined);
  assert.equal(formatLiveSpeed(12_300_000, 1_200_000, formatBitrate), '↓ 12.3 Mbit/s · ↑ 1.2 Mbit/s');
  assert.equal(formatLiveSpeed(12_300_000, undefined, formatBitrate), '↓ 12.3 Mbit/s');
  assert.equal(formatLiveSpeed(undefined, 1_200_000, formatBitrate), '↑ 1.2 Mbit/s');
});

test('displaySpeed prefers live traffic over link rate', () => {
  assert.deepEqual(displaySpeed({ down: 1e6, up: 2e5, linkRate: 1e8, formatBitrate }), {
    text: '↓ 1 Mbit/s · ↑ 200 kbit/s',
    live: true,
  });
  assert.deepEqual(displaySpeed({ down: undefined, up: undefined, linkRate: 1e8, formatBitrate }), {
    text: '100 Mbit/s',
    live: false,
  });
  assert.equal(displaySpeed({ down: undefined, up: undefined, linkRate: undefined, formatBitrate }), undefined);
});
