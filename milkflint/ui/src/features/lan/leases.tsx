// The Addresses tab: IPv4 DHCP leases and IPv6 leases / SLAAC-seen addresses.
import { InfoIcon, SearchIcon, XIcon } from 'lucide-react';
import { type ReactElement, useMemo, useState } from 'react';
import { Note } from '@/components/note';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePoll } from '@/hooks/use-poll';
import { formatDuration } from '@/lib/format';
import { href } from '@/lib/router';
import { Answer, AnswerCell, Figure, GoLink } from '@/components/page-kit';
import { HeadRow } from '../firewall/table-parts';
import { loadLanLeases, type LanLease } from './api';
import { leaseMatches } from './model';

const columns = [
  { label: 'Device', className: 'pl-5' },
  { label: 'Address' },
  { label: 'Family' },
  { label: 'Lease left', className: 'pr-5 text-right' },
] as const;

function LeaseAnswer({ leases }: { leases: readonly LanLease[] }): ReactElement {
  const v4 = leases.filter((l) => l.family === 'ipv4').length;
  const v6 = leases.filter((l) => l.family === 'ipv6').length;
  return (
    <Answer columns={3} label="Addresses now">
      <AnswerCell title="IPv4 leases" value={<Figure>{v4}</Figure>}>
        From the DHCP pool, with the hostnames devices sent.
      </AnswerCell>
      <AnswerCell title="IPv6" value={<Figure>{v6}</Figure>}>
        DHCPv6 leases and SLAAC addresses the router has seen.
      </AnswerCell>
      <AnswerCell
        title="All devices"
        value={<Figure>{new Set(leases.map((l) => l.mac).filter((m): m is string => m !== undefined)).size}</Figure>}
        action={<GoLink href={href('clients')}>Rename or reserve</GoLink>}
      >
        Distinct MACs in the lease tables.
      </AnswerCell>
    </Answer>
  );
}

export function LanLeases(): ReactElement {
  const { data, error, loading, refresh } = usePoll(loadLanLeases, 10_000);
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () =>
      (data ?? []).filter((l) =>
        leaseMatches({ address: l.address, mac: l.mac, name: l.name, duid: l.duid }, query),
      ),
    [data, query],
  );

  if (error !== undefined && data === undefined) return <LoadError error={error} retry={refresh} />;
  if (loading && data === undefined) return <FormSkeleton />;
  if (data === undefined) return <FormSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <LeaseAnswer leases={data} />
      <Note tone="info" icon={<InfoIcon />} title="IPv4 and IPv6">
        Devices that only use SLAAC may show an IPv6 address here without an IPv4 lease. Names come from the lease or the
        router’s host hints. For renaming and reservations, use{' '}
        <a href={href('clients')} className="font-medium link">
          All devices
        </a>
        .
      </Note>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="text-base font-semibold">
          Leases{' '}
          <span className="text-sm font-normal text-muted-foreground tabular">
            {query.trim() === '' ? `· ${String(data.length)}` : `· ${String(shown.length)} of ${String(data.length)}`}
          </span>
        </h2>
        <div className="relative w-full sm:w-72">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search leases"
            placeholder="Search name, IP or MAC"
            value={query}
            className="pl-9"
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
      </div>
      {shown.length === 0 ? (
        <Card className="items-start gap-3 px-5 py-6 text-sm">
          {query.trim() === '' ? (
            <p className="text-muted-foreground">No leases yet. They appear when a device asks for an address.</p>
          ) : (
            <>
              <p className="text-muted-foreground">No lease matches “{query.trim()}”.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('');
                }}
              >
                <XIcon /> Clear the search
              </Button>
            </>
          )}
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b">
                <HeadRow columns={columns} />
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={`${l.family}-${l.address}-${l.mac ?? l.duid ?? ''}`} className="border-b last:border-b-0">
                    <td className="max-w-0 py-2.5 pr-3 pl-5">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className={l.name === undefined ? 'truncate text-muted-foreground' : 'truncate font-medium'}>
                          {l.name ?? 'Unnamed device'}
                        </span>
                        <span className="font-mono text-xs break-all text-muted-foreground">{l.mac ?? l.duid ?? '—'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs break-all">{l.address}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{l.family === 'ipv4' ? 'IPv4' : 'IPv6'}</td>
                    <td className="py-2.5 pr-5 text-right text-muted-foreground tabular">
                      {l.expires === undefined || l.expires <= 0 ? '—' : formatDuration(l.expires)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y md:hidden">
            {shown.map((l) => (
              <li key={`${l.family}-${l.address}-${l.mac ?? l.duid ?? ''}`} className="flex flex-col gap-1 px-4 py-3 text-sm">
                <span className={l.name === undefined ? 'text-muted-foreground' : 'font-medium'}>{l.name ?? 'Unnamed device'}</span>
                <span className="font-mono text-xs break-all">{l.address}</span>
                <span className="text-xs text-muted-foreground">
                  {l.family === 'ipv4' ? 'IPv4' : 'IPv6'}
                  {l.expires !== undefined && l.expires > 0 ? ` · ${formatDuration(l.expires)} left` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
