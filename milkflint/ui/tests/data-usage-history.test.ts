// Last 24 hours usage history: age-pruned ring, counter resets, window diffs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  counterDelta,
  deviceUsage,
  HISTORY_INTERVAL,
  pruneSamples,
  pushSample,
  rateSeries,
  slotValues,
  spanLabel,
  windowBaseline,
  type HistorySample,
} from '../src/features/data-statistics/history.ts';

const mac = (n: number): string => `aa:bb:cc:dd:ee:0${String(n)}`;

const sample = (t: number, devices: Record<string, readonly [number, number]>): HistorySample => ({
  t,
  d: devices,
});

test('pruneSamples drops anything older than the keep window', () => {
  const samples = [sample(100, {}), sample(200, {}), sample(400, {})];
  assert.deepEqual(
    pruneSamples(samples, 400, 150).map((s) => s.t),
    [400],
  );
  assert.deepEqual(
    pruneSamples(samples, 400, 250).map((s) => s.t),
    [200, 400],
  );
});

test('pushSample appends and prunes by age', () => {
  const a = sample(0, { [mac(1)]: [10, 1] });
  const b = sample(HISTORY_INTERVAL, { [mac(1)]: [20, 2] });
  const c = sample(HISTORY_INTERVAL * 2, { [mac(1)]: [30, 3] });
  const ring = pushSample(pushSample([a], b, HISTORY_INTERVAL + 1), c, HISTORY_INTERVAL + 1);
  assert.deepEqual(
    ring.map((s) => s.t),
    [HISTORY_INTERVAL, HISTORY_INTERVAL * 2],
  );
});

test('counterDelta treats a drop as an accounting-period reset', () => {
  assert.equal(counterDelta(100, 150), 50);
  assert.equal(counterDelta(100, 100), 0);
  assert.equal(counterDelta(100, 40), 40);
});

test('windowBaseline prefers the last sample at or before since', () => {
  const samples = [sample(0, {}), sample(300, {}), sample(600, {}), sample(900, {})];
  assert.equal(windowBaseline(samples, 600)?.t, 600);
  assert.equal(windowBaseline(samples, 450)?.t, 300);
  assert.equal(windowBaseline(samples, -1)?.t, 0);
  assert.equal(windowBaseline([sample(1000, {})], 100)?.t, 1000);
});

test('deviceUsage diffs baseline to latest and skips brand-new absolute counters', () => {
  const samples = [
    sample(0, { [mac(1)]: [1000, 100], [mac(2)]: [500, 50] }),
    sample(300, { [mac(1)]: [1500, 150], [mac(2)]: [500, 50], [mac(3)]: [9_000_000, 1] }),
    sample(600, { [mac(1)]: [2000, 200], [mac(2)]: [800, 80], [mac(3)]: [9_000_100, 2] }),
  ];
  assert.deepEqual(deviceUsage(samples, 0), [
    { key: mac(1), rx: 1000, tx: 100 },
    { key: mac(2), rx: 300, tx: 30 },
    { key: mac(3), rx: 100, tx: 1 },
  ]);
  assert.deepEqual(deviceUsage(samples, 300), [
    { key: mac(1), rx: 500, tx: 50 },
    { key: mac(2), rx: 300, tx: 30 },
    { key: mac(3), rx: 100, tx: 1 },
  ]);
  assert.deepEqual(deviceUsage([samples[2]!], 0), []);
});

test('deviceUsage sums intervals across a mid-window counter reset', () => {
  const samples = [
    sample(0, { [mac(1)]: [10_000, 1_000] }),
    sample(300, { [mac(1)]: [15_000, 1_500] }),
    sample(600, { [mac(1)]: [100, 10] }),
    sample(900, { [mac(1)]: [400, 40] }),
  ];
  // 5_000 + 100 (reset) + 300
  assert.deepEqual(deviceUsage(samples, 0), [{ key: mac(1), rx: 5_400, tx: 540 }]);
});

test('rateSeries sums bit/s between consecutive samples and gaps break the line', () => {
  const samples = [
    sample(0, { [mac(1)]: [0, 0] }),
    sample(300, { [mac(1)]: [3000, 1500] }),
    sample(1200, { [mac(1)]: [6000, 3000] }), // 900 s gap > 2 * 300 (one miss still joins)
    sample(1500, { [mac(1)]: [9000, 4500] }),
  ];
  const series = rateSeries(samples, 0, 300);
  assert.equal(series.length, 3);
  assert.deepEqual(series[0], { t: 300, down: 80, up: 40 });
  assert.deepEqual(series[1], { t: 1200, down: undefined, up: undefined });
  assert.deepEqual(series[2], { t: 1500, down: 80, up: 40 });
});

test('slotValues maps newest-last chart slots from a rate series', () => {
  const series = [
    { t: 700, down: 10, up: 1 },
    { t: 1000, down: 20, up: 2 },
  ];
  assert.deepEqual(slotValues(series, 4, 1000, 300, 'down'), [undefined, undefined, 10, 20]);
  assert.deepEqual(slotValues(series, 4, 1000, 300, 'up'), [undefined, undefined, 1, 2]);
});

test('spanLabel reads as hours', () => {
  assert.equal(spanLabel(1), '1 hour');
  assert.equal(spanLabel(24), '24 hours');
});
