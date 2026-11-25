#!/usr/bin/env python3
"""Make the phone app's icons and splash screens from ../icons/icon-source.png (1024 px art).

Run from native/:  python3 make-assets.py
Writes: iOS AppIcon + Splash, Android launcher icons (legacy, round, adaptive) + splash,
and the store graphics in store/ (Play icon 512, Play feature graphic 1024x500).
Needs Pillow. Re-run whenever icon-source.png changes.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'icons', 'icon-source.png')
GLYPH = os.path.join(HERE, '..', 'icons', 'icon-glyph.png')   # the symbols alone, transparent (for padded icons and splash)
BG = (22, 95, 102)        # mid-teal of the icon's gradient (#165F66), used to pad and as background
BG_HEX = '#165F66'
IOS = os.path.join(HERE, 'ios', 'App', 'App', 'Assets.xcassets')
RES = os.path.join(HERE, 'android', 'app', 'src', 'main', 'res')
STORE = os.path.join(HERE, 'store')

art = Image.open(SRC).convert('RGB')
assert art.size == (1024, 1024), art.size
glyph = Image.open(GLYPH).convert('RGBA') if os.path.exists(GLYPH) else None


def fit(size, frac):
    """Square canvas `size` px, BG colour, with the art scaled to `frac` of it, centred."""
    c = Image.new('RGB', (size, size), BG)
    n = max(1, round(size * frac))
    src = glyph or art
    im = src.resize((n, n), Image.LANCZOS)
    c.paste(im, ((size - n) // 2, (size - n) // 2), im if glyph else None)
    return c


def canvas(w, h, frac):
    """w x h, BG colour, art scaled to `frac` of the shorter side, centred."""
    c = Image.new('RGB', (w, h), BG)
    n = round(min(w, h) * frac)
    src = glyph or art
    im = src.resize((n, n), Image.LANCZOS)
    c.paste(im, ((w - n) // 2, (h - n) // 2), im if glyph else None)
    return c


def circle(img):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = img.convert('RGBA')
    out.putalpha(m)
    return out


# ---- iOS: one 1024 icon (no transparency allowed), three 2732 splash images ----
art.save(os.path.join(IOS, 'AppIcon.appiconset', 'AppIcon-512@2x.png'))
# Splash is drawn "aspect fill" on a 2732 square: a phone shows only the middle ~45% of the
# width, so the art stays inside the middle 36%.
sp = canvas(2732, 2732, 0.36)
for n in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    sp.save(os.path.join(IOS, 'Splash.imageset', n))

# ---- Android launcher icons ----
# Legacy square icon: whole art. Round icon: art shrunk so the word fits inside the circle.
# Adaptive (Android 8+): 108dp canvas, launchers show a mask of ~72dp and promise only the
# middle 66dp circle; the art's farthest corner of content is 0.575 of the half-width from the
# centre, so 0.53 of the canvas keeps all of it inside that circle.
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in DENS.items():
    folder = os.path.join(RES, 'mipmap-' + d)
    s = round(48 * k)
    art.resize((s, s), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
    circle(fit(s, 0.80)).save(os.path.join(folder, 'ic_launcher_round.png'))
    fit(round(108 * k), 0.53).save(os.path.join(folder, 'ic_launcher_foreground.png'))

with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">%s</color>\n</resources>\n' % BG_HEX)

# ---- Android splash (older Android; Android 12+ shows the launcher icon on BG) ----
for root, dirs, files in os.walk(RES):
    if os.path.basename(root).startswith('drawable') and 'splash.png' in files:
        p = os.path.join(root, 'splash.png')
        w, h = Image.open(p).size
        canvas(w, h, 0.6).save(p)

# ---- Store graphics ----
os.makedirs(STORE, exist_ok=True)
art.resize((512, 512), Image.LANCZOS).save(os.path.join(STORE, 'play-icon-512.png'))
fg = canvas(1024, 500, 1.0) if glyph else Image.new('RGB', (1024, 500), BG)
if not glyph: fg.paste(art.resize((500, 500), Image.LANCZOS), (262, 0))
fg.save(os.path.join(STORE, 'play-feature-1024x500.png'))
print('icons and splash written')
