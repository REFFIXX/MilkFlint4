// Startup model: critical-service detection and service-list sorting.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actionNeedsConfirm,
  CRITICAL_SERVICES,
  formatStart,
  isCriticalService,
  sortServices,
  type StartupService,
} from '@/features/startup/model';

const svc = (over: Partial<StartupService> & Pick<StartupService, 'name' | 'start'>): StartupService => ({
  enabled: true,
  running: false,
  stop: null,
  ...over,
});

test('CRITICAL_SERVICES covers network path, DNS, web UI and SSH', () => {
  assert.deepEqual([...CRITICAL_SERVICES].sort(), ['dnsmasq', 'dropbear', 'firewall', 'network', 'odhcpd', 'rpcd', 'uhttpd']);
});

test('isCriticalService: only the listed names', () => {
  for (const name of CRITICAL_SERVICES) assert.equal(isCriticalService(name), true);
  assert.equal(isCriticalService('cron'), false);
  assert.equal(isCriticalService('networkd'), false);
  assert.equal(isCriticalService(''), false);
});

test('actionNeedsConfirm: stop, restart and disable of critical services', () => {
  assert.equal(actionNeedsConfirm('stop', 'network'), true);
  assert.equal(actionNeedsConfirm('restart', 'uhttpd'), true);
  assert.equal(actionNeedsConfirm('disable', 'dropbear'), true);
  assert.equal(actionNeedsConfirm('start', 'network'), false);
  assert.equal(actionNeedsConfirm('reload', 'firewall'), false);
  assert.equal(actionNeedsConfirm('enable', 'rpcd'), false);
  assert.equal(actionNeedsConfirm('stop', 'cron'), false);
  assert.equal(actionNeedsConfirm('disable', 'sqm'), false);
});

test('sortServices: by start priority, then name', () => {
  const sorted = sortServices([
    svc({ name: 'uhttpd', start: 50 }),
    svc({ name: 'network', start: 20 }),
    svc({ name: 'dropbear', start: 50 }),
    svc({ name: 'firewall', start: 19 }),
  ]);
  assert.deepEqual(
    sorted.map((s) => s.name),
    ['firewall', 'network', 'dropbear', 'uhttpd'],
  );
});

test('sortServices: does not mutate the input', () => {
  const input = [svc({ name: 'b', start: 2 }), svc({ name: 'a', start: 1 })];
  const copy = [...input];
  sortServices(input);
  assert.deepEqual(input, copy);
});

test('formatStart: two digits, clamped 0–99', () => {
  assert.equal(formatStart(5), '05');
  assert.equal(formatStart(20), '20');
  assert.equal(formatStart(-1), '00');
  assert.equal(formatStart(100), '99');
  assert.equal(formatStart(12.7), '12');
});
