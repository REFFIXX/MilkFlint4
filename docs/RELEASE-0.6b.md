# MilkFlint4 0.6b (Flint 4 / GL-BE14000, kernel 6.18)

Patch release on the stable `main` track. No driver or config changes — only
board-default and UI fixes found during review, plus a firmware CI build.

## Fixed

- **SQM defaults** (`99-milkflint4-flint4-sqm`): WAN shaper targets corrected
  from `wan | eth2 | sfp` to `wan` (there is no `eth2` on this board; `sfp` is
  a LAN port).
- **IPv6 stealth default** (`uci-defaults.sh`): `Allow-ICMPv6-*` echo-request
  removal now counts the `icmp_type` list instead of comparing only its first
  element (a list of `echo-request echo-reply …` was previously left untouched).
- **AdGuard Home** (`notices-go.sh`): license files whose names contain spaces
  are no longer word-split (`$(ls …)` → glob), so `THIRD-PARTY-NOTICES` is
  complete.
- **UI** (`milkflint/ui`):
  - `use-apply.ts`: the LAN-address / HTTPS “move the router” flow now enters
    the `applying` state (Save button disabled, spinner shown) instead of
    allowing a double submit.
  - `firewall/api.ts`: `getCounters()` no longer throws on an empty
    `nft --json` response (guards `res.code`/empty stdout with a try/catch).
  - `tuning/model.ts`: the GRO max field honours the backend `bin/gro` range
    4096–65536, so a LuCI-set out-of-range value no longer misleads the form.

## CI

- New `.github/workflows/build-firmware.yml`: builds `glinet_gl-be14000`
  (kernel 6.18) on push to `main` and on `v*` tags, uploading the `sysupgrade.bin`
  and attaching it to a draft release.

## Verified unchanged (no action needed)

- Full driver set present: MediaTek USXGMII PCS (10G WAN + YT9224 trunk),
  Motorcomm YT922x DSA (2.5G LAN + SFP), Realtek RTL8261C/D 10G PHY,
  mtk_eth_soc hardware RSS, WED ring-reset/2nd-PCIe fixes, mtk_eth_soc PPE TID.
- DTS `&usxgmiisys1 { mediatek,force-fixed-10g; }`, `motorcomm,mdi-swap`,
  `yt922x_4b` tag, and MAC nvmem cells all match upstream OpenWrt.
- Milk theme (Monokai milk) wired into both the MilkFlint UI and LuCI Footstrap
  (`98-milkflint4-luci-theme` → `palette=monokai-milk`).

## Notes

- The Flint 4 front-panel `fb0` paint/backlight init (added on the experimental
  `cursor/flint4-kernel-7.3-ec1a` branch) is intentionally not part of 0.6b;
  the panel hardware is enabled via the DTS and DRM drivers.
