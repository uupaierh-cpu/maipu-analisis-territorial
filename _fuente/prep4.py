# Exporta las rutas nacionales y provinciales del IGN (capa rutas_ign de capas_carta1.gpkg) a data/rutas.json.
# Uso: python prep4.py <capas_carta1.gpkg> <carpeta de la app>
import sys, json, geopandas as gpd
from shapely.ops import linemerge
from shapely.geometry import box, LineString, MultiLineString
g, A = sys.argv[1], sys.argv[2]
r = gpd.read_file(g, layer='rutas_ign'); lim = gpd.read_file(g, layer='limite')
b = lim.total_bounds; zona = box(b[0] - 4000, b[1] - 4000, b[2] + 4000, b[3] + 4000)
r = r[r.intersects(zona)].copy(); r['geometry'] = r.intersection(zona)
r['ruta'] = r.apply(lambda x: ('RN ' if x.jur == 'nacional' else 'RP ') + str(x.rtn), axis=1)
out = []
for (ruta, jur), grp in r.groupby(['ruta', 'jur']):
    m = linemerge([seg for geom in grp.geometry for seg in (geom.geoms if hasattr(geom, 'geoms') else [geom]) if isinstance(seg, LineString)])
    partes = list(m.geoms) if isinstance(m, MultiLineString) else [m]
    for p in partes:
        if p.length < 150: continue
        out.append({'ruta': ruta, 'jurisdiccion': jur, 'longitud_km': round(p.length / 1000, 1), 'rot': 1 if p.length > 1500 else 0, 'geometry': p.simplify(8)})
o = gpd.GeoDataFrame(out, crs=r.crs).to_crs(4326)
o.to_file(f'{A}/data/rutas.json', driver='GeoJSON', COORDINATE_PRECISION=5)
print(len(o), sorted(o.ruta.unique()))
