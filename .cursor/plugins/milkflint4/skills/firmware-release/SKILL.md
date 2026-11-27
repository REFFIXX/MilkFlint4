---
name: firmware-release
description: Prepare or verify a MilkFlint4 firmware version tag and GitHub Actions release build for GL-BE14000.
---

# Firmware release

1. Confirm `CONFIG_VERSION_NUMBER` in `milkflint/diffconfig` matches the intended tag (e.g. `1.1.2` → tag `v1.1.2`).
2. Ensure `docs/RELEASE-<version>.md` exists and matches the changelog intent.
3. Tag push triggers **Build GL-BE14000 firmware**; watch with `gh run list --workflow=build-firmware.yml` and/or CI subscriptions.
4. Release assets appear only after the **Publish release (tags only)** step succeeds. Until then `gh release view vX.Y.Z` may 404.
5. Image name pattern: `milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin`.
6. Save notable release/CI facts to Supermemory (project scope) when the user cares about follow-up.
