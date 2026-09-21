#!/usr/bin/env python3
"""Turns one square piece of icon art into every icon slot Expo needs.

Expo does not derive these from each other: app.json names four separate
files, and three of them have different framing rules. Doing it by hand is
how an app ships with a beautifully cropped iOS icon and an Android one with
the character's head sliced off by the circular mask.

    python3 scripts/build-app-icon.py <source.png>

Needs Pillow (`pip install Pillow`); it is a build-time tool, not a project
dependency.

The source must be the clean artwork: square, at least 1024px, with nothing
overlaid. An earlier version of this script tried to repair a screenshot of a
generation page — watermark and UI buttons painted out by harmonic inpainting
— and the fill left flat grey patches exactly where the art had been. Repair
the source, do not repair the icon.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

SKY_SAMPLE = (0.55, 0.04)  # where to read the colour that pads the Android icon


def rounded(img, radius_frac=0.225):
    out = img.convert("RGBA")
    mask = Image.new("L", out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, out.size[0] - 1, out.size[1] - 1], radius=int(out.size[0] * radius_frac), fill=255
    )
    out.putalpha(mask)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Image.open(sys.argv[1]).convert("RGB")
    if src.size[0] != src.size[1]:
        side = min(src.size)
        src = src.crop((0, 0, side, side))
        print(f"⚠  source was not square; cropped to {side}×{side}")
    if src.size[0] < 1024:
        print(f"⚠  source is only {src.size[0]}px — 1024 is the store minimum, this will be soft")

    art = src.resize((1024, 1024), Image.LANCZOS)

    # 1. iOS and the stores: full bleed, square, no alpha. Apple rejects an
    #    icon with transparency. Both consoles want exactly this file, so
    #    there is no separate store export — an earlier version wrote one and
    #    it was byte-identical, a megabyte of duplicate in the repo.
    art.save(ASSETS / "icon.png")

    # 2. Android adaptive. The launcher crops this to a circle, a squircle or
    #    whatever the device's mask is, and only the middle ~66% is guaranteed
    #    to survive. Full-bleed art put straight in would lose the top of the
    #    cap and the edge of the coin, so the art is inset and the margin is
    #    filled by a blurred blow-up of itself — no hard seam, and the face
    #    stays well inside every mask.
    inset = 0.80
    small = art.resize((int(1024 * inset), int(1024 * inset)), Image.LANCZOS)
    pad = art.resize((1024, 1024), Image.LANCZOS).filter(ImageFilter.GaussianBlur(48))
    fg = pad.copy()
    off = (1024 - small.size[0]) // 2
    fg.paste(small, (off, off))
    fg.convert("RGBA").save(ASSETS / "android-icon-foreground.png")

    bg = Image.new("RGB", (1024, 1024), src.getpixel((int(SKY_SAMPLE[0] * src.size[0]), int(SKY_SAMPLE[1] * src.size[1]))))
    bg.save(ASSETS / "android-icon-background.png")

    # 3. Splash: drawn at 220px over #1a1410, so it wants soft corners rather
    #    than a hard square floating on the dark.
    rounded(art).save(ASSETS / "splash-icon.png")

    # 4. Web.
    rounded(art).resize((196, 196), Image.LANCZOS).save(ASSETS / "favicon.png")

    print("✅ icon.png, android-icon-foreground.png, android-icon-background.png")
    print("✅ splash-icon.png, favicon.png")
    print("ℹ  android-icon-monochrome.png is left alone — it has to be a flat")
    print("   silhouette, so it comes from assets/logo/mark-mono.svg, not from art.")


if __name__ == "__main__":
    main()
