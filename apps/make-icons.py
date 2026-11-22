#!/usr/bin/env python3
"""Draw Shop Floor and Dead Acre icons from the games' favicon art.

The shapes match shopfloor/favicon.svg and the Dead Acre favicon embedded in
zombies/index.html. Pastries uses one of the game's in-game logos
(apps/app-ids.json iconLogo) until Madison picks the real icon.
iOS rounds the icon, so these are full-bleed squares with no transparency.

    python apps/make-icons.py            # all three
    python apps/make-icons.py pastries   # only Pastries and more!
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent

SHOP_ICON_BG = (28, 36, 48)  # favicon #1c2430
SHOP_SCREEN_BG = (18, 23, 30)  # game #12171e
DEAD_ICON_BG = (16, 22, 18)  # favicon #101612
DEAD_SCREEN_BG = (7, 11, 9)  # game #070b09


def shop_shapes(draw: ImageDraw.ImageDraw, origin: float, scale: float) -> None:
    def box(x, y, w, h, radius, fill):
        draw.rounded_rectangle(
            (origin + x * scale, origin + y * scale, origin + (x + w) * scale, origin + (y + h) * scale),
            radius=radius * scale,
            fill=fill,
        )

    box(10, 34, 44, 16, 3, (62, 107, 74))
    box(18, 22, 12, 16, 2, (197, 204, 212))
    box(30, 16, 18, 8, 2, (240, 192, 20))
    draw.ellipse(
        (
            origin + (46 - 4) * scale,
            origin + (18 - 4) * scale,
            origin + (46 + 4) * scale,
            origin + (18 + 4) * scale,
        ),
        fill=(61, 222, 132),
    )


def dead_shapes(draw: ImageDraw.ImageDraw, origin: float, scale: float) -> None:
    def circle(cx, cy, r, fill):
        draw.ellipse(
            (
                origin + (cx - r) * scale,
                origin + (cy - r) * scale,
                origin + (cx + r) * scale,
                origin + (cy + r) * scale,
            ),
            fill=fill,
        )

    circle(23, 9, 4, (244, 236, 212))
    circle(16, 20, 6.5, (106, 138, 72))
    circle(14, 19, 1.1, (232, 255, 138))
    circle(18.2, 19, 1.1, (232, 255, 138))
    stroke = max(2, int(round(2 * scale)))
    draw.line(
        (origin + 8 * scale, origin + 27 * scale, origin + 24 * scale, origin + 27 * scale),
        fill=(231, 215, 177),
        width=stroke,
    )


def paint(size: int, background: tuple[int, int, int], shapes, viewbox: float, content: float) -> Image.Image:
    image = Image.new("RGB", (size, size), background)
    draw = ImageDraw.Draw(image)
    scale = size * content / viewbox
    origin = (size - viewbox * scale) / 2
    shapes(draw, origin, scale)
    return image


def splash(screen: tuple[int, int, int], shapes, viewbox: float) -> Image.Image:
    canvas = 2732
    image = Image.new("RGB", (canvas, canvas), screen)
    draw = ImageDraw.Draw(image)
    # Keep the mark near the middle, on the same color the game opens with.
    mark = canvas * 0.34
    scale = mark / viewbox
    origin = (canvas - viewbox * scale) / 2
    shapes(draw, origin, scale)
    return image


def write_app(folder_name: str, shapes, viewbox: float, icon_bg, screen_bg) -> None:
    app = ROOT / folder_name
    resources = app / "resources"
    resources.mkdir(parents=True, exist_ok=True)
    icon = paint(1024, icon_bg, shapes, viewbox, 0.72)
    launch = splash(screen_bg, shapes, viewbox)
    icon.save(resources / "icon.png", "PNG", optimize=True)
    launch.save(resources / "splash.png", "PNG", optimize=True)

    catalog = app / "ios" / "App" / "App" / "Assets.xcassets"
    if catalog.exists():
        icon.save(catalog / "AppIcon.appiconset" / "AppIcon-512@2x.png", "PNG", optimize=True)
        splash_set = catalog / "Splash.imageset"
        for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
            launch.save(splash_set / name, "PNG", optimize=True)
    print(f"{folder_name}: icon and launch image written")


def pastries_images() -> tuple[Image.Image, Image.Image]:
    ids = json.loads((ROOT / "app-ids.json").read_text(encoding="utf-8"))
    meta = ids["pastries"]
    logo_id = meta.get("iconLogo") or "cupcake"
    logo_path = ROOT.parent / "pastries" / "icons" / "logos" / f"{logo_id}-512.png"
    if not logo_path.exists():
        raise SystemExit(
            f"No {logo_path.name}. Set iconLogo in apps/app-ids.json to a file in pastries/icons/logos/."
        )
    hex_color = meta["background"].lstrip("#")
    screen = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    mark = Image.open(logo_path).convert("RGB")
    icon = mark.resize((1024, 1024), Image.Resampling.LANCZOS)
    canvas = 2732
    launch = Image.new("RGB", (canvas, canvas), screen)
    mark_size = int(canvas * 0.34)
    centered = mark.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
    origin = (canvas - mark_size) // 2
    launch.paste(centered, (origin, origin))
    return icon, launch


def write_pastries() -> None:
    app = ROOT / "pastries"
    resources = app / "resources"
    resources.mkdir(parents=True, exist_ok=True)
    icon, launch = pastries_images()
    icon.save(resources / "icon.png", "PNG", optimize=True)
    launch.save(resources / "splash.png", "PNG", optimize=True)
    catalog = app / "ios" / "App" / "App" / "Assets.xcassets"
    if catalog.exists():
        icon.save(catalog / "AppIcon.appiconset" / "AppIcon-512@2x.png", "PNG", optimize=True)
        splash_set = catalog / "Splash.imageset"
        for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
            launch.save(splash_set / name, "PNG", optimize=True)
    logo = json.loads((ROOT / "app-ids.json").read_text(encoding="utf-8"))["pastries"]["iconLogo"]
    print(f"pastries: icon and launch image written from {logo}")


def main() -> None:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    known = {"shopfloor", "deadacre", "pastries"}
    if only not in known and only is not None:
        raise SystemExit(f"Usage: python apps/make-icons.py [{' | '.join(sorted(known))}]")
    if only in (None, "shopfloor"):
        write_app("shopfloor", shop_shapes, 64, SHOP_ICON_BG, SHOP_SCREEN_BG)
    if only in (None, "deadacre"):
        write_app("deadacre", dead_shapes, 32, DEAD_ICON_BG, DEAD_SCREEN_BG)
    if only in (None, "pastries"):
        write_pastries()


if __name__ == "__main__":
    main()
