# MilkFlint4 0.9 (beta) — Flint 4 / GL-BE14000, kernel 6.18

First **beta** release. Ports OddBlueDog [MilkFlint 0.87a](https://github.com/OddBlueDog/openwrt/releases/tag/milkflint-0.87a) userspace fixes onto our Flint 4 / OpenWrt **main** / **kernel 6.18** tree. Kernel driver patches that are 6.12-only stay out; board handling for `glinet,gl-be14000` and **Monokai milk** stay ours.

## What’s new (from 0.87a, userspace)

### Smart Queue

- **Multi-queue CAKE on Automatic starts from 1 Gbit/s on Ethernet** (DHCP/static), and stays at **500 Mbit/s on PPPoE**. Below that on Ethernet, one CAKE keeps fairness exact; upgrading moves Automatic Ethernet queues below 1 Gbit/s back to one CAKE once (manual multi-queue stays as set).
- **A queue per CPU wherever packet steering spreads a download** (sqm-scripts patch 110): with RSS off or OpenWrt’s layout, Ethernet/VLAN WAN ifbs get one CPU each, as PPPoE already did.
- **CAKE ECN / DSCP** settings are tried again at the next reload if `sch_cake` wasn’t loaded yet.

### VPN

- **Use VPN’s DNS** on Send through a VPN: devices sent through the tunnel look names up with the provider’s DNS (through the tunnel); everyone else keeps the router’s DNS. Works with AdGuard Home; no fallback to the router if the tunnel drops.

### Test Bench & tuning

- Smarter **Smart Queue delay** figures (weighted by tin traffic; quiet seconds no longer reuse stale values).
- A download/upload that stops sending ends as **stalled** after 5 s.
- MU-RU / uplink MIMO-OFDMA controls live with the Wi‑Fi feature (full muru refactor).

## MilkFlint4-specific (kept / tuned)

- **Theme:** default **Monokai milk** (pink / cyan / green on soft milk panels). **Honey milk** stays available. LuCI Advanced uses Footstrap’s matching Monokai milk palette.
- **Board:** `ports` still resolves `wan` / RSS for `glinet,gl-be14000`; packet-steering fallback is `wan`, not `eth1`.
- **WED:** still knows **mt7996e** (Flint 4) as well as mt7915e.
- **Kernel 6.18** stack unchanged from 0.6b (RTL8261C/D, hardware RSS, ALL_KMODS, US 6 GHz LPI, etc.).
- Skipped ODB’s 6.12 Ethernet `qdma_tx_dim` / interrupt-moderation kernel bits — not applicable here.

## Status

**Beta.** Keep a stock GL.iNet recovery image before you flash. Device control and WED remain the same caution areas as upstream MilkFlint.

## Install

Flash only:

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- **From earlier MilkFlint4:** keep settings is fine.
- **From GL.iNet or plain OpenWrt:** do **not** keep settings (`sysupgrade -n`).

After a clean flash: LAN cable → `http://192.168.1.1` → set a password.

## Source

Upstream userspace reference: OddBlueDog `milkflint-0.87a` (`7b3ee522ea`). This tree: MilkFlint4 `main` / tag `v0.9`.
