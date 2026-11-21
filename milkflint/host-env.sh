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

# Host BPF toolchain (CONFIG_BPF_TOOLCHAIN_HOST): need llvm opt/llc/llvm-dis/
# llvm-strip beside clang. bpf.mk searches dir(clang) first — on Ubuntu
# /usr/bin/clang → llvm-18, so put /usr/lib/llvm-*/bin on PATH (and prefer
# CONFIG_BPF_TOOLCHAIN_HOST_PATH="/usr/lib/llvm-18" in diffconfig).
for _mf_llvm in /usr/lib/llvm-18/bin /usr/lib/llvm-*/bin; do
  if [ -x "$_mf_llvm/opt" ] && [ -x "$_mf_llvm/llvm-dis" ]; then
    case ":$PATH:" in *":$_mf_llvm:"*) ;; *) PATH="$_mf_llvm:$PATH" ;; esac
    export PATH
    break
  fi
done
unset _mf_llvm
for _mf_t in opt llc llvm-dis llvm-strip; do
  if ! command -v "$_mf_t" >/dev/null 2>&1; then
    echo "WARN: '$_mf_t' not in PATH; install llvm (apt: llvm-18) for bridger/BPF" >&2
  fi
done
unset _mf_t

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
