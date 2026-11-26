#!/usr/bin/env python3
"""Build a 320x240 RGB565 LE splash from assets/logo.png."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
W, H = 320, 240
TARGET = 180  # logo height on panel


def main() -> None:
	logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
	scale = TARGET / max(logo.size)
	nw = max(1, int(round(logo.width * scale)))
	nh = max(1, int(round(logo.height * scale)))
	logo = logo.resize((nw, nh), Image.Resampling.LANCZOS)

	canvas = Image.new("RGBA", (W, H), (0, 0, 0, 255))
	ox, oy = (W - nw) // 2, (H - nh) // 2
	canvas.alpha_composite(logo, (ox, oy))
	rgb = canvas.convert("RGB")

	buf = bytearray(W * H * 2)
	i = 0
	for y in range(H):
		for x in range(W):
			r, g, b = rgb.getpixel((x, y))
			pix = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
			buf[i] = pix & 0xFF
			buf[i + 1] = (pix >> 8) & 0xFF
			i += 2

	out = ROOT / "files" / "lcd-splash.rgb565"
	out.parent.mkdir(parents=True, exist_ok=True)
	out.write_bytes(buf)
	print(f"wrote {out} bytes={len(buf)} logo={nw}x{nh} at ({ox},{oy})")


if __name__ == "__main__":
	main()
