// Poll All devices every 5 s, keeping the previous station counters so live
// speeds can be computed the same way Home does.
import { useRef } from 'react';
import { usePoll } from '@/hooks/use-poll';
import { type ClientsCounters, type ClientsData, loadClients } from './api';

export function useClients(): ReturnType<typeof usePoll<ClientsData>> {
  const counters = useRef<ClientsCounters | undefined>(undefined);
  return usePoll(async () => {
    const { data, counters: next } = await loadClients(counters.current);
    counters.current = next;
    return data;
  }, 5000);
}
