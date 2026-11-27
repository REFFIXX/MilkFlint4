# MilkFlint4 1.1.1 — roaming/mesh hardening

Point release on **1.1**. Same Flint 4 / kernel **6.18** base; ships the open-issue mitigations and UI polish that landed right after the 1.1 tag.

## Highlights

- **openwrt#26972:** fixed mac80211 `507` (MLO airtime once + NULL `sinfo` guards) so `ethtool -S` on an AP MLD cannot oops
- **openwrt#26690 / #26691:** keep WAN fan-pulse + bounce hotplugs; add **`milkflint4-wan-watch`** for dual-radio 10G flap storms
- **Wi‑Fi roaming:** persist apply-all / selected SSIDs; reload wifi + usteer after save
- **Mesh peer:** clear Access-point vs `portal_detect=1` (not TPE `5`); WAN warning when peer is selected
- **Why?:** SQM rates, 6 GHz PSC, MU-MIMO, firewall offload, guest isolate
- Everything from [1.1](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.1) (Wi‑Fi roaming + 802.11s mesh) when that tag’s image is available, and from [1.0.1](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.0.1)

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- From MilkFlint4 **1.0 / 1.0.1 / 1.1**: keep settings is fine  
- From GL.iNet / plain OpenWrt: **do not** keep settings (`sysupgrade -n`)

After flash: set a password, open **Wi‑Fi → Mesh** / **Wi‑Fi roaming**, and follow the page help. Dual-radio + 10G WAN overnight soak on a BE14000 completed without flaps/wedges (mitigations in place for still-open upstream #26690/#26691).

## Source

Tag `v1.1.1` on `main`.
