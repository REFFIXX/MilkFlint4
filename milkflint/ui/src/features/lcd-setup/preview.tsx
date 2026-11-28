// Live CSS preview of the front panel (320×240), Monokai milk dark tokens.
import { type ReactElement, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ALL_SLIDES, type LcdForm, type LcdMode, SLIDE_LABELS, type SlideId } from './model';

const PREVIEW_LINES: Readonly<Record<SlideId, readonly [string, string]>> = {
  splash: ['MilkFlint4', 'Front panel'],
  wan: ['Iface wan', 'IP —'],
  wifi: ['SSID —', 'Radios —'],
  clients: ['Leases —', 'Live —'],
  vpn: ['Client —', 'Kill-switch —'],
  system: ['Up —', 'Load —'],
};

function modeLabel(mode: LcdMode): string {
  switch (mode) {
    case 'on':
      return 'On';
    case 'off':
      return 'Off';
    case 'idle':
      return 'Idle';
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function cycleOf(form: LcdForm): readonly SlideId[] {
  return form.slideshow && form.slides.length > 0 ? form.slides : (['splash'] as const);
}

export function LcdPreview({ form, className }: { form: LcdForm; className?: string }): ReactElement {
  const cycle = cycleOf(form);
  const [tick, setTick] = useState(0);
  const slidesKey = form.slides.join(',');
  const dwellMs = Math.max(2, form.dwellSeconds) * 1000;

  useEffect(() => {
    if (!form.enabled || form.mode === 'off' || cycle.length <= 1) return;
    const t = window.setInterval(() => {
      setTick((n) => n + 1);
    }, dwellMs);
    return () => {
      window.clearInterval(t);
    };
  }, [form.enabled, form.mode, dwellMs, cycle.length, slidesKey]);

  const index = tick % cycle.length;
  const slide = cycle[index] ?? 'splash';
  const lines = PREVIEW_LINES[slide];
  const blank = !form.enabled || form.mode === 'off';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className="relative overflow-hidden rounded-md border shadow-sm"
        style={{ width: 320, maxWidth: '100%', aspectRatio: '320 / 240' }}
        aria-label={`Front panel preview: ${blank ? 'blank' : SLIDE_LABELS[slide]}`}
      >
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            background: blank ? '#0a090a' : 'var(--color-card, #1e1b1e)',
            color: 'var(--color-card-foreground, #fcfcfa)',
          }}
        >
          {!blank && (
            <>
              <div className="h-1 shrink-0" style={{ background: 'var(--color-primary, #fc618d)' }} />
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <p className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-primary, #fc618d)' }}>
                  {slide === 'splash' ? 'MilkFlint4' : SLIDE_LABELS[slide]}
                </p>
                <div className="h-px w-full opacity-40" style={{ background: 'var(--color-border, #403c41)' }} />
                <p className="text-sm font-medium">{lines[0]}</p>
                <p className="text-sm opacity-70">{lines[1]}</p>
                <p className="mt-auto text-xs" style={{ color: 'var(--color-info, #78dce8)' }}>
                  MilkFlint4
                </p>
              </div>
              <div className="h-1 shrink-0" style={{ background: 'var(--color-info, #78dce8)' }} />
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {blank
          ? 'Panel blank'
          : `${modeLabel(form.mode)} · ${SLIDE_LABELS[slide]}${form.slideshow ? ` (${String(index + 1)}/${String(cycle.length)})` : ''}`}
      </p>
      {!blank && form.slideshow && (
        <div className="flex flex-wrap gap-1" aria-hidden>
          {ALL_SLIDES.filter((s) => form.slides.includes(s)).map((s, i) => (
            <span
              key={s}
              className={cn('size-1.5 rounded-full', i === index % cycle.length ? 'bg-primary' : 'bg-muted-foreground/40')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
