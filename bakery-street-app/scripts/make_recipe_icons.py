#!/usr/bin/env python3
"""Draws stand-in icons for the shop recipes (simit, latte, kurabiye, mocha, muffin, waffle) into assets/game/icons/<id>.webp (256 px, transparent).

They are simple cartoon shapes in the game's palette (thick brown outline, warm flat fills, a highlight) so the order bubbles, trays,
plates and panels show a picture instead of an emoji until real art (ChatGPT, like the other icons) replaces them: just overwrite the files.
    python3 scripts/make_recipe_icons.py
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter

S = 1024                      # drawn big, then reduced to 256 for smooth edges
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'game', 'icons')
BROWN = (92, 58, 36, 255); CREAM = (250, 238, 210, 255); HONEY = (214, 160, 92, 255); GOLD = (226, 170, 80, 255)
TERRA = (184, 95, 59, 255); CHOC = (110, 66, 40, 255); CHOC_L = (150, 96, 60, 255); MILK = (255, 247, 232, 255); COFFEE = (150, 98, 60, 255)
GREEN = (125, 152, 85, 255); PINK = (236, 120, 130, 255); BUTTER = (255, 226, 120, 255); SYRUP = (190, 110, 40, 255)
W = 26                        # outline width at 1024

def canvas(): return Image.new('RGBA', (S, S), (0, 0, 0, 0))
def shadow(d, cx, cy, rx, ry): d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(70, 48, 32, 60))
def save(im, name):
    im = im.resize((256, 256), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=92, method=6)
    print('wrote', name)

def ring(d, cx, cy, r_out, r_in, fill, outline=BROWN, w=W):
    d.ellipse((cx - r_out - w, cy - r_out - w, cx + r_out + w, cy + r_out + w), fill=outline)
    d.ellipse((cx - r_out, cy - r_out, cx + r_out, cy + r_out), fill=fill)
    d.ellipse((cx - r_in - w, cy - r_in - w, cx + r_in + w, cy + r_in + w), fill=outline)
    d.ellipse((cx - r_in, cy - r_in, cx + r_in, cy + r_in), fill=(0, 0, 0, 0))

def simit():
    im = canvas(); d = ImageDraw.Draw(im); cx = cy = S // 2
    shadow(d, cx, 880, 330, 50)
    ring(d, cx, cy + 10, 360, 150, GOLD)
    # lighter top half of the dough and a glossy highlight
    hl = Image.new('RGBA', (S, S), (0, 0, 0, 0)); h = ImageDraw.Draw(hl)
    h.pieslice((cx - 330, cy - 320, cx + 330, cy + 340), 190, 330, fill=(255, 214, 140, 255))
    h.ellipse((cx - 150, cy - 140, cx + 150, cy + 160), fill=(0, 0, 0, 0))
    mask = Image.new('L', (S, S), 0); m = ImageDraw.Draw(mask); m.ellipse((cx - 360, cy - 350, cx + 360, cy + 370), fill=255); m.ellipse((cx - 150, cy - 140, cx + 150, cy + 160), fill=0)
    im.paste(hl, (0, 0), Image.composite(hl.split()[3], Image.new('L', (S, S), 0), mask))
    d = ImageDraw.Draw(im)
    random.seed(4)
    for _ in range(46):                        # sesame seeds on the ring
        a = random.uniform(0, math.tau); r = random.uniform(190, 330)
        x, y = cx + math.cos(a) * r, cy + 10 + math.sin(a) * r
        d.ellipse((x - 16, y - 9, x + 16, y + 9), fill=CREAM, outline=BROWN, width=4)
    save(im, 'simit')

def cookie():
    im = canvas(); d = ImageDraw.Draw(im); cx = cy = S // 2
    shadow(d, cx, 870, 330, 48)
    d.ellipse((cx - 360 - W, cy - 340 - W, cx + 360 + W, cy + 340 + W), fill=BROWN)
    d.ellipse((cx - 360, cy - 340, cx + 360, cy + 340), fill=HONEY)
    d.pieslice((cx - 330, cy - 310, cx + 330, cy + 310), 195, 320, fill=(236, 188, 120, 255))
    for x, y, r in [(-150, -140, 62), (110, -190, 54), (200, 30, 64), (-230, 60, 56), (-30, 70, 66), (80, 190, 58), (-170, 210, 50)]:
        d.ellipse((cx + x - r - 10, cy + y - r * 0.8 - 10, cx + x + r + 10, cy + y + r * 0.8 + 10), fill=BROWN)
        d.ellipse((cx + x - r, cy + y - r * 0.8, cx + x + r, cy + y + r * 0.8), fill=CHOC)
        d.ellipse((cx + x - r * 0.5, cy + y - r * 0.55, cx + x + r * 0.1, cy + y - r * 0.15), fill=CHOC_L)
    save(im, 'kurabiye')

def muffin():
    im = canvas(); d = ImageDraw.Draw(im); cx = S // 2
    shadow(d, cx, 900, 300, 46)
    top = 520
    d.polygon([(cx - 300, top), (cx + 300, top), (cx + 220, 880), (cx - 220, 880)], fill=BROWN)           # liner outline
    d.polygon([(cx - 280, top + 10), (cx + 280, top + 10), (cx + 205, 860), (cx - 205, 860)], fill=TERRA)
    for i in range(-3, 4):                                                                               # liner pleats
        d.line([(cx + i * 82, top + 20), (cx + i * 60, 850)], fill=(150, 70, 42, 255), width=10)
    d.ellipse((cx - 360 - W, 190 - W, cx + 360 + W, 600 + W), fill=BROWN)                               # dome
    d.ellipse((cx - 360, 190, cx + 360, 600), fill=GOLD)
    d.pieslice((cx - 330, 215, cx + 330, 560), 200, 320, fill=(246, 204, 130, 255))
    random.seed(9)
    for _ in range(14):                                                                                  # sugar crumbs
        x, y = cx + random.randint(-230, 230), random.randint(260, 470)
        d.ellipse((x - 11, y - 11, x + 11, y + 11), fill=CREAM)
    d.ellipse((cx - 60 - 14, 150 - 14, cx + 60 + 14, 270 + 14), fill=BROWN); d.ellipse((cx - 60, 150, cx + 60, 270), fill=PINK)   # a berry on top
    d.ellipse((cx - 28, 175, cx + 4, 205), fill=(255, 190, 190, 255))
    save(im, 'muffin')

def waffle():
    im = canvas(); d = ImageDraw.Draw(im); cx = cy = S // 2
    shadow(d, cx, 880, 330, 48)
    r = 90
    d.rounded_rectangle((cx - 340 - W, cy - 300 - W, cx + 340 + W, cy + 300 + W), radius=r + W, fill=BROWN)
    d.rounded_rectangle((cx - 340, cy - 300, cx + 340, cy + 300), radius=r, fill=GOLD)
    for i in range(1, 4):                                                                                # the grid
        x = cx - 340 + i * 170; y = cy - 300 + i * 150
        d.line([(x, cy - 290), (x, cy + 290)], fill=(166, 104, 44, 255), width=22)
        if i < 4: d.line([(cx - 330, y), (cx + 330, y)], fill=(166, 104, 44, 255), width=22)
    d.rounded_rectangle((cx - 330, cy - 290, cx + 330, cy - 120), radius=70, fill=(240, 196, 120, 255)) if False else None
    d.rounded_rectangle((cx - 120 - 12, cy - 100 - 12, cx + 120 + 12, cy + 40 + 12), radius=26, fill=BROWN)   # butter pat
    d.rounded_rectangle((cx - 120, cy - 100, cx + 120, cy + 40), radius=20, fill=BUTTER)
    d.polygon([(cx - 120, cy - 100), (cx + 120, cy - 100), (cx + 90, cy - 70), (cx - 90, cy - 70)], fill=(255, 240, 170, 255))
    d.ellipse((cx - 200, cy + 20, cx + 40, cy + 170), fill=SYRUP)                                        # syrup
    d.ellipse((cx - 150, cy + 40, cx - 40, cy + 90), fill=(226, 150, 70, 255))
    save(im, 'waffle')

def cup(name, liquid, foam, drizzle=False, glass=False):
    im = canvas(); d = ImageDraw.Draw(im); cx = S // 2
    shadow(d, cx, 900, 300, 46)
    if glass:                                                                                            # tall latte glass
        d.polygon([(cx - 230 - W, 170), (cx + 230 + W, 170), (cx + 190 + W, 900), (cx - 190 - W, 900)], fill=BROWN)
        d.polygon([(cx - 230, 190), (cx + 230, 190), (cx + 190, 880), (cx - 190, 880)], fill=(255, 255, 255, 235))
        d.polygon([(cx - 214, 340), (cx + 214, 340), (cx + 186, 870), (cx - 186, 870)], fill=liquid)
        d.polygon([(cx - 222, 250), (cx + 222, 250), (cx + 214, 340), (cx - 214, 340)], fill=foam)
        d.polygon([(cx - 205, 400), (cx + 205, 400), (cx + 200, 520), (cx - 200, 520)], fill=(210, 150, 100, 255))   # milk / coffee layer
        d.rectangle((cx - 150, 205, cx - 110, 700), fill=(255, 255, 255, 120))                              # highlight
        d.ellipse((cx - 230, 150, cx + 230, 230), fill=(255, 255, 255, 240), outline=BROWN, width=W)
    else:                                                                                                # a mug
        d.rounded_rectangle((cx - 300 - W, 330 - W, cx + 240 + W, 860 + W), radius=130, fill=BROWN)
        d.arc((cx + 130, 430, cx + 400, 720), -90, 90, fill=BROWN, width=70)                              # handle
        d.arc((cx + 150, 460, cx + 360, 700), -90, 90, fill=CREAM, width=26)
        d.rounded_rectangle((cx - 300, 330, cx + 240, 860), radius=110, fill=CREAM)
        d.ellipse((cx - 300 - W, 250 - W, cx + 240 + W, 440 + W), fill=BROWN)
        d.ellipse((cx - 300, 250, cx + 240, 440), fill=liquid)
        d.ellipse((cx - 250, 275, cx + 190, 400), fill=foam)
        if drizzle:
            for dx, dy in [(-120, 0), (-30, 20), (60, -5), (130, 25)]:
                d.line([(cx - 30 + dx - 70, 330 + dy), (cx - 30 + dx + 40, 360 + dy)], fill=CHOC, width=26)
        d.rectangle((cx - 250, 470, cx - 215, 800), fill=(255, 255, 255, 150))
    save(im, name)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    simit(); cookie(); muffin(); waffle()
    cup('latte', COFFEE, MILK, glass=True)
    cup('mocha', CHOC, MILK, drizzle=True)
