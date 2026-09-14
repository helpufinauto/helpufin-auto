# Phase 8 — verify that the Material Symbols subset referenced by
# index.html contains working ligatures for EVERY icon the app uses.
# Run: python scripts/verify-ms-subset.py   (exits non-zero on failure)
import io
import re
import sys
import urllib.request

import uharfbuzz as hb
from fontTools.ttLib import TTFont

ICONS = [
    "balance", "bookmark", "close", "compare_arrows", "directions_car",
    "expand_more", "home", "inbox", "lightbulb", "menu", "photo_library",
    "sell", "star", "star_border", "support_agent", "upload",
]

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

index = open("index.html", encoding="utf-8").read()
m = re.search(
    r'href="(https://fonts\.googleapis\.com/css2\?family=Material\+Symbols[^"]+)"',
    index,
)
assert m, "Material Symbols stylesheet link not found in index.html"

css = urllib.request.urlopen(
    urllib.request.Request(m.group(1), headers={"User-Agent": UA})
).read().decode()

font_url = re.search(r"url\((https://[^)]+)\)", css).group(1)
woff2 = urllib.request.urlopen(
    urllib.request.Request(font_url, headers={"User-Agent": UA})
).read()

# HarfBuzz cannot parse woff2 — decompress to bare TTF first.
f = TTFont(io.BytesIO(woff2))
f.flavor = None
buf = io.BytesIO()
f.save(buf)

face = hb.Face(hb.Blob(buf.getvalue()))
font = hb.Font(face)

failures = 0
for name in ICONS:

    b = hb.Buffer()
    b.add_str(name)
    b.guess_segment_properties()
    hb.shape(font, b, {"liga": True})

    gid = b.glyph_infos[0].codepoint
    ok = gid != 0 and len(b.glyph_infos) == 1
    print(("OK  " if ok else "FAIL"), name, "->", gid)
    failures += 0 if ok else 1

# also confirm the stylesheet declares display=swap
swap = "font-display: swap" in css.replace("  ", " ") or "font-display:swap" in css.replace(" ", "")
print("font-display swap in stylesheet:", swap)
print("subset font bytes:", len(woff2))

if failures or not swap:
    print("RESULT: FAIL")
    sys.exit(1)

print("RESULT: PASS — all", len(ICONS), "ligatures render from the subset")
