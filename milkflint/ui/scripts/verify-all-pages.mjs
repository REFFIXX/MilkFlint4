#!/usr/bin/env node
/**
 * Crawl every MilkFlint sidebar route against the mock ubus and report failures.
 * Expects Vite on :5288 and mock on :8088.
 */
import { chromium } from 'playwright';

const BASE = process.env.MILKFLINT_UI ?? 'http://127.0.0.1:5288/milkflint/';
const featureIds = [
  'dashboard',
  'internet',
  'dns',
  'mode',
  'wifi',
  'wifi-guest',
  'wifi-roaming',
  'mesh',
  'wifi-scan',
  'radar-scan',
  'clients',
  'device-control',
  'lan',
  'ipv6',
  'remote-access',
  'vpn-client',
  'network-quality',
  'test-bench',
  'data-statistics',
  'sqm',
  'tuning',
  'wifi-driver',
  'firewall',
  'port-forwards',
  'adguardhome',
  'banip',
  'upnp',
  'system-overview',
  'admin-password',
  'https',
  'upgrade',
  'time',
  'schedules',
  'logs',
  'backup-reset',
  'themes',
];

const failHints = [
  "Couldn't load",
  'couldn’t load',
  'Couldn’t load',
  'Expected ',
  'received undefined',
  'ZodError',
  'Something went wrong',
  'Failed to fetch',
  'Access denied',
];

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const password = page.locator('input[type="password"]');
  if (await password.count()) {
    await password.fill('sim');
    await page
      .getByRole('button', { name: /log in|sign in|continue/i })
      .first()
      .click();
    await page.waitForTimeout(800);
  }
}

async function checkPage(page, id) {
  const hash = id === 'dashboard' ? '#/' : `#/${id}`;
  await page.goto(`${BASE}${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const body = (await page.locator('main, [role="main"], body').first().innerText()).slice(0, 4000);
  const hits = failHints.filter((h) => body.includes(h));
  const logoHasFour = await page.evaluate(() => {
    const svg = document.querySelector('aside svg, a[href*="dashboard"] svg, header svg');
    if (!svg) return false;
    return [...svg.querySelectorAll('path')].some((p) => (p.getAttribute('d') || '').includes('40.5 12.5'));
  });
  return { id, ok: hits.length === 0, hits, logoHasFour, snippet: body.replace(/\s+/g, ' ').slice(0, 180) };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

await login(page);
const results = [];
for (const id of featureIds) {
  try {
    results.push(await checkPage(page, id));
  } catch (err) {
    results.push({ id, ok: false, hits: [String(err)], logoHasFour: false, snippet: '' });
  }
}

const failed = results.filter((r) => !r.ok);
const logoOk = results.some((r) => r.logoHasFour);
console.log(
  JSON.stringify(
    {
      logoOk,
      passed: results.length - failed.length,
      failed: failed.length,
      results: failed,
      consoleErrors: consoleErrors.slice(0, 30),
    },
    null,
    2,
  ),
);
await browser.close();
process.exit(failed.length ? 1 : 0);
