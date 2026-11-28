# MilkFlint Sim (x86_64 QEMU)

A **browser-reachable OpenWrt appliance** with the real MilkFlint UI and soft services (SQM, DNS, VPN, banIP, usteer/mesh *packages*). No Flint 4 Wi‑Fi, WED, 10G WAN, or LCD — those stay on hardware.

## Quick start (WSL / Linux)

```bash
# once: QEMU
sudo apt-get install -y qemu-system-x86

# fetch latest published sim image + boot
./scripts/milkflint-sim

# open
xdg-open http://127.0.0.1:8080/milkflint/   # or your browser
# login: root / milkflint
```

Useful commands:

```bash
./scripts/milkflint-sim status
./scripts/milkflint-sim stop
./scripts/milkflint-sim start --port 8080
./scripts/milkflint-sim start --local ~/.cache/milkflint-sim/milkflint-sim-x86_64-ext4-combined.img.gz
```

SSH (debug): `ssh -p 2222 root@127.0.0.1`

## Vite against the guest

```bash
cd milkflint/ui
MILKFLINT_VM=http://127.0.0.1:8080 pnpm exec vite
# http://127.0.0.1:5288/milkflint/
```

## Build from this tree

Full OpenWrt world build (hours on first run):

```bash
./scripts/milkflint-sim build
./scripts/milkflint-sim start --local ~/.cache/milkflint-sim/milkflint-sim-x86_64-ext4-combined.img.gz
```

Config: `milkflint/sim/diffconfig`  
Rootfs overlay: `milkflint/sim/files/` (hostname `MilkFlint-Sim`, password `milkflint`, `/etc/milkflint-sim` marker)

## CI / “always latest”

Workflow: `.github/workflows/build-sim.yml`

- `workflow_dispatch` — manual sim build
- Tag `v*` — builds sim in parallel with firmware and uploads  
  `milkflint-sim-x86_64-ext4-combined.img.gz` onto the same GitHub release

`./scripts/milkflint-sim` always pulls that asset from the **latest** release.

## What to test where

| Surface | Use |
| --- | --- |
| Layout / forms / themes (seconds) | Node mock — `docs/DEV-WSL.md` |
| Apply, UCI, packages, VPN/DNS/SQM/admin | **MilkFlint Sim** (this doc) |
| Wi‑Fi 7 / WED / 10G / LCD / fan | Real **GL-BE14000** |

## Agent notes

Prefer Sim over guessing ubus shapes when the mock is insufficient. Do not target filogic/MT7988 under QEMU for UI work.
