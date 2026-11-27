# MilkFlint4 1.1.2 — Codex polish on 1.1.1

Point release on **1.1.1**. Same Flint 4 / kernel **6.18** image content, plus three small correctness fixes from review.

## Fixed

- **WAN watch (openwrt#26690):** carrier flap detection uses a real **60s** window (two 30s samples), so slow dual-radio flap storms still trigger fan pulse + bounce
- **6 GHz PSC help:** Preferred Scanning Channels listed as **5, 21, 37, 53, …** (every 16 channels), not the incorrect 5, 9, 13 sequence
- **Wi‑Fi roaming:** an intentionally empty SSID selection stays empty on reload; save asks you to pick a network or turn All AP networks on

## From 1.1.1

Everything in [1.1.1](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.1.1): roaming, mesh, #26972 / #26690 mitigations, Why? polish, UI bugfixes.

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- From MilkFlint4 **1.0 / 1.0.1 / 1.1.1**: keep settings is fine  
- From GL.iNet / plain OpenWrt: **do not** keep settings (`sysupgrade -n`)

## Source

Tag `v1.1.2` on `main`.
