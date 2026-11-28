// The Connections tab: live conntrack summary — protocol counts, top flows,
// searchable table. Polled every 5 s.
import { InfoIcon, SearchIcon, XIcon } from 'lucide-react';
import { type ReactElement, useMemo, useState } from 'react';
import { Note } from '@/components/note';
import { FormSkeleton, LoadError } from '@/components/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePoll } from '@/hooks/use-poll';
import { formatBytes, formatNumber } from '@/lib/format';
import { Answer, AnswerCell, Figure } from '@/components/page-kit';
import { HeadRow } from '../firewall/table-parts';
import { loadLanConnections, type LanConnection } from './api';
import { connectionMatches, type ConnSort, sortConnections } from './model';

const columns = [
  { label: 'Protocol', className: 'pl-5' },
  { label: 'Source' },
  { label: 'Destination' },
  { label: 'State' },
  { label: 'Bytes', className: 'pr-5 text-right' },
] as const;

function endpoint(ip: string, port: number | null): string {
  return port === null ? ip : `${ip}:${String(port)}`;
}

function ProtoBars({ rows }: { rows: readonly { proto: string; count: number }[] }): ReactElement {
  const top = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-col gap-2">
      {rows.slice(0, 6).map((r) => (
        <div key={r.proto} className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 font-mono text-muted-foreground uppercase">{r.proto}</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full bg-chart-2" style={{ width: `${String((r.count / top) * 100)}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right tabular">{formatNumber(r.count)}</span>
        </div>
      ))}
    </div>
  );
}

export function LanConnections(): ReactElement {
  const { data, error, loading, refresh } = usePoll(loadLanConnections, 5000);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ConnSort>('bytes');
  const shown = useMemo(() => {
    if (data === undefined) return [];
    return sortConnections(
      data.connections.filter((c) => connectionMatches(c, query)),
      sort,
    );
  }, [data, query, sort]);

  if (error !== undefined && data === undefined) return <LoadError error={error} retry={refresh} />;
  if (loading && data === undefined) return <FormSkeleton />;
  if (data === undefined) return <FormSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <Answer columns={3} label="Connections now">
        <AnswerCell title="Tracked now" value={<Figure>{formatNumber(data.count)}</Figure>}>
          {data.max === null ? 'Open flows the firewall is tracking.' : `Of ${formatNumber(data.max)} the kernel will hold.`}
        </AnswerCell>
        <AnswerCell title="In this table" value={<Figure>{shown.length}</Figure>}>
          Top flows by bytes{query.trim() === '' ? '' : ', matching the search'}.
        </AnswerCell>
        <AnswerCell title="Busiest host" value={<Figure>{data.hosts[0] === undefined ? '—' : data.hosts[0].ip}</Figure>}>
          {data.hosts[0] === undefined
            ? 'No LAN host stood out yet.'
            : `${formatNumber(data.hosts[0].connections)} flows · ${formatBytes(data.hosts[0].bytes)}`}
        </AnswerCell>
      </Answer>

      <Note tone="info" icon={<InfoIcon />} title="From conntrack">
        Live connections come from the kernel’s conntrack table (the same place Smart Queue and banIP look). The table is a sample
        of the largest flows — not every packet path — so it’s for spotting who is talking where, not for accounting.
      </Note>

      {data.byProto.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-5">
            <h2 className="text-base font-semibold">By protocol</h2>
            <ProtoBars rows={data.byProto} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="text-base font-semibold">
          Top connections <span className="text-sm font-normal text-muted-foreground tabular">· {String(shown.length)}</span>
        </h2>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as ConnSort);
            }}
          >
            <SelectTrigger className="w-40" aria-label="Sort connections">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bytes">Sort by bytes</SelectItem>
              <SelectItem value="packets">Sort by packets</SelectItem>
              <SelectItem value="proto">Sort by protocol</SelectItem>
              <SelectItem value="src">Sort by source</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Search connections"
              placeholder="Search IP, port or protocol"
              value={query}
              className="pl-9"
              onChange={(e) => {
                setQuery(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="items-start gap-3 px-5 py-6 text-sm">
          {query.trim() === '' ? (
            <p className="text-muted-foreground">No connections tracked right now.</p>
          ) : (
            <>
              <p className="text-muted-foreground">No connection matches “{query.trim()}”.</p>
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
          <div className="hidden lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b">
                <HeadRow columns={columns} />
              </thead>
              <tbody>
                {shown.map((c, i) => (
                  <ConnRow key={`${c.proto}-${c.src}-${c.dst}-${String(c.sport)}-${String(c.dport)}-${String(i)}`} c={c} />
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y lg:hidden">
            {shown.map((c, i) => (
              <li
                key={`${c.proto}-${c.src}-${c.dst}-${String(c.sport)}-${String(c.dport)}-${String(i)}`}
                className="flex flex-col gap-1 px-4 py-3 text-sm"
              >
                <span className="font-medium uppercase">{c.proto}</span>
                <span className="font-mono text-xs break-all">
                  {endpoint(c.src, c.sport)} → {endpoint(c.dst, c.dport)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[c.state, c.bytes === null ? undefined : formatBytes(c.bytes)].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ConnRow({ c }: { c: LanConnection }): ReactElement {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2.5 pr-3 pl-5 font-mono text-xs uppercase">{c.proto}</td>
      <td className="px-3 py-2.5 font-mono text-xs break-all">{endpoint(c.src, c.sport)}</td>
      <td className="px-3 py-2.5 font-mono text-xs break-all">{endpoint(c.dst, c.dport)}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{c.state ?? '—'}</td>
      <td className="py-2.5 pr-5 text-right tabular">{c.bytes === null ? '—' : formatBytes(c.bytes)}</td>
    </tr>
  );
}
