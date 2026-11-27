# Building MilkFlint4 on Windows (WSL2)

Full firmware builds need a Linux tree on a native ext4 filesystem. Use **WSL2 Ubuntu 24.04**; keep the clone under the Linux home directory, not a `/mnt/c` bind-mount.

Native Windows / NTFS / Docker Desktop bind-mounts from `C:\` are out of scope — path case, file locking, and I/O throughput will waste hours.

## 1. WSL2 + clone on ext4

```powershell
wsl --install -d Ubuntu-24.04
```

Inside Ubuntu:

```bash
sudo apt-get update
mkdir -p ~/src && cd ~/src
git clone https://github.com/REFFIXX/MilkFlint4.git
cd MilkFlint4
```

Confirm you are not on DrvFs:

```bash
df -T .   # expect ext4 (or similar), not 9p/drvfs
```

## 2. Apt dependencies (match CI)

Same packages as [`.github/workflows/build-firmware.yml`](../.github/workflows/build-firmware.yml):

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential clang-18 llvm-18 lld-18 flex bison g++ gawk \
  gcc-multilib g++-multilib gettext git libncurses-dev libssl-dev \
  python3 python3-setuptools rsync unzip zlib1g-dev file wget cpio \
  nodejs npm
```

Optional but recommended:

```bash
sudo apt-get install -y ccache
export PATH="/usr/lib/ccache:$PATH"
```

Node **24** + **pnpm 12** for the UI (Corepack or a manual install is fine):

```bash
sudo npm install -g pnpm@12
# or: corepack enable && corepack prepare pnpm@12 --activate
```

## 3. Feeds + configure + world

```bash
cd ~/src/MilkFlint4
./scripts/feeds update -a
./scripts/feeds install -a
cp milkflint/diffconfig .config
make defconfig
make -j"$(nproc)" world V=s IGNORE_ERRORS='n m'
```

Images land under:

```text
bin/targets/mediatek/filogic/*glinet_gl-be14000*.bin
```

First `world` is multi-hour on a typical laptop; rebuilds with ccache are much faster. `IGNORE_ERRORS='n m'` matches CI so unused ALL_KMODS packaging gaps do not block the sysupgrade image.

## 4. UI-only loop (seconds)

For Roaming / Mesh / theme work you rarely need a full flash:

```bash
cd ~/src/MilkFlint4/milkflint/ui
pnpm install
pnpm exec vite build
node scripts/package.ts
```

Copy the packaged `htdocs` into a running image’s `milkflint-ui` package tree when iterating on-device, or flash a full image after packages settle.

## 5. What this image includes for roaming + mesh

`milkflint/diffconfig` forces:

- `wpad-mbedtls` (full wpad — 802.11k/r/v)
- `usteer` (not dawn)
- `mesh11sd` plus `ip-full`, `vxlan`, `kmod-nft-bridge`

Configure them from the MilkFlint **Wi‑Fi → Wi‑Fi roaming** and **Wi‑Fi → Mesh** pages (OpenWrt 25.x / MilkFlint4 only). Mesh first-boot scripts start with `auto_config=0` (confidence test) and `portal_detect=1` (ordinary portal/peer auto-detect).

## UI simulator (no router required)

For Roaming / Mesh page work without a Flint 4:

```bash
cd milkflint/ui
node scripts/mock-openwrt-ubus.mjs          # :8088 simulated OpenWrt 25.x ubus
MILKFLINT_VM=http://127.0.0.1:8088 pnpm exec vite   # :5288 MilkFlint UI
# optional: node scripts/verify-roaming-mesh-sim.mjs
```

Open `http://127.0.0.1:5288/milkflint/` — password any. Seeded tri-band APs, usteer neighbors, and mesh peers.
