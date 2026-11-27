import { bool, type Change, type Section, str } from '@/lib/api/uci';

export interface ApIface {
  name: string;
  ssid: string;
  device: string;
  disabled: boolean;
}

export interface RoamingForm {
  /** Apply FT/k/v to every AP interface (non-guest). */
  applyAll: boolean;
  /** Named wifi-iface sections to update when applyAll is false. */
  selected: string[];
  ieee80211r: boolean;
  mobilityDomain: string;
  ftOverDs: boolean;
  ieee80211k: boolean;
  bssTransition: boolean;
  usteer: boolean;
}

export function listApIfaces(wireless: Section[]): ApIface[] {
  return wireless
    .filter((s) => s['.type'] === 'wifi-iface' && (str(s, 'mode') ?? 'ap') === 'ap')
    .filter((s) => !String(s['.name'] ?? '').includes('guest'))
    .map((s) => ({
      name: s['.name'],
      ssid: str(s, 'ssid') ?? s['.name'],
      device: str(s, 'device') ?? '',
      disabled: bool(s, 'disabled'),
    }));
}

export function readForm(wireless: Section[], usteer: Section[]): RoamingForm {
  const aps = listApIfaces(wireless);
  const sample = aps.map((a) => wireless.find((s) => s['.name'] === a.name)).find(Boolean);
  const usteerSec = usteer.find((s) => s['.type'] === 'usteer') ?? usteer[0];
  return {
    applyAll: true,
    selected: aps.map((a) => a.name),
    ieee80211r: bool(sample, 'ieee80211r'),
    mobilityDomain: (str(sample, 'mobility_domain') ?? '4f57').slice(0, 4).toLowerCase(),
    ftOverDs: bool(sample, 'ft_over_ds', true),
    ieee80211k: bool(sample, 'ieee80211k'),
    bssTransition: bool(sample, 'bss_transition'),
    usteer: usteerSec === undefined ? false : !bool(usteerSec, 'disabled', true),
  };
}

export function validateMobilityDomain(v: string): string | undefined {
  if (!/^[0-9a-fA-F]{4}$/.test(v)) return 'Use exactly 4 hex digits (0–9, a–f).';
  return undefined;
}

export function toChanges(form: RoamingForm, wireless: Section[], usteer: Section[]): Change[] {
  const changes: Change[] = [];
  const targets = form.applyAll
    ? listApIfaces(wireless).map((a) => a.name)
    : form.selected.filter((n) => listApIfaces(wireless).some((a) => a.name === n));

  const values: Record<string, string> = {
    ieee80211r: form.ieee80211r ? '1' : '0',
    ieee80211k: form.ieee80211k ? '1' : '0',
    bss_transition: form.bssTransition ? '1' : '0',
  };
  if (form.ieee80211r) {
    values.mobility_domain = form.mobilityDomain.toLowerCase();
    values.ft_over_ds = form.ftOverDs ? '1' : '0';
    // Do not set nasid here: it must be unique per AP (PMK-R0 key holder).
    // When unset, hostapd uses the interface BSSID, which is unique.
  }

  for (const name of targets) {
    const perIface = { ...values };
    changes.push({ op: 'set', config: 'wireless', section: name, values: perIface });
    if (form.ieee80211r) {
      // Drop a shared mobility-domain nasid left by older MilkFlint builds.
      const existing = wireless.find((s) => s['.name'] === name);
      const nasid = str(existing, 'nasid');
      if (nasid !== undefined && nasid.toLowerCase() === form.mobilityDomain.toLowerCase()) {
        changes.push({ op: 'unset', config: 'wireless', section: name, options: ['nasid'] });
      }
    }
  }

  const usteerSec = usteer.find((s) => s['.name'] === 'usteer' || s['.type'] === 'usteer');
  const disabled = form.usteer ? '0' : '1';
  if (usteerSec !== undefined) {
    changes.push({ op: 'set', config: 'usteer', section: usteerSec['.name'], values: { disabled } });
  } else if (form.usteer) {
    changes.push({
      op: 'add',
      config: 'usteer',
      type: 'usteer',
      name: 'usteer',
      values: { disabled: '0' },
    });
  }

  return changes;
}
