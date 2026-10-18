#!/usr/bin/env python3
"""Sestaví index.html ze src/index.html: mapa Srí Lanky s trasou (SVG) + ?v= hashe."""
import hashlib, json, pathlib, shutil

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'

K = 118                       # px na stupeň
LON0, LAT0 = 79.45, 9.95      # levý horní roh
proj = lambda lon, lat: ((lon - LON0) * K, (LAT0 - lat) * K)

geo = json.loads((SRC / 'lka.geo.json').read_text())
ring = geo['features'][0]['geometry']['coordinates'][0]
island = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in (proj(*p) for p in ring)) + 'Z'

# zastávky zájezdu 29. 8.–15. 9. 2027 (lon, lat, popisek, zarovnání popisku); poslední = návrat do Colomba
stops = [
    (79.88, 7.18, 'Colombo', 'l'),
    (80.22, 6.03, 'Galle', 'l'),
    (80.83, 6.05, 'Rekawa', 'r'),
    (81.05, 6.87, 'Ella', 'r'),
    (79.88, 7.18, '', 'l'),
]
pts = [proj(lon, lat) for lon, lat, *_ in stops]

def smooth(p, t=0.5):
    """Catmull-Rom → kubické Bézierovy křivky."""
    d = f'M{p[0][0]:.1f} {p[0][1]:.1f}'
    for i in range(len(p) - 1):
        p0, p1, p2 = p[max(i - 1, 0)], p[i], p[i + 1]
        p3 = p[min(i + 2, len(p) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3)
        d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d

# přílet z Malediv — oblouk zpoza mapy vlevo dole do Colomba
cx, cy = pts[0]
flight = f'M{-10:.1f} {cy + 150:.1f} C{20:.1f} {cy + 110:.1f} {cx - 40:.1f} {cy + 50:.1f} {cx:.1f} {cy:.1f}'
dots = ''
for i, ((x, y), (_, _, name, side)) in enumerate(zip(pts, stops)):
    tx, anchor = (x + 12, 'start') if side == 'r' else (x - 12, 'end')
    if not name:
        dots += f'<g class="stop" data-stop="{i}"><circle class="stop-halo" cx="{x:.1f}" cy="{y:.1f}" r="11"/></g>'
        continue
    dots += (f'<g class="stop" data-stop="{i}"><circle class="stop-halo" cx="{x:.1f}" cy="{y:.1f}" r="11"/>'
             f'<circle class="stop-dot" cx="{x:.1f}" cy="{y:.1f}" r="4.5"/>'
             f'<text x="{tx:.1f}" y="{y + 4:.1f}" text-anchor="{anchor}">{name}</text></g>')

svg = f'''<svg class="map-svg" viewBox="-20 -10 340 500" role="img" aria-label="Mapa Srí Lanky s trasou zájezdu 2027">
      <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>
      <path class="island-shadow" d="{island}" transform="translate(5 7)"/>
      <path class="island" d="{island}"/>
      <path class="island-hatch" d="{island}" fill="url(#hatch)"/>
      <path class="route-bg" d="{smooth(pts)}"/>
      <path class="route" id="route" d="{smooth(pts)}" pathLength="1000"/>
      <path class="flight" id="flight" d="{flight}" pathLength="100"/>
      {dots}
      <g class="plane-to-mle"><text x="-6" y="{cy + 172:.1f}">Malé, Maledivy ↗</text></g>
      <g class="compass" transform="translate(292 30)"><circle r="16"/><path d="M0 -12 L4 0 L0 12 L-4 0Z"/><text y="-20" text-anchor="middle">N</text></g>
    </svg>'''

html = (SRC / 'index.html').read_text().replace('<!--MAP-->', svg)
for f in ('style.css', 'main.js'):
    shutil.copy(SRC / f, ROOT / 'assets' / f)
shutil.copy(SRC / 'favicon.svg', ROOT / 'assets/favicon.svg')
h = lambda p: hashlib.md5((ROOT / p).read_bytes()).hexdigest()[:8]
html = (html.replace('__V_CSS__', h('assets/style.css')).replace('__V_JS__', h('assets/main.js'))
            .replace('__V_FAV__', h('assets/favicon.svg')))
(ROOT / 'index.html').write_text(html)
print('index.html ok')
