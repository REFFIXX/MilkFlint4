---
name: milkflint-status
description: Snapshot MilkFlint4 firmware CI runs and GitHub releases for recent version tags
---

Run and summarize:

```bash
gh run list --workflow=build-firmware.yml --limit 8
gh release list --limit 8
```

For in-progress tag builds, also:

```bash
gh run view <id> --json status,conclusion,displayTitle,headBranch,url,jobs
```

Report started/elapsed times in Europe/Copenhagen. Note whether `v*` releases exist yet.
