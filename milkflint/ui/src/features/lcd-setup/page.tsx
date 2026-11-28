// LCD Setup: ON/OFF/Idle, slideshow slides, and a live Monokai milk preview
// of the Flint 4 front panel. Saves milkflint.lcd, then reloads the service.
import { ChevronDownIcon, ChevronUpIcon, TriangleAlertIcon } from 'lucide-react';
import { type ReactElement, useCallback, useState } from 'react';
import { ApplyStatus } from '@/components/apply-status';
import { CardHeading } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/layout/page-header';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { SaveBar } from '@/components/save-bar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { useApply } from '@/hooks/use-apply';
import { useLoad } from '@/hooks/use-load';
import { errorMessage } from '@/lib/utils';
import { loadLcd, reloadLcd } from './api';
import { ALL_SLIDES, type LcdForm, type LcdMode, moveSlide, SLIDE_LABELS, slideOn, toChangesWithAdd, withSlide } from './model';
import { LcdPreview } from './preview';

const MODE_OPTIONS: readonly { value: LcdMode; label: string; title: string }[] = [
  { value: 'on', label: 'On', title: 'Panel stays on and shows the slideshow' },
  { value: 'off', label: 'Off', title: 'Blank the panel' },
  { value: 'idle', label: 'Idle', title: 'Show for a while, then blank' },
];

export function LcdSetupPage(): ReactElement {
  const { data, error, loading, reload } = useLoad(loadLcd);
  const [edit, setEdit] = useState<LcdForm>();
  const [reloadErr, setReloadErr] = useState<string>();
  const form = edit ?? data?.form;

  const onApplied = useCallback(() => {
    setEdit(undefined);
    void (async () => {
      try {
        setReloadErr(undefined);
        await reloadLcd();
      } catch (err) {
        setReloadErr(errorMessage(err));
      } finally {
        reload();
      }
    })();
  }, [reload]);

  const { state, apply } = useApply(onApplied);

  const set = <K extends keyof LcdForm>(key: K, value: LcdForm[K]): void => {
    setEdit((current) => {
      const base = current ?? data?.form;
      return base === undefined ? undefined : { ...base, [key]: value };
    });
  };

  const dirty = edit !== undefined && data !== undefined && JSON.stringify(edit) !== JSON.stringify(data.form);

  return (
    <>
      <PageHeader title="LCD Setup" description="What the Flint 4 front panel shows, and when it sleeps." />
      <div className="flex flex-col gap-4">
        <ApplyStatus state={state} />
        {reloadErr !== undefined && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Panel service did not reload</AlertTitle>
            <AlertDescription>Settings were saved, but: {reloadErr}</AlertDescription>
          </Alert>
        )}
        {error !== undefined && data === undefined ? (
          <LoadError
            error={error}
            retry={() => {
              reload();
            }}
          />
        ) : loading || form === undefined || data === undefined ? (
          <FormSkeleton />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <Card>
                <CardContent className="flex flex-col gap-1 pt-5">
                  <CardHeading title="Panel" />
                  <Field
                    id="lcd-enabled"
                    label="Use the front panel"
                    {...explain('When off, the service blanks the panel and stays quiet until you turn it on again.', [
                      'milkflint.lcd.enabled',
                    ])}
                  >
                    <Switch
                      id="lcd-enabled"
                      checked={form.enabled}
                      onCheckedChange={(on) => {
                        set('enabled', on);
                      }}
                    />
                  </Field>

                  <Field
                    id="lcd-mode"
                    label="Mode"
                    {...explain(
                      'On keeps the panel lit with the slideshow. Off blanks it. Idle shows slides for a while, then blanks until you change mode or reboot.',
                      ['milkflint.lcd.mode'],
                    )}
                  >
                    <Segmented<LcdMode>
                      label="Mode"
                      value={form.mode}
                      options={MODE_OPTIONS}
                      disabled={!form.enabled}
                      onChange={(mode) => {
                        set('mode', mode);
                      }}
                    />
                  </Field>

                  <Field
                    id="lcd-idle"
                    label="Idle minutes"
                    {...explain('In Idle mode, how long the panel stays lit before it blanks. One to 1440 minutes.', [
                      'milkflint.lcd.idle_minutes',
                    ])}
                  >
                    <Input
                      id="lcd-idle"
                      type="number"
                      min={1}
                      max={1440}
                      className="w-28"
                      disabled={!form.enabled || form.mode !== 'idle'}
                      value={form.idleMinutes}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n)) set('idleMinutes', n);
                      }}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-1 pt-5">
                  <CardHeading title="Slideshow" />
                  <Field
                    id="lcd-slideshow"
                    label="Cycle slides"
                    {...explain(
                      'When on, the panel steps through the slides you enable below. When off, it stays on the brand splash.',
                      ['milkflint.lcd.slideshow'],
                    )}
                  >
                    <Switch
                      id="lcd-slideshow"
                      checked={form.slideshow}
                      disabled={!form.enabled}
                      onCheckedChange={(on) => {
                        set('slideshow', on);
                      }}
                    />
                  </Field>

                  <Field
                    id="lcd-dwell"
                    label="Seconds per slide"
                    {...explain('How long each slide stays on screen before the next. Two to 120 seconds.', [
                      'milkflint.lcd.dwell_seconds',
                    ])}
                  >
                    <Input
                      id="lcd-dwell"
                      type="number"
                      min={2}
                      max={120}
                      className="w-28"
                      disabled={!form.enabled || !form.slideshow}
                      value={form.dwellSeconds}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n)) set('dwellSeconds', n);
                      }}
                    />
                  </Field>

                  <Field
                    id="lcd-slides"
                    label="Slides"
                    {...explain(
                      'Pick which status screens appear, and their order. The brand splash is the MilkFlint4 logo; the rest are short status panels.',
                      ['milkflint.lcd.slides'],
                    )}
                  >
                    <ul className="flex w-full max-w-md flex-col gap-1.5" aria-label="Slideshow slides">
                      {ALL_SLIDES.map((id) => {
                        const on = slideOn(form, id);
                        const i = form.slides.indexOf(id);
                        return (
                          <li key={id} className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
                            <Switch
                              id={`lcd-slide-${id}`}
                              checked={on}
                              disabled={!form.enabled || !form.slideshow}
                              aria-label={SLIDE_LABELS[id]}
                              onCheckedChange={(v) => {
                                setEdit(withSlide(form, id, v));
                              }}
                            />
                            <label htmlFor={`lcd-slide-${id}`} className="min-w-0 flex-1 text-sm">
                              {SLIDE_LABELS[id]}
                            </label>
                            <div className="flex shrink-0 gap-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                disabled={!form.enabled || !form.slideshow || !on || i <= 0}
                                aria-label={`Move ${SLIDE_LABELS[id]} earlier`}
                                onClick={() => {
                                  setEdit(moveSlide(form, id, -1));
                                }}
                              >
                                <ChevronUpIcon className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                disabled={!form.enabled || !form.slideshow || !on || i < 0 || i >= form.slides.length - 1}
                                aria-label={`Move ${SLIDE_LABELS[id]} later`}
                                onClick={() => {
                                  setEdit(moveSlide(form, id, 1));
                                }}
                              >
                                <ChevronDownIcon className="size-4" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Field>
                </CardContent>
              </Card>
            </div>

            <Card className="w-full shrink-0 lg:sticky lg:top-4 lg:w-[22rem]">
              <CardContent className="flex flex-col gap-3 pt-5">
                <CardHeading title="Preview" description="Scaled view of the 320×240 panel, in Monokai milk colours." />
                <LcdPreview form={form} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <SaveBar
        visible={dirty}
        busy={state.phase === 'applying'}
        invalid={false}
        onSave={() => {
          if (form === undefined || data === undefined) return;
          void apply(toChangesWithAdd(form, data.sections));
        }}
        onRevert={() => {
          setEdit(undefined);
        }}
      />
    </>
  );
}
