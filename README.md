<img src="milkflint/logo.svg" width="96" alt="MilkFlint logo: a flint rock, half full of milk">

# MilkFlint4: OpenWrt for the GL.iNet Flint 4 (GL-BE14000)

MilkFlint4 is a fork of [MilkFlint](https://github.com/OddBlueDog/openwrt)
retargeted at the **GL.iNet Flint 4 (GL-BE14000)** — MediaTek MT7988A with
Wi-Fi 7 (mt7996), YT9224 2.5G switch, 10G WAN, SFP+, and the front panel.

It keeps MilkFlint’s everyday web UI (LuCI under “Advanced”), Smart Queue
with multi-queue CAKE, AdGuard Home, banIP, WireGuard, and the rest of the
MilkFlint package set, on top of OpenWrt 25.12 with device support for the
BE14000.

MilkFlint4 is experimental (an alpha). Flash at your own risk; keep a
recovery path (GL.iNet stock image / serial) before you try it.

## Installing

> **Don’t keep settings.** Untick “Keep settings” when you flash
> MilkFlint4 (`sysupgrade -n` from a shell). Settings from GL.iNet stock,
> OpenWrt snapshots, or another build may not match.

Flash **`milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin`**.

Do **not** flash random preloader / bl31-uboot images unless you know you
need them and can recover: they replace the bootloader.

- **From GL.iNet firmware:** http://192.168.8.1 → System → Upgrade →
  Local Upgrade, untick Keep Settings.
- **From OpenWrt:** System → Backup / Flash Firmware, untick Keep settings.
- **Official OpenWrt snapshots** for this board (reference):  
  https://downloads.openwrt.org/snapshots/targets/mediatek/filogic/

Then use a LAN port and open http://192.168.1.1. Empty password on first
boot — set one under System → Admin Password. Wi-Fi stays off until you
configure it (with your country).

### Ports (Flint 4)

| Role | Interfaces |
|---|---|
| LAN | `lan1`–`lan8` (1G + 2.5G) |
| WAN | `eth2` (10G RJ45) |
| Second WAN | `sfp` (SFP+) |

## Building

On a Linux host set up for OpenWrt:

```bash
./scripts/feeds update -a
./scripts/feeds install -a
cp milkflint/diffconfig .config
make defconfig
make download
make -j$(nproc)
```

Images land in `bin/targets/mediatek/filogic/`. Flash the
`milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin` one.

Device support for the BE14000 (DTS, YT9224 DSA, ST7789 panel, CST3530
touch) is ported from GL.iNet’s OpenWrt 25.12 tree and aligned with
mainline OpenWrt’s `glinet_gl-be14000` profile. Wi-Fi 7 uses mt7996
firmware (`kmod-mt7996-233-firmware`).

## This branch

`milkflint-25.12` / feature branches are OpenWrt `v25.12.6` with MilkFlint
and MilkFlint4 changes on top.

| Where | What |
|---|---|
| `target/linux/mediatek/` | BE14000 DTS, YT9224/ST7789 patches, board network/upgrade |
| `package/kernel/cst353x/` | Hynitron CST3530 touchscreen |
| `package/kernel/mt76/` | mt76 (mt7996 enabled for Flint 4) |
| `package/milkflint/` | UI and MilkFlint packages |
| `milkflint/diffconfig` | Build configuration for GL-BE14000 |

## License

Same as OpenWrt / MilkFlint (see `COPYING` and `LICENSES/`).
