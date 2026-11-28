// Shared Updates card: installed apk version from ubus, release-based copy,
// no Check/Install against a missing MilkFlint4 feed (AGH + banIP pages).
import 'virtual:milkflint-themes.css';
import '@/styles.css';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type * as AghApi from '@/features/adguardhome/api';
import { AdGuardHomePage } from '@/features/adguardhome/page';
import type * as BanipApi from '@/features/banip/api';
import { BanipPage } from '@/features/banip/page';
import type * as Uci from '@/lib/api/uci';

vi.mock('@/lib/api/uci', async (importOriginal) => {
  const real = await importOriginal<typeof Uci>();
  return { ...real, getConfig: () => Promise.resolve([]) };
});

vi.mock('@/features/adguardhome/api', async (importOriginal) => {
  const real = await importOriginal<typeof AghApi>();
  return {
    ...real,
    getAdGuardStatus: () =>
      Promise.resolve({
        installed: true,
        configured: false,
        enabled: false,
        mode: 'router',
        running: false,
        version: '0.107.80-r1',
        router_login: true,
        state: 'off',
        settings: [],
        networks: [],
      } as AghApi.AdGuardStatus),
  };
});

vi.mock('@/features/banip/api', async (importOriginal) => {
  const real = await importOriginal<typeof BanipApi>();
  return {
    ...real,
    getStatus: () =>
      Promise.resolve({
        installed: true,
        enabled: false,
        mode: 'router',
        state: 'off',
        version: '1.9.1-r2',
      } as unknown as BanipApi.BanipStatus),
    getConfig: () =>
      Promise.resolve({
        installed: true,
        mode: 'router',
        enabled: false,
        options: {},
        milkflint: {},
      } as unknown as BanipApi.BanipConfig),
  };
});

afterEach(async () => {
  await cleanup();
});

test('AdGuard Home Updates card shows installed version and no Check against a feed', async () => {
  window.location.hash = '#/adguardhome';
  const screen = await render(
    <TooltipProvider>
      <AdGuardHomePage />
    </TooltipProvider>,
  );
  await expect.element(screen.getByRole('heading', { name: 'Package updates', exact: true })).toBeVisible();
  await expect.element(screen.getByText('v0.107.80')).toBeVisible();
  await expect.element(screen.getByText(/MilkFlint4 release image/)).toBeVisible();
  await expect.element(screen.getByRole('link', { name: /GitHub releases/ })).toBeVisible();
  expect(screen.container.querySelectorAll('button').length).toBeGreaterThan(0);
  for (const b of screen.container.querySelectorAll('button')) {
    expect(b.textContent).not.toMatch(/^\s*Check\s*$/);
  }
});

test('banIP Package updates card shows installed version and points at firmware upgrades', async () => {
  window.location.hash = '#/banip';
  const screen = await render(
    <TooltipProvider>
      <BanipPage />
    </TooltipProvider>,
  );
  await expect.element(screen.getByRole('heading', { name: 'Package updates', exact: true })).toBeVisible();
  await expect.element(screen.getByText('v1.9.1 (build 2)')).toBeVisible();
  await expect.element(screen.getByRole('link', { name: /Upgrade firmware/ })).toBeVisible();
  await expect.element(screen.getByText(/MilkFlint4 release image/)).toBeVisible();
});
