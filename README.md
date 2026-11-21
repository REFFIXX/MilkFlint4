<img src="milkflint/logo.svg" width="96" alt="MilkFlint4 logo: a four-facet flint, half full of milk">

# MilkFlint4

OpenWrt for the **GL.iNet Flint 4 (GL-BE14000)** — MediaTek MT7988A, Wi-Fi 7,
10G WAN, 2.5G LAN, SFP+, and the front panel — with MilkFlint’s everyday UI
(LuCI under Advanced), multi-queue CAKE, AdGuard Home, banIP, and WireGuard.

Built on OpenWrt 25.12. Experimental alpha: keep a stock recovery image before
you flash.

## Install

Flash only:

```
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

from [Releases](https://github.com/REFFIXX/MilkFlint4/releases) when builds are
published.

**Don’t keep settings** (`sysupgrade -n`). **Don’t use the factory image** —
GL.iNet’s upgrade UI and U-Boot recovery reject it (no OpenWrt metadata). Never
flash random preloader / bl31-uboot files unless you mean to replace the
bootloader.

### From GL.iNet stock

Wired LAN. Admin/SSH at `192.168.8.1`:

```sh
scp -O milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin root@192.168.8.1:/tmp/
ssh root@192.168.8.1
cat /tmp/sysinfo/board_name    # glinet,gl-be14000
sysupgrade -T /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

SSH drops mid-flash — wait 3–5 minutes. Or use **System → Upgrade → Local
Upgrade** with Keep Settings off.

### From OpenWrt / MilkFlint4

LuCI → **System → Backup / Flash Firmware**, Keep settings off, or
`sysupgrade -n` from a shell.

### First boot

1. LAN cable into any `lan1`–`lan8` port  
2. Open `http://192.168.1.1` — empty password; set one under Admin Password  
3. Turn Wi-Fi on and set your country  

### Back to stock

Hold **Reset** while powering on until the panel countdown, set PC to
`192.168.1.2/24`, open `http://192.168.1.1`, upload GL.iNet firmware from
[dl.gl-inet.com](https://dl.gl-inet.com/). That recovery only takes vendor
images.

## Ports

| Role | Interface |
|---|---|
| WAN (10G RJ45) | `eth2` |
| WAN (SFP+) | `sfp` (same firewall WAN zone) |
| LAN | `lan1`–`lan8` (2.5G + 1G) |

MACs: factory eMMC `0x4000` (WAN label), LAN = WAN+2; Wi-Fi bands from
`0x4006`.

## Hardware

| | |
|---|---|
| SoC | MT7988A (4× A73) |
| RAM / storage | 2 GB DDR4 / eMMC |
| Wi-Fi | MT7996 tri-band Wi-Fi 7 |
| Switch | YT9224 DSA + YT8824 2.5G PHYs; 10G C45 WAN PHY |
| Panel | ST7789 SPI + CST3530 touch |
| Cooling | PWM fan, SoC thermal trips |
| Console | `ttyS0` 115200 8N1 |

## Build

Linux host with the
[OpenWrt build system](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem).
Use **gcc** as the host compiler (not clang).

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

Image: `bin/targets/mediatek/filogic/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin`.

UI rebuild (Node 24 + pnpm):

```bash
cd milkflint/ui && pnpm install --frozen-lockfile && pnpm package
```

## Notes

- Package manager is **`apk`**. Prefer a new image over mixing official
  snapshot `kmod-*` packages (kernel mismatch).
- Prefer an explicit **PSC** 6 GHz channel (5, 21, 37, …) over `auto`.
- Development is on **`main`**.

| Path | Role |
|---|---|
| `target/linux/mediatek/` | BE14000 DTS, DSA/panel patches, board scripts |
| `package/kernel/cst353x/` | CST3530 touch |
| `package/milkflint/` | UI + MilkFlint packages |
| `milkflint/diffconfig` | Flint 4 build seed |

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
