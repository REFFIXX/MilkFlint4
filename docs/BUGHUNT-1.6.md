# MilkFlint4 1.6 — firmware / UI mega bug hunt

Living checklist while shipping LCD Setup + 0.91a ports. Update as items clear.

## UI gate

- [ ] `cd milkflint/ui && PATH=/usr/local/bin:$PATH pnpm check` green
- [ ] DEFAULT_THEME_ID remains `monokai-milk`
- [ ] New pages: LCD Setup, Startup, SSH tabs, LAN Addresses/Connections — load in mock ubus
- [ ] `explain()` present on LCD + SSH + Startup rc.local + LAN tips

## Config-safe

- [ ] `milkflint.lcd` uci-defaults only when missing
- [ ] `/etc/milkflint/devices.json` in conffiles
- [ ] VPN profile migrate (when landed) preserves existing wg_out
- [ ] Keep-settings flash from 1.5 → 1.6 documented

## LCD

- [ ] `lcd-ctl on|off|idle|reload|status`
- [ ] Schedule actions classify in schedules model
- [ ] Idle is timer-only (no touch wake) — documented known limit
- [ ] Hardware soak: boot splash → slideshow → schedule OFF → ON (BE14000)

## Router access / Startup

- [ ] Password-off lockout requires ≥1 key
- [ ] Cannot delete last key while password auth off
- [ ] Critical service stop/disable confirms

## LAN / Clients

- [ ] Leases IPv4+IPv6 searchable
- [ ] Connections degrade gracefully if milkflint.lan missing
- [ ] First-seen 30-day forget
- [ ] Live speed falls back to link rate

## Kernel audit (no blind paste)

- [ ] Follow `docs/AUDIT-1.6-mt76-cake-091a.md`
- [ ] Explicit no-ship for Flint-2-only hunks in RELEASE notes

## Release

- [ ] `CONFIG_VERSION_NUMBER` → `1.6` in milkflint + sim diffconfig
- [ ] `docs/RELEASE-1.6.md` written
