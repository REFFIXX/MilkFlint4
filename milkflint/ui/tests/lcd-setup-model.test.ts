// LCD Setup model: parse milkflint.lcd, slide toggles/reorder, toChanges.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Section } from '@/lib/api/uci';
import {
  ALL_SLIDES,
  defaults,
  moveSlide,
  parseLcd,
  SLIDE_LABELS,
  slideOn,
  toChanges,
  toChangesWithAdd,
  withSlide,
} from '@/features/lcd-setup/model';

const section = (over: Record<string, string | string[]> = {}): Section =>
  ({
    '.type': 'lcd',
    '.name': 'lcd',
    enabled: '1',
    mode: 'on',
    idle_minutes: '10',
    slideshow: '1',
    dwell_seconds: '8',
    slides: [...ALL_SLIDES],
    ...over,
  }) as Section;

test('defaults match the uci-defaults sketch', () => {
  assert.equal(defaults.enabled, true);
  assert.equal(defaults.mode, 'on');
  assert.equal(defaults.idleMinutes, 10);
  assert.equal(defaults.slideshow, true);
  assert.equal(defaults.dwellSeconds, 8);
  assert.deepEqual(defaults.slides, [...ALL_SLIDES]);
  assert.equal(SLIDE_LABELS.splash, 'Brand splash');
});

test('parseLcd: missing section → defaults; unknown slides dropped', () => {
  assert.deepEqual(parseLcd(undefined), { ...defaults, slides: [...ALL_SLIDES] });
  const f = parseLcd(section({ mode: 'idle', idle_minutes: '15', slides: ['splash', 'nope', 'wan'] }));
  assert.equal(f.mode, 'idle');
  assert.equal(f.idleMinutes, 15);
  assert.deepEqual(f.slides, ['splash', 'wan']);
});

test('parseLcd: clamps idle and dwell; bad mode → on', () => {
  assert.equal(parseLcd(section({ mode: 'blink' })).mode, 'on');
  assert.equal(parseLcd(section({ idle_minutes: '0' })).idleMinutes, 1);
  assert.equal(parseLcd(section({ idle_minutes: '9999' })).idleMinutes, 1440);
  assert.equal(parseLcd(section({ dwell_seconds: '1' })).dwellSeconds, 2);
  assert.equal(parseLcd(section({ dwell_seconds: '200' })).dwellSeconds, 120);
  assert.equal(parseLcd(section({ enabled: '0' })).enabled, false);
  assert.equal(parseLcd(section({ slideshow: '0' })).slideshow, false);
});

test('slide toggle and reorder keep relative order', () => {
  let f = parseLcd(section({ slides: ['splash', 'wan', 'wifi'] }));
  assert.equal(slideOn(f, 'clients'), false);
  f = withSlide(f, 'clients', true);
  assert.deepEqual(f.slides, ['splash', 'wan', 'wifi', 'clients']);
  f = withSlide(f, 'wan', false);
  assert.deepEqual(f.slides, ['splash', 'wifi', 'clients']);
  f = moveSlide(f, 'clients', -1);
  assert.deepEqual(f.slides, ['splash', 'clients', 'wifi']);
  f = moveSlide(f, 'splash', -1);
  assert.deepEqual(f.slides, ['splash', 'clients', 'wifi']);
});

test('toChanges writes milkflint.lcd options and slides list', () => {
  const f = parseLcd(section({ mode: 'off', slides: ['system', 'splash'] }));
  assert.deepEqual(toChanges(f), [
    {
      op: 'set',
      config: 'milkflint',
      section: 'lcd',
      values: {
        enabled: '1',
        mode: 'off',
        idle_minutes: '10',
        slideshow: '1',
        dwell_seconds: '8',
        slides: ['system', 'splash'],
      },
    },
  ]);
});

test('toChangesWithAdd adds the section when milkflint.lcd is missing', () => {
  const f = { ...defaults, mode: 'idle' as const, slides: ['splash' as const] };
  const add = toChangesWithAdd(f, []);
  assert.equal(add[0]?.op, 'add');
  assert.deepEqual(toChangesWithAdd(f, [section()])[0]?.op, 'set');
});
