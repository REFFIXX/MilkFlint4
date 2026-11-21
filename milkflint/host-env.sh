# Source before make world on VMs where /usr/bin/cc is clang:
#   . milkflint/host-env.sh
export HOSTCC=gcc
export HOSTCXX=g++
if [ -x /usr/bin/gcc ] && [ "$(readlink -f /usr/bin/cc 2>/dev/null)" != "$(readlink -f /usr/bin/gcc)" ]; then
  echo "WARN: /usr/bin/cc is not gcc; elfutils host build may fail (-lstdc++)" >&2
fi
