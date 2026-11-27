#!/usr/bin/env bash
# Sync the in-repo milkflint4 Cursor plugin into ~/.cursor/plugins/local/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/.cursor/plugins/milkflint4"
DEST="${HOME}/.cursor/plugins/local/milkflint4"
if [[ ! -d "$SRC" ]]; then
  echo "missing plugin source: $SRC" >&2
  exit 1
fi
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
if command -v rsync >/dev/null 2>&1; then
  mkdir -p "$DEST"
  rsync -a --delete "$SRC/" "$DEST/"
else
  cp -a "$SRC" "$DEST"
fi
echo "Synced milkflint4 plugin → $DEST"
