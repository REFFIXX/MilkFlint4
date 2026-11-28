// Startup: init.d services (enable at boot, start order, running, Start /
// Restart / Reload / Stop) and Local startup (/etc/rc.local), like LuCI
// System → Startup. Stopping a critical service asks for confirmation first.
import { TriangleAlertIcon } from 'lucide-react';
import { type ReactElement, useCallback, useState } from 'react';
import { ApplyStatus } from '@/components/apply-status';
import { CardHeading } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/layout/page-header';
import { Note } from '@/components/note';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { SaveBar } from '@/components/save-bar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import type { ApplyState } from '@/hooks/use-apply';
import { useLoad } from '@/hooks/use-load';
import { tabFrom, tabHref, useSubPath } from '@/lib/router';
import { cn, errorMessage } from '@/lib/utils';
import { getRcLocal, listServices, serviceAction, setRcLocal } from './api';
import {
  actionNeedsConfirm,
  formatStart,
  isCriticalService,
  type ServiceAction,
  sortServices,
  type StartupService,
} from './model';

type Tab = 'services' | 'local';

const TABS: { id: Tab; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'local', label: 'Local startup' },
];

const TITLE = 'Startup';
const DESCRIPTION =
  'Enable services at boot, start or stop them now, and edit the commands that run once every boot finishes (/etc/rc.local).';

const ACTION_LABELS: Record<ServiceAction, string> = {
  enable: 'Enable',
  disable: 'Disable',
  start: 'Start',
  stop: 'Stop',
  restart: 'Restart',
  reload: 'Reload',
};

interface StartupData {
  services: StartupService[];
  rcLocal: string;
}

function criticalStopHint(name: string, action: ServiceAction): string {
  const verb = action === 'disable' ? 'Disabling' : action === 'restart' ? 'Restarting' : 'Stopping';
  if (name === 'network' || name === 'firewall')
    return `${verb} ${name} can cut this page and every device off the network until you recover over a cable or serial.`;
  if (name === 'uhttpd' || name === 'rpcd')
    return `${verb} ${name} can lock you out of this web interface until the service is started again over SSH.`;
  if (name === 'dropbear') return `${verb} dropbear closes SSH until it is started again from the console.`;
  if (name === 'dnsmasq' || name === 'odhcpd')
    return `${verb} ${name} can break name lookups and addresses for devices on your network.`;
  return `${verb} ${name} can make the router hard to reach.`;
}

function ServiceActions({
  service,
  busy,
  onAction,
}: {
  service: StartupService;
  busy: boolean;
  onAction: (name: string, action: ServiceAction) => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(['start', 'restart', 'reload', 'stop'] as const).map((action) => (
        <Button
          key={action}
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            onAction(service.name, action);
          }}
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  );
}

function ServicesTab({
  services,
  busy,
  onAction,
  onToggle,
}: {
  services: readonly StartupService[];
  busy: string | undefined;
  onAction: (name: string, action: ServiceAction) => void;
  onToggle: (name: string, enabled: boolean) => void;
}): ReactElement {
  const rows = sortServices(services);
  return (
    <Card className="pb-0">
      <CardHeading
        title="Init scripts"
        description="Enable or disable for the next boot. Start, restart, reload or stop run now."
      />
      <CardContent className="border-t pt-4">
        <Note tone="warning" icon={<TriangleAlertIcon />} title="Essential services">
          Disabling or stopping network, firewall, DNS (dnsmasq / odhcpd), the web server (uhttpd), SSH (dropbear) or rpcd can
          lock you out of the router.
        </Note>
      </CardContent>
      {rows.length === 0 ? (
        <CardContent className="border-t py-5">
          <p className="text-sm text-muted-foreground">No init scripts with a start priority under 100.</p>
        </CardContent>
      ) : (
        <>
          <div className="hidden border-t lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 pl-5">Order</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="w-24">Running</TableHead>
                  <TableHead className="w-28">At boot</TableHead>
                  <TableHead className="pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const rowBusy = busy === s.name;
                  return (
                    <TableRow key={s.name} className={cn(isCriticalService(s.name) && 'bg-warning-subtle/30')}>
                      <TableCell className="pl-5 font-mono text-xs tabular">{formatStart(s.start)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{s.name}</span>
                        {isCriticalService(s.name) && (
                          <Badge variant="warning" className="ml-2">
                            Critical
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.running ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={s.enabled}
                          disabled={rowBusy}
                          aria-label={`${s.name} at boot`}
                          onCheckedChange={(on) => {
                            onToggle(s.name, on);
                          }}
                        />
                      </TableCell>
                      <TableCell className="pr-5">
                        <ServiceActions service={s} busy={rowBusy} onAction={onAction} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y border-t lg:hidden">
            {rows.map((s) => {
              const rowBusy = busy === s.name;
              return (
                <li
                  key={s.name}
                  className={cn('flex flex-col gap-3 px-5 py-4', isCriticalService(s.name) && 'bg-warning-subtle/30')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <span className="mr-2 font-mono text-xs text-muted-foreground tabular">{formatStart(s.start)}</span>
                        {s.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {s.running ? <Badge variant="success">Running</Badge> : <Badge variant="secondary">Stopped</Badge>}
                        {isCriticalService(s.name) && <Badge variant="warning">Critical</Badge>}
                      </div>
                    </div>
                    <Switch
                      checked={s.enabled}
                      disabled={rowBusy}
                      aria-label={`${s.name} at boot`}
                      onCheckedChange={(on) => {
                        onToggle(s.name, on);
                      }}
                    />
                  </div>
                  <ServiceActions service={s} busy={rowBusy} onAction={onAction} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

function LocalStartupTab({ text, onChange }: { text: string; onChange: (next: string) => void }): ReactElement {
  return (
    <Card>
      <CardHeading title="Local startup" description="Shell commands that run once after every boot finishes, before exit 0." />
      <CardContent className="flex flex-col gap-4">
        <Field
          id="rc-local"
          label="/etc/rc.local"
          labelHidden
          {...explain('Runs as root after all enabled init scripts. Keep exit 0 at the end so the boot is marked complete.', [
            '/etc/rc.local',
          ])}
        >
          <textarea
            id="rc-local"
            spellCheck={false}
            className="min-h-64 w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={text}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            aria-label="Contents of /etc/rc.local"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

async function loadStartup(): Promise<StartupData> {
  const [services, rcLocal] = await Promise.all([listServices(), getRcLocal()]);
  return { services, rcLocal };
}

export function StartupPage(): ReactElement {
  const sub = useSubPath();
  const tab = tabFrom(sub, TABS, 'services');
  const goTo = (id: Tab): void => {
    window.location.hash = tabHref('startup', id, 'services');
  };

  const { data, error, loading, reload } = useLoad(loadStartup);
  const [servicesEdit, setServicesEdit] = useState<StartupService[]>();
  const [rcEdit, setRcEdit] = useState<string>();
  const [savedRc, setSavedRc] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [confirm, setConfirm] = useState<{ name: string; action: ServiceAction }>();
  const [saveState, setSaveState] = useState<ApplyState>({ phase: 'idle' });

  const services = servicesEdit ?? data?.services ?? [];
  const rcBefore = savedRc ?? data?.rcLocal ?? '';
  const rcLocal = rcEdit ?? rcBefore;
  const dirty = rcEdit !== undefined && rcEdit !== rcBefore;

  const refreshServices = useCallback(async (): Promise<void> => {
    const next = await listServices();
    setServicesEdit(next);
  }, []);

  const runAction = useCallback(
    async (name: string, action: ServiceAction): Promise<void> => {
      setConfirm(undefined);
      setActionError(undefined);
      setBusy(name);
      try {
        await serviceAction(name, action);
        await refreshServices();
      } catch (err) {
        setActionError(errorMessage(err));
      }
      setBusy(undefined);
    },
    [refreshServices],
  );

  const requestAction = (name: string, action: ServiceAction): void => {
    if (actionNeedsConfirm(action, name)) setConfirm({ name, action });
    else void runAction(name, action);
  };

  const onToggle = (name: string, enabled: boolean): void => {
    requestAction(name, enabled ? 'enable' : 'disable');
  };

  const saveLocal = async (): Promise<void> => {
    setSaveState({ phase: 'applying' });
    try {
      await setRcLocal(rcLocal);
      setSavedRc(rcLocal);
      setRcEdit(undefined);
      setSaveState({ phase: 'done', nothingChanged: false });
    } catch (err) {
      setSaveState({ phase: 'failed', message: errorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <div className="flex flex-col gap-4">
        <ApplyStatus state={saveState} />
        <Tabs label="Startup" prefix="startup" items={TABS} value={tab} onChange={goTo} />
        {actionError !== undefined && (
          <Alert variant="destructive" role="alert">
            <TriangleAlertIcon />
            <AlertTitle>Service action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}
        {error !== undefined && data === undefined ? (
          <LoadError
            error={error}
            retry={() => {
              reload();
            }}
          />
        ) : loading && data === undefined ? (
          <FormSkeleton />
        ) : (
          <>
            <TabPanel prefix="startup" id="services" value={tab} className="flex flex-col gap-4">
              <ServicesTab services={services} busy={busy} onAction={requestAction} onToggle={onToggle} />
            </TabPanel>
            <TabPanel prefix="startup" id="local" value={tab} className="flex flex-col gap-4">
              <LocalStartupTab
                text={rcLocal}
                onChange={(next) => {
                  setRcEdit(next);
                }}
              />
            </TabPanel>
          </>
        )}
      </div>
      {tab === 'local' && (
        <SaveBar
          visible={dirty}
          busy={saveState.phase === 'applying'}
          invalid={false}
          onSave={() => {
            void saveLocal();
          }}
          onRevert={() => {
            setRcEdit(undefined);
          }}
        />
      )}

      <Dialog
        open={confirm !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirm(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === undefined ? 'Confirm' : `${ACTION_LABELS[confirm.action]} ${confirm.name}?`}</DialogTitle>
            <DialogDescription>{confirm === undefined ? '' : criticalStopHint(confirm.name, confirm.action)}</DialogDescription>
          </DialogHeader>
          <Note tone="destructive" icon={<TriangleAlertIcon />} title="This can lock you out">
            Prefer a cable or serial console ready before you continue.
          </Note>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy !== undefined}
              onClick={() => {
                if (confirm !== undefined) void runAction(confirm.name, confirm.action);
              }}
            >
              {confirm === undefined ? 'Confirm' : ACTION_LABELS[confirm.action]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
