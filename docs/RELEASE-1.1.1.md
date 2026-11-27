# MilkFlint4 1.1.1 — roaming, mesh & Flint 4 hardening

Feature + hardening release on **1.0.1**. Same GL-BE14000 / kernel **6.18** base. This is the image to flash: the earlier `v1.1` tag was dropped so roaming/mesh and the follow-up fixes ship together here.

## What’s new

### Wi‑Fi roaming
- First-class **Wi‑Fi → Wi‑Fi roaming** page
- **802.11r / 802.11k / 802.11v** plus **usteer** steering
- Shared **mobility domain**; apply to all AP SSIDs or pick interfaces
- Settings **persist** (`milkflint.roaming`); save **reloads** wifi + usteer
- “Why?” help with recommended defaults

### 802.11s mesh
- First-class **Wi‑Fi → Mesh** page on **mesh11sd**
- Main · auto / Main · fixed / Access point roles, shared identity, live peers
- First-boot script to deploy more OpenWrt **25.12+** APs
- Clear **Access point** semantics: UI role vs `portal_detect=1` (not TPE `5`); WAN warning when peer is selected

### Image packages
- `wpad-mbedtls`, `usteer`, `mesh11sd` (+ helpers) in the default build

### Look & docs
- **Monokai milk** README / gallery polish (Hardware cyan, Features pink, image labels green)
- **Milk4** mark in the UI; Monokai milk remains the default theme

## Fixed & hardened

### Upstream OpenWrt (own mitigations — issues still open upstream)
- **[openwrt#26972](https://github.com/openwrt/openwrt/issues/26972)** — fixed mac80211 `507` (MLO airtime once + NULL `sinfo` guards) so `ethtool -S` on an AP MLD cannot oops
- **[openwrt#26690](https://github.com/openwrt/openwrt/issues/26690) / [#26691](https://github.com/openwrt/openwrt/issues/26691)** — keep WAN fan-pulse + bounce hotplugs; add **`milkflint4-wan-watch`** for dual-radio 10G flap storms; cold-boot PHY retry kept

### UI
- Mesh / Roaming **LoadError** “Try again” was dead (`onRetry` → `retry`)
- Home **duplicate React keys** for the same client MAC on multiple radios (dedupe by strongest signal)
- Wi‑Fi menu order: Nearby no longer clashes with Mesh

### Why? (hurtful knobs)
- SQM download/upload rates, 6 GHz PSC channel copy, MU-MIMO, firewall software/hardware offload, guest isolate (plus existing Tuning / VPN DNS / country)

### Soak
- Dual-radio + 10G WAN overnight on a BE14000: **no flaps/wedges** observed (mitigations in place; upstream PHY/PCS fix still pending)

## From earlier releases
- Everything in [1.0.1](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.0.1) (LCD splash) and [1.0](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.0)

## Not in this image (on purpose)
- **mt76 rebase** to OpenWrt 2026-10-28+ — deferred (pin stays **2026-10-08**; WED/MU regression risk)
- Real upstream fix for #26690/#26691 — still watch OpenWrt; we ship mitigations only

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- From MilkFlint4 **1.0 / 1.0.1**: keep settings is fine  
- From GL.iNet / plain OpenWrt: **do not** keep settings (`sysupgrade -n`)

After flash: set a password, open **Wi‑Fi → Mesh** and **Wi‑Fi roaming**, and follow the page help.

## Source

Tag `v1.1.1` on `main` (`CONFIG_VERSION_NUMBER=1.1.1`).
