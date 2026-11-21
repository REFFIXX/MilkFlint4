<img src="milkflint/logo.svg" width="96" alt="MilkFlint logo: a flint rock, half full of milk">

# MilkFlint4: OpenWrt for the GL.iNet Flint 4 (GL-BE14000)

MilkFlint4 is [MilkFlint](https://github.com/OddBlueDog/openwrt) retargeted at the
**GL.iNet Flint 4 (GL-BE14000)** — MediaTek MT7988A, Wi-Fi 7 (mt7996), YT9224 2.5G
switch, 10G WAN, SFP+, front ST7789 panel and CST3530 touch — on OpenWrt 25.12.

It keeps MilkFlint’s everyday web UI (LuCI under “Advanced”), Smart Queue with
multi-queue CAKE, AdGuard Home, banIP, WireGuard, and the rest of the MilkFlint
package set.

MilkFlint4 is experimental (an alpha). Flash at your own risk. Keep a recovery
path (GL.iNet stock image + U-Boot web recovery) before you try it.

Images land on the [Releases](https://github.com/REFFIXX/MilkFlint4/releases)
page when a build finishes. Flash only:

```
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

## Hardware (GL-BE14000)

| | |
|---|---|
| SoC | MediaTek MT7988A (4× Cortex-A73) |
| RAM | 2 GB DDR4 |
| Storage | eMMC (~56 GB usable for rootfs layout) |
| Wi-Fi | MT7996, tri-band Wi-Fi 7 (2.4 / 5 / 6 GHz) |
| Ethernet | 10G RJ45 WAN (`eth2`), SFP+ (`sfp`), 4× 2.5G + 4× 1G LAN (`lan1`–`lan8`) via YT9224 DSA + YT8824 PHY |
| Panel | ST7789 SPI TFT + Hynitron CST3530 touch |
| Other | USB 3.x, PWM fan, reset button (GPIO 13) |
| Console | `ttyS0`, 115200 8N1 |

### Ports

| Role | Interface |
|---|---|
| WAN (10G RJ45) | `eth2` |
| Second WAN (SFP+) | `sfp` |
| LAN | `lan1`–`lan8` |

MAC layout (eMMC `factory` partition): WAN = offset `0x4000`, second WAN
(`sfp`) = WAN+1, LAN bridge = WAN+2. Wi-Fi EEPROM is `eeprom@0` in the same
partition.

## Installing

> **Don’t keep settings.** Untick “Keep settings” / use `sysupgrade -n`. Config
> from GL.iNet stock, OpenWrt snapshots, or another MilkFlint4 build may not
> match. Back up first if you want the old config for reference.

> **Use the sysupgrade image, not factory.**  
> `*-squashfs-factory.bin` has no OpenWrt metadata. GL.iNet’s admin upgrade and
> U-Boot web recovery both reject it (`Firmware not compatible` /
> `UPDATE FAILED`). The sysupgrade image carries `supported_devices` and is
> what stock GL.iNet (OpenWrt-based) accepts.

Never flash random `preloader` / `bl31-uboot` artifacts unless you know you need
them and can recover: they replace the bootloader.

### From GL.iNet stock (recommended)

Wired LAN only. Stock admin is at `http://192.168.8.1` (SSH `root@192.168.8.1`).

```sh
# on your computer — Dropbear has no sftp-server, so -O is required
scp -O milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin root@192.168.8.1:/tmp/

# on the router
sha256sum /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
cat /tmp/sysinfo/board_name          # must be: glinet,gl-be14000
sysupgrade -T /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

`sysupgrade -T` only validates (exit 0 = metadata OK). The SSH session drops
mid-flash — that is expected. Wait 3–5 minutes; do not cut power.

You can also use **System → Upgrade → Local Upgrade** in the GL.iNet UI with the
same sysupgrade file and **Keep Settings** unticked.

### From OpenWrt / earlier MilkFlint4

LuCI → **System → Backup / Flash Firmware → Flash image**, untick Keep settings,
or from a shell:

```sh
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

### First boot

1. Plug a cable into a **LAN** port (`lan1`–`lan8`).
2. Open `http://192.168.1.1` (MilkFlint UI; LuCI under Advanced).
3. Empty root password — set one under **System → Admin Password**.
4. Wi-Fi stays off until you configure it (set your country).

### Going back to stock

The vendor U-Boot is left alone. Hold **Reset** while powering on until the
panel shows a countdown, set your PC to `192.168.1.2/24`, open
`http://192.168.1.1`, and upload a GL.iNet stock firmware from
[GL.iNet’s download page](https://dl.gl-inet.com/). That recovery path will
**not** accept OpenWrt/MilkFlint4 images — use it only for vendor firmware.

Official OpenWrt snapshots for this board (reference, not MilkFlint4):  
https://downloads.openwrt.org/snapshots/targets/mediatek/filogic/

## After install

- Package manager is **`apk`** (OpenWrt 25.12), not `opkg`.
- Kernel modules from official OpenWrt snapshot feeds will **not** match this
  kernel. Prefer a full new image over mixing `kmod-*` packages.
- 6 GHz clients only scan Preferred Scanning Channels (5, 21, 37, 53, …). Prefer
  an explicit PSC channel over `auto` if the 6 GHz SSID looks invisible.

## Building

On a Linux host set up for OpenWrt
([build system setup](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem)).
Host compiler must be **gcc** (not clang) — elfutils fails to link against
libc++’s demangler otherwise.

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

Images: `bin/targets/mediatek/filogic/`. Flash the
`milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin` one.

To rebuild the web UI after changing it (Node.js 24 + pnpm):

```bash
cd milkflint/ui
pnpm install --frozen-lockfile
pnpm package
```

## Repository layout

Development is on **`main`**. Device support for the BE14000 (DTS, YT9224 DSA,
ST7789 panel, CST3530 touch) is ported from GL.iNet’s OpenWrt 25.12 tree and
aligned with mainline OpenWrt’s `glinet_gl-be14000` profile. Wi-Fi 7 uses
mt7996 firmware (`kmod-mt7996-233-firmware`).

| Where | What |
|---|---|
| `target/linux/mediatek/` | BE14000 DTS, YT9224/ST7789/motorcomm patches, board network/upgrade |
| `package/kernel/cst353x/` | Hynitron CST3530 touchscreen |
| `package/kernel/mt76/` | mt76 (mt7996 enabled for Flint 4) |
| `package/milkflint/` | UI and MilkFlint packages |
| `milkflint/diffconfig` | Build configuration for GL-BE14000 |
| `milkflint/ui/` | Web interface source (React, TypeScript) |

## AdGuard Home

Same as MilkFlint: AdGuard Home is in the image, off until enabled under
Security. Devices still query the router; unfiltered fallback if AGH stops
answering. MilkFlint4 is not made or endorsed by AdGuard; “AdGuard” is their
trademark.

## License

Same as OpenWrt / MilkFlint (see `COPYING` and `LICENSES/`).

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

Built firmware images are available for many architectures and come with a
package selection to be used as WiFi home router. To quickly find a factory
image usable to migrate from a vendor stock firmware to OpenWrt, try the
*Firmware Selector*.

* [OpenWrt Firmware Selector](https://firmware-selector.openwrt.org/)

If your device is supported, please follow the **Info** link to see install
instructions or consult the support resources listed below.

## Development

To build your own firmware you need a GNU/Linux, BSD or macOS system (case
sensitive filesystem required). Cygwin is unsupported because of the lack of a
case sensitive file system.

### Requirements

You need the following tools to compile OpenWrt, the package names vary between
distributions. A complete list with distribution specific packages is found in the
[Build System Setup](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem)
documentation.

```
binutils bzip2 diff find flex gawk gcc-6+ getopt grep install libc-dev libz-dev
make4.1+ perl python3.7+ rsync subversion unzip which
```

### Quickstart

1. Run `./scripts/feeds update -a` to obtain all the latest package definitions
   defined in feeds.conf / feeds.conf.default

2. Run `./scripts/feeds install -a` to install symlinks for all obtained
   packages into package/feeds/

3. Run `make menuconfig` to select your preferred configuration for the
   toolchain, target system & firmware packages.

4. Run `make` to build your firmware. This will download all sources, build the
   cross-compile toolchain and then cross-compile the GNU/Linux kernel & all chosen
   applications for your target system.

### Related Repositories

* [LuCI Web Interface](https://github.com/openwrt/luci)
* [OpenWrt Packages](https://github.com/openwrt/packages)
* [OpenWrt Routing](https://github.com/openwrt/routing)
* [OpenWrt Video](https://github.com/openwrt/video)

## Support Information

* [OpenWrt Hardware Database](https://openwrt.org/supported_devices)
* [Forum](https://forum.openwrt.org)
* [Support Chat](https://webchat.oftc.net/#openwrt): `#openwrt` on **oftc.net**
* [Bug Reports](https://bugs.openwrt.org)
* [Dev Mailing List](https://lists.openwrt.org/mailman/listinfo/openwrt-devel)

## License

OpenWrt is licensed under GPL-2.0
