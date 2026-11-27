// Wi-Fi roaming: 802.11r/k/v on AP SSIDs plus usteer for neighbor steering.
import { type ReactElement, useCallback, useId, useMemo, useState } from 'react';
import { ApplyStatus } from '@/components/apply-status';
import { CardHeading } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/layout/page-header';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { SaveBar } from '@/components/save-bar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useApply } from '@/hooks/use-apply';
import { useLoad } from '@/hooks/use-load';
import { usePoll } from '@/hooks/use-poll';
import { getBoard } from '@/lib/api/system';
import { getConfig } from '@/lib/api/uci';
import { href } from '@/lib/router';
import { GoLink } from '@/components/page-kit';
import { getRoamingStatus, reloadRoaming } from './api';
import { supports25RoamingMesh } from './compat';
import {
  listApIfaces,
  type RoamingForm,
  readForm,
  toChanges,
  validateMobilityDomain,
} from './model';

interface Data {
  form: RoamingForm;
  wireless: Awaited<ReturnType<typeof getConfig>>;
  usteer: Awaited<ReturnType<typeof getConfig>>;
  milkflint: Awaited<ReturnType<typeof getConfig>>;
  compatible: boolean;
  versionLabel: string;
}

async function load(): Promise<Data> {
  const [wireless, usteer, milkflint, board] = await Promise.all([
    getConfig('wireless'),
    getConfig('usteer').catch(() => []),
    getConfig('milkflint').catch(() => []),
    getBoard().catch(() => undefined),
  ]);
  const dist = board?.release?.distribution ?? 'OpenWrt';
  const ver = board?.release?.version ?? '?';
  return {
    form: readForm(wireless, usteer, milkflint),
    wireless,
    usteer,
    milkflint,
    compatible: supports25RoamingMesh(board),
    versionLabel: `${dist} ${ver}`,
  };
}

export function WifiRoamingPage(): ReactElement {
  const id = useId();
  const { data, error, reload, loading } = useLoad(load);
  const [form, setForm] = useState<RoamingForm | undefined>();
  const current = form ?? data?.form;
  const { state, apply, reset } = useApply(() => {
    void reloadRoaming().finally(() => {
      void reload();
    });
  });
  const status = usePoll(getRoamingStatus, 8000, data !== undefined ? 'on' : 'off').data;

  const dirty = useMemo(() => {
    if (data === undefined || current === undefined) return false;
    return JSON.stringify(current) !== JSON.stringify(data.form);
  }, [current, data]);

  const set = useCallback(<K extends keyof RoamingForm>(key: K, value: RoamingForm[K]) => {
    setForm((prev) => {
      const base = prev ?? data?.form;
      if (base === undefined) return prev;
      return { ...base, [key]: value };
    });
  }, [data?.form]);

  const domainError = current === undefined ? undefined : validateMobilityDomain(current.mobilityDomain);
  const aps = data === undefined ? [] : listApIfaces(data.wireless);

  if (error !== undefined && data === undefined) {
    return (
      <>
        <PageHeader title="Wi-Fi roaming" description="Fast handoff between this router and your access points." />
        <LoadError error={error} retry={() => void reload()} />
      </>
    );
  }
  if (data === undefined || current === undefined) {
    return (
      <>
        <PageHeader title="Wi-Fi roaming" description="Fast handoff between this router and your access points." />
        <FormSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Wi-Fi roaming"
        description="Seamless handoff between this router and your access points."
      />

      {!data.compatible && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>OpenWrt 25.x required</AlertTitle>
          <AlertDescription>
            Roaming packages target OpenWrt 25.x (or MilkFlint4 on main). This device reports{' '}
            <code className="font-mono">{data.versionLabel}</code>.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 py-4 text-sm text-muted-foreground">
          <p>
            Roaming keeps phones and laptops on the same Wi-Fi name while they walk from one access point to another —
            without a long reconnect. Turn the same switches on here and on every other OpenWrt 25.x AP that shares your
            SSID, and use one shared <strong className="text-foreground">mobility domain</strong>.
          </p>
          <p>
            Recommended starter: Fast Transition, 802.11k, 802.11v, and usteer all On, with mobility domain{' '}
            <code className="font-mono text-foreground">a1b2</code> (or any four hex digits you copy everywhere). Needs
            full <code className="font-mono text-foreground">wpad-mbedtls</code> (shipped in this image). Use{' '}
            <GoLink href={`${href('mesh')}`}>Mesh</GoLink> when you are adding more APs.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 pb-24">
        <Card>
          <CardHeading
            title="Essentials"
            description="The three standards that make handoff smooth: fast re-auth, smarter scanning, and gentle steering."
          />
          <CardContent className="flex flex-col gap-1">
            <Field
              id={`${id}-r`}
              label="Fast Transition (802.11r)"
              {...explain(
                'Lets phones and laptops re-authenticate in a flash when they move between APs, instead of a full login each time. Recommended: turn this On for every AP that shares this SSID, and use the same mobility domain everywhere.',
                ['wireless.@wifi-iface.ieee80211r', 'wireless.@wifi-iface.mobility_domain'],
              )}
              status={current.ieee80211r ? <Badge variant="success">On</Badge> : <Badge variant="secondary">Off</Badge>}
            >
              <Switch
                id={`${id}-r`}
                checked={current.ieee80211r}
                onCheckedChange={(v) => set('ieee80211r', v)}
              />
            </Field>

            <Field
              id={`${id}-md`}
              label="Mobility domain"
              {...explain(
                'A four-hex-digit club ID that ties your APs into one roaming set. Recommended: pick one value (for example a1b2), save it here, then copy the same four digits onto every other AP. Mismatched domains break Fast Transition.',
                ['wireless.@wifi-iface.mobility_domain'],
              )}
              error={domainError}
            >
              <Input
                id={`${id}-md`}
                value={current.mobilityDomain}
                maxLength={4}
                className="font-mono uppercase max-w-[8rem]"
                disabled={!current.ieee80211r}
                onChange={(e) => set('mobilityDomain', e.target.value.toLowerCase())}
                aria-invalid={domainError !== undefined}
              />
            </Field>

            <Field
              id={`${id}-ft`}
              label="FT over distribution system"
              {...explain(
                'Sends the Fast Transition handshake over your wired LAN between APs when that path is available. Recommended: On. Turn Off only if a particular AP fails to finish FT and devices stick to the old AP.',
                ['wireless.@wifi-iface.ft_over_ds'],
              )}
            >
              <Switch
                id={`${id}-ft`}
                checked={current.ftOverDs}
                disabled={!current.ieee80211r}
                onCheckedChange={(v) => set('ftOverDs', v)}
              />
            </Field>

            <Field
              id={`${id}-k`}
              label="Neighbor reports (802.11k)"
              {...explain(
                'Lets each AP tell clients about nearby APs so they scan less and switch sooner. Recommended: On. Needs full wpad and works best with usteer steering below.',
                ['wireless.@wifi-iface.ieee80211k'],
              )}
              status={current.ieee80211k ? <Badge variant="success">On</Badge> : <Badge variant="secondary">Off</Badge>}
            >
              <Switch id={`${id}-k`} checked={current.ieee80211k} onCheckedChange={(v) => set('ieee80211k', v)} />
            </Field>

            <Field
              id={`${id}-v`}
              label="BSS transition (802.11v)"
              {...explain(
                'Lets the network suggest a better AP when signal or load is poor. Recommended: On when you also run usteer. Harmless if a phone ignores the hint.',
                ['wireless.@wifi-iface.bss_transition'],
              )}
              status={current.bssTransition ? <Badge variant="success">On</Badge> : <Badge variant="secondary">Off</Badge>}
            >
              <Switch
                id={`${id}-v`}
                checked={current.bssTransition}
                onCheckedChange={(v) => set('bssTransition', v)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeading
            title="Networks"
            description="Choose which Wi-Fi names on this router get the roaming settings above."
          />
          <CardContent className="flex flex-col gap-1">
            <Field
              id={`${id}-all`}
              label="All AP networks"
              {...explain(
                'Writes the same roaming settings to every non-guest AP interface on this router. Recommended: On for a single household SSID. Turn Off only when you want roaming on some SSIDs and not others.',
                ['wireless.@wifi-iface'],
              )}
            >
              <Switch id={`${id}-all`} checked={current.applyAll} onCheckedChange={(v) => set('applyAll', v)} />
            </Field>
            {!current.applyAll && (
              <div className="flex flex-col gap-2 py-2">
                {aps.length === 0 && <p className="text-sm text-muted-foreground">No AP interfaces found yet.</p>}
                {aps.map((ap) => {
                  const checked = current.selected.includes(ap.name);
                  return (
                    <label key={ap.name} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          set(
                            'selected',
                            on ? [...new Set([...current.selected, ap.name])] : current.selected.filter((n) => n !== ap.name),
                          );
                        }}
                      />
                      <span className="font-medium text-foreground">{ap.ssid || ap.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{ap.name}</span>
                      {ap.disabled && <Badge variant="secondary">Off</Badge>}
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeading
            title="Steering"
            description="Optional helper that nudges clients toward a stronger or less busy AP."
          />
          <CardContent className="flex flex-col gap-1">
            <Field
              id={`${id}-usteer`}
              label="Enable usteer"
              {...explain(
                'Runs OpenWrt’s usteer daemon so this router can steer clients using 802.11k/v neighbor data. Recommended: On for multi-AP homes. Do not also run dawn. Other APs should share the SSID and FT settings, and ideally run usteer too.',
                ['usteer.@usteer.disabled'],
              )}
              status={
                status?.usteerRunning ? (
                  <Badge variant="success">Running</Badge>
                ) : current.usteer ? (
                  <Badge variant="secondary">Configured</Badge>
                ) : (
                  <Badge variant="secondary">Off</Badge>
                )
              }
            >
              <Switch id={`${id}-usteer`} checked={current.usteer} onCheckedChange={(v) => set('usteer', v)} />
            </Field>
            {status?.wpadFull === false && (
              <p className="text-sm text-warning">
                Full wpad was not detected. 802.11k may be missing — this image should ship wpad-mbedtls.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeading
            title="Status"
            description="Live check: which interfaces have Fast Transition, and which neighbor APs usteer can see."
          />
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              After you save, FT ifaces should list your AP networks. Neighbors appear once other APs share the SSID and
              roaming settings — empty is normal on a single router.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">FT ifaces: {(status?.ftIfaces ?? []).length}</Badge>
              <Badge variant="outline">Neighbors: {(status?.neighbors ?? []).length}</Badge>
            </div>
            {(status?.ftIfaces ?? []).length > 0 && (
              <p className="font-mono text-xs text-muted-foreground">{(status?.ftIfaces ?? []).join(', ')}</p>
            )}
            {(status?.neighbors ?? []).slice(0, 8).map((n, i) => (
              <div key={`${n.bssid ?? i}`} className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                <span className="font-medium text-foreground">{n.ssid ?? '—'}</span>
                <span className="font-mono text-xs">{n.bssid ?? ''}</span>
                {n.signal !== undefined && <span>{n.signal} dBm</span>}
              </div>
            ))}
            {(status?.neighbors ?? []).length === 0 && (
              <p className="text-muted-foreground">
                No usteer neighbors yet. Enable the same roaming options on peer APs, or open Mesh → Deploy other APs to
                add them.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <SaveBar
        visible={dirty}
        busy={state.phase === 'applying'}
        invalid={loading || domainError !== undefined || !data.compatible}
        onSave={() => {
          if (domainError !== undefined || !data.compatible) return;
          void apply(toChanges(current, data.wireless, data.usteer, data.milkflint));
          setForm(undefined);
        }}
        onRevert={() => {
          setForm(undefined);
          reset();
        }}
      />
      <ApplyStatus state={state} />
    </>
  );
}
