// apk package versions as OpenWrt writes them (e.g. 0.107.80-r1, 1.9.2-r1001):
// upstream release, then MilkFlint/OpenWrt’s -rN build. Shared by AdGuard Home
// and banIP Updates cards. Feed-based install/rollback stays in AdGuard Home’s
// model for when MilkFlint4 publishes its own @milkflint index.

/** Firmware image releases that currently carry package bumps. */
export const FIRMWARE_RELEASES = 'https://github.com/REFFIXX/MilkFlint4/releases';

/**
 * MilkFlint4 does not yet publish its own versioned apk feed. The Flint 2
 * OddBlueDog feed must not be used for upgrades here. Flip when packaging
 * ships `packages/<arch>/milkflint/` for this tree and pins are ready.
 */
export const PACKAGE_FEED_READY = false;

export interface ApkVersionParts {
  /** The full string from apk / ubus (e.g. 0.107.80-r3). */
  raw: string;
  /** Upstream version without -rN (e.g. 0.107.80). */
  upstream: string;
  /** OpenWrt/MilkFlint release number after -r, when present. */
  release: number | undefined;
}

/**
 * Split an apk version into upstream + -rN. Strings that are not the usual
 * `digits…-rN` form keep the whole value as upstream with no release.
 */
export function parseApkVersion(v: string | null | undefined): ApkVersionParts | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const m = /^([0-9][0-9a-z.]*)-r([0-9]+)$/i.exec(v);
  if (m === null) return { raw: v, upstream: v, release: undefined };
  return { raw: v, upstream: m[1] ?? v, release: Number(m[2]) };
}

/** "v0.107.80" from 0.107.80-r1; "(build N)" when -rN is not 1. */
export function versionLabel(v: string | null | undefined): string {
  const parts = parseApkVersion(v);
  if (parts === undefined) return 'unknown';
  if (parts.release === undefined) return parts.raw;
  return parts.release === 1 ? `v${parts.upstream}` : `v${parts.upstream} (build ${String(parts.release)})`;
}

/** apk’s order of two versions (0.107.80-r1 after 0.107.79-r3), numbers as numbers. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/-r/, '.').split('.');
  const pb = b.replace(/-r/, '.').split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = Number(pa[i] ?? 0);
    const y = Number(pb[i] ?? 0);
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
