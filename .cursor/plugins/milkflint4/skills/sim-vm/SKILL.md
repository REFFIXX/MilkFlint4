---
name: sim-vm
description: Run or build the MilkFlint Sim x86_64 QEMU appliance for UI and non-Wi-Fi feature testing.
---

# MilkFlint Sim

Use when the user wants a browser-reachable OpenWrt + MilkFlint UI without Flint 4 hardware, or when testing apply/UCI/packages beyond the Node ubus mock.

## Run (preferred)

```bash
sudo apt-get install -y qemu-system-x86   # once
./scripts/milkflint-sim                  # latest release image + boot
```

- UI: `http://127.0.0.1:8080/milkflint/`
- Login: `root` / `milkflint`
- Stop: `./scripts/milkflint-sim stop`
- Docs: `docs/SIM-VM.md`

## Build

```bash
./scripts/milkflint-sim build
./scripts/milkflint-sim start --local ~/.cache/milkflint-sim/milkflint-sim-x86_64-ext4-combined.img.gz
```

## Split testing

| Need | Tool |
| --- | --- |
| Fast UI / forms | `milkflint/ui/scripts/mock-openwrt-ubus.mjs` |
| Real UCI / services | MilkFlint Sim |
| Wi‑Fi / WED / 10G / LCD | GL-BE14000 hardware |

Do not chase filogic/MT7988 under QEMU for UI work.
