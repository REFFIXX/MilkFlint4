import { bool, type Change, list, type Section, str } from '@/lib/api/uci';

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

function roamingMeta(milkflint: Section[]): Section | undefined {
  return milkflint.find((s) => s['.name'] === 'roaming' || s['.type'] === 'roaming');
}

export function readForm(wireless: Section[], usteer: Section[], milkflint: Section[] = []): RoamingForm {
  const aps = listApIfaces(wireless);
  const sample = aps.map((a) => wireless.find((s) => s['.name'] === a.name)).find(Boolean);
  const usteerSec = usteer.find((s) => s['.type'] === 'usteer') ?? usteer[0];
  const meta = roamingMeta(milkflint);
  const applyAll = meta === undefined ? true : bool(meta, 'apply_all', true);
  // When apply_all is off, keep an intentionally empty iface list empty —
  // do not fall back to every AP (that would re-apply roaming on next save).
  const saved = list(meta, 'iface').filter((n) => aps.some((a) => a.name === n));
  const allNames = aps.map((a) => a.name);
  return {
    applyAll,
    selected: applyAll ? allNames : saved,
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

/** Block a save that would write roaming nowhere while “All AP networks” is off. */
export function validateSelection(form: RoamingForm): string | undefined {
  if (!form.applyAll && form.selected.length === 0) {
    return 'Select at least one network, or turn on All AP networks.';
  }
  return undefined;
}

export function toChanges(
  form: RoamingForm,
  wireless: Section[],
  usteer: Section[],
  milkflint: Section[] = [],
): Change[] {
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
    values['mobility_domain'] = form.mobilityDomain.toLowerCase();
    values['ft_over_ds'] = form.ftOverDs ? '1' : '0';
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

  // Persist which SSIDs get roaming so "All AP networks" survives reload.
  const meta = roamingMeta(milkflint);
  const metaValues: Record<string, string | string[]> = {
    apply_all: form.applyAll ? '1' : '0',
  };
  if (!form.applyAll) metaValues['iface'] = targets;
  if (meta === undefined) {
    changes.push({ op: 'add', config: 'milkflint', type: 'roaming', name: 'roaming', values: metaValues });
  } else {
    changes.push({ op: 'set', config: 'milkflint', section: meta['.name'], values: metaValues });
    if (form.applyAll && list(meta, 'iface').length > 0) {
      changes.push({ op: 'unset', config: 'milkflint', section: meta['.name'], options: ['iface'] });
    }
  }

  return changes;
}
