# Source before make world on VMs where /usr/bin/cc is clang:
#   . milkflint/host-env.sh && make -j$(nproc) world
#
# OpenWrt sets HOSTCC:=$(STAGING_DIR_HOST)/bin/gcc (rules.mk), so the
# staging symlink must point at real GNU gcc — not /usr/bin/cc→clang.
# Clang-as-cc OOMs gcc Ada probe ("checking whether compiler driver
# understands Ada...") on 16G builders.

_MF_ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
_MF_HOST_BIN="${_MF_ROOT}/staging_dir/host/bin"

# Prefer gcc-14 when present (Ubuntu 24.04 cloud images).
if [ -x /usr/bin/gcc-14 ]; then
  export HOSTCC=/usr/bin/gcc-14
  export HOSTCXX=/usr/bin/g++-14
elif [ -x /usr/bin/gcc ]; then
  export HOSTCC=/usr/bin/gcc
  export HOSTCXX=/usr/bin/g++
else
  export HOSTCC=gcc
  export HOSTCXX=g++
fi

# Host BPF toolchain (CONFIG_BPF_TOOLCHAIN_HOST): need llvm opt/llc/llvm-strip,
# not just clang. Ubuntu package: llvm (provides /usr/bin/opt).
if ! command -v opt >/dev/null 2>&1; then
  echo "WARN: 'opt' not in PATH; install llvm for bridger/BPF packages" >&2
fi

if [ -x /usr/bin/gcc ] && [ "$(readlink -f /usr/bin/cc 2>/dev/null)" != "$(readlink -f /usr/bin/gcc)" ]; then
  echo "WARN: /usr/bin/cc is not gcc; fixing staging host gcc/g++/cc -> ${HOSTCC}" >&2
fi

# Keep staging wrappers on real gcc even if prereq linked them to clang.
if [ -d "$_MF_HOST_BIN" ]; then
  ln -sfn "$HOSTCC" "$_MF_HOST_BIN/gcc"
  ln -sfn "$HOSTCXX" "$_MF_HOST_BIN/g++"
  ln -sfn "$HOSTCC" "$_MF_HOST_BIN/cc"
fi
unset _MF_ROOT _MF_HOST_BIN
