// Live traffic rates for a device, the same math Home uses on Wi-Fi stations:
// byte counters between two polls → bit/s. Wired devices get a rate when
// conntrack host bytes are available; otherwise the list falls back to link
// speed.

/** Two answers that arrive almost together give no rate (near-zero interval). */
export const MIN_RATE_SECONDS = 0.5;

/** Bytes then and now over `seconds` → bit/s, or undefined when the sample is unusable. */
export function trafficRate(prevBytes: number | undefined, curBytes: number | undefined, seconds: number): number | undefined {
  if (prevBytes === undefined || curBytes === undefined || seconds < MIN_RATE_SECONDS || curBytes < prevBytes) return undefined;
  return ((curBytes - prevBytes) * 8) / seconds;
}

/** Down and up as one short line for the devices list, or undefined when neither is known. */
export function formatLiveSpeed(down: number | undefined, up: number | undefined, formatBitrate: (bps: number) => string): string | undefined {
  if (down === undefined && up === undefined) return undefined;
  if (down !== undefined && up !== undefined) return `↓ ${formatBitrate(down)} · ↑ ${formatBitrate(up)}`;
  if (down !== undefined) return `↓ ${formatBitrate(down)}`;
  if (up !== undefined) return `↑ ${formatBitrate(up)}`;
  return undefined;
}

/** Prefer live traffic; else the Wi-Fi link rate (negotiated, not traffic). */
export function displaySpeed(opts: {
  down: number | undefined;
  up: number | undefined;
  linkRate: number | undefined;
  formatBitrate: (bps: number) => string;
}): { text: string; live: boolean } | undefined {
  const live = formatLiveSpeed(opts.down, opts.up, opts.formatBitrate);
  if (live !== undefined) return { text: live, live: true };
  if (opts.linkRate === undefined) return undefined;
  return { text: opts.formatBitrate(opts.linkRate), live: false };
}
