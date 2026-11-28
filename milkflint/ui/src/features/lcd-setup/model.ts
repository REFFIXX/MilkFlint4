// LCD Setup form: milkflint.lcd as the page edits it — mode, idle, slideshow
// slides — and the UCI changes a save writes. Pure functions for the tests.
import { bool, type Change, list, type Section, str } from '@/lib/api/uci';

export type SlideId = 'splash' | 'wan' | 'wifi' | 'clients' | 'vpn' | 'system';
export type LcdMode = 'on' | 'off' | 'idle';

export const ALL_SLIDES: readonly SlideId[] = ['splash', 'wan', 'wifi', 'clients', 'vpn', 'system'];

export const SLIDE_LABELS: Readonly<Record<SlideId, string>> = {
  splash: 'Brand splash',
  wan: 'WAN',
  wifi: 'Wi-Fi',
  clients: 'Clients',
  vpn: 'VPN',
  system: 'System',
};

export interface LcdForm {
  enabled: boolean;
  mode: LcdMode;
  idleMinutes: number;
  slideshow: boolean;
  dwellSeconds: number;
  /** Enabled slides in display order. */
  slides: SlideId[];
}

export const defaults: LcdForm = {
  enabled: true,
  mode: 'on',
  idleMinutes: 10,
  slideshow: true,
  dwellSeconds: 8,
  slides: [...ALL_SLIDES],
};

function isSlideId(v: string): v is SlideId {
  return (ALL_SLIDES as readonly string[]).includes(v);
}

function parseMode(v: string | undefined): LcdMode {
  if (v === 'off' || v === 'idle' || v === 'on') return v;
  return 'on';
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Parse a milkflint lcd section into the form; missing section → defaults. */
export function parseLcd(section: Section | undefined): LcdForm {
  if (section === undefined) return { ...defaults, slides: [...defaults.slides] };
  const raw = list(section, 'slides').filter(isSlideId);
  const slides = raw.length > 0 ? raw : [...defaults.slides];
  const idle = Number(str(section, 'idle_minutes') ?? defaults.idleMinutes);
  const dwell = Number(str(section, 'dwell_seconds') ?? defaults.dwellSeconds);
  return {
    enabled: bool(section, 'enabled', true),
    mode: parseMode(str(section, 'mode')),
    idleMinutes: clampInt(idle, 1, 1440, defaults.idleMinutes),
    slideshow: bool(section, 'slideshow', true),
    dwellSeconds: clampInt(dwell, 2, 120, defaults.dwellSeconds),
    slides,
  };
}

/** Whether a slide is in the enabled list. */
export function slideOn(f: LcdForm, id: SlideId): boolean {
  return f.slides.includes(id);
}

/** Toggle a slide in/out of the list, keeping relative order of known slides. */
export function withSlide(f: LcdForm, id: SlideId, on: boolean): LcdForm {
  if (on === slideOn(f, id)) return f;
  if (!on) return { ...f, slides: f.slides.filter((s) => s !== id) };
  const next = ALL_SLIDES.filter((s) => s === id || f.slides.includes(s));
  return { ...f, slides: next };
}

/** Move an enabled slide earlier (−1) or later (+1) in the list. */
export function moveSlide(f: LcdForm, id: SlideId, dir: -1 | 1): LcdForm {
  const i = f.slides.indexOf(id);
  if (i < 0) return f;
  const j = i + dir;
  if (j < 0 || j >= f.slides.length) return f;
  const slides = [...f.slides];
  const a = slides[i];
  const b = slides[j];
  if (a === undefined || b === undefined) return f;
  slides[i] = b;
  slides[j] = a;
  return { ...f, slides };
}

/** UCI changes for milkflint.lcd from the form. */
export function toChanges(f: LcdForm): Change[] {
  const slides = f.slides.length > 0 ? f.slides : (['splash'] as SlideId[]);
  return [
    {
      op: 'set',
      config: 'milkflint',
      section: 'lcd',
      values: {
        enabled: f.enabled ? '1' : '0',
        mode: f.mode,
        idle_minutes: String(clampInt(f.idleMinutes, 1, 1440, defaults.idleMinutes)),
        slideshow: f.slideshow ? '1' : '0',
        dwell_seconds: String(clampInt(f.dwellSeconds, 2, 120, defaults.dwellSeconds)),
        slides,
      },
    },
  ];
}

/** Ensure the lcd section exists when saving to a fresh config. */
export function toChangesWithAdd(f: LcdForm, sections: readonly Section[]): Change[] {
  const existing = sections.find((s) => s['.type'] === 'lcd' && s['.name'] === 'lcd');
  const values = toChanges(f)[0];
  if (values?.op !== 'set') return [];
  if (existing !== undefined) return [values];
  return [{ op: 'add', config: 'milkflint', type: 'lcd', name: 'lcd', values: values.values }];
}
