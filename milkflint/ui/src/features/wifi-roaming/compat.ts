// OpenWrt 25.x / MilkFlint4 gate for roaming + mesh pages.
import type { Board } from '@/lib/api/system';

/** True when this firmware is MilkFlint4 or an OpenWrt 25.x release. */
export function supports25RoamingMesh(board: Board | undefined): boolean {
  const dist = board?.release?.distribution ?? '';
  const ver = board?.release?.version ?? '';
  if (/^milkflint/i.test(dist)) return true;
  return ver.startsWith('25.');
}
