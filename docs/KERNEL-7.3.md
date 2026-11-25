# MilkFlint4 experimental: Linux 7.3 on Flint 4 (GL-BE14000)

**Status:** experimental branch `cursor/flint4-kernel-7.3-ec1a`  
**Base:** MilkFlint4 0.3a (kernel 6.18) + first-party bump to **Linux 7.3.5**  
**OpenWrt main:** still `KERNEL_PATCHVER:=6.18` for `mediatek` — we are intentionally ahead.

## Why 7.x

OpenWrt ships MediaTek Filogic on longterm **6.18** and backports selected **v7.0 / v7.1** commits into `patches-6.18`. Upstream Linux has already moved on:

| Area | Why it matters on Flint 4 |
|---|---|
| **mt76 / MT7996** | Linux **7.1** networking pull: NPU offload path for MT7996, MLO per-link beacon monitoring, external EEPROM for MT799x, large fix storm |
| **mtk_eth_soc** | Hardware **RSS + LRO** series for MT798x (net-next / 7.x era) — may replace our out-of-tree `990-*` MilkFlint RSS patches once verified present |
| **Realtek 10G PHY** | 6.18 already got RTL8261C/D C45+PCS; 7.3 keeps that stack current |
| **Generic net** | 7.1+: hardware queue leasing / AF_XDP leasing, cleaner IPv6 built-in, driver churn |

NPU offload landed around Airoha EN7581 + MT7996; MT7988 may not expose the same NPU binding. We still want 7.3 for the rest of the mt76/mtk_eth wins and to stop living on a backport treadmill.

## What we did ourselves (no waiting for OpenWrt)

1. `target/linux/generic/kernel-7.3` → **7.3.5** + official tarball hash  
2. `config-7.3` seeded from `config-6.18` (needs `oldconfig` refresh)  
3. `backport-7.3` starts **empty** (6.18 “future” backports are already upstream)  
4. `pending-7.3` / `hack-7.3` copied from 6.18 for refresh  
5. `mediatek/patches-7.3` copied from 6.18; dropped `*-v6.19-*` … `*-v7.3-*` already-in-tree patches  
6. Kept MilkFlint **990-*** RSS series + **991** RTL8261x cold-boot retry for re-port  
7. Board defaults (US country, SQM, WAN mitigations, max-perf sysctl) stay — userspace is kernel-agnostic
8. `filogic/config-7.3` (+ other mediatek subtarget `config-7.3`) seeded from 6.18/6.12 so `CONFIG_ARCH_MEDIATEK` is set  

## Build (worktree)

```sh
cd /path/to/milkflint4-k7
cp milkflint/diffconfig .config   # or existing 0.3a config
make defconfig
make target/linux/{clean,prepare} V=s   # first fight: patch refresh
make -j$(nproc) world V=s
```

## Success criteria

- [x] `make target/linux/prepare` patch-application blockers fixed (0.7b-k7: `741` moved to `-broken`; duplicate `pcie*_pins`/`spi1_pins` removed from board DTS) — needs CI re-verification
- [ ] Kernel + modules build for `glinet_gl-be14000` (verify via `.github/workflows/build-firmware.yml`)
- [ ] **0.7b-k7** world → flashable `…-sysupgrade.bin` (this pass)
- [ ] mtk_eth_soc RSS `990-*` series refreshed + re-instated (NOT in 7.3.5 as first assumed)
- [x] YT9224 DSA + 4-byte tag + PPE bridge patches in `pending-7.3`
- [x] Panel/touch packages + backlight/`fb0` bring-up init
- [x] MilkFlint UI synced from main; UL MU-MIMO off; WAN radio fan-pulse
- [ ] On-device: WAN 10G + LAN switch + tri-band Wi‑Fi + panel + UI

## Non-goals (yet)

- Replacing the **0.3a / 6.18** release track on `main`  
- Official openwrt.org kmods (vermagic will never match)  

## Upstream status (re-verified against the 7.3.5 tarball, 2026-11-26)

> **Correction — the earlier "RSS is already in 7.3.5" note was wrong.** A
> direct check of `drivers/net/ethernet/mediatek/mtk_eth_soc.c` in `linux-7.3.5`
> shows **zero** RSS/LRO code (`MTK_RSS`/`mtk_rss_init` are absent). The
> `990-*` RSS series is therefore **still required** and is quarantined in
> `target/linux/generic/broken-7.3/` (14 patches) — it must be refreshed and
> re-instated for packet steering / multi-queue CAKE.

Two driver stacks are entirely absent from mainline 7.3.5 and are the real
remaining work (both are out-of-tree in OpenWrt):

1. **MT7988 USXGMII PCS** — `drivers/net/pcs/pcs-mtk-usxgmii.c` does not exist
   in 7.3.5, `mtk_eth_soc.c` has no USXGMII handling, and `mt7988a.dtsi` has no
   `usxgmiisys*` nodes. Without it, `gmac1` (YT9224 trunk) and `gmac2` (10G WAN)
   never link; only the built-in 1G switch on `gmac0` works. Forward-port chain:
   `737` (phylink PCS-provider) → `739-04/05` (USXGMII PCS driver) →
   `978` (fixed-10g) + `975` (link-flap), plus the `usxgmiisys` DT nodes.
2. **mtk_eth_soc hardware RSS** — the `990-*` SDK series (above).

## Config
Kernel configure runs `olddefconfig` after merging OpenWrt config fragments so incomplete `config-7.3` does not trip interactive syncconfig on NEW symbols.



## 0.7a-k7 bring-up (this pass)

| Area | What we ship |
|---|---|
| **UI** | `milkflint-ui` htdocs/package synced from main `0.6a` |
| **Wi‑Fi** | WED on; UL MU-MIMO/OFDMA pinned off; US country; 6 GHz PSC 37; `#26690` ieee80211 fan-pulse |
| **Switch** | YT9224 DSA series in `pending-7.3`; gmac1 10G fixed-link to CPU port; LAN `192.168.8.1` |
| **Display** | `panel-mipi-dbi` + CST3530 + `milkflint4-panel` backlight/`fb0` paint |
| **PHY FW** | `mt7988-2p5g-phy-firmware` + `rtl8261c-firmware` |
| **Build** | Host LLVM BPF (`/usr/lib/llvm-18`); `IGNORE_ERRORS='n m'`; no `ALL_KMODS` |
