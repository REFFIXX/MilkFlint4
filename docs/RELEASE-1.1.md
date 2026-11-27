# MilkFlint4 1.1 — Wi‑Fi roaming + 802.11s mesh

Feature release on **1.0.1**. Same Flint 4 / kernel **6.18** base; the image now ships multi‑AP roaming and mesh as first-class MilkFlint pages.

## Highlights

- **Wi‑Fi roaming:** 802.11r / 802.11k / 802.11v + `usteer`, shared mobility domain, “Why?” hints with recommended settings (**Wi‑Fi → Wi‑Fi roaming**)
- **802.11s mesh:** `mesh11sd` Main / peer roles, shared identity, live topology, first-boot script to deploy more OpenWrt **25.12+** APs (**Wi‑Fi → Mesh**)
- **Image packages:** `wpad-mbedtls`, `usteer`, `mesh11sd` (+ helpers) in the default build
- **Milk4 mark** in the UI; **Monokai milk** remains the default theme
- Everything from [1.0.1](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.0.1) (LCD splash) and [1.0](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.0)

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- From MilkFlint4 **1.0 / 1.0.1**: keep settings is fine  
- From GL.iNet / plain OpenWrt: **do not** keep settings (`sysupgrade -n`)

After flash: set a password, open **Wi‑Fi → Mesh** / **Wi‑Fi roaming**, and follow the page help to add OpenWrt 25.x APs.

## Source

Tag `v1.1` on `main`.
