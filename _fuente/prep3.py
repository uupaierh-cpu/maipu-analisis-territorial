# Genera las imágenes de portada y de los banners de capítulo del StoryMap (img/banner_*.jpg)
# a partir de los mismos archivos de data/ e img/ que usa la plataforma. Uso: python prep3.py <carpeta de la app>
import json, sys, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection, PolyCollection
from PIL import Image
from pyproj import Transformer
A = sys.argv[1] if len(sys.argv) > 1 else 'app'
D = lambda n: json.load(open(f'{A}/data/{n}'))
tf = Transformer.from_crs(4326, 3857, always_xy=True)
W, H = 20, 9  # pulgadas a 100 dpi -> 2000 x 900

def coords_lineas(fc, filtro=lambda p: True):
    segs, props = [], []
    for f in fc['features']:
        if not filtro(f['properties']): continue
        g = f['geometry']; partes = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
        for c in partes:
            c = np.array(c); x, y = tf.transform(c[:, 0], c[:, 1]); segs.append(np.c_[x, y]); props.append(f['properties'])
    return segs, props

def coords_poligonos(fc, filtro=lambda p: True):
    polys, props = [], []
    for f in fc['features']:
        if not filtro(f['properties']): continue
        g = f['geometry']; ps = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for p in ps:
            c = np.array(p[0]); x, y = tf.transform(c[:, 0], c[:, 1]); polys.append(np.c_[x, y]); props.append(f['properties'])
    return polys, props

lim, _ = coords_poligonos(D('limite.json'))
dis, _ = coords_poligonos(D('distritos.json'))
allp = np.vstack(lim); bx = [allp[:, 0].min(), allp[:, 1].min(), allp[:, 0].max(), allp[:, 1].max()]
cel = np.array(D('celdas.json')['celdas'])
CX, CY = tf.transform(cel[:, 1], cel[:, 0])
rb = D('raster_bounds.json')

def lienzo(bg, ext=None, derecha=.30, zoom=1.32):
    fig = plt.figure(figsize=(W, H), facecolor=bg); ax = fig.add_axes([0, 0, 1, 1]); ax.set_facecolor(bg); ax.axis('off')
    b = ext or bx; w = (b[2] - b[0]) * 1.12 / zoom; h = w * H / W
    if h < (b[3] - b[1]) * 1.1 / zoom: h = (b[3] - b[1]) * 1.1 / zoom; w = h * W / H
    cx = (b[0] + b[2]) / 2 - w * derecha / 2
    cy = (b[1] + b[3]) / 2
    ax.set_xlim(cx - w / 2, cx + w / 2); ax.set_ylim(cy - h / 2, cy + h / 2)
    return fig, ax

def raster(ax, nombre, **kw):
    b = rb[nombre.replace('.png', '')]; x0, y0 = tf.transform(b[0][1], b[0][0]); x1, y1 = tf.transform(b[1][1], b[1][0])
    ax.imshow(Image.open(f'{A}/img/{nombre}'), extent=(x0, x1, y0, y1), **kw)

def contorno(ax, color, lw=1.2, distritos=None):
    if distritos: ax.add_collection(PolyCollection(dis, facecolor='none', edgecolor=distritos, lw=.6, zorder=6))
    ax.add_collection(PolyCollection(lim, facecolor='none', edgecolor=color, lw=lw, zorder=7))

def lineas(ax, fc, color, lw, filtro=lambda p: True, z=5, alpha=1):
    s, p = coords_lineas(fc, filtro)
    w = lw(p) if callable(lw) else lw
    ax.add_collection(LineCollection(s, colors=color, linewidths=w, zorder=z, alpha=alpha, capstyle='round'))

def guardar(fig, n):
    fig.savefig(f'{A}/img/{n}', dpi=100, facecolor=fig.get_facecolor(), pil_kwargs={'quality': 80, 'optimize': True, 'progressive': True}); plt.close(fig); print(n)

red = D('red_actual.json'); sal = lambda p: np.clip(np.array([q['salidas'] for q in p]) / 160, .25, 3.2)
dot = 6.5

# Portada (hero): relieve oscuro, población lejana y red
fig, ax = lienzo('#11161a', derecha=.28, zoom=1.25)
raster(ax, 'sombreado.png', alpha=.22, zorder=1)
ax.scatter(CX[cel[:, 3] == 2], CY[cel[:, 3] == 2], s=dot, marker='s', color='#8f78c7', lw=0, alpha=.75, zorder=3)
ax.scatter(CX[cel[:, 3] == 1], CY[cel[:, 3] == 1], s=dot, marker='s', color='#b9a3f0', lw=0, zorder=3)
lineas(ax, red, '#e8ece9', lambda p: sal(p) * .8, z=4, alpha=.55)
contorno(ax, '#e8ece9', 1.3, distritos='#3a4247')
guardar(fig, 'banner_portada.jpg')

# 1 El problema
fig, ax = lienzo('#1b1530', derecha=.30)
ax.scatter(CX[cel[:, 3] == 0], CY[cel[:, 3] == 0], s=dot, marker='s', color='#2e2748', lw=0, zorder=2)
ax.scatter(CX[cel[:, 3] == 2], CY[cel[:, 3] == 2], s=dot, marker='s', color='#7c63c0', lw=0, zorder=3)
ax.scatter(CX[cel[:, 3] == 1], CY[cel[:, 3] == 1], s=dot, marker='s', color='#cdbdf7', lw=0, zorder=3)
contorno(ax, '#cdbdf7', 1.1, distritos='#3a3258')
guardar(fig, 'banner_1.jpg')

# 2 El crecimiento
fig, ax = lienzo('#241a0f', derecha=.30)
esc = np.array(D('escA_2051_nuevo.json')); ex, ey = tf.transform(esc[:, 1], esc[:, 0])
ax.scatter(ex, ey, s=dot * 1.2, marker='s', c=esc[:, 2], cmap='YlOrBr', vmin=-.2, vmax=1.1, lw=0, zorder=2, alpha=.9)
pe, pp = coords_poligonos(D('expansion.json'))
cols = {'1990-2000': '#f6d9a8', '2000-2010': '#e8a94e', '2010-2020': '#c47a1d'}
ax.add_collection(PolyCollection(pe, facecolor=[cols.get(p['periodo'], '#e8a94e') for p in pp], edgecolor='none', zorder=3))
pu, uu = coords_poligonos(D('uit.json'), lambda p: p['uit'] == 'Urbana')
ax.add_collection(PolyCollection(pu, facecolor='none', edgecolor='#fff4e2', lw=1.4, linestyle=(0, (4, 2)), zorder=4))
contorno(ax, '#e9c898', 1.0, distritos='#4a3820')
guardar(fig, 'banner_2.jpg')

# 3 La red actual
fig, ax = lienzo('#161a1c', derecha=.30)
lineas(ax, red, '#ffffff', lambda p: sal(p) * 1.5, z=4, alpha=1)
pa = D('paradas.json'); px = np.array([f['geometry']['coordinates'] for f in pa['features'] if f['properties']['tipo_parada'].startswith('existente')])
X, Y = tf.transform(px[:, 0], px[:, 1]); ax.scatter(X, Y, s=7, color='#e0a64a', lw=0, zorder=5)
contorno(ax, '#7d878b', 1.0, distritos='#2c3337')
guardar(fig, 'banner_3.jpg')

# 4 El relieve (corredor)
b = rb['sombreado_corredor']; x0, y0 = tf.transform(b[0][1], b[0][0]); x1, y1 = tf.transform(b[1][1], b[1][0])
fig, ax = lienzo('#2a2418', ext=[x0, y0, x1, y1], derecha=0, zoom=1.15)
raster(ax, 'hipsometria.png', zorder=1); raster(ax, 'sombreado.png', alpha=.55, zorder=2)
lineas(ax, D('e14_curvas_5m.json'), '#3d2f1c', .6, z=3, alpha=.55)
lineas(ax, D('e14_perfiles_trazas.json'), '#ffffff', 2.4, z=4)
guardar(fig, 'banner_4.jpg')

# 5 El agua
fig, ax = lienzo('#06121f', ext=[x0, y0, x1, y1], derecha=0, zoom=1.1)
raster(ax, 'acumulacion.png', zorder=1, alpha=.9)
lineas(ax, D('canales.json'), '#7fbf9a', .8, z=2, alpha=.5)
lineas(ax, D('e14_red_derivada_36ha.json'), '#8ec5ff', 1.4, z=3)
pc, _ = coords_poligonos(D('e14_cuenca_aportante.json'))
ax.add_collection(PolyCollection(pc, facecolor='#8ec5ff22', edgecolor='#d6ecff', lw=2, zorder=4))
lineas(ax, D('e14_cuenca_cauce_principal.json'), '#ffffff', 2.6, z=5)
guardar(fig, 'banner_5.jpg')

# 6 Paradas y agua
fig, ax = lienzo('#0c1824', derecha=.30)
re = D('red_escurrimiento.json'); lineas(ax, re, '#3f7fbf', lambda p: np.array([q['orden'] for q in p]) * .45, z=3, alpha=.85)
pts = [(f['geometry']['coordinates'], f['properties']['clase']) for f in pa['features']]
for cl, c, s in [('BAJA', '#5f7486', 2), ('MEDIA', '#f2c14e', 6), ('ALTA', '#ff6b4a', 18)]:
    q = np.array([p for p, k in pts if k == cl]); X, Y = tf.transform(q[:, 0], q[:, 1]); ax.scatter(X, Y, s=s, color=c, lw=0, zorder=5)
contorno(ax, '#9fb3c4', 1.0, distritos='#1f3042')
guardar(fig, 'banner_6.jpg')

# 7 Las alternativas: tres miniaturas (A1, A2, A3)
fig = plt.figure(figsize=(W, H), facecolor='#f1efe9')
for i, (col, nom) in enumerate([(4, 'A1'), (5, 'A2'), (6, 'A3')]):
    ax = fig.add_axes([.39 + i * .185, .1, .175, .8]); ax.set_facecolor('#f1efe9'); ax.axis('off')
    ax.scatter(CX[cel[:, 3] == 0], CY[cel[:, 3] == 0], s=1.1, marker='s', color='#dcdad3', lw=0)
    lejos = (cel[:, 3] > 0) & (cel[:, col] == 1); cerca = (cel[:, 3] > 0) & (cel[:, col] == 0)
    ax.scatter(CX[cerca], CY[cerca], s=1.1, marker='s', color='#6cc08f', lw=0)
    ax.scatter(CX[lejos], CY[lejos], s=1.1, marker='s', color='#5b3a99', lw=0)
    ax.add_collection(PolyCollection(lim, facecolor='none', edgecolor='#1d2321', lw=.8))
    ax.set_xlim(bx[0] - 800, bx[2] + 800); ax.set_ylim(bx[1] - 800, bx[3] + 800); ax.set_aspect('equal')
    ax.text(.5, .02, nom, transform=ax.transAxes, ha='center', fontsize=26, fontweight='bold', color='#1d2321', family='DejaVu Sans')
guardar(fig, 'banner_7.jpg')

# 8 La propuesta
fig, ax = lienzo('#0f1f17', derecha=.30)
lineas(ax, red, '#3c5247', sal, z=2)
ef = cel[:, 6] == 0; ax.scatter(CX[(cel[:, 3] > 0) & ef], CY[(cel[:, 3] > 0) & ef], s=dot, marker='s', color='#2f6b4a', lw=0, zorder=3)
for n, c, w in [('p_alimentadores.json', '#9be3b8', 2.0), ('p_directos.json', '#d8f5c6', 2.0), ('p_modificaciones.json', '#5fd08f', 3.2)]:
    lineas(ax, D(n), c, w, z=5)
contorno(ax, '#9be3b8', 1.0, distritos='#1d3a2b')
guardar(fig, 'banner_8.jpg')

# 9 Lo que queda
fig, ax = lienzo('#1c1d1f', derecha=.30)
pz, zp = coords_poligonos(D('p_zonas.json'), lambda p: p.get('solucion_E11b_piso') == 'ninguna')
ax.add_collection(PolyCollection(pz, facecolor='#3a3c40', edgecolor='#55585d', lw=.5, zorder=2))
lj = (cel[:, 3] > 0) & (cel[:, 6] == 1); ax.scatter(CX[lj], CY[lj], s=dot, marker='s', color='#a58ae6', lw=0, zorder=3)
for n in ['p_alimentadores.json', 'p_directos.json', 'p_modificaciones.json']: lineas(ax, D(n), '#6cc08f', 1.6, z=4, alpha=.8)
contorno(ax, '#9a9ea4', 1.0, distritos='#2c2e31')
guardar(fig, 'banner_9.jpg')
