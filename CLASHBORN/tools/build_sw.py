#!/usr/bin/env python3
"""Service worker sürümünü günceller: sw.js içindeki VERSION = 'clashborn-<içerik özeti>' (src/, data/, index.html özeti). Her yayın öncesi çalıştır:  python3 tools/build_sw.py"""
import hashlib, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')
h = hashlib.sha1()
for base in ('src', 'data'):
    for d, _, fs in sorted(os.walk(os.path.join(ROOT, base))):
        for f in sorted(fs): h.update(open(os.path.join(d, f), 'rb').read())
h.update(open(os.path.join(ROOT, 'index.html'), 'rb').read())
p = os.path.join(ROOT, 'sw.js'); s = open(p).read(); v = 'clashborn-' + h.hexdigest()[:10]
open(p, 'w').write(re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{v}';", s)); print('sw.js VERSION =', v)
