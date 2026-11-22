# MilkFlint4 0.5a — OpenWrt forum screenshots

Retina captures of the MilkFlint UI on a busy **GL-BE14000** mock, **Monokai milk** theme (charcoal flint / milk / pink `#ff6188`).

Regenerate from a packaged UI:

```bash
cd milkflint/ui
pnpm package
FORUM_SHOTS_OUT=/tmp/forum-shots node scripts/forum-screenshots.mjs
```

Then copy the `forum-*.png` files you want into this folder.

---

## Logo

![Logo — Monokai milk](forum-00-logo-monokai-milk.png)

![Logo — dark](forum-00-logo-monokai-milk-dark.png)

![Brand rail](forum-00b-brand-rail-light.png)

![Logo mark in UI](forum-00c-logo-mark-ui.png)

## Home

![Home — Monokai milk](forum-01-home-monokai-milk.png)

![Home — dark](forum-01b-home-monokai-dark.png)

![Home hero 4K](forum-07-home-hero-4k.png)

![Home hero 4K — dark](forum-07b-home-hero-4k-dark.png)

## Wi-Fi (tri-band)

![Wi-Fi](forum-02-wifi-triband.png)

![Wi-Fi — dark](forum-02b-wifi-dark.png)

## Performance tuning (UL MU-MIMO Off)

![Tuning — UL MU-MIMO Off](forum-03-tuning-ul-mimo-off.png)

![Tuning — dark](forum-03b-tuning-ul-mimo-dark.png)

![UL MU-MIMO detail](forum-03b-ul-mimo-off-detail.png)

![Tuning expert full](forum-03-tuning-expert-full.png)

## Devices / SQM / Themes

![Devices](forum-05-devices.png)

![SQM](forum-06-sqm.png)

![Themes gallery](forum-08-themes-gallery.png)
