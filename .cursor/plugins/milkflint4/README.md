# milkflint4 (Cursor plugin)

Local agent tooling for **MilkFlint4** — OpenWrt on GL-BE14000 (Flint 4).

## Install / sync to your machine

From the repo root:

```bash
mkdir -p ~/.cursor/plugins/local
rsync -a --delete .cursor/plugins/milkflint4/ ~/.cursor/plugins/local/milkflint4/
```

Or run `./scripts/sync-milkflint4-plugin.sh`.

Cursor picks up plugins under `~/.cursor/plugins/local/` automatically (reload window if needed).

## Components

| Kind | What it gives you |
|------|-------------------|
| **Rules** | Always-on project conventions (version tags, UI check gate, research sources) |
| **Skills** | `firmware-release`, `ui-check`, `openwrt-research`, `sim-vm` |
| **Commands** | `/milkflint-status` — CI + release + sim snapshot |

Supermemory / Context.dev / Context7 come from your Cursor MCP / marketplace plugins — not duplicated here.

## Usage

- Firmware tag/release work → skill `firmware-release`
- Dashboard / React UI changes → skill `ui-check`
- mt76 / OpenWrt / GL.iNet questions → skill `openwrt-research`
- QEMU UI appliance (no Wi‑Fi) → skill `sim-vm` / `docs/SIM-VM.md` / `./scripts/milkflint-sim`
