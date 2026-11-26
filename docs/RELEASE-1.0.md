# MilkFlint4 1.0 — Flint 4 / GL-BE14000, kernel 6.18

First **stable** release. MilkFlint’s everyday UI on OpenWrt **main** / **kernel 6.18**, with OddBlueDog [0.87a](https://github.com/OddBlueDog/openwrt/releases/tag/milkflint-0.87a) userspace and Flint 4 board tuning.

## Highlights

- **Stable 1.0** (out of beta)
- **Monokai milk** default theme (pink / cyan / green on soft milk panels); Honey milk available; LuCI Footstrap matches
- **0.87a userspace**: VPN “Use VPN’s DNS”, multi-queue CAKE from 1 Gbit/s Ethernet / 500 Mbit/s PPPoE, queue-per-CPU IFBs (sqm patch 110), Test Bench delay/stall, CAKE ECN/DSCP retry, MU-RU refactor
- **Flint 4 kept**: `ports` → `wan`, WED `mt7996e`, hardware RSS, UL MU-MIMO/OFDMA off via `wifi-muru`
- **Fixed** stale first-boot call to removed `wifi-muru-ul` (now `wifi-muru` + per-band UCI)

## Not included (on purpose)

- OddBlueDog **6.12** CAKE / IFB / mt76 / QDMA kernel driver series — this image is **6.18** with OpenWrt main cake_mq backports
- MT6000-only `ports` / eth1 hardcoding

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- From earlier MilkFlint4: keep settings is fine  
- From GL.iNet / plain OpenWrt: **do not** keep settings (`sysupgrade -n`)

## Source

Tag `v1.0` on `main`. Upstream userspace reference: OddBlueDog `milkflint-0.87a`.
