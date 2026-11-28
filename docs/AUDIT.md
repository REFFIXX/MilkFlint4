# MilkFlint4 security posture (audit note)

**Scope:** MilkFlint4 firmware for GL.iNet GL-BE14000 (Flint 4), as of the **1.6** tree on `main`  
**Kernel:** Linux **6.18.64** (`target/linux/mediatek`, `KERNEL_PATCHVER=6.18`)  
**Base:** OpenWrt-derived image (LuCI + MilkFlint UI), not a vendor GL.iNet stock build  
**Date:** 28 November 2026  

This note is for operators who ask whether the image is “secure” and whether it includes “all the latest zero-days.” Short answer first, then the evidence.

---

## Bottom line

MilkFlint4 does **not** claim to fix every public CVE or every unpublished exploit the day it appears. No custom router firmware can honestly say that.

What it *does* do:

1. Ship a current OpenWrt-based userland on a **recent mainline kernel series** (6.18.x), not an abandoned 5.x/6.6 vendor fork.
2. Fold in **specific** OpenWrt/hardware fixes we care about for this board (see below).
3. Keep the admin surface on normal OpenWrt controls: `rpcd` sessions, Dropbear, uhttpd/TLS, sysupgrade image checks.
4. Rely on **upstream OpenWrt and Linux** for the bulk of security backports. When those move, we move with them on the next MilkFlint4 rebuild/tag.

If someone needs a signed guarantee of continuous CVE chasing against a fixed LTS line, that is a different product model (and a different staffing commitment) than this project.

---

## What the image is built on

| Layer | What 1.6 uses |
| --- | --- |
| SoC / board | MediaTek MT7988A + MT7996 (Filogic), `glinet_gl-be14000` |
| Kernel | **6.18.64** (hash pinned in `target/linux/generic/kernel-6.18`) |
| Wireless stack | OpenWrt mac80211 + mt76 (board packages `kmod-mt7996*`) |
| Web UI | MilkFlint React shell + LuCI under Advanced |
| TLS for LuCI/UI | `luci-ssl` / uhttpd (mbedtls path) |
| Wi‑Fi auth | `wpad-mbedtls` (full wpad) |

Rebuilds are public: GitHub Actions on version tags (`v*`), release notes under `docs/RELEASE-*.md`, binaries on GitHub Releases.

---

## How security updates actually arrive

OpenWrt’s own security page is clear: project advisories cover OpenWrt-maintained pieces; the project also tracks upstream Linux and libraries and pulls fixes by **updating those components**, rather than publishing a CVE blog for every kernel issue.

MilkFlint4 follows that model:

- **Kernel and core packages** — refreshed when we rebase/rebuild on newer OpenWrt/`main` and bump the 6.18.x point release.
- **MilkFlint-specific patches** — carried in-tree (mac80211, WAN PHY mitigations, UI/rpcd behaviour).
- **AdGuard Home** — packaged by MilkFlint; AGH’s self-updater is disabled (`--no-check-update`). Package bumps go through firmware (and, where wired, the `@milkflint` apk feed).
- **banIP** — blocklists refresh on the device; the banIP *package* usually moves with firmware.

There is no separate “MilkFlint4 CVE feed” that promises same-day zero-day coverage independent of those rebuilds.

---

## Board- and tree-specific hardening / fixes (examples)

These are concrete items in this repository, not marketing claims:

| Area | What we did | References |
| --- | --- | --- |
| MLD / mac80211 crash | mac80211 patch 507 corrected so NULL / `valid_links` guards apply on 6.18 backports | openwrt#26972; patch under `package/kernel/mac80211/patches/` |
| 10G WAN flap storms | Hotplug + `milkflint4-wan-watch` mitigations (carrier / ifdown windows) | openwrt#26690 / #26691; Filogic `base-files` |
| Firmware install | Upload runs `sysupgrade --test` (image fit for this board) and shows a SHA-256 for **manual** comparison with the release page; the router does not fetch a trusted digest itself. Optional force (`-F`) is explicit | `package/milkflint/milkflint-ui/files/features/upgrade/rpcd.uc` |
| SSH lockout | UI refuses to clear the last authorized key while password auth is off; rejects private-key paste into `authorized_keys` | `…/features/ssh/rpcd.uc` |
| HTTPS | Certificate management through uhttpd; redirect/listen via UCI | `…/features/https/rpcd.uc` |
| Admin password state | UI can detect unset root password (OpenWrt factory default) and push the user to set one | `…/features/admin-password/rpcd.uc` |

Kernel audit for mt76/CAKE cherry-picks from other MilkFlint lines is documented separately (`docs/AUDIT-1.6-mt76-cake-091a.md`): those hunks are **not** blindly pasted into this 6.18 / MT7988 tree.

---

## Attack surface (honest inventory)

**Always assume LAN is a trust boundary until you lock it down.**

1. **Web UI / LuCI / ubus** — Authenticated after login. A fresh flash can have an **empty root password** (same as stock OpenWrt): until a password is set, login behaviour is the usual OpenWrt weak default. Set a strong password on first boot; prefer HTTPS on the LAN.
2. **SSH (Dropbear)** — Present for administration. Prefer keys; do not expose to the WAN without a clear need.
3. **DNS / AdGuard Home / banIP / VPN** — Optional services. Misconfiguration (e.g. management UI on WAN) is an operator issue, not fixed by a slogan in release notes.
4. **Package feeds** — apk repositories (including `@milkflint` when configured) are a trust path. Prefer signed indexes from the project’s published feed; treat random third-party repos as high risk.
5. **Sysupgrade `-F` / force** — Exists for recovery. Using it skips safety checks; only for known-good images.
6. **Wi‑Fi** — Security depends on WPA3/WPA2 settings the user chooses; we ship a full `wpad-mbedtls`, not a stripped mini authenticator.

Remote “zero-click from the internet” risk is dominated by **what you expose on WAN**, not by the Home dashboard layout.

---

## What we will *not* claim

- That MilkFlint4 includes every CVE fixed in the latest OpenWrt **25.12.x service release** the same day that release ships. This tree tracks a **6.18 / mainline-style** Filogic build; alignment is by rebase and tag, not by cherry-picking every stable service release announcement unread.
- That unpublished or embargoed exploits are already mitigated.
- That third-party packages (AdGuard Home upstream, banIP feeds, WireGuard configs you import) are free of their own bugs.
- That a security audit of this depth replaces a full third-party penetration test.

---

## Recommendations for cautious users

1. Set the **root / UI password** before putting the router into service.
2. Keep **SSH and the web UI off the WAN** unless you know why they are there; use VPN or a jump host if you need remote admin.
3. Turn on **HTTPS** for the UI on the LAN.
4. Install MilkFlint4 images only from **GitHub Releases** for this repository. Before confirming an upgrade, compare the UI’s SHA-256 with the hash on the release page (or `sha256sum` on the file you downloaded).
5. When OpenWrt or MilkFlint4 publish a security-relevant rebuild, **upgrade**—do not stay on a months-old tag “because it still works.”
6. For Wi‑Fi, use modern WPA3/WPA2-PSK settings and avoid open or WEP/WPA networks.

---

## How to verify what you are running

On the router (SSH):

```sh
cat /etc/openwrt_release
uname -r
# expect a 6.18.x kernel on current MilkFlint4 1.x images
```

In the UI: System / About (or equivalent) should show the MilkFlint4 version string from `CONFIG_VERSION_NUMBER` (e.g. **1.6**).

Source and release notes: `https://github.com/REFFIXX/MilkFlint4` — tags `v*`, docs under `docs/RELEASE-*.md`.

---

## Revision

| Rev | Date | Notes |
| --- | --- | --- |
| 1 | 2026-11-28 | Initial public posture note for the 1.6 tree (kernel 6.18.64). |

Questions or vulnerability reports: use the repository issue tracker. Do not expect same-day private bounty SLAs from this project unless that is arranged separately.
