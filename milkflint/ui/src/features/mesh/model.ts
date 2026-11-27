import { type Change, sectionChanges, type Section, str } from '@/lib/api/uci';

/** portal_detect codes we expose in v1. */
export type MeshRole = 'main-auto' | 'main-fixed' | 'peer';

export type MeshBand = '2g' | '5g' | '6g';

/** mesh_gate_encryption codes used by mesh11sd. */
export type GateEncryption = '0' | '1' | '2' | '3' | '4';

export interface MeshForm {
  enabled: boolean;
  autoConfig: boolean;
  role: MeshRole;
  autoMeshId: string;
  autoMeshKey: string;
  band: MeshBand;
  gateSsid: string;
  gateEncryption: GateEncryption;
  gateKey: string;
  ssidSuffix: boolean;
}

const ENC_LABELS: Record<GateEncryption, string> = {
  '0': 'Open / OWE transition',
  '1': 'WPA3 SAE',
  '2': 'WPA2/WPA3 mixed',
  '3': 'WPA2 PSK',
  '4': 'OWE',
};

const ROLES: readonly MeshRole[] = ['main-auto', 'main-fixed', 'peer'];

export function encryptionLabel(v: GateEncryption): string {
  return ENC_LABELS[v];
}

export function roleFromPortalDetect(v: string | undefined): MeshRole {
  if (v === '0') return 'main-fixed';
  // 5 (TPE) and legacy 2 are specialised peers; treat as Access point in the UI
  // and migrate ordinary peers to auto-detect (1) on save.
  if (v === '5' || v === '2') return 'peer';
  return 'main-auto';
}

/**
 * Ordinary home mesh: portal_detect=1 for both Main·auto and Access point
 * (WAN up → portal, WAN down → peer). Fixed portal is 0.
 * Do not use 5 (TPE / VXLAN trunk peer) for a normal AP — UI “peer” is
 * milkflint.mesh.role only; mesh11sd still sees portal_detect=1.
 */
export function portalDetectFor(role: MeshRole): string {
  if (role === 'main-fixed') return '0';
  return '1';
}

export function setupSection(mesh: Section[]): Section | undefined {
  return mesh.find((s) => s['.name'] === 'setup' || s['.type'] === 'mesh11sd');
}

function parseRole(v: string | undefined): MeshRole | undefined {
  return ROLES.includes(v as MeshRole) ? (v as MeshRole) : undefined;
}

export function readForm(mesh: Section[], milkflint: Section[] = []): MeshForm {
  const s = setupSection(mesh);
  const meta = milkflint.find((x) => x['.name'] === 'mesh');
  const enc = (str(s, 'mesh_gate_encryption') ?? '4') as GateEncryption;
  const band = (str(s, 'auto_mesh_band') ?? '2g') as MeshBand;
  const portal = str(s, 'portal_detect');
  return {
    enabled: (str(s, 'enabled') ?? '1') !== '0',
    autoConfig: (str(s, 'auto_config') ?? '0') !== '0',
    // Prefer the UI intent we saved; fall back to portal_detect.
    role: parseRole(str(meta, 'role')) ?? roleFromPortalDetect(portal),
    autoMeshId: str(s, 'auto_mesh_id') ?? 'MilkFlint',
    autoMeshKey: str(s, 'auto_mesh_key') ?? '',
    band: band === '5g' || band === '6g' ? band : '2g',
    gateSsid: str(s, 'mesh_gate_base_ssid') ?? 'MilkFlint',
    gateEncryption: ['0', '1', '2', '3', '4'].includes(enc) ? enc : '4',
    gateKey: str(s, 'mesh_gate_key') ?? '',
    ssidSuffix: (str(s, 'ssid_suffix_enable') ?? '1') !== '0',
  };
}

export function validateForm(form: MeshForm): string | undefined {
  if (form.autoMeshId.trim() === '') return 'Mesh ID is required on every node.';
  const maxSsid = form.ssidSuffix ? 22 : 30;
  if (form.gateSsid.replace(/\s+/g, '').length > maxSsid) {
    return `Gate SSID must be ≤${maxSsid} characters${form.ssidSuffix ? ' when the suffix is on' : ''}.`;
  }
  if (form.gateEncryption !== '0' && form.gateEncryption !== '4') {
    if (form.gateKey.trim() === '') return 'Gate key is required for this encryption mode.';
    if (form.gateKey.trim().length < 8) return 'Gate key must be at least 8 characters.';
  }
  return undefined;
}

export function toChanges(form: MeshForm, mesh: Section[], milkflint: Section[] = []): Change[] {
  const values: Record<string, string | undefined> = {
    enabled: form.enabled ? '1' : '0',
    auto_config: form.autoConfig ? '1' : '0',
    portal_detect: portalDetectFor(form.role),
    auto_mesh_id: form.autoMeshId.trim(),
    auto_mesh_key: form.autoMeshKey.trim() === '' ? undefined : form.autoMeshKey.trim(),
    auto_mesh_band: form.band,
    mesh_gate_base_ssid: form.gateSsid.replace(/\s+/g, ''),
    mesh_gate_encryption: form.gateEncryption,
    mesh_gate_key: form.gateEncryption === '0' || form.gateEncryption === '4' ? undefined : form.gateKey.trim(),
    ssid_suffix_enable: form.ssidSuffix ? '1' : '0',
    mesh_gate_enable: '1',
  };
  const setup = sectionChanges('mesh11sd', mesh, 'setup', values).map((c) => (c.op === 'add' ? { ...c, type: 'mesh11sd' } : c));
  // Persist UI role separately: main-auto and peer both use portal_detect=1.
  const meta = sectionChanges('milkflint', milkflint, 'mesh', { role: form.role }).map((c) =>
    c.op === 'add' ? { ...c, type: 'mesh' } : c,
  );
  return [...setup, ...meta];
}

/**
 * First-boot uci-defaults for another OpenWrt 25.x AP.
 * Starts in confidence-test mode (auto_config=0); portal_detect=1 so WAN
 * decides portal vs ordinary peer. Enable auto_config after the node proves healthy.
 */
export function firstBootScript(form: MeshForm): string {
  const lines = [
    '# MilkFlint4 mesh — paste into Firmware Selector "Script to run on first boot"',
    '# OpenWrt 25.12+. Same auto_mesh_id / gate SSID / key on every node.',
    '# auto_config=0 = confidence test (power-cycle recovers). After mesh11sd status looks good:',
    "#   uci set mesh11sd.setup.auto_config='1' && uci commit mesh11sd",
    '#   (or: mesh11sd auto_config enable)',
    "uci set mesh11sd.setup.auto_config='0'",
    "uci set mesh11sd.setup.portal_detect='1'",
    `uci set mesh11sd.setup.auto_mesh_id='${escapeUci(form.autoMeshId.trim())}'`,
  ];
  if (form.autoMeshKey.trim() !== '') {
    lines.push(`uci set mesh11sd.setup.auto_mesh_key='${escapeUci(form.autoMeshKey.trim())}'`);
  }
  lines.push(
    `uci set mesh11sd.setup.auto_mesh_band='${form.band}'`,
    `uci set mesh11sd.setup.mesh_gate_base_ssid='${escapeUci(form.gateSsid.replace(/\s+/g, ''))}'`,
    `uci set mesh11sd.setup.mesh_gate_encryption='${form.gateEncryption}'`,
  );
  if (form.gateEncryption !== '0' && form.gateEncryption !== '4') {
    lines.push(`uci set mesh11sd.setup.mesh_gate_key='${escapeUci(form.gateKey.trim())}'`);
  }
  lines.push(
    `uci set mesh11sd.setup.ssid_suffix_enable='${form.ssidSuffix ? '1' : '0'}'`,
    'uci commit mesh11sd',
    // Persist UI role: peer and main-auto both use portal_detect=1.
    'uci -q get milkflint.mesh >/dev/null 2>&1 || uci set milkflint.mesh=mesh',
    `uci set milkflint.mesh.role='${form.role}'`,
    'uci commit milkflint',
    '',
  );
  return lines.join('\n');
}

function escapeUci(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, `'\\''`);
}
