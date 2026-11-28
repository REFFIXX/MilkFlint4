# MilkFlint4 — agent notes

OpenWrt firmware for **GL-BE14000 (Flint 4)** · kernel **6.18** · React shell in `milkflint/ui`.

## Must-know

- Version: `milkflint/diffconfig` → `CONFIG_VERSION_NUMBER`. Tags: `v*`. Firmware CI: tag push or `workflow_dispatch` only (not every `main` push).
- Release notes: `docs/RELEASE-*.md`. GitHub release publishes from the tag workflow after a successful world build.
- UI gate: `cd milkflint/ui && pnpm check` (needs Node ^24.11, pnpm, Playwright Chromium).
- Cloud agents: prefer `PATH=/usr/local/bin:$PATH` so Node **24.11** wins over `/exec-daemon` Node 22.
- Research: Context.dev for OpenWrt/mt76; Context7 for Vitest/React/Vite; Supermemory for durable project memory.

## milkflint4 Cursor plugin

Canonical copy lives in-repo:

```text
.cursor/plugins/milkflint4/
```

Sync to your Cursor local plugins (desktop or cloud):

```bash
./scripts/sync-milkflint4-plugin.sh
```

Skills: `firmware-release`, `ui-check`, `openwrt-research`. Command: `/milkflint-status`.

## Learned User Preferences

- Always ship **Monokai milk** as the look everywhere (React shell, LuCI Footstrap, LCD branding); do not drift to other default themes.
- UX quality bar: polish, motion, and smooth interactions — “we make it smooth, we make it AMAZE AMAZE.”
- Hardware UX pages (especially LCD) must include **help tips** so controls are self-explanatory.
- Prefer product plans that pull sensible features from OddBlueDog `milkflint-0.91a` rather than inventing parallel UX.
- Keep firmware upgrades **config-safe**: preserve existing settings across version flashes; treat UCI/config migration carefully (latest flash already worked with keep-config / no error).

## Learned Workspace Facts

- Front-panel LCD work belongs under a new UI menu **LCD Setup** (`milkflint/ui` feature + sidebar entry), not buried only in System/Upgrade docs.
- LCD product direction: custom device status with **slideshow**, plus **ON / OFF / Idle** scheduling — extend beyond the current always-on splash from v1.0.1.
- Upstream userspace reference trail: OddBlueDog MilkFlint (recent target `milkflint-0.91a`); MilkFlint4 stays on OpenWrt main / kernel 6.18 / GL-BE14000.
- Theme source of truth: `milkflint/ui/src/theme/themes/monokai-milk.ts` and `DEFAULT_THEME_ID` in `themes/index.ts`.
