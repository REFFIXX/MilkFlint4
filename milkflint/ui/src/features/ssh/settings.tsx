// SSH (Dropbear) settings on Router access: enable, port, interface,
// password auth, root password login, gateway ports. Saves only changed
// UCI options, then restarts dropbear.
import { type ReactElement, useCallback, useState } from 'react';
import { ApplyStatus } from '@/components/apply-status';
import { CardHeading } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { SaveBar } from '@/components/save-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApply } from '@/hooks/use-apply';
import { useLoad } from '@/hooks/use-load';
import { errorMessage } from '@/lib/utils';
import { loadSsh, restartDropbear } from './api';
import { interfaceChoices, type SshForm, toChanges, validateSsh } from './model';

const ANY = '__any__';

export function SshSettingsPanel(): ReactElement {
  const { data, error, loading, reload } = useLoad(loadSsh);
  const [edit, setEdit] = useState<SshForm>();
  const [restartErr, setRestartErr] = useState<string>();
  const form = edit ?? data?.form;

  const onApplied = useCallback(() => {
    setEdit(undefined);
    void (async () => {
      try {
        setRestartErr(undefined);
        await restartDropbear();
      } catch (err) {
        setRestartErr(errorMessage(err));
      } finally {
        reload();
      }
    })();
  }, [reload]);

  const { state, apply, reset } = useApply(onApplied);

  const set = <K extends keyof SshForm>(key: K, value: SshForm[K]): void => {
    if (data === undefined) return;
    setEdit({ ...(edit ?? data.form), [key]: value });
    reset();
  };

  const dirty = edit !== undefined && data !== undefined && JSON.stringify(edit) !== JSON.stringify(data.form);
  const keyCount = data?.keys.length ?? 0;
  const savedPort = data === undefined ? undefined : Number(data.form.port);
  const errors =
    form === undefined || data === undefined
      ? {}
      : validateSsh(
          form,
          keyCount,
          data.tcpPorts.filter((p) => p !== savedPort),
          savedPort,
        );
  const invalid = Object.keys(errors).length > 0;
  const ifaces = interfaceChoices(data?.interfaces ?? []);

  return (
    <div className="flex flex-col gap-4">
      <ApplyStatus state={state} />
      {restartErr !== undefined && (
        <ApplyStatus state={{ phase: 'failed', message: `Settings were saved, but Dropbear did not restart: ${restartErr}` }} />
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
        <Card>
          <CardHeading
            title="SSH"
            description="Dropbear, the router’s SSH server: how you reach a shell as root."
            action={
              <Switch
                checked={form.enabled}
                onCheckedChange={(on) => {
                  set('enabled', on);
                }}
                aria-label="SSH on"
              />
            }
          />
          <CardContent className="divide-y border-t">
            <Field
              id="ssh-port"
              label="Port"
              error={errors.port}
              {...explain('TCP port Dropbear listens on. Change it only if you know why; keep 22 for the usual tools.', [
                'dropbear.@dropbear[0].Port',
              ])}
            >
              <Input
                id="ssh-port"
                inputMode="numeric"
                className="max-w-28 font-mono"
                value={form.port}
                disabled={!form.enabled}
                aria-invalid={errors.port !== undefined}
                onChange={(e) => {
                  set('port', e.target.value);
                }}
              />
            </Field>
            <Field
              id="ssh-iface"
              label="Interface"
              {...explain(
                'Limit SSH to addresses on one network interface, or Any for every address. lan is typical for home use.',
                ['dropbear.@dropbear[0].Interface'],
              )}
            >
              <Select
                value={form.iface === '' ? ANY : form.iface}
                disabled={!form.enabled}
                onValueChange={(v) => {
                  set('iface', v === ANY ? '' : v);
                }}
              >
                <SelectTrigger id="ssh-iface" className="max-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ifaces.map((o) => (
                    <SelectItem key={o.value === '' ? ANY : o.value} value={o.value === '' ? ANY : o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                  {form.iface !== '' && !ifaces.some((o) => o.value === form.iface) && (
                    <SelectItem value={form.iface}>{form.iface}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="ssh-password"
              label="Password authentication"
              error={errors.passwordAuth}
              {...explain(
                'Allow signing in with the root password. Turn this off only after you have an SSH key, or you can lock yourself out.',
                ['dropbear.@dropbear[0].PasswordAuth'],
              )}
            >
              <Switch
                id="ssh-password"
                checked={form.passwordAuth}
                disabled={!form.enabled}
                onCheckedChange={(on) => {
                  set('passwordAuth', on);
                }}
              />
            </Field>
            <Field
              id="ssh-root-password"
              label="Root password login"
              {...explain('Allow the root account to authenticate with a password when password authentication is on.', [
                'dropbear.@dropbear[0].RootPasswordAuth',
              ])}
            >
              <Switch
                id="ssh-root-password"
                checked={form.rootPasswordAuth}
                disabled={!form.enabled || !form.passwordAuth}
                onCheckedChange={(on) => {
                  set('rootPasswordAuth', on);
                }}
              />
            </Field>
            <Field
              id="ssh-gateway"
              label="Gateway ports"
              {...explain(
                'Allow remote hosts to connect to ports forwarded through an SSH session. Off by default; leave it off unless a tool needs it.',
                ['dropbear.@dropbear[0].GatewayPorts'],
              )}
            >
              <Switch
                id="ssh-gateway"
                checked={form.gatewayPorts}
                disabled={!form.enabled}
                onCheckedChange={(on) => {
                  set('gatewayPorts', on);
                }}
              />
            </Field>
          </CardContent>
        </Card>
      )}
      <SaveBar
        visible={dirty}
        busy={state.phase === 'applying'}
        invalid={invalid}
        onSave={() => {
          if (form === undefined || data === undefined || invalid) return;
          void apply(toChanges(form, data.section), {
            note: 'Dropbear restarts with the new settings. Open SSH sessions may drop.',
          });
        }}
        onRevert={() => {
          setEdit(undefined);
          reset();
        }}
      />
    </div>
  );
}
