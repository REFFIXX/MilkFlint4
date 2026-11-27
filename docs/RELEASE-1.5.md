# MilkFlint4 1.5 — Flint 4 correctness major

A **major** release focused on fixing what 1.1.x shipped and soak-tested. Same board (**GL-BE14000**), same kernel (**6.18**), same roaming + mesh story — made reliable.

Flash this if you are on **1.1.1 / 1.1.2** (or earlier 1.x). Keep settings is fine from MilkFlint4 1.0+.

---

## Why 1.5

1.1.x landed roaming, mesh, MLD oops guards, and the 10G WAN watchdogs. A full-stack audit (UI + board scripts + OpenWrt issue cross-check) found several correctness bugs that deserved a major bump rather than another point release:

- Roaming could **lie** about status and about which SSID’s FT settings you were editing
- Home traffic rates could **spike or blank** for MLO / multi-radio clients
- Flint 4’s intended **US** Wi‑Fi country (and 6 GHz LPI path) never applied after the generic wifi seed wrote **GB**
- The iface hotplug “flap counter” for openwrt#26690 almost never tripped in real ifdown↔ifup storms

---

## Highlights

### Roaming & mesh that match the UI
- Status card accepts usteer `null` neighbor fields (no more empty Status)
- FT/k/v form samples the **selected** network when “All AP networks” is off
- Deselecting a network turns **off** FT/k/v there (not only on the kept ones)
- Guest SSIDs filtered by `network=guest|guest2|guest3`, not a name substring
- Failed Apply **keeps** your edits (Mesh + Roaming)
- Mesh first-boot script sets `milkflint.mesh.role` so Access point nodes open as **peer**
- Mesh seed no longer forces `auto_config=0` over an existing mesh11sd setup

### Home & All devices
- Home MAC dedupe **sums** per-link bytes before rate math (MLO-safe)
- All devices keeps the **strongest** Wi‑Fi link for a MAC seen on several radios

### 6 GHz on Flint 4
- Why? recommends a **PSC** (default **37**), not Auto — ACS on dual MLD can deadlock
- Channel picker labels Preferred Scanning Channels with `· PSC`

### 10G WAN recovery (openwrt#26690 / #26691)
- Hotplug: real **60s** flap window, no reset on every ifup, `INTERFACE=wan` only (not wan6), count **phys** not BSS netdevs, cold-boot recovery once per boot
- `milkflint4-wan-watch`: wait for `wan` (respawn if missing); same phys counting
- Country: treat first-boot `GB` as overridable → **US**; migrate boxes stuck all-`GB` with the old flag

---

## From 1.1.x (still in this image)

- Wi‑Fi → Wi‑Fi roaming (802.11r/k/v + usteer) and 802.11s mesh (mesh11sd)
- Fixed mac80211 patch 507 for [openwrt#26972](https://github.com/openwrt/openwrt/issues/26972) (MLD `ethtool -S` oops) — hunk line counts corrected so the #26972 NULL/`valid_links` guards apply cleanly on backports 6.18
- WAN watch 60s sample window, PSC help text, empty-SSID save guard from 1.1.2

---

## Still deferred

| Item | Notes |
|---|---|
| Real PHY/PCS fix for #26690 / #26691 | Upstream still open — we ship mitigations |
| mt76 rebase past 2026-10-08 pin | Needs WED / MU regression plan |
| Dynamic DNS on Remote access | Still “Coming soon” |

---

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

| From | Keep settings? |
|---|---|
| MilkFlint4 **1.0 / 1.0.1 / 1.1.x** | Yes |
| GL.iNet / plain OpenWrt | **No** — `sysupgrade -n` |

## Source

Tag `v1.5` on `main`.
