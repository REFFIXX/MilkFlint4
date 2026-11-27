# MilkFlint4 — agent notes

OpenWrt firmware for **GL-BE14000 (Flint 4)** · kernel **6.18** · React shell in `milkflint/ui`.

## Must-know

- Version: `milkflint/diffconfig` → `CONFIG_VERSION_NUMBER`. Tags: `v*`. Firmware CI: tag push or `workflow_dispatch` only (not every `main` push).
- Release notes: `docs/RELEASE-*.md`. GitHub release publishes from the tag workflow after a successful world build.
- UI gate: `cd milkflint/ui && pnpm check` (needs Node ^24.11, pnpm, Playwright Chromium).
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
