# MilkFlint4 1.6 — firmware / UI mega bug hunt

Living checklist while shipping LCD Setup + 0.91a ports. Update as items clear.

## UI gate

- [x] `cd milkflint/ui && PATH=/usr/local/bin:$PATH pnpm check` green
- [x] DEFAULT_THEME_ID remains `monokai-milk`
- [x] New pages: LCD Setup, Startup, SSH tabs, LAN Addresses/Connections — load in mock ubus
- [x] `explain()` present on LCD + SSH + Startup rc.local + LAN tips
- [x] Monokai milk walkthrough (mock Vite `:5288`) — LCD preview, VPN, AGH/banIP Updates; SSH mock stubbed

## Config-safe

- [x] `milkflint.lcd` uci-defaults only when missing
- [x] `/etc/milkflint/devices.json` in conffiles
- [x] VPN profile migrate (when landed) preserves existing wg_out
- [x] Keep-settings flash from 1.5 → 1.6 documented (`docs/RELEASE-1.6.md`)
- [x] `/etc/milkflint/vpn-profiles.json` in conffiles

## LCD

- [x] `lcd-ctl on|off|idle|reload|status`
- [x] Schedule actions classify in schedules model
- [x] Idle is timer-only (no touch wake) — documented known limit
- [ ] Hardware soak: boot splash → slideshow → schedule OFF → ON (BE14000)

## Router access / Startup

- [x] Password-off lockout requires ≥1 key
- [x] Cannot delete last key while password auth off
- [x] Critical service stop/disable confirms

## LAN / Clients

- [x] Leases IPv4+IPv6 searchable
- [x] Connections degrade gracefully if milkflint.lan missing
- [x] First-seen 30-day forget
- [x] Live speed falls back to link rate

## Kernel audit (no blind paste)

- [x] Follow `docs/AUDIT-1.6-mt76-cake-091a.md`
- [x] Explicit no-ship for Flint-2-only hunks in RELEASE notes

## Release

- [x] `CONFIG_VERSION_NUMBER` → `1.6` in `milkflint/diffconfig` (no `milkflint/sim/diffconfig` in this tree)
- [x] `docs/RELEASE-1.6.md` written
