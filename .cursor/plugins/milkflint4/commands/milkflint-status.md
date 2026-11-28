---
name: milkflint-status
description: Snapshot MilkFlint4 firmware CI runs and GitHub releases for recent version tags
---

Run and summarize:

```bash
gh run list --workflow=build-firmware.yml --limit 8
gh run list --workflow=build-sim.yml --limit 5
gh release list --limit 8
./scripts/milkflint-sim status || true
```

For in-progress tag builds, also:

```bash
gh run view <id> --json status,conclusion,displayTitle,headBranch,url,jobs
```

Report started/elapsed times in Europe/Copenhagen. Note whether `v*` releases exist yet and whether `milkflint-sim-x86_64-ext4-combined.img.gz` is attached.
