---
name: ui-check
description: Run and interpret MilkFlint4 milkflint UI quality gates (typecheck, lint, unit + browser tests, build).
---

# UI check

Working directory: `milkflint/ui`.

```bash
pnpm install
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` = typecheck + lint + format:check + node tests + vitest browser + vite build.

- Prefer Vitest browser / Playwright for dashboard regressions over BrowserStack (router UI is LAN-bound).
- For API/docs questions about Vitest browser mode or React 19, use Context7 (`/vitest-dev/vitest`, `/vitest-community/vitest-browser-react`).
- Keep Monokai milk theme tokens and existing feature folder layout under `src/features`.
