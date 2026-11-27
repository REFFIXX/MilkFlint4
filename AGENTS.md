# MilkFlint4 — agent notes

OpenWrt firmware for **GL-BE14000 (Flint 4)** · kernel **6.18** · React shell in `milkflint/ui`.

## Must-know

- Version: `milkflint/diffconfig` → `CONFIG_VERSION_NUMBER`. Tags: `v*`. Firmware CI: tag push or `workflow_dispatch` only (not every `main` push).
- Release notes: `docs/RELEASE-*.md`. GitHub release publishes from the tag workflow after a successful world build.
- UI gate: `cd milkflint/ui && pnpm check` (needs Playwright Chromium).
- Research: Context.dev for OpenWrt/mt76; Context7 for Vitest/React/Vite; Supermemory for durable project memory.

## Useful local plugin

If available: Cursor plugin **`milkflint4`** (`~/.cursor/plugins/local/milkflint4`) — skills `firmware-release`, `ui-check`, `openwrt-research`, command `/milkflint-status`.
