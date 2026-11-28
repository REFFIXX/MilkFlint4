# MilkFlint4 — agent notes

OpenWrt firmware for **GL-BE14000 (Flint 4)** · kernel **6.18** · React shell in `milkflint/ui`.

## Must-know

- Version: `milkflint/diffconfig` → `CONFIG_VERSION_NUMBER`. Tags: `v*`. Firmware CI: tag push or `workflow_dispatch` only (not every `main` push).
- Release notes: `docs/RELEASE-*.md`. GitHub release publishes from the tag workflow after a successful world build.
- UI gate: `cd milkflint/ui && pnpm check` (needs Node ^24.11, pnpm, Playwright Chromium).
- Cloud agents: prefer `PATH=/usr/local/bin:$PATH` so Node **24.11** wins over `/exec-daemon` Node 22.
- Research: Context.dev for OpenWrt/mt76; Context7 for Vitest/React/Vite; Supermemory for durable project memory.
- **MilkFlint Sim (x86_64 QEMU):** real OpenWrt + MilkFlint UI for browser tests (no Wi‑Fi hardware). Docs: `docs/SIM-VM.md`. Run: `./scripts/milkflint-sim` → `http://127.0.0.1:8080/milkflint/` (root / `milkflint`). Config: `milkflint/sim/diffconfig`. CI: `.github/workflows/build-sim.yml` uploads `milkflint-sim-x86_64-ext4-combined.img.gz` on `v*` tags. Prefer Sim over inventing ubus shapes when the Node mock is not enough; keep Wi‑Fi/WED/10G/LCD on the real GL-BE14000.

## milkflint4 Cursor plugin

Canonical copy lives in-repo:

```text
.cursor/plugins/milkflint4/
```

Sync to your Cursor local plugins (desktop or cloud):

```bash
./scripts/sync-milkflint4-plugin.sh
```

Skills: `firmware-release`, `ui-check`, `openwrt-research`, `sim-vm`. Command: `/milkflint-status`.
