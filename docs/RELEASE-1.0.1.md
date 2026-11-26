# MilkFlint4 1.0.1 — Flint 4 LCD splash

Point release on **1.0**. Same userspace and kernel; the front panel finally gets the brand.

## Highlights

- **LCD splash:** MilkFlint4 logo painted on the GL-BE14000 320×240 panel after boot and left on screen (DRM/`fb0`, RGB565)
- Everything else from [1.0](https://github.com/REFFIXX/MilkFlint4/releases/tag/v1.0)

## Install

```text
milkflint4-*-glinet_gl-be14000-squashfs-sysupgrade.bin
```

- From MilkFlint4 **1.0**: keep settings is fine  
- From GL.iNet / plain OpenWrt: **do not** keep settings (`sysupgrade -n`)

## Source

Tag `v1.0.1` on `main`.
