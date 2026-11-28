# MilkFlint4 1.6 — LCD Setup + 0.91a UX ports

A **major** release that puts the Flint 4 front panel under user control and
pulls the high-value OddBlueDog **milkflint-0.91a** UX patterns onto
**GL-BE14000**, without pasting Flint 2 kernel hunks.

Flash this if you are on **1.5** (or earlier 1.x). Keep settings is fine from
MilkFlint4 **1.0+**.

---

## Why 1.6

1.5 fixed roaming, Home rates, country, and 10G WAN mitigations. 1.6 ships the
next product layer users asked for after soak:

- **LCD Setup** — slideshow, ON / OFF / Idle, and schedule hooks for the
  320×240 ST7789P3 panel
- **Router depth** — SSH + keys, Startup / `rc.local`, LAN leases + live
  connections, first-seen + live device speed
- **VPN client** — named profiles, dead-tunnel honesty, sites that stay direct
- **Usage + Updates honesty** — optional last-24h history; AGH/banIP Updates
  cards that point at firmware releases (no fake package feed)

Theme everywhere remains **Monokai milk**.

---

## Highlights

### LCD Setup (Wave 1)
- New System page `#/lcd-setup` with `explain()` tips and a live 320×240 preview
- UCI `milkflint.lcd` (one `list` value per slide) created **only when missing**
- Modes: **On** (slideshow), **Off** (blank), **Idle** (lit for N minutes, then blank)
- Schedules actions: LCD on / off / idle → `/usr/libexec/milkflint/lcd-ctl …`
- Known limit: Idle is **timer-only** on this board (no touch wake yet)

### Router access & Startup
- SSH settings + SSH keys tabs beside Password / HTTPS
- Lockout-safe: cannot turn password auth off with zero keys; cannot delete the
  last key while password auth is off
- Startup page: enable/disable/start/stop with confirms for critical services;
  Local startup editor for `/etc/rc.local`

### LAN & All devices
- LAN **Addresses** + **Connections** (IPv4/IPv6 leases, searchable conntrack)
- First-seen kept in `/etc/milkflint/devices.json` (conffile), forgotten after
  **30 days** of silence
- Live device speed from traffic counters with link-rate fallback

### VPN client
- Named WireGuard **profiles** in `/etc/milkflint/vpn-profiles.json` (conffile);
  migrate preserves an existing `wg_out` as the first profile
- Dead-tunnel watch (`vpn-dead.uc`) + clear Home/VPN copy when the handshake
  goes stale; kill-switch semantics stay honest
- **Sites that go direct** via dnsmasq-full `nftset` bypass (image now ships
  `dnsmasq-full` + `nftset`)

### Data usage & package Updates
- Optional **Last 24 hours** history (off by default; 5‑min samples under `/tmp`)
- Shared **Package updates** card on AdGuard Home and banIP: installed apk
  version + “upgrade firmware” path — **no Check against a missing feed**

### Kernel audit (explicit no-ship)
- `docs/AUDIT-1.6-mt76-cake-091a.md`: treat 0.91a mt76 / hostapd / CAKE deltas
  as audit candidates only
- **No** blind paste of Flint 2 / OpenWrt 25.12.6 kernel hunks into this 6.18 /
  MT7988 tree

---

## From 1.5 (still in this image)

- Roaming / mesh correctness, Home MLO-safe rates, PSC help, 10G WAN mitigations
- Kernel **6.18**, board **GL-BE14000**

---

## Screens / video (dark Monokai milk)

Walkthrough and stills for forum posts and release notes:

[`docs/media/1.6-monokai-dark/`](media/1.6-monokai-dark/) — video + Home / LCD Setup / Startup / SSH / LAN / VPN / AdGuard Home

---

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```


| From | Keep settings? |
|---|---|
| MilkFlint4 **1.0 / 1.0.1 / 1.1.x / 1.5** | Yes — new UCI (`milkflint.lcd`) and JSON conffiles only appear when missing |
| GL.iNet / plain OpenWrt | **No** — `sysupgrade -n` |

## Source

Tag `v1.6` on `main` (`CONFIG_VERSION_NUMBER=1.6`).
