// 802.11s mesh via mesh11sd: role, shared identity, live peers, first-boot export.
import { CheckIcon, CopyIcon, DownloadIcon, RouterIcon, WaypointsIcon } from 'lucide-react';
import { type ReactElement, useCallback, useId, useMemo, useState } from 'react';
import { ApplyStatus } from '@/components/apply-status';
import { CardHeading } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/layout/page-header';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { GoLink } from '@/components/page-kit';
import { SaveBar } from '@/components/save-bar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApply } from '@/hooks/use-apply';
import { useLoad } from '@/hooks/use-load';
import { usePoll } from '@/hooks/use-poll';
import { getBoard } from '@/lib/api/system';
import { getConfig } from '@/lib/api/uci';
import { href } from '@/lib/router';
import { cn } from '@/lib/utils';
import { getMeshStatus, reloadMesh } from './api';
import { supports25RoamingMesh } from './compat';
import {
  encryptionLabel,
  firstBootScript,
  type GateEncryption,
  type MeshBand,
  type MeshForm,
  type MeshRole,
  readForm,
  toChanges,
  validateForm,
} from './model';

interface Data {
  form: MeshForm;
  mesh: Awaited<ReturnType<typeof getConfig>>;
  milkflint: Awaited<ReturnType<typeof getConfig>>;
  compatible: boolean;
  versionLabel: string;
}

async function load(): Promise<Data> {
  const [mesh, milkflint, board] = await Promise.all([
    getConfig('mesh11sd').catch(() => []),
    getConfig('milkflint').catch(() => []),
    getBoard().catch(() => undefined),
  ]);
  const dist = board?.release?.distribution ?? 'OpenWrt';
  const ver = board?.release?.version ?? '?';
  return {
    form: readForm(mesh, milkflint),
    mesh,
    milkflint,
    compatible: supports25RoamingMesh(board),
    versionLabel: `${dist} ${ver}`,
  };
}

function copyText(text: string): void {
  if (window.isSecureContext && 'clipboard' in navigator) {
    void navigator.clipboard.writeText(text);
    return;
  }
  const t = document.createElement('textarea');
  t.value = text;
  document.body.append(t);
  t.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- plain-http fallback
  document.execCommand('copy');
  t.remove();
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ROLE_HELP: Record<MeshRole, string> = {
  'main-auto':
    'Recommended for most homes: plug WAN into your modem for Main; leave WAN unplugged on other APs so they become peers.',
  'main-fixed':
    'Always the Main (portal) router, even with no WAN cable. Use when this box must stay Main no matter what.',
  peer:
    'This unit is only an access point. Leave its WAN unplugged so mesh11sd treats it as a Mesh Peer, not a second Main.',
};

export function MeshPage(): ReactElement {
  const id = useId();
  const { data, error, reload, loading } = useLoad(load);
  const [form, setForm] = useState<MeshForm | undefined>();
  const current = form ?? data?.form;
  const { state, apply, reset } = useApply(() => {
    void reloadMesh().finally(() => {
      void reload();
    });
  });
  const status = usePoll(getMeshStatus, 8000, data !== undefined ? 'on' : 'off').data;
  const [copied, setCopied] = useState(false);

  const dirty = useMemo(() => {
    if (data === undefined || current === undefined) return false;
    return JSON.stringify(current) !== JSON.stringify(data.form);
  }, [current, data]);

  const set = useCallback(<K extends keyof MeshForm>(key: K, value: MeshForm[K]) => {
    setForm((prev) => {
      const base = prev ?? data?.form;
      if (base === undefined) return prev;
      return { ...base, [key]: value };
    });
  }, [data?.form]);

  const formError = current === undefined ? undefined : validateForm(current);
  const script = current === undefined ? '' : firstBootScript(current);

  if (error !== undefined && data === undefined) {
    return (
      <>
        <PageHeader title="Mesh" description="802.11s backhaul with mesh11sd." />
        <LoadError error={error} onRetry={() => void reload()} />
      </>
    );
  }
  if (data === undefined || current === undefined) {
    return (
      <>
        <PageHeader title="Mesh" description="802.11s backhaul with mesh11sd." />
        <FormSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Mesh"
        description="Join this Flint 4 to an 802.11s backhaul: pick Main or peer, match identity, then deploy more APs."
      />

      {!data.compatible && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>OpenWrt 25.x required</AlertTitle>
          <AlertDescription>
            mesh11sd rapid deploy targets OpenWrt 25.12+ (or MilkFlint4 on main). This device reports{' '}
            <code className="font-mono">{data.versionLabel}</code>.
          </AlertDescription>
        </Alert>
      )}

      {current.autoConfig && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>mesh11sd owns wireless and network</AlertTitle>
          <AlertDescription>
            With auto-config on, do not hand-edit wireless or network for the mesh. Change role and identity here, then
            reboot if portal detection does not take effect. Pair with{' '}
            <GoLink href={href('wifi-roaming')}>Wi-Fi roaming</GoLink> on the gate SSIDs so phones roam across APs.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 pb-24">
        <Card>
          <CardHeading
            title="Role"
            description="One Main talks to your ISP; the others are access-point peers on the same mesh."
          />
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Recommended path: leave this Flint 4 on <strong className="text-foreground">Main · auto</strong> with the
              modem on WAN, then flash other APs as peers with the script below (WAN unplugged on those).
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { role: 'main-auto' as const, label: 'Main · auto', Icon: RouterIcon },
                  { role: 'main-fixed' as const, label: 'Main · fixed', Icon: RouterIcon },
                  { role: 'peer' as const, label: 'Access point', Icon: WaypointsIcon },
                ] as const
              ).map(({ role, label, Icon }) => {
                const on = current.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => set('role', role)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition-colors',
                      on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <Icon className={cn('size-5', on ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{ROLE_HELP[role]}</span>
                  </button>
                );
              })}
            </div>
            <Field
              id={`${id}-auto`}
              label="Auto-config (mesh11sd)"
              {...explain(
                'When on, mesh11sd builds the wireless and network settings for the mesh for you. Recommended: Off (confidence-test) on brand-new hardware until mesh11sd status looks healthy, then On for day-to-day use.',
                ['mesh11sd.setup.auto_config'],
              )}
              status={
                status?.running ? (
                  <Badge variant="success">Running</Badge>
                ) : current.autoConfig ? (
                  <Badge variant="secondary">Configured</Badge>
                ) : (
                  <Badge variant="secondary">Off</Badge>
                )
              }
            >
              <Switch id={`${id}-auto`} checked={current.autoConfig} onCheckedChange={(v) => set('autoConfig', v)} />
            </Field>
            <Field
              id={`${id}-en`}
              label="mesh11sd daemon"
              {...explain(
                'Master power switch for the mesh11sd service that runs the 802.11s mesh. Recommended: On whenever you want this node in the mesh.',
                ['mesh11sd.setup.enabled'],
              )}
            >
              <Switch id={`${id}-en`} checked={current.enabled} onCheckedChange={(v) => set('enabled', v)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeading
            title="Shared identity"
            description="Every node must agree on these values — copy them onto each AP or use the deploy script."
          />
          <CardContent className="flex flex-col gap-1">
            <Field
              id={`${id}-mid`}
              label="Mesh ID"
              {...explain(
                'A shared name that becomes the 802.11s mesh ID after hashing. Recommended: one memorable lab name (for example MilkFlintLab) used on every node. Different IDs will not form one mesh.',
                ['mesh11sd.setup.auto_mesh_id'],
              )}
            >
              <Input
                id={`${id}-mid`}
                value={current.autoMeshId}
                className="font-mono max-w-md"
                onChange={(e) => set('autoMeshId', e.target.value)}
              />
            </Field>
            <Field
              id={`${id}-mkey`}
              label="Mesh key (optional)"
              {...explain(
                'Optional extra secret mixed into the mesh SAE key. Recommended: leave blank for a simple home mesh, or set the same strong phrase on every node if you want a private backhaul password.',
                ['mesh11sd.setup.auto_mesh_key'],
              )}
            >
              <Input
                id={`${id}-mkey`}
                type="password"
                autoComplete="new-password"
                value={current.autoMeshKey}
                className="font-mono max-w-md"
                onChange={(e) => set('autoMeshKey', e.target.value)}
              />
            </Field>
            <Field
              id={`${id}-band`}
              label="Mesh band"
              {...explain(
                'Which radio carries the AP-to-AP backhaul (not the band phones use for everyday Wi-Fi). Recommended: 5 GHz when the APs are close and you want speed; 2.4 GHz when walls are thick and you need range. Match this on every node.',
                ['mesh11sd.setup.auto_mesh_band'],
              )}
            >
              <Select value={current.band} onValueChange={(v) => set('band', v as MeshBand)}>
                <SelectTrigger id={`${id}-band`} className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2g">2.4 GHz</SelectItem>
                  <SelectItem value="5g">5 GHz</SelectItem>
                  <SelectItem value="6g">6 GHz</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              id={`${id}-ssid`}
              label="Gate SSID base"
              {...explain(
                'The Wi-Fi name guests and phones see on the mesh gate APs. Recommended: your household name (for example MilkFlint). Keep it under 22 characters if the MAC suffix is On; spaces are stripped.',
                ['mesh11sd.setup.mesh_gate_base_ssid'],
              )}
            >
              <Input
                id={`${id}-ssid`}
                value={current.gateSsid}
                maxLength={current.ssidSuffix ? 22 : 30}
                className="max-w-md"
                onChange={(e) => set('gateSsid', e.target.value)}
              />
            </Field>
            <Field
              id={`${id}-suffix`}
              label="SSID MAC suffix"
              {...explain(
                'Appends the last four hex digits of each AP’s mesh MAC to the gate SSID so nodes stay unique while testing. Recommended: On while you bring APs online; Off later if you want one clean SSID everywhere and rely on roaming instead.',
                ['mesh11sd.setup.ssid_suffix_enable'],
              )}
            >
              <Switch id={`${id}-suffix`} checked={current.ssidSuffix} onCheckedChange={(v) => set('ssidSuffix', v)} />
            </Field>
            <Field
              id={`${id}-enc`}
              label="Gate encryption"
              {...explain(
                'How phones authenticate to the gate Wi-Fi. Recommended: OWE (Opportunistic Wireless Encryption) for open-looking but encrypted guest-style gates — mesh11sd’s default. Choose WPA2/WPA3 when you want a normal passworded SSID.',
                ['mesh11sd.setup.mesh_gate_encryption'],
              )}
            >
              <Select
                value={current.gateEncryption}
                onValueChange={(v) => set('gateEncryption', v as GateEncryption)}
              >
                <SelectTrigger id={`${id}-enc`} className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['4', '1', '2', '3', '0'] as const).map((v) => (
                    <SelectItem key={v} value={v}>
                      {encryptionLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {current.gateEncryption !== '0' && current.gateEncryption !== '4' && (
              <Field
                id={`${id}-gkey`}
                label="Gate key"
                {...explain(
                  'The Wi-Fi password phones type for the gate SSID. Recommended: 8+ characters, same on every node that shares this encryption mode.',
                  ['mesh11sd.setup.mesh_gate_key'],
                )}
              >
                <Input
                  id={`${id}-gkey`}
                  type="password"
                  autoComplete="new-password"
                  value={current.gateKey}
                  className="font-mono max-w-md"
                  onChange={(e) => set('gateKey', e.target.value)}
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeading
            title="Topology"
            description="A live map of this node and any mesh peers that have joined."
          />
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              What to expect: this Flint 4 shows as Main or Peer. Healthy peers list a hostname, MAC, signal (dBm — closer
              to 0 is stronger), and a routing metric (lower is better). Empty peers usually means other APs are not
              flashed yet, or Mesh ID / band do not match.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{status?.local?.hostname ?? 'This node'}</Badge>
              <Badge variant={current.role === 'peer' ? 'secondary' : 'success'}>
                {current.role === 'peer' ? 'Peer' : 'Main'}
              </Badge>
              {status?.local?.portalType && (
                <Badge variant="outline" className="font-mono">
                  {status.local.portalType}
                </Badge>
              )}
              {status?.installed === false && <Badge variant="warning">mesh11sd missing</Badge>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(status?.peers ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  No peers yet. Use Deploy other APs below, keep the same Mesh ID and band, power the new AP near this
                  one, then wait a minute for paths to appear.
                </p>
              )}
              {(status?.peers ?? []).map((p) => (
                <div key={p.id ?? p.mac ?? '?'} className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <WaypointsIcon className="size-4 text-muted-foreground" />
                    <span className="font-medium">{p.hostname ?? p.mac ?? p.id ?? 'Peer'}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                    {p.role && <span>{p.role}</span>}
                    {p.mac && <span>{p.mac}</span>}
                    {p.signal != null && <span>{p.signal} dBm</span>}
                    {p.metric != null && <span>metric {p.metric}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeading
            title="Deploy other APs"
            description="Step-by-step: build an OpenWrt 25.12+ image for another AP and drop this first-boot script in."
          />
          <CardContent className="flex flex-col gap-3">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Open{' '}
                <a
                  className="text-primary underline-offset-2 hover:underline"
                  href="https://firmware-selector.openwrt.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  firmware-selector.openwrt.org
                </a>
                , pick the AP model and OpenWrt <strong className="text-foreground">25.12+</strong>.
              </li>
              <li>
                Customize packages: remove basic wpad and add{' '}
                <code className="font-mono text-foreground">-wpad-basic-mbedtls wpad-mbedtls mesh11sd ip-full vxlan</code>
                .
              </li>
              <li>Paste the script below into the first-boot / custom script box, request the build, then flash the AP.</li>
              <li>
                Plug the new AP in with <strong className="text-foreground">WAN unplugged</strong> (peer). Only the Main
                keeps WAN → modem. Match Mesh ID and band with this page.
              </li>
              <li>
                The script starts in <strong className="text-foreground">confidence-test</strong> (
                <code className="font-mono text-foreground">auto_config=0</code>
                ). When <code className="font-mono text-foreground">mesh11sd status</code> looks healthy, set{' '}
                <code className="font-mono text-foreground">auto_config=1</code> (or turn Auto-config On here and save).
              </li>
              <li>
                Then open <GoLink href={href('wifi-roaming')}>Wi-Fi roaming</GoLink> and enable the same Fast Transition
                options on every gate SSID.
              </li>
            </ol>
            <pre className="max-h-56 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-5">
              {script}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  copyText(script);
                  setCopied(true);
                  window.setTimeout(() => {
                    setCopied(false);
                  }, 1500);
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy first-boot script'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  downloadText('milkflint-mesh-firstboot.sh', script);
                }}
              >
                <DownloadIcon /> Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {formError !== undefined && (
        <p className="mb-2 text-sm text-destructive" role="status">
          {formError}
        </p>
      )}

      <SaveBar
        visible={dirty}
        busy={state.phase === 'applying'}
        invalid={loading || formError !== undefined || !data.compatible}
        onSave={() => {
          if (formError !== undefined || !data.compatible) return;
          void apply(toChanges(current, data.mesh, data.milkflint));
          setForm(undefined);
        }}
        onRevert={() => {
          setForm(undefined);
          reset();
        }}
      />
      <ApplyStatus state={state} onDismiss={reset} />
    </>
  );
}
