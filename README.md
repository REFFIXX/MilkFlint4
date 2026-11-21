<p align="center">
  <img src="milkflint/logo.svg" width="128" alt="MilkFlint4: a four-facet flint, half full of milk">
</p>

<h1 align="center">MilkFlint4</h1>

<p align="center">
  <strong>OpenWrt for the GL.iNet Flint 4 (GL-BE14000)</strong><br>
  MediaTek MT7988A · Wi‑Fi 7 · 10G WAN · 2.5G LAN · SFP+ · front panel<br>
  MilkFlint’s everyday UI, tuned for Flint 4 hardware
</p>

<p align="center">
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/github/v/release/REFFIXX/MilkFlint4?label=release&color=b45309" alt="Release"></a>
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/target-mediatek%2Ffilogic-0f766e" alt="Target"></a>
  <a href="https://openwrt.org"><img src="https://img.shields.io/badge/base-OpenWrt%20main%206.18-1a7f4b" alt="OpenWrt"></a>
</p>

---

MilkFlint4 is MilkFlint, rebuilt for the **Flint 4**: the same dashboard, guest Wi‑Fi, AdGuard Home, banIP, Smart Queue (CAKE), WireGuard, themes, and Performance Tuning — wired to MT7988 / MT7996 / YT9224 instead of the Flint 2’s MT7986 stack.

Experimental alpha. Keep a stock GL.iNet recovery image before you flash.

## Install (sysupgrade)

Flash only this file from [Releases](https://github.com/REFFIXX/MilkFlint4/releases):

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

That is the normal OpenWrt upgrade path. **Do not use the factory image** with GL.iNet’s upgrade UI or U‑Boot web recovery — they expect vendor metadata. Leave the stock bootloader alone.

### From GL.iNet stock firmware

1. Plug a PC into any LAN port. Admin/SSH is at `192.168.8.1`.
2. Copy the sysupgrade image, then flash with settings erased:

```sh
scp -O milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin root@192.168.8.1:/tmp/
ssh root@192.168.8.1
cat /tmp/sysinfo/board_name    # must print: glinet,gl-be14000
sysupgrade -T /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

SSH drops mid-flash — wait **3–5 minutes**. Or use **System → Upgrade → Local Upgrade** with Keep Settings **off**.

### From OpenWrt / MilkFlint4

LuCI → **System → Backup / Flash Firmware**, Keep settings off on the first MilkFlint4 flash, or:

```sh
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

Later MilkFlint4 → MilkFlint4 upgrades can keep settings.

### First boot

1. LAN cable into any `lan2`–`lan9` port  
2. Open `http://192.168.1.1` — empty password; set one under **Admin Password**  
3. Wi‑Fi country defaults to **US** (6 GHz LPI AP enabled via our regdb patch). Change it under Wi‑Fi if you need another region; use **WPA3** on 6 GHz  
4. Optional: **Performance Tuning → Hardware offloading (WED)** is on by default on Flint 4; enable firewall hardware flow offloading when you want Wi‑Fi ↔ WAN to leave the CPU  

### Back to stock GL.iNet

Hold **Reset** while powering on until the panel countdown, set the PC to `192.168.1.2/24`, open `http://192.168.1.1`, upload firmware from [dl.gl-inet.com](https://dl.gl-inet.com/). Recovery only accepts vendor images.

## Ports

| Role | Interface |
|---|---|
| WAN (10G RJ45) | `wan` |
| LAN | `lan2`–`lan5` (2.5G on YT9224) · `lan6`–`lan9` (1G) · `sfp` (SFP+ on LAN) |

MACs: factory eMMC `0x4000` (WAN label), LAN = WAN+2; Wi‑Fi bands from `0x4006`.

## Hardware

| | |
|---|---|
| SoC | MT7988A (4× Cortex‑A73) |
| Kernel | **6.18** (OpenWrt main mediatek/filogic) |
| RAM / storage | 2 GB DDR4 / eMMC |
| Wi‑Fi | MT7996 tri‑band Wi‑Fi 7 (2.4 / 5 / 6 GHz) |
| Switch | YT9224 DSA + YT8824 2.5G PHYs; RTL8261C/D-CG 10G WAN PHY |
| Panel | MIPI DBI (ST7789) + CST3530 touch |
| Cooling | PWM fan, SoC thermal trips (fan starts ~45 °C) |
| Console | `ttyS0` 115200 8N1 |

## MilkFlint carried over — Flint 4 focused

Everything below ships in the image. Generic MilkFlint behaviour is kept; defaults that touch radios, WED, or the switch are pointed at **MT7996 / MT7988 / YT9224**.

| Area | What you get on Flint 4 |
|---|---|
| **MilkFlint UI** | Dashboard, Wi‑Fi, guests, DNS, AdGuard Home, banIP, SQM, VPN, schedules, device control, themes, upgrade, Performance Tuning — LuCI under **Advanced** |
| **Theme** | Default **Monokai milk** (milky Monokai Pro: pink / cyan / green on soft milk panels). Honey milk stays available. LuCI Advanced uses Footstrap’s matching Monokai milk palette |
| **Upstream MilkFlint** | Includes OddBlueDog **MilkFlint 0.85a** (device control, crontab schedules, CAKE/Wi‑Fi fixes, AdGuard/ubus fixes) — Flint 2–only bits left aside; Flint 4 WED/Wi‑Fi/switch overlays on top |
| **uhttpd** | `milkflint.html` is the index page; UI assets under `/milkflint/` |
| **Packet steering** | Hardware **RSS** on `wan` (four PDMA rings / GIC 221–224), not software RPS — MilkFlint layout via `ports rss` |
| **Smart Queue** | Multi‑queue CAKE on by default for Flint 4; ingress `cake_mq` + `no-split-gso` on multi‑gig WAN; per‑host fairness (`nat dual-dsthost` / `dual-srchost`); egress stays single CAKE on `mtk_soc_eth` |
| **Wi‑Fi latency** | 5 GHz + **6 GHz** best‑effort TXOP/backoff tweak; MU EDCA timers shortened; DTIM 1; airtime fairness ready (off until enabled) |
| **Country** | Default **US** on first boot; 6 GHz LPI AP allowed (regdb patch drops US `NO-IR`) |
| **6 GHz** | Default PSC channel **37** instead of `auto` (avoids 5+6 GHz MLD ACS deadlock) |
| **WED** | `mt7996e wed_enable=Y` by default; flowtable hotplug when radios appear |
| **Stealth / ping** | WAN ping off and related firewall defaults from MilkFlint |
| **Front panel** | MIPI DBI panel firmware + CST3530 touch |
| **Fan** | PWM fan with earlier low trip so the 10G PHY stays cooler |
| **kmods** | Full `CONFIG_ALL_KMODS` set built with this image’s vermagic — install extras from the MilkFlint4 package feed, not downloads.openwrt.org |

### Flint 4 kernel / board fixes in this release (0.3a)

Moved mediatek/filogic to **kernel 6.18** (OpenWrt main stack) for best Flint 4 performance:

- **Kernel 6.18** — OpenWrt main `backport` / `hack` / `pending` + mediatek `patches-6.18`, including full **RTL8261C/D-CG** Realtek PHY support + `rtl8261c` / `rtl826x` firmware
- **Upstream BE14000 DTS** — `wan` netdev name, `yt922x_4b` DSA tag, `mediatek,force-fixed-10g`, MIPI panel, CST3530
- **Hardware RSS (MT7988)** — PDMA IRQs SPI 189–192 + `MTK_PDMA_INT \| MTK_RSS` (MilkFlint 990-series, including MT7988 enablement)
- **YT9224 mdi-swap / USXGMII PCS flap skip** — from OpenWrt main (975/978 + 967-54)
- **US 6 GHz LPI** — wireless-regdb patch so US AP mode is not blocked by `NO-IR`
- **SQM / CAKE** — MilkFlint `sch_cake` / `cake_mq` series ported to `pending-6.18` (870-*)
- **ALL_KMODS** — extras match this build (official snapshot kmods will not load)

### Known issues (upstream / hardware)

- **openwrt#26690** — some units still report 10G WAN wedging when a second radio comes up; PCS skip is included, but treat multi-radio + 10G as “watch the link” until upstream closes it.
- **openwrt#26691** — rare cold boot with empty 10G speed capabilities; power cycle if WAN stays dark.
- Do **not** mix `kmod-*` from downloads.openwrt.org into this image — vermagic will not match. Use the kmods built with this release.

## Build

Linux host with the [OpenWrt build system](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem). Use **gcc** as the host compiler (not clang).

```bash
git clone https://github.com/REFFIXX/MilkFlint4.git
cd MilkFlint4
./scripts/feeds update -a
./scripts/feeds install -a
cp milkflint/diffconfig .config
make defconfig
make download
make -j$(nproc)
```

Image:

```text
bin/targets/mediatek/filogic/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

UI rebuild (Node **24.11** + pnpm):

```bash
cd milkflint/ui && pnpm install --frozen-lockfile --config.trust-policy=off && pnpm exec vite build && node scripts/package.ts
```

## Tree map

| Path | Role |
|---|---|
| `target/linux/mediatek/` | BE14000 DTS, 6.18 patches, board scripts, Flint 4 Wi‑Fi / SQM defaults |
| `target/linux/generic/*-6.18/` | OpenWrt main 6.18 backports + MilkFlint CAKE (`870-*`) |
| `package/firmware/` | `rtl8261c-firmware`, `rtl826x-firmware`, MIPI DBI panel sequences |
| `package/milkflint/` | UI + MilkFlint packages (WED aware of `mt7996e`) |
| `milkflint/ui/` | React UI source |
| `milkflint/diffconfig` | Flint 4 build seed (`VERSION_DIST=MilkFlint4`, kernel 6.18, `ALL_KMODS`) |

Development is on **`main`**.

## License

Same as OpenWrt / MilkFlint — see `COPYING` and `LICENSES/`.

---

*The rest of this README is OpenWrt’s.*

![OpenWrt logo](include/logo.png)

OpenWrt Project is a Linux operating system targeting embedded devices. Instead
of trying to create a single, static firmware, OpenWrt provides a fully
writable filesystem with package management. This frees you from the
application selection and configuration provided by the vendor and allows you
to customize the device through the use of packages to suit any application.
For developers, OpenWrt is the framework to build an application without having
to build a complete firmware around it; for users this means the ability for
full customization, to use the device in ways never envisioned.

Sunshine!

## Download

* [OpenWrt Firmware Selector](https://firmware-selector.openwrt.org/)
* [OpenWrt Wiki Download](https://openwrt.org/downloads)

## Development

GNU/Linux, BSD or macOS (case-sensitive filesystem). See
[Build System Setup](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem).

```
binutils bzip2 diff find flex gawk gcc-6+ getopt grep install libc-dev libz-dev
make4.1+ perl python3.7+ rsync subversion unzip which
```

1. `./scripts/feeds update -a`
2. `./scripts/feeds install -a`
3. `make menuconfig`
4. `make`

Related: [LuCI](https://github.com/openwrt/luci),
[Packages](https://github.com/openwrt/packages),
[Routing](https://github.com/openwrt/routing),
[Video](https://github.com/openwrt/video).

## Support

* [Hardware database](https://openwrt.org/supported_devices)
* [Forum](https://forum.openwrt.org) · `#openwrt` on oftc.net
* [Bugs](https://bugs.openwrt.org) · [dev list](https://lists.openwrt.org/mailman/listinfo/openwrt-devel)

## License

OpenWrt is licensed under GPL-2.0
