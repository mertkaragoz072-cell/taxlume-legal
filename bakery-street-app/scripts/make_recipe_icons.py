#!/usr/bin/env python3
"""Draws stand-in icons for the shop recipes (simit, latte, kurabiye, mocha, muffin, waffle, brezel, pankek, donut, puding, turta, sogukkahve, affogato) into assets/game/icons/<id>.webp (256 px, transparent).

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

def brezel():
    im = canvas(); d = ImageDraw.Draw(im); cx, cy = S // 2, S // 2 + 20
    shadow(d, cx, 880, 330, 48)
    def loop(box, a0, a1):
        d.arc(box, a0, a1, fill=BROWN, width=150); d.arc(box, a0, a1, fill=SYRUP, width=100)
    loop((cx - 360, cy - 330, cx + 40, cy + 230), 90, 380)                     # left loop
    loop((cx - 40, cy - 330, cx + 360, cy + 230), 160, 450)                    # right loop
    d.line([(cx - 260, cy + 260), (cx + 120, cy - 160)], fill=BROWN, width=150); d.line([(cx - 260, cy + 260), (cx + 120, cy - 160)], fill=SYRUP, width=100)
    d.line([(cx + 260, cy + 260), (cx - 120, cy - 160)], fill=BROWN, width=150); d.line([(cx + 260, cy + 260), (cx - 120, cy - 160)], fill=SYRUP, width=100)
    random.seed(7)
    for _ in range(40):                                                        # coarse salt
        x, y = cx + random.randint(-330, 330), cy + random.randint(-300, 260)
        if im.getpixel((x, y))[:3] == SYRUP[:3]: d.rectangle((x - 9, y - 9, x + 9, y + 9), fill=MILK)
    save(im, 'brezel')

def pankek():
    im = canvas(); d = ImageDraw.Draw(im); cx = S // 2
    shadow(d, cx, 900, 360, 50)
    d.ellipse((cx - 400 - W, 760 - W, cx + 400 + W, 900 + W), fill=BROWN); d.ellipse((cx - 400, 760, cx + 400, 900), fill=MILK)   # plate
    for i, y in enumerate([700, 590, 480, 370]):                               # the stack
        d.rounded_rectangle((cx - 330 - W, y - 70 - W, cx + 330 + W, y + 70 + W), radius=90, fill=BROWN)
        d.rounded_rectangle((cx - 330, y - 70, cx + 330, y + 70), radius=80, fill=GOLD)
        d.rounded_rectangle((cx - 310, y - 66, cx + 310, y - 20), radius=40, fill=(246, 204, 130, 255))
    d.rounded_rectangle((cx - 110 - 12, 250 - 12, cx + 110 + 12, 340 + 12), radius=24, fill=BROWN); d.rounded_rectangle((cx - 110, 250, cx + 110, 340), radius=18, fill=BUTTER)
    d.polygon([(cx - 260, 330), (cx + 250, 330), (cx + 290, 470), (cx + 120, 420), (cx - 40, 520), (cx - 200, 440), (cx - 300, 470)], fill=SYRUP)   # syrup running down
    save(im, 'pankek')

def donut():
    im = canvas(); d = ImageDraw.Draw(im); cx = cy = S // 2
    shadow(d, cx, 880, 330, 50)
    ring(d, cx, cy + 20, 370, 130, GOLD)
    icing = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(icing)
    pts = [(cx + math.cos(t) * (300 + 26 * math.sin(t * 7)), cy + 10 + math.sin(t) * (290 + 26 * math.sin(t * 7))) for t in [i / 90 * math.tau for i in range(90)]]
    g.polygon(pts, fill=PINK); g.ellipse((cx - 170, cy - 150, cx + 170, cy + 180), fill=(0, 0, 0, 0))
    im.alpha_composite(icing); d = ImageDraw.Draw(im)
    d.ellipse((cx - 130 - W, cy - 110 - W, cx + 130 + W, cy + 150 + W), outline=BROWN, width=W)
    random.seed(3)
    for _ in range(34):                                                        # sprinkles
        a = random.uniform(0, math.tau); r = random.uniform(200, 280); x, y = cx + math.cos(a) * r, cy + 10 + math.sin(a) * r; b = random.uniform(0, math.pi)
        d.line([(x - math.cos(b) * 22, y - math.sin(b) * 22), (x + math.cos(b) * 22, y + math.sin(b) * 22)], fill=random.choice([CREAM, GREEN, BUTTER, (120, 170, 220, 255)]), width=14)
    save(im, 'donut')

def puding():
    im = canvas(); d = ImageDraw.Draw(im); cx = S // 2
    shadow(d, cx, 900, 360, 50)
    d.ellipse((cx - 400 - W, 760 - W, cx + 400 + W, 900 + W), fill=BROWN); d.ellipse((cx - 400, 760, cx + 400, 900), fill=MILK)
    d.polygon([(cx - 230 - W, 330), (cx + 230 + W, 330), (cx + 310 + W, 820), (cx - 310 - W, 820)], fill=BROWN)          # custard
    d.polygon([(cx - 230, 345), (cx + 230, 345), (cx + 305, 805), (cx - 305, 805)], fill=BUTTER)
    d.ellipse((cx - 240 - W, 260 - W, cx + 240 + W, 400 + W), fill=BROWN); d.ellipse((cx - 240, 260, cx + 240, 400), fill=SYRUP)   # caramel top
    d.polygon([(cx - 230, 340), (cx - 180, 470), (cx - 120, 360), (cx - 40, 520), (cx + 40, 370), (cx + 130, 480), (cx + 230, 340)], fill=SYRUP)
    d.ellipse((cx - 150, 280, cx - 30, 320), fill=(226, 150, 70, 255))
    d.rectangle((cx - 250, 500, cx - 215, 760), fill=(255, 255, 255, 120))
    save(im, 'puding')

def turta():
    im = canvas(); d = ImageDraw.Draw(im); cx, cy = S // 2, S // 2 + 40
    shadow(d, cx, 880, 380, 50)
    d.ellipse((cx - 400 - W, cy - 280 - W, cx + 400 + W, cy + 280 + W), fill=BROWN); d.ellipse((cx - 400, cy - 280, cx + 400, cy + 280), fill=SYRUP)   # tin / crust edge
    d.ellipse((cx - 340, cy - 230, cx + 340, cy + 230), fill=TERRA)                                       # apple filling
    for i in range(-3, 4):                                                                                # lattice
        d.line([(cx + i * 95 - 120, cy - 230), (cx + i * 95 + 120, cy + 230)], fill=BROWN, width=62); d.line([(cx + i * 95 - 120, cy - 230), (cx + i * 95 + 120, cy + 230)], fill=GOLD, width=40)
        d.line([(cx + i * 95 + 120, cy - 230), (cx + i * 95 - 120, cy + 230)], fill=BROWN, width=62); d.line([(cx + i * 95 + 120, cy - 230), (cx + i * 95 - 120, cy + 230)], fill=GOLD, width=40)
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse((cx - 400, cy - 280, cx + 400, cy + 280), fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(im, (0, 0), mask)
    d2 = ImageDraw.Draw(out); shadow(d2, cx, 880, 380, 50)
    d2.ellipse((cx - 400, cy - 280, cx + 400, cy + 280), outline=BROWN, width=W)
    d2.ellipse((cx - 370, cy - 255, cx + 370, cy + 255), outline=GOLD, width=34)
    save(out, 'turta')

def soguk_kahve():
    im = canvas(); d = ImageDraw.Draw(im); cx = S // 2
    shadow(d, cx, 900, 300, 46)
    d.line([(cx + 60, 60), (cx + 140, 520)], fill=BROWN, width=70); d.line([(cx + 60, 60), (cx + 140, 520)], fill=TERRA, width=42)   # straw
    d.polygon([(cx - 240 - W, 200), (cx + 240 + W, 200), (cx + 190 + W, 900), (cx - 190 - W, 900)], fill=BROWN)
    d.polygon([(cx - 240, 220), (cx + 240, 220), (cx + 190, 880), (cx - 190, 880)], fill=(255, 255, 255, 235))
    d.polygon([(cx - 226, 330), (cx + 226, 330), (cx + 188, 870), (cx - 188, 870)], fill=(196, 140, 92, 255))
    d.polygon([(cx - 222, 290), (cx + 222, 290), (cx + 226, 330), (cx - 226, 330)], fill=MILK)
    for x, y in [(-110, 420), (70, 380), (-30, 560), (110, 610)]:                                        # ice cubes
        d.rounded_rectangle((cx + x - 70, y - 60, cx + x + 70, y + 60), radius=20, fill=(235, 245, 255, 200), outline=(255, 255, 255, 255), width=8)
    d.line([(cx + 80, 200), (cx + 140, 520)], fill=TERRA, width=42)
    d.rectangle((cx - 160, 240, cx - 125, 800), fill=(255, 255, 255, 130))
    save(im, 'sogukkahve')

def affogato():
    im = canvas(); d = ImageDraw.Draw(im); cx = S // 2
    shadow(d, cx, 900, 320, 46)
    d.polygon([(cx - 320 - W, 430), (cx + 320 + W, 430), (cx + 180 + W, 860), (cx - 180 - W, 860)], fill=BROWN)   # glass bowl
    d.polygon([(cx - 320, 445), (cx + 320, 445), (cx + 180, 845), (cx - 180, 845)], fill=(255, 255, 255, 230))
    d.polygon([(cx - 290, 520), (cx + 290, 520), (cx + 180, 840), (cx - 180, 840)], fill=COFFEE)
    d.ellipse((cx - 230 - W, 200 - W, cx + 230 + W, 580 + W), fill=BROWN); d.ellipse((cx - 230, 200, cx + 230, 580), fill=MILK)   # the scoop
    d.ellipse((cx - 170, 240, cx - 40, 330), fill=(255, 255, 255, 255))
    d.polygon([(cx - 190, 500), (cx - 120, 620), (cx - 60, 520), (cx + 30, 660), (cx + 100, 520), (cx + 170, 610), (cx + 210, 470)], fill=COFFEE)   # coffee poured over it
    d.ellipse((cx - 40 - 14, 150 - 14, cx + 40 + 14, 230 + 14), fill=BROWN); d.ellipse((cx - 40, 150, cx + 40, 230), fill=CHOC)   # a coffee bean on top
    d.line([(cx, 160), (cx, 220)], fill=CHOC_L, width=10)
    save(im, 'affogato')

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    simit(); cookie(); muffin(); waffle()
    cup('latte', COFFEE, MILK, glass=True)
    cup('mocha', CHOC, MILK, drizzle=True)
    brezel(); pankek(); donut(); puding(); turta(); soguk_kahve(); affogato()
