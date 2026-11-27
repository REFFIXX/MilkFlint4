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

export function encryptionLabel(v: GateEncryption): string {
  return ENC_LABELS[v];
}

export function roleFromPortalDetect(v: string | undefined): MeshRole {
  if (v === '0') return 'main-fixed';
  if (v === '5' || v === '2') return 'peer';
  return 'main-auto';
}

export function portalDetectFor(role: MeshRole): string {
  if (role === 'main-fixed') return '0';
  if (role === 'peer') return '5';
  return '1';
}

export function setupSection(mesh: Section[]): Section | undefined {
  return mesh.find((s) => s['.name'] === 'setup' || s['.type'] === 'mesh11sd');
}

export function readForm(mesh: Section[]): MeshForm {
  const s = setupSection(mesh);
  const enc = (str(s, 'mesh_gate_encryption') ?? '4') as GateEncryption;
  const band = (str(s, 'auto_mesh_band') ?? '2g') as MeshBand;
  return {
    enabled: (str(s, 'enabled') ?? '1') !== '0',
    autoConfig: (str(s, 'auto_config') ?? '0') !== '0',
    role: roleFromPortalDetect(str(s, 'portal_detect')),
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
    if (form.gateKey.length > 0 && form.gateKey.length < 8) return 'Gate key must be at least 8 characters.';
  }
  return undefined;
}

export function toChanges(form: MeshForm, mesh: Section[]): Change[] {
  const values: Record<string, string | undefined> = {
    enabled: form.enabled ? '1' : '0',
    auto_config: form.autoConfig ? '1' : '0',
    portal_detect: portalDetectFor(form.role),
    auto_mesh_id: form.autoMeshId.trim(),
    auto_mesh_key: form.autoMeshKey.trim() === '' ? undefined : form.autoMeshKey.trim(),
    auto_mesh_band: form.band,
    mesh_gate_base_ssid: form.gateSsid.replace(/\s+/g, ''),
    mesh_gate_encryption: form.gateEncryption,
    mesh_gate_key:
      form.gateEncryption === '0' || form.gateEncryption === '4'
        ? undefined
        : form.gateKey.trim() === ''
          ? undefined
          : form.gateKey.trim(),
    ssid_suffix_enable: form.ssidSuffix ? '1' : '0',
    mesh_gate_enable: '1',
  };
  return sectionChanges('mesh11sd', mesh, 'setup', values).map((c) =>
    c.op === 'add' ? { ...c, type: 'mesh11sd' } : c,
  );
}

/** First-boot uci-defaults snippet for another OpenWrt 25.x AP. */
export function firstBootScript(form: MeshForm, peerRole: boolean): string {
  const lines = [
    '# MilkFlint4 mesh — paste into Firmware Selector "Script to run on first boot"',
    '# Same auto_mesh_id / gate SSID / key on every node. OpenWrt 25.12+.',
    "uci set mesh11sd.setup.auto_config='1'",
    `uci set mesh11sd.setup.portal_detect='${peerRole ? '5' : '1'}'`,
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
  if (form.gateEncryption !== '0' && form.gateEncryption !== '4' && form.gateKey.trim() !== '') {
    lines.push(`uci set mesh11sd.setup.mesh_gate_key='${escapeUci(form.gateKey.trim())}'`);
  }
  lines.push(
    `uci set mesh11sd.setup.ssid_suffix_enable='${form.ssidSuffix ? '1' : '0'}'`,
    'uci commit mesh11sd',
    '',
  );
  return lines.join('\n');
}

function escapeUci(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, `'\\''`);
}
