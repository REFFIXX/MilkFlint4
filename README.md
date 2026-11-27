<p align="center">
  <img src="milkflint/logo.svg" width="140" alt="MilkFlint4 — four-facet flint, half full of milk">
</p>

<h1 align="center">MilkFlint4</h1>

<p align="center">
  <strong>OpenWrt that actually <em>feels</em> like a Flint 4</strong><br>
  <code>GL-BE14000</code> · MT7988A · <strong>kernel 6.18</strong> · Wi‑Fi 7 · 10G WAN · LCD that isn’t a blank stare
</p>

<p align="center">
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/status-stable-a9dc76?style=flat-square&labelColor=2d2a2e" alt="stable"></a>
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/kernel-6.18-78dce8?style=flat-square&labelColor=2d2a2e" alt="kernel 6.18"></a>
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/roaming-802.11r%2Fk%2Fv-ff6188?style=flat-square&labelColor=2d2a2e" alt="Wi-Fi roaming"></a>
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/mesh-802.11s-ab9df2?style=flat-square&labelColor=2d2a2e" alt="802.11s mesh"></a>
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/theme-Monokai%20milk-fcfcfa?style=flat-square&labelColor=2d2a2e&color=ff6188" alt="Monokai milk"></a>
  <a href="https://github.com/REFFIXX/MilkFlint4/releases"><img src="https://img.shields.io/badge/LCD-logo%20on-ffd866?style=flat-square&labelColor=2d2a2e" alt="LCD splash"></a>
  <a href="https://openwrt.org"><img src="https://img.shields.io/badge/base-OpenWrt%20main-fc9867?style=flat-square&labelColor=2d2a2e" alt="OpenWrt main"></a>
</p>

---

If you’ve been waiting for OpenWrt on the **GL-BE14000** that doesn’t treat the box like a generic MT7988 brick — this is it.

**MilkFlint4** is everyday MilkFlint on Flint 4: live dashboard, Wi‑Fi 7, guests, DNS, AdGuard Home, banIP, SQM, WireGuard, schedules, device control, themes, upgrade, Performance Tuning — on **OpenWrt main / kernel 6.18**, with MT7988 / MT7996 / YT9224 / RTL8261C wired in properly. The front-panel LCD lights up with the MilkFlint4 logo and **stays on**.

The look is ours: **Monokai milk** (soft charcoal / milk panels, pink `#ff6188`, cyan, green). Honey milk and friends live under **System → Themes**. Footstrap LuCI matches.

Keep a stock GL.iNet recovery image before you flash. Then grab a release, flash it, watch the pink **4** light up, and go break a speed test.

<h2><span style="color:#ff6188">●</span> Features</h2>

<table>
  <tr>
    <td width="50%" valign="top">
      <p><img src="https://img.shields.io/badge/Wi--Fi%20roaming-ff6188?style=flat-square&labelColor=2d2a2e" alt="Wi-Fi roaming"></p>
      <p><b>Wi‑Fi → Wi‑Fi roaming</b><br>
      802.11r / k / v + <code>usteer</code>, shared mobility domain, “Why?” hints with recommended settings for multi‑AP handoff.</p>
    </td>
    <td width="50%" valign="top">
      <p><img src="https://img.shields.io/badge/802.11s%20mesh-ab9df2?style=flat-square&labelColor=2d2a2e" alt="802.11s mesh"></p>
      <p><b>Wi‑Fi → Mesh</b><br>
      <code>mesh11sd</code> Main / peer roles, shared identity, live topology, first-boot script to deploy more OpenWrt <b>25.x</b> APs.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <p><img src="https://img.shields.io/badge/Monokai%20milk-fcfcfa?style=flat-square&labelColor=2d2a2e&color=ff6188" alt="Monokai milk"></p>
      <p>Soft charcoal / milk panels · pink / cyan / green · Honey milk, Plain milk, Moss, Minimamilk one click away · Footstrap LuCI.</p>
    </td>
    <td width="50%" valign="top">
      <p><img src="https://img.shields.io/badge/LCD%20splash-ffd866?style=flat-square&labelColor=2d2a2e" alt="LCD splash"></p>
      <p>MilkFlint4 logo on the 320×240 panel at boot — and it <b>stays on</b>. Pink <b>4</b> on the front like it owns the place.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <p><img src="https://img.shields.io/badge/Wi--Fi%207-78dce8?style=flat-square&labelColor=2d2a2e" alt="Wi-Fi 7"></p>
      <p>MT7996 tri‑band · <b>WED</b> on by default · latency-first radio defaults · full MilkFlint Wi‑Fi / guests / schedules.</p>
    </td>
    <td width="50%" valign="top">
      <p><img src="https://img.shields.io/badge/10G%20%2B%20SQM-a9dc76?style=flat-square&labelColor=2d2a2e" alt="10G + SQM"></p>
      <p>Real <code>wan</code> on RTL8261C · multi-queue CAKE · RSS · AdGuard Home, banIP, WireGuard, Performance Tuning.</p>
    </td>
  </tr>
</table>

## Screenshots

<table>
  <tr>
    <td align="center" width="50%"><img src="milkflint/docs/readme/home-monokai-dark.png" width="480" alt="Home"><br><sub><b>Home</b></sub></td>
    <td align="center" width="50%"><img src="milkflint/docs/readme/themes-monokai-dark.png" width="480" alt="Themes"><br><sub><b>Themes</b> — Monokai milk</sub></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="milkflint/docs/readme/roaming-monokai-dark.png" width="480" alt="Wi-Fi roaming"><br><sub><b>Wi‑Fi roaming</b></sub></td>
    <td align="center" width="50%"><img src="milkflint/docs/readme/mesh-monokai-dark.png" width="480" alt="Mesh"><br><sub><b>Mesh</b></sub></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="milkflint/docs/readme/wifi-monokai-dark.png" width="480" alt="Networks & radios"><br><sub><b>Networks & radios</b></sub></td>
    <td align="center" width="50%"><img src="milkflint/docs/readme/sqm-monokai-dark.png" width="480" alt="Smart Queue"><br><sub><b>Smart Queue</b></sub></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="milkflint/docs/readme/tuning-monokai-dark.png" width="480" alt="Performance tuning"><br><sub><b>Performance tuning</b></sub></td>
    <td align="center" width="50%"><img src="milkflint/docs/readme/firewall-monokai-dark.png" width="480" alt="Firewall"><br><sub><b>Firewall</b></sub></td>
  </tr>
</table>

More screenshots (light + dark): [`milkflint/docs/forum/`](milkflint/docs/forum/).

<h2><span style="color:#78dce8">●</span> Hardware</h2>

Not “it boots.” *Wired in properly* — MT7988 / MT7996 / YT9224 / RTL8261C treated as a Flint 4, not a generic brick.

| Piece | What’s going on |
|---|---|
| **10G WAN (RTL8261C)** | Firmware load, soft-reset, USXGMII flap skip, MDIO 2.5 MHz, `eee-broken-*`, hotplug recovery |
| **WAN path** | Real `wan` — not Flint 2 `ports` / `eth1` cargo-cult |
| **Wi‑Fi 7 (MT7996)** | Tri-band · **WED** on by default (`mt7996e wed_enable=Y`) |
| **RSS** | Hardware RSS on `wan` (PDMA 0–3) |
| **Panel** | ST7789 + CST3530 — lit, driven, branded (logo stays after boot) |
| **Fan** | PWM from ~45 °C |
| **Switch / PHY** | YT9224 + YT8824 · SFP+ present |

After a hard 10G PHY wedge: **power-cycle** (warm reboot is not enough). Upstream refs: openwrt#26690 / #26691.

<details>
<summary><b>Ports &amp; board</b></summary>

<br>

| Role | Interface |
|---|---|
| WAN (10G RJ45) | `wan` |
| LAN | `lan2`–`lan5` (2.5G) · `lan6`–`lan9` (1G) · `sfp` (SFP+) |

| | |
|---|---|
| SoC | MT7988A (4× A73) · **kernel 6.18** |
| RAM / flash | 2 GB DDR4 / eMMC |
| Wi‑Fi | MT7996 tri‑band Wi‑Fi 7 |
| Switch / PHY | YT9224 + YT8824 · RTL8261C/D 10G WAN |
| Panel / fan | ST7789 + CST3530 · PWM from ~45 °C |
| Console | `ttyS0` 115200 8N1 |

</details>

<h2><span style="color:#a9dc76">●</span> What’s in the image</h2>

| | |
|---|---|
| <img src="https://img.shields.io/badge/UI-ff6188?style=flat-square&labelColor=2d2a2e" alt="UI"> | Live **Home**, Wi‑Fi, guests, DNS, AdGuard Home, banIP, SQM, VPN, schedules, device control, themes, upgrade, Performance Tuning — LuCI under **Advanced** |
| <img src="https://img.shields.io/badge/Roaming-ff6188?style=flat-square&labelColor=2d2a2e" alt="Roaming"> | **Wi‑Fi → Wi‑Fi roaming** — 802.11r/k/v + `usteer`, shared mobility domain, “Why?” recommended settings |
| <img src="https://img.shields.io/badge/Mesh-ab9df2?style=flat-square&labelColor=2d2a2e" alt="Mesh"> | **Wi‑Fi → Mesh** — `mesh11sd` Main/peer, shared identity, live topology, first-boot script for OpenWrt 25.x APs |
| <img src="https://img.shields.io/badge/Theme-fcfcfa?style=flat-square&labelColor=2d2a2e&color=ff6188" alt="Theme"> | **Monokai milk** default · Honey milk / Plain milk / Moss / Minimamilk · Footstrap LuCI |
| <img src="https://img.shields.io/badge/LCD-ffd866?style=flat-square&labelColor=2d2a2e" alt="LCD"> | Boot splash paints the logo on the 320×240 panel and leaves it on |
| <img src="https://img.shields.io/badge/SQM%20%2F%20VPN-a9dc76?style=flat-square&labelColor=2d2a2e" alt="SQM / VPN"> | Multi-queue CAKE (1 Gbit Eth / 500 Mbit PPPoE) · queue-per-CPU IFBs · VPN **Use VPN’s DNS** · CAKE ECN/DSCP retry |
| <img src="https://img.shields.io/badge/Wi--Fi-78dce8?style=flat-square&labelColor=2d2a2e" alt="Wi-Fi"> | UL MU-MIMO/OFDMA **off** (latency-first) · US country · 6 GHz PSC **37** · WED on · BE latency tweak on 5+6 GHz |
| <img src="https://img.shields.io/badge/Steering-fc9867?style=flat-square&labelColor=2d2a2e" alt="Steering"> | Hardware **RSS** on `wan` (PDMA 0–3) · multi-queue CAKE egress on `mtk_soc_eth` |
| <img src="https://img.shields.io/badge/Packages-ab9df2?style=flat-square&labelColor=2d2a2e" alt="Packages"> | `wpad-mbedtls` · `usteer` · `mesh11sd` · full `CONFIG_ALL_KMODS` (don’t pull snapshot `kmod-*` from openwrt.org) |

**Performance defaults** — CPU `performance` · RSS forced · RX coalesce 20 µs · software + hardware flow offload + WED · large TCP buffers · high conntrack — seeded once by `99-milkflint4-flint4-perf`. Change later under **Performance Tuning**; edits stick.

**This is not** stock GL.iNet UI / cloud, not Flint 2 with labels swapped, and not a **6.12** kernel driver tree — this is **6.18** + OpenWrt main `cake_mq` backports.

<h2><span style="color:#ffd866">●</span> Releases</h2>

### 1.1

- **Wi‑Fi roaming** (802.11r/k/v + `usteer`) and **802.11s mesh** (`mesh11sd`) in the MilkFlint UI  
- Image ships `wpad-mbedtls`, `usteer`, `mesh11sd`  
- Everything from **1.0.1**: LCD splash · **1.0**: Flint 4 / 6.18, Monokai milk, MilkFlint userspace defaults  

Notes: [`docs/RELEASE-1.1.md`](docs/RELEASE-1.1.md) · [`docs/RELEASE-1.0.1.md`](docs/RELEASE-1.0.1.md) · [`docs/RELEASE-1.0.md`](docs/RELEASE-1.0.md)

## Install

Flash **only** this from [Releases](https://github.com/REFFIXX/MilkFlint4/releases):

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

Do **not** use a factory / preloader image with GL.iNet recovery — leave the stock bootloader alone.

### From GL.iNet stock

```sh
scp -O milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin root@192.168.8.1:/tmp/
ssh root@192.168.8.1
cat /tmp/sysinfo/board_name    # must print: glinet,gl-be14000
sysupgrade -T /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

SSH drops mid-flash — wait **3–5 minutes**. Or **System → Upgrade → Local Upgrade** with Keep Settings **off**.

### From OpenWrt / MilkFlint4

```sh
sysupgrade -n /tmp/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

First MilkFlint4 flash: don’t keep settings. Later MilkFlint4 → MilkFlint4: keep settings is fine.

### First boot

1. Cable into any `lan2`–`lan9`  
2. `http://192.168.1.1` — empty password → set one under **Admin Password**  
3. Glance at the front panel — logo should be sitting there like it owns the place  
4. Wi‑Fi country defaults to **US** (6 GHz LPI). Use **WPA3** on 6 GHz  
5. WED is on by default; turn on firewall hardware flow offloading when you want Wi‑Fi ↔ WAN off the CPU  

### Back to stock

Reset + power-on → recovery at `http://192.168.1.1` (PC at `192.168.1.2/24`) → vendor image from [dl.gl-inet.com](https://dl.gl-inet.com/).

## Add OpenWrt 25.x access points

MilkFlint4 ships **Wi‑Fi roaming** (802.11r/k/v + `usteer`) and **802.11s mesh** (`mesh11sd`) as first-class **Wi‑Fi** pages — with plain-language “Why?” help and recommended settings.

<p align="center">
  <img src="milkflint/docs/readme/roaming-monokai-dark.png" width="480" alt="Wi-Fi roaming">
  &nbsp;
  <img src="milkflint/docs/readme/mesh-monokai-dark.png" width="480" alt="Mesh">
</p>

Use other OpenWrt **25.12+** boxes as APs — same mobility domain for roaming, same mesh identity for backhaul.

1. Flash each AP with OpenWrt **25.12+** plus `mesh11sd` and full `wpad-mbedtls` (drop `wpad-basic-*`). Firmware Selector → customize packages, e.g. `-wpad-basic-mbedtls wpad-mbedtls mesh11sd ip-full vxlan`.
2. On the Flint 4 **Mesh** page, copy the **first-boot script** (same `auto_mesh_id` / gate SSID / key) and paste it into Firmware Selector’s “Script to run on first boot”, or run it once on a fresh AP.
3. Keep **`portal_detect=1`** on every node. One node with **WAN → ISP** becomes Main/portal; other nodes leave WAN unplugged and become peers. (Do not use `portal_detect=5` unless you need a VXLAN trunk peer.)
4. First-boot scripts start with **`auto_config=0`** (confidence test). After `mesh11sd status` looks healthy, set `auto_config=1` (or `mesh11sd auto_config enable`).
5. On every AP SSID used for clients: match the **mobility domain** and enable 802.11r/k/v; run `usteer` (or rely on the MilkFlint router + matching FT). Do **not** run dawn and usteer together.
6. Stuck? Check channel tracking, power-cycle a confidence-test peer, and don’t hand-edit wireless/network while mesh11sd auto-config owns the mesh.

LuCI stays the escape hatch under **Advanced**.

## Build

```bash
git clone https://github.com/REFFIXX/MilkFlint4.git
cd MilkFlint4
./scripts/feeds update -a && ./scripts/feeds install -a
cp milkflint/diffconfig .config && make defconfig
make download && make -j$(nproc) IGNORE_ERRORS='n m'
```

```text
bin/targets/mediatek/filogic/milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

UI (Node **24** + pnpm **12**):

```bash
cd milkflint/ui && pnpm install && pnpm exec vite build && node scripts/package.ts
```

### Windows (WSL2)

Prefer **WSL2 Ubuntu 24.04** with the tree on **ext4** (`~/src/MilkFlint4`), never `/mnt/c/...`. Install the same apt set as CI (see [`.github/workflows/build-firmware.yml`](.github/workflows/build-firmware.yml)), then feeds → `cp milkflint/diffconfig .config` → `make defconfig` → `make -j$(nproc) world` with `IGNORE_ERRORS='n m'`. For UI-only iteration (seconds): `cd milkflint/ui && pnpm install && pnpm exec vite build`. Full notes: [`docs/DEV-WSL.md`](docs/DEV-WSL.md).

| Path | Role |
|---|---|
| `target/linux/mediatek/` | BE14000 DTS, 6.18 patches, board defaults |
| `package/milkflint/` | UI + MilkFlint packages (incl. LCD splash) |
| `milkflint/ui/` | React source (Monokai milk default) |
| `milkflint/diffconfig` | Build seed |

## Support

* [Releases](https://github.com/REFFIXX/MilkFlint4/releases)  
* [OpenWrt Forum](https://forum.openwrt.org)  
* Upstream: [OpenWrt](https://openwrt.org) · [OddBlueDog MilkFlint](https://github.com/OddBlueDog/openwrt)

## License

GPL-2.0 as OpenWrt / MilkFlint — see `COPYING` and `LICENSES/`.
