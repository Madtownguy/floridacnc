#!/usr/bin/env python3
"""Draw Shop Floor and Dead Acre icons from the games' favicon art.

The shapes match shopfloor/favicon.svg and the Dead Acre favicon embedded in
zombies/index.html. iOS rounds the icon, so these are full-bleed squares
with no extra frame and no transparency.
"""

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


def main() -> None:
    write_app("shopfloor", shop_shapes, 64, SHOP_ICON_BG, SHOP_SCREEN_BG)
    write_app("deadacre", dead_shapes, 32, DEAD_ICON_BG, DEAD_SCREEN_BG)


if __name__ == "__main__":
    main()
