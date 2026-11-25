#!/bin/sh
# SPDX-License-Identifier: MIT
# MilkFlint: the licenses of the Go modules linked into AdGuard Home, for its
# THIRD-PARTY-NOTICES.txt. Run in the module's source tree with the build's Go
# environment (GOOS/GOARCH, GOMODCACHE...): `go list -deps` of the main package
# lists what the binary is built from, without the modules of AdGuard Home's
# development tools (go.mod's tool block). For each module: its path and
# version, then the text of its LICENSE / LICENCE / COPYING / NOTICE files.
# Usage: notices-go.sh <main package>  (writes to stdout)
set -eu
# (a failed go list would give an empty list: fail instead)
set -o pipefail 2> /dev/null || true

go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}} {{.Version}} {{.Dir}}{{end}}{{end}}' "$1" |
	sort -u > /tmp/notices-go.$$
echo "$(wc -l < /tmp/notices-go.$$) modules"
echo
while read -r path version dir; do
	echo "--- $path $version"
	found=
	# Iterate with a glob so license filenames containing spaces are not
	# word-split (e.g. "LICENSE (MIT).txt").
	for f in "$dir"/[Ll][Ii][Cc][Ee][Nn][CcSs][Ee]* \
		 "$dir"/[Cc][Oo][Pp][Yy][Ii][Nn][Gg]* \
		 "$dir"/[Nn][Oo][Tt][Ii][Cc][Ee]*; do
		[ -f "$f" ] || continue
		cat "$f"
		echo
		found=1
	done
	[ -n "$found" ] || echo "(no license file in the module)"
	echo
done < /tmp/notices-go.$$
rm -f /tmp/notices-go.$$
