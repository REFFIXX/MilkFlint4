// Startup page model: which init scripts are critical to leave running, and
// how the service list is ordered for the table (start priority, then name).

/** Services that cut off the LAN, WAN, DNS, web UI or SSH if stopped. */
export const CRITICAL_SERVICES = ['network', 'firewall', 'dnsmasq', 'odhcpd', 'uhttpd', 'dropbear', 'rpcd'] as const;

export type CriticalService = (typeof CRITICAL_SERVICES)[number];

const criticalSet = new Set<string>(CRITICAL_SERVICES);

/** True when stopping (or restarting) this service needs a confirm dialog. */
export function isCriticalService(name: string): boolean {
  return criticalSet.has(name);
}

export type ServiceAction = 'enable' | 'disable' | 'start' | 'stop' | 'restart' | 'reload';

/** Actions that tear the process down: confirm when the service is critical. */
export function actionNeedsConfirm(action: ServiceAction, name: string): boolean {
  return isCriticalService(name) && (action === 'stop' || action === 'restart' || action === 'disable');
}

export interface StartupService {
  name: string;
  /** Boot start order (from /etc/rc.d/S?? or START= in the script). */
  start: number;
  stop: number | null;
  enabled: boolean;
  running: boolean;
}

/** Sort like LuCI Startup: start priority ascending, then name. */
export function sortServices(services: readonly StartupService[]): StartupService[] {
  return [...services].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}

/** Two-digit start priority as shown in the table. */
export function formatStart(start: number): string {
  return String(Math.max(0, Math.min(99, Math.trunc(start)))).padStart(2, '0');
}
