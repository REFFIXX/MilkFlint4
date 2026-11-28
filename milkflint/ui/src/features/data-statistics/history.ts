// Last 24 hours data-usage samples: a ring pruned by age (5‑minute snapshots
// of nlbwmon's absolute per-MAC counters). The UI diffs them for windows of
// 1 / 4 / 8 / 24 hours. Storage on the router is /tmp only (flash-safe).

export const HISTORY_INTERVAL = 300;
export const HISTORY_KEEP = 24 * 3600;
export const HISTORY_WINDOWS = [1, 4, 8, 24] as const;
export type HistoryHours = (typeof HISTORY_WINDOWS)[number];

/** One snapshot: absolute rx/tx bytes per MAC (lower case). */
export interface HistorySample {
  t: number;
  /** Compact wire form: mac → [rx, tx]. */
  d: Readonly<Record<string, readonly [number, number]>>;
}

/** Drop samples older than `keep` seconds before `now`. */
export function pruneSamples(samples: readonly HistorySample[], now: number, keep: number = HISTORY_KEEP): HistorySample[] {
  const cut = now - keep;
  return samples.filter((s) => s.t > cut);
}

/** Append a sample and prune; the ring is age-based, not a fixed slot count. */
export function pushSample(
  samples: readonly HistorySample[],
  sample: HistorySample,
  keep: number = HISTORY_KEEP,
): HistorySample[] {
  return pruneSamples([...samples, sample], sample.t, keep);
}

/** Bytes gained from `prev` to `next`, treating a drop as an accounting reset. */
export function counterDelta(prev: number, next: number): number {
  return next >= prev ? next - prev : next;
}

function pairDelta(prev: readonly [number, number], next: readonly [number, number]): [number, number] {
  return [counterDelta(prev[0], next[0]), counterDelta(prev[1], next[1])];
}

/**
 * Baseline for a window: the last sample at or before `since`, else the first
 * sample after it (sampling started mid-window).
 */
export function windowBaseline(samples: readonly HistorySample[], since: number): HistorySample | undefined {
  let before: HistorySample | undefined;
  for (const s of samples) {
    if (s.t <= since) before = s;
    else break;
  }
  if (before !== undefined) return before;
  return samples.find((s) => s.t > since);
}

/**
 * Per-device usage from the window baseline to the latest sample, summing
 * consecutive counter deltas (so a mid-window accounting reset keeps earlier
 * intervals). A MAC missing from an earlier sample is skipped for that step.
 * Busiest first.
 */
export function deviceUsage(samples: readonly HistorySample[], since: number): { key: string; rx: number; tx: number }[] {
  const end = samples.at(-1);
  if (end === undefined) return [];
  if (end.t < since) return [];
  const baseline = windowBaseline(samples, since);
  if (baseline === undefined || baseline.t >= end.t) return [];

  const from = samples.indexOf(baseline);
  if (from < 0) return [];
  const totals = new Map<string, { rx: number; tx: number }>();
  for (let i = from + 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (prev === undefined || cur === undefined) continue;
    for (const key of Object.keys(cur.d)) {
      const prevPair = prev.d[key];
      const curPair = cur.d[key];
      if (prevPair === undefined || curPair === undefined) continue;
      const [drx, dtx] = pairDelta(prevPair, curPair);
      const row = totals.get(key) ?? { rx: 0, tx: 0 };
      row.rx += drx;
      row.tx += dtx;
      totals.set(key, row);
    }
  }
  return [...totals.entries()]
    .filter(([, v]) => v.rx > 0 || v.tx > 0)
    .map(([key, v]) => ({ key, rx: v.rx, tx: v.tx }))
    .sort((a, b) => b.rx + b.tx - (a.rx + a.tx));
}

/**
 * Download/upload bit/s between consecutive samples from the baseline through
 * the latest. MACs missing from the earlier sample are skipped for that step
 * (avoids treating a first absolute counter as a 5‑minute burst). A gap longer
 * than `2 * interval` breaks the line.
 */
export function rateSeries(
  samples: readonly HistorySample[],
  since: number,
  interval: number = HISTORY_INTERVAL,
): { t: number; down: number | undefined; up: number | undefined }[] {
  const baseline = windowBaseline(samples, since);
  if (baseline === undefined) return [];
  const from = samples.indexOf(baseline);
  if (from < 0 || from >= samples.length - 1) return [];
  const maxGap = interval * 2;
  const out: { t: number; down: number | undefined; up: number | undefined }[] = [];
  for (let i = from + 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (prev === undefined || cur === undefined) continue;
    const dt = cur.t - prev.t;
    if (dt <= 0 || dt > maxGap) {
      out.push({ t: cur.t, down: undefined, up: undefined });
      continue;
    }
    let rx = 0;
    let tx = 0;
    for (const key of Object.keys(cur.d)) {
      const prevPair = prev.d[key];
      const curPair = cur.d[key];
      if (prevPair === undefined || curPair === undefined) continue;
      const [drx, dtx] = pairDelta(prevPair, curPair);
      rx += drx;
      tx += dtx;
    }
    out.push({ t: cur.t, down: (rx * 8) / dt, up: (tx * 8) / dt });
  }
  return out;
}

/** Fill `slots` newest-last values from a rate series for ThroughputChart. */
export function slotValues(
  series: readonly { t: number; down: number | undefined; up: number | undefined }[],
  slots: number,
  now: number,
  interval: number,
  pick: 'down' | 'up',
): (number | undefined)[] {
  const values: (number | undefined)[] = Array.from({ length: slots }, () => undefined);
  if (slots <= 0 || interval <= 0) return values;
  for (const point of series) {
    const age = now - point.t;
    if (age < 0) continue;
    const slot = slots - 1 - Math.round(age / interval);
    if (slot < 0 || slot >= slots) continue;
    values[slot] = point[pick];
  }
  return values;
}

export function spanLabel(hours: HistoryHours): string {
  return hours === 1 ? '1 hour' : `${String(hours)} hours`;
}
