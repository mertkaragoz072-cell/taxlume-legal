#!/usr/bin/env python3
"""Cleans the guest cat sheets in place (run once; safe to run again):

  1. Floor streaks: the generated sheets carry pale grey "floor shadow" smears under the feet of the front / back walk frames. In the game they show as
     white streaks on the floor (the game draws its own shadow). Pale, colourless pixels in the bottom band of a cell that can be reached from the
     transparent background without crossing the cat's dark outline are removed. White paws are enclosed by the outline and stay.
  2. Specks: small opaque islands in the bottom band that do not touch the cat (number remnants from the sheet) are removed.

  python3 scripts/clean_cat_sprites.py            # all cats
  python3 scripts/clean_cat_sprites.py --dry      # only report what would change
"""
import sys
from collections import deque
from PIL import Image

LOOKS = {'boy_backpack': 80, 'girl_basket': 80, 'oldman': 80, 'boy_cap': 80, 'boy_redcap': 50, 'girl_glasses': 80, 'girl_red': 80, 'grandma': 80}
COLS = 10
BAND = 0.2          # bottom share of a cell that is looked at
DRY = '--dry' in sys.argv


def pale(p):
    r, g, b, a = p
    return a > 0 and min(r, g, b) > 150 and max(r, g, b) - min(r, g, b) < 46


def clean_cell(px, x0, y0, w, h, walk):
    removed = 0
    top = y0 + int(h * (1 - BAND))
    if walk:                                                    # 1. pale pixels reachable from the background
        seen = set()
        q = deque()
        for y in range(top, y0 + h):
            for x in range(x0, x0 + w):
                if px[x, y][3] == 0:
                    q.append((x, y)); seen.add((x, y))
        kill = []
        while q:
            x, y = q.popleft()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if nx < x0 or nx >= x0 + w or ny < top or ny >= y0 + h or (nx, ny) in seen:
                    continue
                p = px[nx, ny]
                if p[3] == 0:
                    seen.add((nx, ny)); q.append((nx, ny))
                elif pale(p) or p[3] < 90:
                    seen.add((nx, ny)); q.append((nx, ny)); kill.append((nx, ny))
        for x, y in kill:
            px[x, y] = (0, 0, 0, 0)
        removed += len(kill)
    # 2. islands in the bottom band that are not part of the cat
    label = {}
    comps = []
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if px[x, y][3] > 0 and (x, y) not in label:
                comp = []
                q = deque([(x, y)]); label[(x, y)] = len(comps)
                while q:
                    cx, cy = q.popleft(); comp.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if x0 <= nx < x0 + w and y0 <= ny < y0 + h and (nx, ny) not in label and px[nx, ny][3] > 0:
                            label[(nx, ny)] = len(comps); q.append((nx, ny))
                comps.append(comp)
    if comps:
        biggest = max(len(c) for c in comps)
        for c in comps:
            if len(c) < biggest * 0.04 and min(y for _, y in c) >= top:
                for x, y in c:
                    px[x, y] = (0, 0, 0, 0)
                removed += len(c)
    return removed


for look, frames in LOOKS.items():
    path = f'assets/game/characters/{look}.webp'
    im = Image.open(path).convert('RGBA')
    rows = -(-frames // COLS)
    w, h = im.width // COLS, im.height // rows
    px = im.load()
    total = 0
    for f in range(frames):
        total += clean_cell(px, (f % COLS) * w, (f // COLS) * h, w, h, walk=f < 20)
    print(f'{look}: {total} pixels cleaned')
    if total and not DRY:
        im.save(path, 'WEBP', quality=92, alpha_quality=100, method=6)       # (lossy like the originals; lossless would triple the app's size)
