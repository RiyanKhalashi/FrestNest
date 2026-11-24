"""FreshNest role scenes (farmer, dealer, transporter): painterly-realistic SVG sources.
Usage: python3 role-scenes-gen.py <out_dir>
Then render each SVG to WebP (see the render step in docs/decisions/fyp-premium-design.md)."""
import math, random, re, sys

W, H = 1200, 420
OUT = sys.argv[1]
SUN = (1, -1)  # light from the upper right (changed per scene)


def f(n):
    return f"{n:.1f}".rstrip("0").rstrip(".")


def mix(a, b, t):
    a, b = [int(a[i:i + 2], 16) for i in (1, 3, 5)], [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(a, b))


DEFS = """<defs>
<filter id="tex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="2" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="1.4" result="l"><feDistantLight azimuth="45" elevation="58"/></feDiffuseLighting><feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1=".55" k2=".5" k3="0" k4="0" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="tex2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .5" numOctaves="3" seed="8" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="2" result="l"><feDistantLight azimuth="90" elevation="62"/></feDiffuseLighting><feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1=".5" k2=".55" k3="0" k4="0" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="b05"><feGaussianBlur stdDeviation=".5"/></filter>
<filter id="b1"><feGaussianBlur stdDeviation="1.1"/></filter>
<filter id="b2"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="b4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="b12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
<filter id="b30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .28  0 0 0 0 .22  0 0 0 .07 0"/></filter>
<radialGradient id="vig" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a2018" stop-opacity=".22"/></radialGradient>
<linearGradient id="trunkG" x1="0" x2="1"><stop offset="0" stop-color="#5b4330"/><stop offset=".6" stop-color="#8a6a4c"/><stop offset="1" stop-color="#a5835f"/></linearGradient>
<linearGradient id="palmT" x1="0" x2="1"><stop offset="0" stop-color="#6b5745"/><stop offset=".55" stop-color="#9c8468"/><stop offset="1" stop-color="#b9a283"/></linearGradient>
</defs>"""


# ---------------------------------------------------------------- sky
def sky(stops, sun, cloud_lit, cloud_shade, seed=1):
    g = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    s = [f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">{g}</linearGradient><rect width="{W}" height="{H}" fill="url(#sky)"/>']
    sx, sy, sc = sun
    s.append(f'<circle cx="{sx}" cy="{sy}" r="190" fill="{sc}" opacity=".35" filter="url(#b30)"/>')
    s.append(f'<circle cx="{sx}" cy="{sy}" r="70" fill="{sc}" opacity=".7" filter="url(#b12)"/>')
    s.append(f'<circle cx="{sx}" cy="{sy}" r="26" fill="#fffaf0" opacity=".95" filter="url(#b4)"/>')
    r = random.Random(seed)
    for _ in range(7):  # cumulus banks: shaded base, lit tops
        cx, cy, w = r.uniform(-50, W + 50), r.uniform(50, 170), r.uniform(140, 300)
        base = []
        lit = []
        for i in range(16):
            px, py, rr = cx + r.uniform(-w / 2, w / 2), cy + r.uniform(-12, 10), r.uniform(18, 40)
            base.append(f'<circle cx="{f(px)}" cy="{f(py+8)}" r="{f(rr)}" fill="{cloud_shade}"/>')
            lit.append(f'<circle cx="{f(px+SUN[0]*4)}" cy="{f(py-6)}" r="{f(rr*0.8)}" fill="{cloud_lit}"/>')
        s.append(f'<g opacity=".55" filter="url(#b12)">{"".join(base)}</g><g opacity=".6" filter="url(#b4)">{"".join(lit)}</g>')
    return "".join(s)


def birds(pts, c="#4d5a52"):
    return "".join(f'<path d="M{x} {y} q4 -5 9 -1 q5 -4 9 1" fill="none" stroke="{c}" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>' for x, y in pts)


def shadow(x, y, rx, ry, op=.28):
    return f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="#1c2a17" opacity="{op}" filter="url(#b4)"/>'


# ---------------------------------------------------------------- vegetation
def foliage(cx, cy, rx, ry, seed, pal, n=70, leaf=(5, 12)):
    """Clumped canopy lit from SUN: dark interior, mid body, bright rim on the sun side."""
    r = random.Random(seed)
    dark, mid, light, hi = pal
    out = [f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx*0.92)}" ry="{f(ry*0.88)}" fill="{dark}"/>']
    pts = []
    for _ in range(n):
        a, d = r.uniform(0, 2 * math.pi), math.sqrt(r.random())
        x, y = cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d
        lum = ((x - cx) / rx * SUN[0] + (y - cy) / ry * SUN[1]) * 0.5 + 0.5  # 0 shade .. 1 sun
        pts.append((lum + r.uniform(-.18, .18), x, y, r.uniform(*leaf)))
    pts.sort()
    for lum, x, y, s in pts:
        c = dark if lum < .3 else mid if lum < .62 else light if lum < .85 else hi
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(s)}" fill="{c}"/>')
        if lum > .7:
            out.append(f'<circle cx="{f(x+SUN[0]*s*.35)}" cy="{f(y+SUN[1]*s*.35)}" r="{f(s*.45)}" fill="{hi}" opacity=".7"/>')
    return f'<g filter="url(#tex)">{"".join(out)}</g>'


GREENS = ("#2f5a2a", "#4d7f3a", "#79a84f", "#b4d27a")
FAR = ("#7f9d82", "#93ae92", "#a9c0a3", "#bccfb4")


def tree(x, y, s=1.0, pal=GREENS, seed=None):
    seed = seed or int(x * 13 + y)
    trunk = (f'<path d="M{f(x-6*s)} {f(y)} C{f(x-5*s)} {f(y-25*s)} {f(x-7*s)} {f(y-45*s)} {f(x-2*s)} {f(y-62*s)} L{f(x+3*s)} {f(y-62*s)} C{f(x+5*s)} {f(y-40*s)} {f(x+4*s)} {f(y-22*s)} {f(x+7*s)} {f(y)}Z" fill="url(#trunkG)"/>'
             f'<path d="M{f(x)} {f(y-50*s)} L{f(x-18*s)} {f(y-74*s)} M{f(x+1*s)} {f(y-46*s)} L{f(x+20*s)} {f(y-70*s)}" stroke="#6b5039" stroke-width="{f(3*s)}" stroke-linecap="round"/>')
    return shadow(x - SUN[0] * 26 * s, y + 2, 46 * s, 7 * s) + trunk + foliage(x, y - 88 * s, 52 * s, 42 * s, seed, pal, int(80 * s) + 20)


def palm(x, y, h=160, lean=14, seed=1, fr="#3f7a35", fr2="#6b9e45"):
    r = random.Random(seed)
    tx, ty = x + lean, y - h
    out = [shadow(x - SUN[0] * 40, y + 2, 40, 5, .2)]
    out.append(f'<path d="M{f(x-5)} {y} Q{f(x+lean*0.25-4)} {f(y-h/2)} {f(tx-3)} {f(ty)} L{f(tx+3)} {f(ty)} Q{f(x+lean*0.25+4)} {f(y-h/2)} {f(x+5)} {y}Z" fill="url(#palmT)"/>')
    out += [f'<path d="M{f(x-4+lean*i/18*0.25)} {f(y-i*h/18)} h8" stroke="#5e4c3c" stroke-width="1" opacity=".5"/>' for i in range(1, 18)]
    fronds = []
    for k in range(13):
        a = math.radians(-180 + k * 15 + r.uniform(-6, 6))
        ln = r.uniform(58, 80)
        ex, ey = tx + math.cos(a) * ln, ty + math.sin(a) * ln * 0.55 + ln * 0.45
        cx, cy = tx + math.cos(a) * ln * 0.55, ty + math.sin(a) * ln * 0.6 - 10
        col = fr2 if (math.cos(a) * SUN[0] > 0.2) else fr
        leaf = [f'<path d="M{f(tx)} {f(ty)} Q{f(cx)} {f(cy)} {f(ex)} {f(ey)}" stroke="#55703a" stroke-width="1.6" fill="none"/>']
        for i in range(1, 15):
            t = i / 15
            px = (1 - t) ** 2 * tx + 2 * (1 - t) * t * cx + t * t * ex
            py = (1 - t) ** 2 * ty + 2 * (1 - t) * t * cy + t * t * ey
            dx, dy = 2 * (1 - t) * (cx - tx) + 2 * t * (ex - cx), 2 * (1 - t) * (cy - ty) + 2 * t * (ey - cy)
            n = math.hypot(dx, dy) or 1
            nx, ny = -dy / n, dx / n
            L = (17 * math.sin(math.pi * min(t + .1, 1)) + 4) * r.uniform(.8, 1.15)
            for sgn in (1, -1):
                ex2, ey2 = nx * L * sgn + dx / n * 5, ny * L * sgn + dy / n * 5 + 9 + 6 * t  # leaflets droop under their weight
                c2 = col if r.random() < .7 else mix(col, "#1f3d1c", .35)
                leaf.append(f'<path d="M{f(px)} {f(py)} q{f(ex2*.55)} {f(ey2*.2)} {f(ex2)} {f(ey2)}" stroke="{c2}" stroke-width="1.7" fill="none" stroke-linecap="round"/>')
        fronds.append("".join(leaf))
    out.append("".join(fronds))
    out.append(f'<circle cx="{f(tx)}" cy="{f(ty+4)}" r="5" fill="#6b5a2c"/><circle cx="{f(tx+5)}" cy="{f(ty+8)}" r="4" fill="#7c6a33"/>')
    return "".join(out)


def banana(x, y, s=1.0, seed=3):
    r = random.Random(seed)
    out = [shadow(x - SUN[0] * 20 * s, y + 2, 30 * s, 5 * s, .2),
           f'<path d="M{f(x-5*s)} {f(y)} L{f(x-3*s)} {f(y-46*s)} L{f(x+3*s)} {f(y-46*s)} L{f(x+5*s)} {f(y)}Z" fill="#8a9a52"/>']
    for k, (dx, dy) in enumerate([(-58, -18), (54, -26), (-46, -58), (44, -64), (-14, -92), (18, -88)]):
        ex, ey = x + dx * s, y - 46 * s + dy * s
        k2 = 1 if dx < 0 else -1
        lit = dx * SUN[0] > 0
        top, bot = ("#8cbf5c", "#5f9a43") if lit else ("#6aa148", "#467d36")
        mx, my = x + dx * s * .5, y - 46 * s + dy * s * .5 - 20 * s
        out.append(f'<path d="M{f(x)} {f(y-46*s)} Q{f(mx)} {f(my-12*s)} {f(ex)} {f(ey)} Q{f(mx+k2*10*s)} {f(my+26*s)} {f(x)} {f(y-46*s)}Z" fill="{bot}"/>')
        out.append(f'<path d="M{f(x)} {f(y-46*s)} Q{f(mx)} {f(my-12*s)} {f(ex)} {f(ey)} Q{f(mx)} {f(my-2*s)} {f(x)} {f(y-46*s)}Z" fill="{top}"/>')
        out.append(f'<path d="M{f(x)} {f(y-46*s)} Q{f(mx)} {f(my-6*s)} {f(ex)} {f(ey)}" stroke="#d6e6a6" stroke-width="1" fill="none" opacity=".8"/>')
        for i in range(3):  # wind tears
            t = r.uniform(.35, .85)
            px, py = x + (ex - x) * t, (y - 46 * s) + (ey - (y - 46 * s)) * t - 8 * s
            out.append(f'<path d="M{f(px)} {f(py)} l{f(-k2*2*s)} {f(9*s)}" stroke="{bot}" stroke-width="1.4"/>')
    return f'<g filter="url(#tex)">{"".join(out)}</g>'


def grass(y0, y1, n, seed, pal=("#3f6f2f", "#5a8c3a", "#7aab4c", "#a1c868"), hmin=8, hmax=22, x0=-10, x1=W + 10):
    r = random.Random(seed)
    out = []
    for _ in range(n):
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        h = r.uniform(hmin, hmax) * (0.6 + 0.6 * (y - y0) / max(1, y1 - y0))
        bend = r.uniform(-6, 6)
        out.append(f'<path d="M{f(x)} {f(y)} q{f(bend*.3)} {f(-h*.6)} {f(bend)} {f(-h)}" stroke="{pal[r.randrange(4)]}" stroke-width="{f(r.uniform(.9,1.9))}" fill="none" stroke-linecap="round"/>')
    return "".join(out)


def flowers(y0, y1, n, seed, x0=0, x1=W, cols=("#e98aa0", "#f2c94c", "#fbf6ea", "#e0604f", "#c79be0")):
    r = random.Random(seed)
    out = []
    for _ in range(n):
        x, y, c, rr = r.uniform(x0, x1), r.uniform(y0, y1), cols[r.randrange(len(cols))], r.uniform(1.6, 3.2)
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rr)}" fill="{c}"/><circle cx="{f(x+.6)}" cy="{f(y-.6)}" r="{f(rr*.4)}" fill="#fff" opacity=".6"/>')
    return "".join(out)


def treeline(y, amp, seed, col, blur, op=1.0, step=26):
    r = random.Random(seed)
    pts, x = [], -40
    while x < W + 40:
        pts.append((x, y - r.uniform(0, amp)))
        x += r.uniform(step * .6, step * 1.4)
    d = f"M-40 {y+30} " + " ".join(f"Q{f(px-8)} {f(py-amp*.35)} {f(px)} {f(py)}" for px, py in pts) + f" L{W+40} {y+30}Z"
    return f'<path d="{d}" fill="{col}" opacity="{op}" filter="url(#{blur})"/>'


# ---------------------------------------------------------------- buildings & things
def tin_roof(pts, base="#8c9aa1", seed=1):
    r = random.Random(seed)
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = pts  # bottom-left, top-left, top-right, bottom-right
    d = f"M{f(x0)} {f(y0)} L{f(x1)} {f(y1)} L{f(x2)} {f(y2)} L{f(x3)} {f(y3)}Z"
    out = [f'<path d="{d}" fill="{base}"/>']
    n = int(abs(x3 - x0) / 5)
    for i in range(n + 1):
        t = i / n
        bx, by, tx, ty = x0 + (x3 - x0) * t, y0 + (y3 - y0) * t, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        out.append(f'<path d="M{f(bx)} {f(by)} L{f(tx)} {f(ty)}" stroke="{"#a9b6bc" if i % 2 else "#74838a"}" stroke-width="1.4" opacity=".75"/>')
    for _ in range(int(n / 4)):  # rust streaks
        t = r.uniform(0, 1)
        bx, by, tx, ty = x0 + (x3 - x0) * t, y0 + (y3 - y0) * t, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        k = r.uniform(.4, .9)
        out.append(f'<path d="M{f(bx)} {f(by)} L{f(bx+(tx-bx)*k)} {f(by+(ty-by)*k)}" stroke="#9a6a45" stroke-width="{f(r.uniform(2,5))}" opacity=".28" filter="url(#b1)"/>')
    out.append(f'<path d="{d}" fill="url(#roofShade)" />')
    return f'<g filter="url(#tex)">{"".join(out)}</g>'


def house(x, y, s=1.0):
    w, h = 190 * s, 76 * s
    out = ['<linearGradient id="roofShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>',
           '<linearGradient id="wallG" x1="0" x2="1"><stop offset="0" stop-color="#d8c39c"/><stop offset="1" stop-color="#eedfbf"/></linearGradient>']
    out.append(shadow(x + w / 2 - SUN[0] * 40, y + 4, w * .62, 12, .3))
    out.append(f'<rect x="{f(x-18*s)}" y="{f(y-6*s)}" width="{f(w+36*s)}" height="{f(10*s)}" fill="#bfa47a"/>')  # plinth
    out.append(f'<g filter="url(#tex)"><rect x="{f(x)}" y="{f(y-h)}" width="{f(w)}" height="{f(h)}" fill="url(#wallG)"/></g>')
    out.append(f'<rect x="{f(x)}" y="{f(y-h)}" width="{f(w)}" height="{f(16*s)}" fill="#000" opacity=".16" filter="url(#b2)"/>')  # eave shadow
    # door + windows with depth
    dx = x + w * .44
    out.append(f'<rect x="{f(dx-2*s)}" y="{f(y-h*.74-2*s)}" width="{f(30*s)}" height="{f(h*.74+2*s)}" fill="#6d5236"/><rect x="{f(dx)}" y="{f(y-h*.74)}" width="{f(26*s)}" height="{f(h*.74)}" fill="#8a5a36"/><path d="M{f(dx+13*s)} {f(y-h*.74)} v{f(h*.74)}" stroke="#5c3f26" stroke-width="1.5"/><rect x="{f(dx)}" y="{f(y-h*.74)}" width="{f(5*s)}" height="{f(h*.74)}" fill="#000" opacity=".2"/>')
    for wx in (x + 24 * s, x + w - 50 * s):
        out.append(f'<rect x="{f(wx-2*s)}" y="{f(y-h*.72-2*s)}" width="{f(30*s)}" height="{f(26*s)}" fill="#7a5c3e"/><rect x="{f(wx)}" y="{f(y-h*.72)}" width="{f(26*s)}" height="{f(22*s)}" fill="#2e2a25"/>'
                   + "".join(f'<path d="M{f(wx+i*6.5*s)} {f(y-h*.72)} v{f(22*s)}" stroke="#8d7a5f" stroke-width="1.4"/>' for i in range(1, 4)))
    # verandah posts
    for px in (x - 12 * s, x + w + 8 * s):
        out.append(f'<rect x="{f(px)}" y="{f(y-h-4*s)}" width="{f(5*s)}" height="{f(h)}" fill="#8b6a48"/><rect x="{f(px+3*s)}" y="{f(y-h-4*s)}" width="{f(2*s)}" height="{f(h)}" fill="#000" opacity=".2"/>')
    # roof (two planes + gable)
    rt = y - h - 58 * s
    out.append(tin_roof([(x - 26 * s, y - h + 2 * s), (x + w * .22, rt), (x + w * .78, rt), (x + w + 26 * s, y - h + 2 * s)], seed=4))
    out.append(f'<path d="M{f(x+w*.22)} {f(rt)} L{f(x+w*.78)} {f(rt)}" stroke="#5f6d73" stroke-width="3"/>')
    out.append(f'<path d="M{f(x-26*s)} {f(y-h+2*s)} L{f(x+w+26*s)} {f(y-h+2*s)}" stroke="#5f6d73" stroke-width="2.5"/>')
    # clothes line + a pot (lived-in detail)
    out.append(f'<path d="M{f(x+w+12*s)} {f(y-h+18*s)} Q{f(x+w+50*s)} {f(y-h+30*s)} {f(x+w+88*s)} {f(y-h+16*s)}" stroke="#6b5a48" stroke-width=".8" fill="none"/>')
    out += [f'<rect x="{f(x+w+cx*s)}" y="{f(y-h+22*s)}" width="{f(10*s)}" height="{f(16*s)}" fill="{c}"/>' for cx, c in ((22, "#c0504d"), (40, "#2e6aa0"), (58, "#e2b13c"))]
    out.append(f'<ellipse cx="{f(x-30*s)}" cy="{f(y-8*s)}" rx="{f(11*s)}" ry="{f(10*s)}" fill="#a65e3a"/><ellipse cx="{f(x-33*s)}" cy="{f(y-12*s)}" rx="{f(4*s)}" ry="{f(3*s)}" fill="#c98a62"/>')
    return "".join(out)


def haystack(x, y, s=1.0, seed=6):
    r = random.Random(seed)
    out = [shadow(x - SUN[0] * 30 * s, y + 3, 44 * s, 7 * s, .3)]
    out.append(f'<path d="M{f(x)} {f(y-104*s)} L{f(x)} {f(y)}" stroke="#6b5039" stroke-width="3"/>')
    body = f'M{f(x-40*s)} {f(y)} C{f(x-44*s)} {f(y-44*s)} {f(x-18*s)} {f(y-86*s)} {f(x)} {f(y-92*s)} C{f(x+18*s)} {f(y-86*s)} {f(x+44*s)} {f(y-44*s)} {f(x+40*s)} {f(y)}Z'
    out.append('<linearGradient id="hayG" x1="0" x2="1"><stop offset="0" stop-color="#a98a3e"/><stop offset=".65" stop-color="#d9b85c"/><stop offset="1" stop-color="#efd486"/></linearGradient>')
    out.append(f'<path d="{body}" fill="url(#hayG)"/>')
    straws = "".join(f'<path d="M{f(x+r.uniform(-38,38)*s)} {f(y-r.uniform(0,80)*s)} l{f(r.uniform(-6,6)*s)} {f(r.uniform(6,14)*s)}" stroke="{r.choice(["#8f7330", "#f3dc94", "#c6a24a"])}" stroke-width=".9"/>' for _ in range(160))
    out.append(f'<g filter="url(#tex)">{straws}</g>')
    return "".join(out)


def boat(x, y, s=1.0):
    return (f'<path d="M{f(x)} {f(y)} Q{f(x+55*s)} {f(y+18*s)} {f(x+110*s)} {f(y-2*s)} L{f(x+100*s)} {f(y+9*s)} Q{f(x+55*s)} {f(y+22*s)} {f(x+9*s)} {f(y+9*s)}Z" fill="#4a3424"/>'
            f'<path d="M{f(x+4*s)} {f(y+2*s)} Q{f(x+55*s)} {f(y+16*s)} {f(x+106*s)} {f(y)}" stroke="#7a5a3f" stroke-width="1.5" fill="none"/>'
            f'<path d="M{f(x+32*s)} {f(y+4*s)} Q{f(x+55*s)} {f(y-26*s)} {f(x+80*s)} {f(y+4*s)}Z" fill="#a07a4e"/>'
            f'<path d="M{f(x+40*s)} {f(y)} Q{f(x+55*s)} {f(y-18*s)} {f(x+72*s)} {f(y)}" stroke="#7d5c39" stroke-width="1" fill="none"/>'
            f'<path d="M{f(x+94*s)} {f(y-4*s)} L{f(x+70*s)} {f(y-44*s)}" stroke="#3d2c20" stroke-width="2"/>'
            f'<circle cx="{f(x+90*s)}" cy="{f(y-14*s)}" r="{f(4*s)}" fill="#3a2b22"/><path d="M{f(x+86*s)} {f(y-10*s)} l{f(2*s)} {f(9*s)} l{f(7*s)} 0 l{f(1*s)} {f(-9*s)}Z" fill="#e4dccb"/>')


def reflect(svgpart, axis_y, op=.35, blur="b2"):
    return f'<g transform="translate(0 {f(2*axis_y)}) scale(1 -1)" opacity="{op}" filter="url(#{blur})">{svgpart}</g>'


def water(d, top, bottom, seed, x0, x1, y0, y1):
    r = random.Random(seed)
    out = [f'<linearGradient id="wat{seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient><path d="{d}" fill="url(#wat{seed})"/>']
    for _ in range(40):
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        out.append(f'<path d="M{f(x)} {f(y)} h{f(r.uniform(10,46))}" stroke="#ffffff" stroke-width="{f(r.uniform(.6,1.6))}" opacity="{f(r.uniform(.25,.7))}" stroke-linecap="round"/>')
    return "".join(out)


def finish():
    return (f'<rect width="{W}" height="{H}" fill="url(#vig)"/>'
            f'<rect width="{W}" height="{H}" filter="url(#grain)"/>')


def svg(name, body):
    doc = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice">' + DEFS + body + finish() + "</svg>"
    open(f"{OUT}/{name}.svg", "w").write(doc)
    print(name, len(doc))


# ================================================================ FARMER
def farmer():
    global SUN
    SUN = (1, -1)
    b = [sky([(0, "#cfe3d6"), (.55, "#eef3e0"), (1, "#f8f1d8")], (1000, 120, "#ffe7a8"), "#fbfbf4", "#d5e2d6", 3)]
    b.append(birds([(410, 112), (436, 98), (458, 120), (744, 86), (760, 96)]))
    b.append(treeline(252, 22, 1, "#a9c2ab", "b2", .85, 22))
    b.append(treeline(262, 26, 2, "#8fae8c", "b1", .9, 18))
    for x, s2 in ((70, .5), (180, .45), (300, .55), (1080, .5), (1160, .45)):
        b.append(f'<g filter="url(#b05)" opacity=".85">{tree(x, 268, s2, FAR, seed=int(x))}</g>')
    river = "M-40 266 C200 262 380 270 560 274 C520 290 420 300 300 305 C200 309 90 308 -40 306Z"
    b.append(water(river, "#c9dcd8", "#9fbcb9", 1, 0, 520, 272, 304))
    b.append(reflect(boat(220, 284, .8), 287, .3))
    b.append(boat(220, 284, .8))
    # fields
    b.append('<linearGradient id="f1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8cb7a"/><stop offset="1" stop-color="#7fae55"/></linearGradient>'
             '<linearGradient id="f2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86b75c"/><stop offset="1" stop-color="#5f9640"/></linearGradient>')
    b.append('<g filter="url(#tex2)"><path d="M-40 302 C200 306 400 292 600 278 C800 266 1000 262 1240 258 V450 H-40Z" fill="url(#f1)"/></g>')
    rows = []
    for i in range(24):  # paddy rows converging to the right horizon
        rows.append(f'<path d="M{620+i*34} 282 Q{600+i*50} 340 {480+i*62} 440" stroke="#c6e09a" stroke-width="2.2" opacity=".5" fill="none"/>')
        rows.append(f'<path d="M{626+i*34} 282 Q{608+i*50} 340 {492+i*62} 440" stroke="#5b8e3e" stroke-width="1.4" opacity=".35" fill="none"/>')
    b.append("".join(rows))
    b.append('<g filter="url(#tex2)"><path d="M-40 352 C260 340 520 330 760 322 C960 316 1080 318 1240 312 V450 H-40Z" fill="url(#f2)" opacity=".85"/></g>')
    # homestead
    b.append(tree(905, 306, 1.15, seed=21))
    b.append(palm(600, 306, 185, 18, 4))
    b.append(palm(1045, 306, 160, -16, 9))
    b.append(house(650, 320, 1.0))
    b.append(haystack(960, 322, 1.0))
    b.append(banana(565, 334, 1.0, 5))
    b.append(banana(1125, 336, 1.1, 7))
    fence = '<path d="M420 333 H560 M420 323 H560" stroke="#8b6a48" stroke-width="2"/>' + "".join(f'<path d="M{x} 342 V{312+(x%3)}" stroke="#6f5238" stroke-width="3"/>' for x in range(420, 561, 14))
    b.append(fence)
    b.append(grass(312, 360, 500, 3, hmin=5, hmax=12))
    b.append(flowers(336, 410, 70, 4, 360, 1200))
    b.append(f'<g filter="url(#b1)">{grass(372, 425, 900, 5, hmin=12, hmax=30)}</g>')
    svg("farmer", "".join(b))


# ================================================================ DEALER
def sack(x, y, s=1.0, c=("#cdb98e", "#e9dbb6")):
    return (shadow(x - SUN[0] * 10 * s, y + 1, 22 * s, 4 * s, .3)
            + f'<path d="M{f(x-22*s)} {f(y)} C{f(x-27*s)} {f(y-26*s)} {f(x-17*s)} {f(y-46*s)} {f(x-8*s)} {f(y-50*s)} L{f(x+8*s)} {f(y-50*s)} C{f(x+17*s)} {f(y-46*s)} {f(x+27*s)} {f(y-26*s)} {f(x+22*s)} {f(y)}Z" fill="{c[0]}"/>'
            + f'<path d="M{f(x-8*s*SUN[0])} {f(y-48*s)} C{f(x+14*s*SUN[0])} {f(y-42*s)} {f(x+24*s*SUN[0])} {f(y-26*s)} {f(x+20*s*SUN[0])} {f(y-2*s)} L{f(x)} {f(y-2*s)} C{f(x+4*s*SUN[0])} {f(y-20*s)} {f(x)} {f(y-38*s)} {f(x-8*s*SUN[0])} {f(y-48*s)}Z" fill="{c[1]}"/>'
            + f'<path d="M{f(x-10*s)} {f(y-50*s)} q{f(10*s)} {f(-9*s)} {f(20*s)} 0" stroke="#8d7248" stroke-width="2" fill="none"/>'
            + f'<path d="M{f(x-14*s)} {f(y-30*s)} q{f(8*s)} {f(4*s)} {f(12*s)} {f(14*s)} M{f(x+6*s)} {f(y-36*s)} q{f(4*s)} {f(8*s)} {f(2*s)} {f(18*s)}" stroke="#a89167" stroke-width="1" fill="none"/>')


def pile(x, y, s, cols, seed, n=26, rad=7):
    r = random.Random(seed)
    out = [shadow(x, y + 1, 36 * s, 5 * s, .3),
           f'<path d="M{f(x-34*s)} {f(y-24*s)} L{f(x+34*s)} {f(y-24*s)} L{f(x+25*s)} {f(y)} L{f(x-25*s)} {f(y)}Z" fill="#9c7443"/>']
    out += [f'<path d="M{f(x-32*s+i*6*s)} {f(y-24*s)} L{f(x-23*s+i*4.6*s)} {f(y)}" stroke="#7a5631" stroke-width="1"/>' for i in range(11)]
    out.append(f'<path d="M{f(x-34*s)} {f(y-24*s)} L{f(x+34*s)} {f(y-24*s)}" stroke="#c49a63" stroke-width="2.5"/>')
    pts = sorted([(r.uniform(-28, 28) * s, -24 * s - abs(r.gauss(0, 1)) * 9 * s - r.uniform(0, 6) * s) for _ in range(n)], key=lambda p: p[1], reverse=False)
    for dx, dy in pts:
        c = cols[r.randrange(len(cols))]
        out.append(f'<circle cx="{f(x+dx)}" cy="{f(y+dy)}" r="{f(rad*s)}" fill="{mix(c, "#000000", .25)}"/><circle cx="{f(x+dx+.8*s)}" cy="{f(y+dy-.8*s)}" r="{f(rad*s*.85)}" fill="{c}"/><circle cx="{f(x+dx+SUN[0]*2.5*s)}" cy="{f(y+dy-2.5*s)}" r="{f(rad*s*.28)}" fill="#fff" opacity=".55"/>')
    return f'<g filter="url(#tex)">{"".join(out)}</g>'


def stall(x, y, w, awn, seed):
    hgt = 96
    out = [shadow(x + w / 2, y + 2, w * .55, 8, .3)]
    out.append(f'<rect x="{x}" y="{y-hgt}" width="{w}" height="{hgt}" fill="#4b3a2b"/>')  # dark interior
    out.append(f'<rect x="{x}" y="{y-hgt}" width="{w}" height="{hgt}" fill="url(#inner)"/>')
    for i in range(3):  # shelves with goods
        sy = y - hgt + 34 + i * 18
        out.append(f'<rect x="{x+8}" y="{sy+12}" width="{w-16}" height="3" fill="#7a5a3a"/>')
        r = random.Random(seed + i)
        gx = x + 12
        while gx < x + w - 16:
            c = r.choice(["#d9483b", "#e0a33a", "#6a9c45", "#c76b2e", "#8a5a9e", "#e8d9a8"])
            out.append(f'<rect x="{f(gx)}" y="{sy}" width="9" height="12" rx="2" fill="{c}" opacity=".9"/>')
            gx += r.uniform(10, 14)
    out.append(tin_roof([(x - 14, y - hgt + 4), (x + 18, y - hgt - 30), (x + w - 18, y - hgt - 30), (x + w + 14, y - hgt + 4)], seed=seed))
    sw = w / 9
    for i in range(9):
        c = awn[i % 2]
        out.append(f'<path d="M{f(x+i*sw)} {y-hgt+2} L{f(x+(i+1)*sw)} {y-hgt+2} L{f(x+(i+1)*sw)} {y-hgt+22} Q{f(x+(i+.5)*sw)} {y-hgt+31} {f(x+i*sw)} {y-hgt+22}Z" fill="{c}"/>')
        out.append(f'<path d="M{f(x+i*sw)} {y-hgt+22} Q{f(x+(i+.5)*sw)} {y-hgt+31} {f(x+(i+1)*sw)} {y-hgt+22}" stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"/>')
    out.append(f'<rect x="{x}" y="{y-hgt+2}" width="{w}" height="8" fill="#000" opacity=".12"/>')
    out.append(f'<rect x="{x-4}" y="{y-26}" width="{w+8}" height="26" fill="#8f6a44"/><rect x="{x-4}" y="{y-26}" width="{w+8}" height="4" fill="#b58b5b"/>')
    out.append(f'<rect x="{x-8}" y="{y-hgt}" width="6" height="{hgt}" fill="#6b4f35"/><rect x="{x+w+2}" y="{y-hgt}" width="6" height="{hgt}" fill="#6b4f35"/>')
    return "".join(out)


def scale(x, y):
    return (f'<path d="M{x} {y-122} V{y-98} M{x-36} {y-98} H{x+36}" stroke="#3d342b" stroke-width="2.2"/>'
            f'<path d="M{x-32} {y-98} L{x-42} {y-62} M{x-32} {y-98} L{x-22} {y-62} M{x+32} {y-98} L{x+22} {y-62} M{x+32} {y-98} L{x+42} {y-62}" stroke="#5a4a3a" stroke-width="1"/>'
            f'<path d="M{x-46} {y-62} Q{x-32} {y-50} {x-18} {y-62}Z M{x+18} {y-62} Q{x+32} {y-50} {x+46} {y-62}Z" fill="#b08a4a"/>'
            f'<circle cx="{x}" cy="{y-100}" r="3" fill="#3d342b"/>')


def van(x, y, s=1.0):
    wheels = "".join(f'<circle cx="{f(cx)}" cy="{f(y-14*s)}" r="{f(17*s)}" fill="none" stroke="#2a2a2a" stroke-width="{f(3*s)}"/>' + "".join(f'<path d="M{f(cx)} {f(y-14*s)} l{f(math.cos(a)*16*s)} {f(math.sin(a)*16*s)}" stroke="#777" stroke-width=".8"/>' for a in [i * math.pi / 8 for i in range(16)]) + f'<circle cx="{f(cx)}" cy="{f(y-14*s)}" r="{f(3*s)}" fill="#333"/>' for cx in (x + 32 * s, x + 150 * s))
    return (shadow(x + 80 * s, y + 2, 90 * s, 6 * s, .3) + wheels
            + f'<rect x="{f(x)}" y="{f(y-38*s)}" width="{f(118*s)}" height="{f(9*s)}" fill="#6b4f35"/><rect x="{f(x)}" y="{f(y-38*s)}" width="{f(118*s)}" height="{f(2.5*s)}" fill="#a07a50"/>'
            + sack(x + 26 * s, y - 38 * s, .72) + sack(x + 60 * s, y - 38 * s, .78, ("#bfa77a", "#ddc89c")) + sack(x + 94 * s, y - 38 * s, .72)
            + f'<path d="M{f(x+118*s)} {f(y-32*s)} L{f(x+150*s)} {f(y-32*s)} L{f(x+160*s)} {f(y-70*s)}" stroke="#1f4e75" stroke-width="{f(3.5*s)}" fill="none"/>'
            + f'<path d="M{f(x+148*s)} {f(y-72*s)} h{f(22*s)}" stroke="#222" stroke-width="{f(3.5*s)}" stroke-linecap="round"/>'
            + f'<path d="M{f(x+128*s)} {f(y-40*s)} h{f(18*s)}" stroke="#222" stroke-width="{f(5*s)}" stroke-linecap="round"/>')


def town(seed):
    r = random.Random(seed)
    out, x = [], -20
    while x < W + 20:
        w, h = r.uniform(34, 80), r.uniform(40, 130)
        c = r.choice(["#b9c8d4", "#aebfcd", "#c3d0da", "#a8b9c7"])
        out.append(f'<rect x="{f(x)}" y="{f(258-h)}" width="{f(w)}" height="{f(h)}" fill="{c}"/>')
        out.append(f'<rect x="{f(x+w*.7)}" y="{f(258-h)}" width="{f(w*.3)}" height="{f(h)}" fill="#000" opacity=".06"/>')
        for wy in range(int(258 - h + 8), 250, 12):
            for wx in range(int(x + 5), int(x + w - 8), 10):
                if r.random() < .7:
                    out.append(f'<rect x="{wx}" y="{wy}" width="5" height="6" fill="#8fa1b0" opacity=".6"/>')
        x += w + r.uniform(2, 14)
    return f'<g filter="url(#b1)" opacity=".85">{"".join(out)}</g>'


def dealer():
    global SUN
    SUN = (-1, -1)
    b = [sky([(0, "#c9dcea"), (.6, "#e9f0f2"), (1, "#f6f1e4")], (200, 100, "#fff0c4"), "#fbfcfd", "#cad7e2", 6)]
    b.append(birds([(560, 104), (584, 92), (606, 112), (900, 80)], "#55606b"))
    b.append(town(4))
    b.append('<linearGradient id="inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d231a" stop-opacity=".9"/><stop offset="1" stop-color="#6a5440" stop-opacity=".6"/></linearGradient>')
    b.append('<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3d7bd"/><stop offset="1" stop-color="#cdbb98"/></linearGradient>')
    b.append('<g filter="url(#tex)"><path d="M-40 258 C300 250 700 256 1240 248 V450 H-40Z" fill="url(#g1)"/></g>')
    r = random.Random(3)
    b.append("".join(f'<ellipse cx="{f(r.uniform(0,W))}" cy="{f(r.uniform(330,415))}" rx="{f(r.uniform(20,70))}" ry="{f(r.uniform(2,5))}" fill="#a58f6a" opacity=".25" filter="url(#b2)"/>' for _ in range(30)))
    b.append(tree(70, 306, 1.45, seed=31))
    b.append(tree(1150, 300, 1.25, seed=32))
    b.append(palm(1010, 284, 150, 10, 12))
    b.append(stall(175, 318, 215, ("#2b5c8c", "#f1ece0"), 1))
    b.append(stall(420, 314, 205, ("#b8403b", "#f1ece0"), 5))
    b.append(stall(655, 318, 215, ("#2f7a4b", "#f1ece0"), 9))
    b.append(scale(527, 318))
    b.append(sack(206, 366) + sack(250, 368, 1.1, ("#bfa77a", "#ddc89c")) + sack(228, 340, .9))
    b.append(pile(330, 378, 1.0, ["#d0372b", "#e04a35", "#b92e24"], 1))
    b.append(pile(420, 382, 1.0, ["#5f8f3a", "#76a648", "#4e7d30"], 2, rad=6))
    b.append(pile(510, 378, 1.0, ["#6d3f86", "#7d4b98", "#5c3373"], 3, rad=8))
    b.append(pile(600, 382, 1.0, ["#d9a43a", "#e8bd52", "#c98f2c"], 4))
    b.append(sack(692, 366) + sack(732, 368, 1.05, ("#bfa77a", "#ddc89c")))
    b.append(van(880, 384, 1.15))
    b.append(grass(398, 420, 120, 7, ("#6e8a46", "#85a052", "#9cb664", "#5c7a3a"), 4, 10))
    svg("dealer", "".join(b))


# ================================================================ TRANSPORTER
def bridge(x0, x1, y, span=110):
    out = [f'<rect x="{x0}" y="{y}" width="{x1-x0}" height="8" fill="#8e9ba2"/><rect x="{x0}" y="{y+6}" width="{x1-x0}" height="3" fill="#6f7c83"/>']
    for sx in range(x0, x1, span):
        out.append(f'<rect x="{sx+span/2-6}" y="{y+8}" width="12" height="40" fill="#9aa6ab"/><rect x="{sx+span/2+2}" y="{y+8}" width="4" height="40" fill="#7d898f"/>')
        out.append(f'<path d="M{sx} {y} L{sx+12} {y-28} L{sx+span-12} {y-28} L{sx+span} {y}" fill="none" stroke="#7f8d95" stroke-width="2.6"/>')
        n = 6
        for i in range(n):
            a = sx + 12 + i * (span - 24) / n
            b2 = sx + 12 + (i + 1) * (span - 24) / n
            out.append(f'<path d="M{f(a)} {y-28} L{f(b2)} {y} M{f(a)} {y-28} V{y}" stroke="#8a979e" stroke-width="1.2"/>')
    return "".join(out)


def truck(x, y, s=1.0):
    p = [shadow(x + 120 * s, y + 2, 140 * s, 8 * s, .4)]
    p.append('<linearGradient id="boxG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0c45a"/><stop offset="1" stop-color="#c8922e"/></linearGradient>')
    p.append('<linearGradient id="cabG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f6b4a"/><stop offset=".5" stop-color="#2f8a60"/><stop offset="1" stop-color="#22704e"/></linearGradient>')
    p.append('<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f4f7"/><stop offset=".5" stop-color="#a9c8d3"/><stop offset="1" stop-color="#6f93a2"/></linearGradient>')
    bx = x + 74 * s
    p.append(f'<g filter="url(#tex)"><rect x="{f(bx)}" y="{f(y-100*s)}" width="{f(176*s)}" height="{f(76*s)}" fill="url(#boxG)"/>'
             + "".join(f'<path d="M{f(bx)} {f(y-100*s+i*12.5*s)} h{f(176*s)}" stroke="#a87a28" stroke-width="1.3" opacity=".8"/>' for i in range(1, 6))
             + "".join(f'<path d="M{f(bx+i*44*s)} {f(y-100*s)} v{f(76*s)}" stroke="#a87a28" stroke-width="2"/>' for i in range(1, 4)) + "</g>")
    p.append(f'<rect x="{f(bx)}" y="{f(y-104*s)}" width="{f(176*s)}" height="{f(10*s)}" fill="#b8302a"/>')
    p.append("".join(f'<path d="M{f(bx+6*s+i*14*s)} {f(y-94*s)} l{f(7*s)} {f(8*s)} l{f(7*s)} {f(-8*s)}" fill="{c}"/>' for i, c in enumerate(["#2e86c1", "#27ae60", "#f4d03f", "#e74c3c"] * 3)))
    p.append("".join(f'<circle cx="{f(bx+14*s+i*21*s)}" cy="{f(y-38*s)}" r="{f(4.5*s)}" fill="{c}"/><circle cx="{f(bx+13*s+i*21*s)}" cy="{f(y-39.5*s)}" r="{f(1.5*s)}" fill="#fff" opacity=".7"/>' for i, c in enumerate(["#2e86c1", "#c0392b", "#27ae60", "#f1f1f1"] * 2)))
    # cab
    p.append(f'<path d="M{f(x)} {f(y-24*s)} L{f(x)} {f(y-62*s)} Q{f(x+2*s)} {f(y-90*s)} {f(x+26*s)} {f(y-92*s)} L{f(x+76*s)} {f(y-92*s)} L{f(x+76*s)} {f(y-24*s)}Z" fill="url(#cabG)"/>')
    p.append(f'<path d="M{f(x+8*s)} {f(y-64*s)} Q{f(x+10*s)} {f(y-84*s)} {f(x+28*s)} {f(y-84*s)} L{f(x+50*s)} {f(y-84*s)} L{f(x+50*s)} {f(y-62*s)}Z" fill="url(#glass)"/>')
    p.append(f'<path d="M{f(x+20*s)} {f(y-82*s)} L{f(x+34*s)} {f(y-64*s)}" stroke="#fff" stroke-width="{f(3*s)}" opacity=".5"/>')
    p.append(f'<rect x="{f(x+54*s)}" y="{f(y-84*s)}" width="{f(18*s)}" height="{f(22*s)}" fill="url(#glass)"/>')
    p.append(f'<path d="M{f(x+18*s)} {f(y-114*s)} L{f(x+76*s)} {f(y-114*s)} L{f(x+76*s)} {f(y-92*s)} L{f(x+10*s)} {f(y-92*s)}Z" fill="#b8302a"/>')
    p.append(f'<path d="M{f(x+24*s)} {f(y-106*s)} h{f(46*s)}" stroke="#f4c95d" stroke-width="{f(3*s)}" stroke-dasharray="{f(4*s)} {f(3*s)}"/>')
    p.append("".join(f'<path d="M{f(x+12*s+i*8*s)} {f(y-92*s)} l{f(4*s)} {f(7*s)} l{f(4*s)} {f(-7*s)}" fill="#f4c95d"/>' for i in range(8)))
    p.append(f'<rect x="{f(x)}" y="{f(y-44*s)}" width="{f(76*s)}" height="{f(9*s)}" fill="#f4c95d"/><rect x="{f(x)}" y="{f(y-44*s)}" width="{f(76*s)}" height="{f(2*s)}" fill="#fff" opacity=".5"/>')
    p.append(f'<rect x="{f(x-6*s)}" y="{f(y-34*s)}" width="{f(10*s)}" height="{f(12*s)}" rx="{f(2*s)}" fill="#c9cfd2"/><circle cx="{f(x-2*s)}" cy="{f(y-50*s)}" r="{f(4*s)}" fill="#fff6c8"/>')
    p.append(f'<rect x="{f(x-4*s)}" y="{f(y-30*s)}" width="{f(256*s)}" height="{f(9*s)}" fill="#2b2b2b"/>')
    for cx in (x + 42 * s, x + 176 * s, x + 214 * s):
        p.append(f'<circle cx="{f(cx)}" cy="{f(y-12*s)}" r="{f(16*s)}" fill="#1e1e1e"/><circle cx="{f(cx)}" cy="{f(y-12*s)}" r="{f(8*s)}" fill="#8f979b"/><circle cx="{f(cx-2*s)}" cy="{f(y-14*s)}" r="{f(3*s)}" fill="#d4d9db"/>')
    return "".join(p)


def pickup(x, y, s=1.0, c="#3a74a8"):
    return (shadow(x + 60 * s, y + 1, 66 * s, 5 * s, .35)
            + f'<path d="M{f(x)} {f(y-16*s)} L{f(x)} {f(y-40*s)} L{f(x+12*s)} {f(y-58*s)} L{f(x+48*s)} {f(y-58*s)} L{f(x+52*s)} {f(y-40*s)} L{f(x+122*s)} {f(y-40*s)} L{f(x+122*s)} {f(y-16*s)}Z" fill="{c}"/>'
            + f'<path d="M{f(x)} {f(y-30*s)} h{f(122*s)}" stroke="#fff" stroke-opacity=".35" stroke-width="{f(2*s)}"/>'
            + f'<path d="M{f(x+10*s)} {f(y-42*s)} L{f(x+16*s)} {f(y-54*s)} L{f(x+44*s)} {f(y-54*s)} L{f(x+46*s)} {f(y-42*s)}Z" fill="url(#glass)"/>'
            + f'<rect x="{f(x+56*s)}" y="{f(y-58*s)}" width="{f(60*s)}" height="{f(18*s)}" rx="{f(3*s)}" fill="#6a9c45"/><rect x="{f(x+56*s)}" y="{f(y-58*s)}" width="{f(60*s)}" height="{f(5*s)}" fill="#8cbf5c"/>'
            + "".join(f'<circle cx="{f(cx)}" cy="{f(y-10*s)}" r="{f(10*s)}" fill="#1e1e1e"/><circle cx="{f(cx)}" cy="{f(y-10*s)}" r="{f(4.5*s)}" fill="#9aa1a4"/>' for cx in (x + 24 * s, x + 98 * s)))


def transporter():
    global SUN
    SUN = (1, -1)
    b = [sky([(0, "#e9d6c2"), (.5, "#f7e6cf"), (1, "#fbf3e6")], (1000, 128, "#ffcf8a"), "#fff8ef", "#e6cdb6", 9)]
    b.append(birds([(300, 96), (324, 84), (344, 104), (640, 76)], "#6b5a4a"))
    b.append(treeline(244, 20, 7, "#c6c8a8", "b2", .8, 24))
    b.append(treeline(254, 22, 8, "#a7b48f", "b1", .85, 20))
    river = "M-40 260 C300 256 600 260 830 266 C700 282 500 292 300 294 C180 296 80 294 -40 292Z"
    b.append(water(river, "#d2e0dc", "#a9c1bd", 2, 0, 760, 266, 292))
    b.append(f'<g filter="url(#b05)">{bridge(-10, 770, 238)}</g>')
    b.append(reflect(bridge(-10, 770, 238), 262, .22, "b2"))
    b.append('<linearGradient id="t1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d08f"/><stop offset="1" stop-color="#8db466"/></linearGradient>')
    b.append('<g filter="url(#tex2)"><path d="M-40 290 C300 294 600 282 900 272 C1000 268 1100 266 1240 262 V450 H-40Z" fill="url(#t1)"/></g>')
    b.append(grass(296, 336, 400, 11, ("#6f9a48", "#88b05a", "#a3c56d", "#5d8a3c"), 4, 9))
    # road with shoulders, asphalt texture and lane paint
    b.append('<linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8e90"/><stop offset="1" stop-color="#5e6366"/></linearGradient>')
    b.append('<path d="M-40 352 C300 340 700 318 1240 296 L1240 334 C760 352 380 374 -40 398Z" fill="#c9b58e"/>')
    b.append('<g filter="url(#tex)"><path d="M-40 356 C300 344 700 322 1240 300 L1240 330 C760 348 380 370 -40 394Z" fill="url(#road)"/></g>')
    b.append('<path d="M-40 375 C380 356 760 332 1240 315" stroke="#f2efe6" stroke-width="3" stroke-dasharray="30 24" fill="none" opacity=".9"/>')
    b.append('<path d="M-40 359 C300 347 700 325 1240 303" stroke="#f2efe6" stroke-width="1.6" fill="none" opacity=".6"/><path d="M-40 391 C380 367 760 345 1240 327" stroke="#f2efe6" stroke-width="1.6" fill="none" opacity=".6"/>')
    b.append('<g filter="url(#tex2)"><path d="M-40 396 C380 372 760 350 1240 332 V450 H-40Z" fill="#86ad5e"/></g>')
    b.append(tree(120, 306, .95, seed=41) + tree(860, 300, .9, seed=42))
    b.append(palm(985, 304, 160, 12, 14))
    b.append(tree(1130, 298, 1.15, seed=43))
    b.append('<rect x="1034" y="308" width="22" height="32" rx="9" fill="#f1efe8"/><rect x="1034" y="308" width="22" height="11" rx="6" fill="#b8302a"/><rect x="1050" y="310" width="6" height="30" fill="#000" opacity=".08"/>')
    b.append(pickup(820, 330, .78))
    b.append(truck(420, 374, 1.0))
    b.append(flowers(400, 418, 40, 8))
    b.append(f'<g filter="url(#b1)">{grass(398, 426, 700, 13, hmin=10, hmax=24)}</g>')
    svg("transporter", "".join(b))


farmer(); dealer(); transporter()
