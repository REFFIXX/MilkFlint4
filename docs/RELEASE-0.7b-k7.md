# MilkFlint4 0.7b-k7 (Flint 4 / GL-BE14000, kernel 7.3.5)

Second build of the experimental Linux 7.3.5 track. This release fixes the two
patch-application blockers found in the 0.7a-k7 review, cleans up board-default
scripts, and adds CI that builds the `sysupgrade.bin`.

> **Still experimental — not flash-validated.** Keep a stock GL.iNet recovery
> image. See `docs/KERNEL-7.3.md` for the two remaining kernel driver gaps.

## Fixed (build blockers)

- **`741-net-pcs-mtk-lynxi-add-phya-tx-rx-clock-path.patch`** moved to
  `patches-7.3-broken/`. It depended on the quarantined `739-03` (mt7987-only)
  and would have made `make target/linux/prepare` reject.
- **Duplicate pinctrl labels** (`pcie0_pins`, `pcie1_pins`, `spi1_pins`) removed
  from `mt7988a-glinet-gl-be14000.dts` — Linux 7.3.5 already defines them in
  `mt7988a.dtsi`, so the board redefinition was a `duplicate_label` dtc error.

## Fixed (board defaults / packages / UI)

- `99-milkflint4-flint4-sqm`: WAN shaper targets corrected from `wan | eth2 | sfp`
  to `wan` (there is no `eth2` here; `sfp` is a LAN port).
- `99-milkflint4-flint4-wifi`: fixed stale reference to the non-existent
  `80_milkflint4-flint4-wed` preinit → `81_milkflint-tuning`.
- `milkflint4-panel`: framebuffer fill now writes exactly 150 KiB, not 160 KiB.
- `notices-go.sh`: license files with spaces are no longer word-split (glob instead
  of `$(ls …)`).
- `uci-defaults.sh`: `Allow-ICMPv6-*` echo-request removal now counts list entries
  instead of comparing only the first element.
- UI: `applyAndMove` now shows the "Applying…" state; `getCounters()` no longer
  throws on an empty `nft --json` response; `groMax` reader honors the
  backend's 4096–65536 range.

## CI

- New `.github/workflows/build-firmware.yml`: builds `glinet_gl-be14000` on push to
  the branch and on `v*` tags (draft release with the `.bin` attached); also
  `workflow_dispatch`.

## Remaining (next kernel work, per docs/KERNEL-7.3.md)

- MT7988 **USXGMII PCS** (10G WAN + YT9224 LAN trunk) — `737` → `739-04/05` →
  `978`/`975` forward-port.
- mtk_eth_soc **hardware RSS** (`990-*` series) refresh + re-instate.
