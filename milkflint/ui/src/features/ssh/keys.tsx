// SSH keys on Router access: table of Dropbear authorized_keys, paste to
// add, remove with a lockout guard, and a “Make a key” help card.
import { InfoIcon, LoaderCircleIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import { type ReactElement, useCallback, useState } from 'react';
import { ApplyStatus } from '@/components/apply-status';
import { CardHeading } from '@/components/card-heading';
import { explain } from '@/components/explain';
import { Field } from '@/components/field';
import { Note } from '@/components/note';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { inputClass } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ApplyState } from '@/hooks/use-apply';
import { useLoad } from '@/hooks/use-load';
import { cn, errorMessage } from '@/lib/utils';
import { loadSsh, saveAuthorizedKeys } from './api';
import {
  canRemoveKey,
  fingerprintOf,
  keyBits,
  looksLikePrivateKey,
  parsePublicKeyLine,
  type SshKey,
} from './model';

async function keyFromPaste(raw: string): Promise<{ key?: SshKey; error?: string }> {
  if (looksLikePrivateKey(raw))
    return { error: 'That looks like a private key. Paste the matching .pub line (it starts with ssh-ed25519 or ssh-rsa).' };
  const parsed = parsePublicKeyLine(raw);
  if (parsed === undefined) return { error: 'Paste one OpenSSH public key line, starting with ssh-ed25519 or ssh-rsa.' };
  const fingerprint = (await fingerprintOf(parsed.blob)) ?? '';
  return {
    key: {
      id: `new-${String(Date.now())}`,
      line: parsed.line,
      type: parsed.type,
      bits: keyBits(parsed.type, parsed.blob),
      fingerprint,
      comment: parsed.comment,
    },
  };
}

function MakeAKeyCard(): ReactElement {
  return (
    <Card>
      <CardHeading title="Make a key" description="A public key on the router lets your computer sign in without the password." />
      <CardContent className="flex flex-col gap-3 text-sm text-foreground">
        <Field
          id="ssh-tip-mac"
          label="Mac or Linux"
          {...explain(
            'In Terminal: ssh-keygen -t ed25519 -C "you@home". Press Enter for the defaults. Then open ~/.ssh/id_ed25519.pub and paste that one line here.',
            [],
            <p>Keep id_ed25519 private. Only the .pub file goes on the router.</p>,
          )}
        >
          <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
            ssh-keygen -t ed25519 -C &quot;you@home&quot;
          </code>
        </Field>
        <Field
          id="ssh-tip-win"
          label="Windows"
          {...explain(
            'In PowerShell or Windows Terminal, the same ssh-keygen command works. The public key is usually in %USERPROFILE%\\.ssh\\id_ed25519.pub. PuTTYgen users: export the OpenSSH public key line, not the .ppk private file.',
            [],
          )}
        >
          <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
            type %USERPROFILE%\.ssh\id_ed25519.pub
          </code>
        </Field>
        <Note tone="info" icon={<InfoIcon />}>
          After you add a key, try a new SSH session. When that works, you can turn off password authentication on the SSH tab.
        </Note>
      </CardContent>
    </Card>
  );
}

export function SshKeysPanel(): ReactElement {
  const { data, error, loading, reload } = useLoad(loadSsh);
  const [keys, setKeys] = useState<SshKey[]>();
  const [paste, setPaste] = useState('');
  const [pasteErr, setPasteErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ApplyState>({ phase: 'idle' });

  const shown = keys ?? data?.keys ?? [];
  const passwordAuth = data?.form.passwordAuth ?? true;

  const persist = useCallback(
    async (next: SshKey[]): Promise<void> => {
      if (data === undefined) return;
      setBusy(true);
      setState({ phase: 'applying' });
      try {
        await saveAuthorizedKeys(next, data.keysText);
        setKeys(undefined);
        setState({
          phase: 'done',
          nothingChanged: false,
          note: 'New sessions use these keys. Open ones keep whatever they already used.',
        });
        reload();
      } catch (err) {
        setState({ phase: 'failed', message: errorMessage(err) });
      } finally {
        setBusy(false);
      }
    },
    [data, reload],
  );

  const add = async (): Promise<void> => {
    setPasteErr(undefined);
    const { key, error: err } = await keyFromPaste(paste);
    if (err !== undefined || key === undefined) {
      setPasteErr(err ?? 'Could not read that key.');
      return;
    }
    if (shown.some((k) => k.line === key.line || (k.fingerprint !== '' && k.fingerprint === key.fingerprint))) {
      setPasteErr('That key is already on the list.');
      return;
    }
    const next = [...shown, key];
    setKeys(next);
    setPaste('');
    await persist(next);
  };

  const remove = async (id: string): Promise<void> => {
    if (!canRemoveKey(shown.length, passwordAuth)) {
      setState({
        phase: 'failed',
        message: 'Turn password authentication back on before removing the last SSH key, or you could lock yourself out.',
      });
      return;
    }
    const next = shown.filter((k) => k.id !== id);
    setKeys(next);
    await persist(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <ApplyStatus state={state} />
      {error !== undefined && data === undefined ? (
        <LoadError
          error={error}
          retry={() => {
            reload();
          }}
        />
      ) : loading || data === undefined ? (
        <FormSkeleton />
      ) : (
        <>
          {!passwordAuth && shown.length === 0 && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>No keys, and password logins are off</AlertTitle>
              <AlertDescription>
                Add a public key before you lose this session, or turn password authentication back on under SSH.
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeading
              title="SSH keys"
              description="Public keys in /etc/dropbear/authorized_keys. Dropbear accepts these for root."
            />
            <CardContent className="px-0">
              {shown.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No keys yet. Paste a public key below.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Fingerprint</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Remove</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-mono text-xs">{k.type}</TableCell>
                        <TableCell className="tabular text-muted-foreground">
                          {k.bits === undefined ? '—' : String(k.bits)}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate font-mono text-xs" title={k.fingerprint}>
                          {k.fingerprint === '' ? '—' : k.fingerprint}
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate text-muted-foreground" title={k.comment}>
                          {k.comment === '' ? '—' : k.comment}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={busy || !canRemoveKey(shown.length, passwordAuth)}
                            aria-label={`Remove ${k.comment === '' ? k.type : k.comment}`}
                            onClick={() => {
                              void remove(k.id);
                            }}
                          >
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <form
              className="flex flex-col gap-3 border-t"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy && paste.trim() !== '') void add();
              }}
            >
              <CardContent className="pt-4">
                <Field
                  id="ssh-paste"
                  label="Add a public key"
                  error={pasteErr}
                  hint="One line from a .pub file. Private keys are rejected."
                >
                  <textarea
                    id="ssh-paste"
                    rows={3}
                    spellCheck={false}
                    className={cn(inputClass, 'h-auto py-2 font-mono text-xs')}
                    placeholder="ssh-ed25519 AAAA… comment"
                    value={paste}
                    aria-invalid={pasteErr !== undefined}
                    onChange={(e) => {
                      setPaste(e.target.value);
                      setPasteErr(undefined);
                      setState({ phase: 'idle' });
                    }}
                  />
                </Field>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" disabled={busy || paste.trim() === ''}>
                  {busy && <LoaderCircleIcon className="animate-spin" />}
                  <PlusIcon />
                  Add key
                </Button>
              </CardFooter>
            </form>
          </Card>
          <MakeAKeyCard />
        </>
      )}
    </div>
  );
}
