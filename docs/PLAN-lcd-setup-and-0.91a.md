# Plan: LCD Setup + OddBlueDog milkflint-0.91a pull

Product plan for MilkFlint4 on **GL-BE14000 (Flint 4)**. Theme everywhere: **Monokai milk**. Config-safe upgrades stay non-negotiable.

Related: [milkflint-0.91a](https://github.com/OddBlueDog/openwrt/releases/tag/milkflint-0.91a) (Flint 2 / OpenWrt 25.12.6 — ideas only, not a paste).

---

## Where we are

| Piece | Today |
|---|---|
| Front panel | `milkflint4-lcd-splash` paints MilkFlint4 logo on `/dev/fb0` (320×240 RGB565, ST7789P3 via DRM/`panel-mipi-dbi`) and leaves it on |
| UI | No LCD page; no user control of what the panel shows |
| Schedules | Root crontab actions: reboot, Wi‑Fi off/on, banIP update, custom commands — **no LCD actions** |
| Theme | Default `monokai-milk` |

User feedback (2026-11-28): latest flash kept existing config with no error; wants custom device-status **slideshow**, **ON / OFF / Idle** scheduling, and a new menu **LCD Setup** with help tips.

Continual Learning already encoded those prefs into `AGENTS.md`, `.cursor/rules/milkflint4-ux-prefs.mdc`, and the milkflint4 plugin `ui-check` skill.

---

## Wave 1 — LCD Setup (ship first)

### 1. New menu: LCD Setup

- Feature id `lcd-setup`, System group, route `#/lcd-setup`
- Register in `ids.ts` / `index.ts` / `keywords.ts` like every other feature
- Every control uses `explain()` / hint split (“Why?”) so hardware UX is self-explanatory
- Live **preview** of the current frame (scaled 320×240) in Monokai milk tokens — same palette as the panel paint

### 2. Panel power: ON / OFF / Idle

| Mode | Behavior |
|---|---|
| **ON** | Panel active; shows splash and/or slideshow |
| **OFF** | Blank framebuffer + backlight off (sysfs blank / PWM as available) |
| **Idle** | After N minutes with no activity (touch / optional “motion” proxy), dim then blank; wake restores last mode |

UCI sketch (keep defaults so keep-settings flash stays safe):

```text
config lcd 'lcd'
  option enabled '1'
  option mode 'on'          # on | off | idle
  option idle_minutes '10'
  option slideshow '1'
  option dwell_seconds '8'
  # One `list` per value — a single line with many values is not valid UCI.
  list slides 'splash'
  list slides 'wan'
  list slides 'wifi'
  list slides 'clients'
  list slides 'vpn'
  list slides 'system'
```

Backend: evolve `milkflint4-lcd-splash` → small **lcdd** (or procd script + painter) that:

1. Respects UCI
2. Cycles RGB565 frames for the slideshow
3. Honors blank/unblank
4. Survives reboot with the same config

### 3. Schedules integration

Extend Scheduled tasks actions:

- **LCD on** → `/usr/libexec/milkflint/lcd-ctl on`
- **LCD off** → `… off`
- **LCD idle** → `… idle`

Reuse the existing crontab model (`actions` in `schedules/model.ts` + any uci-defaults migration). Keep plain crontab lines so LuCI Scheduled Tasks stay compatible.

### 4. Slideshow content (the “mirror”)

Curated slides (user toggles + reorders):

1. **Brand splash** — Monokai milk logo (today’s art)
2. **WAN** — up/down, IPv4, rough rate
3. **Wi‑Fi** — per-band client counts (2.4 / 5 / 6)
4. **Clients** — busiest device name + live speed
5. **VPN** — on/off, kill-switch state
6. **System** — uptime, CPU/temp/fan if cheap to read

Polish bar: smooth fade/crossfade between frames, readable type at arm’s length, no clutter cards on glass.

### 5. Verification

- Unit tests for UCI→ctl mapping and schedule action kinds
- Mock ubus / sim path for UI preview
- `pnpm check` in `milkflint/ui`
- On hardware: boot splash → slideshow → schedule OFF overnight → ON morning; keep-settings flash must not blank the panel forever

---

## Wave 2–3 — What to pull from milkflint-0.91a

0.91a is for **Flint 2**. Prefer UX and router-side patterns; treat kernel Wi‑Fi/CAKE deltas as audit candidates only.

### Build soon (high user value on Flint 4)

| 0.91a item | MilkFlint4 gap | Cool for users |
|---|---|---|
| **SSH + SSH keys** (Router access tabs) | Password/HTTPS only; no Dropbear UI / key table | Paste/drop `.pub`, fingerprint, lockout-safe (can’t disable passwords with zero keys) |
| **Startup** page | No services / `rc.local` page | Start/stop/enable with “this will break the router” confirms |
| **LAN & DHCP** leases + **live connections** | LAN = address pool; leases live elsewhere | One place: leases, SLAAC seen, searchable connections + light graph |
| **First seen** + **live speed** | Clients/Home lack durable first-seen | Feeds All devices **and** LCD Clients slide |
| **Busiest devices** All / Wi‑Fi / LAN | Wi‑Fi-centric busy list | Wired speeds from conntrack — matches Flint 4’s 10G story |

### Nice next

| 0.91a item | Notes |
|---|---|
| **VPN profiles** + rename/switch | We have WireGuard + kill switch; multi-profile is the missing “USA / France” UX |
| **VPN server dead** behavior | Clear Home/VPN copy when tunnel stops answering; keep kill-switch semantics honest |
| **Sites that go direct** | Split-tunnel domains with CDN caveats explained in tips |
| **Last 24 hours** data usage | Done on this branch: off by default; 5‑min samples in `/tmp`; delete on disable |
| **Sortable tables / shared charts** | Adopt table/chart patterns; **keep** our hash router (do not wholesale migrate to TanStack Router) |
| **Ethernet port hover** detail | Home widget: link speed, likely cable limit, errors |

### Consider later / needs packaging

| 0.91a item | Why wait |
|---|---|
| AGH + banIP **Updates card** from MilkFlint feed | Needs MilkFlint4’s own versioned feed + pin story |
| Dropbear **2026.94** / PQ KEX | Track OpenWrt main; bump when our tree’s Dropbear does |
| **mt76 / hostapd / CAKE** patches from 0.91a | Different board + kernel; cherry-pick only with WED/MU regression plan |

### Skip or translate carefully

- Flint 2–only image / feed pins
- Blind TanStack Router rewrite (we route on `#/<featureId>`)
- Anything that breaks keep-settings from 1.0+

---

## Suggested ship tags (conceptual)

1. **LCD Setup MVP** — page + ON/OFF/Idle + schedule actions + splash still default
2. **LCD slideshow** — frames + preview + Monokai on glass
3. **Router access 0.91a-parity** — SSH keys + Startup
4. **Devices/LAN depth** — first-seen, live speed, connections
5. **VPN profiles + bypass + dead-tunnel UX**
6. **Usage history + Updates card** when packaging allows

Exact version numbers stay in `milkflint/diffconfig` + `docs/RELEASE-*.md` when we cut tags.

---

## Implementation map (agents)

| Layer | Touch |
|---|---|
| Package | `package/milkflint/milkflint4-lcd-splash/` → ctl + slideshow painter |
| UCI | `milkflint.lcd` defaults + careful migration |
| Schedules | `milkflint/ui/src/features/schedules/{model,page}.ts(x)` + crontab commands |
| UI | new `milkflint/ui/src/features/lcd-setup/` |
| Docs | this plan; release notes when shipping |
| Gate | `cd milkflint/ui && pnpm check` |

Research path: Context.dev for OpenWrt/panel; Context7 for React/Vitest; Continual Learning / Supermemory for durable prefs (Monokai, tips, config-safe).
