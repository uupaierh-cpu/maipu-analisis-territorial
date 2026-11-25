# Genera data/cifras.json (única fuente de cifras de los textos) e img/portada.png
import json, geopandas as gpd, pandas as pd, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
G="/mnt/user-data/uploads/PROYECTO FINAL CARTO/_BORRADOR_CARTA1/"; C1=G+'capas_carta1.gpkg'
t=json.load(open('app/data/tablas.json')); cu=t['T06_cuenca']
l=gpd.read_file(C1,layer='lejos_2022_2051')
d=l.groupby('distrito').apply(lambda x: pd.Series({'lejos_2022':float(x.loc[x.clase.str.contains('2022'),'pob_2022'].sum()),'lejos_2051':float(x.pob_2051.sum())}))
d=d.drop(index=[i for i in d.index if 'sin distrito' in i]).sort_values('lejos_2051',ascending=False).round(0)
C={
 # fuente: CIFRAS_VIGENTES.csv (E13), E8 T22, E11b R01, E12 T10, E13 T01, E7 T44, E14
 'lejos_2022':46466,'lejos_2051':69573,'lejos_2051_baja':53618,'lejos_2051_alta':87568,'lejos_2022_M3':73729,
 'lejos_A1':58867,'lejos_A2':25317,'lejos_A3':30489,'acercados_A1':10706,'acercados_A2':44256,'acercados_A3':39084,
 'sin_transbordo_A2':24997,'sin_transbordo_A3':23530,'con_transbordo_A2':19259,'con_transbordo_A3':15555,'minimo_A2':15369,
 'A3_sal16':10537,'A3_sal6_15':5648,'A3_sal4_5':12193,'usu_A2':23435,'usu_A3':26089,
 'fuera_uit_obs_2010_2020_pct':24,'fuera_uit_A_pct':35,'fuera_uit_B_pct':0,'paradas_actuales':1980,'paradas_alta':30,'paradas_media':197,'paradas_baja':1753,
 'reubicadas':3,'zonas_sin':100,'zonas_total':156,'lineas_nucleo':84,
 'cuenca_ha':round(cu['area_ha']),'cuenca_km2':round(cu['area_km2'],1),'cuenca_desnivel':round(cu['desnivel_m']),'cuenca_cauce_km':round(cu['long_cauce_principal_km'],1),
 'cuenca_pob':round(cu['poblacion_2051_A'],-1),'cruces_rp50':16,'L01_km':13.2,'mde_rmse':3.3,
 'distritos':[{'distrito':i,'lejos_2022':r.lejos_2022,'lejos_2051':r.lejos_2051} for i,r in d.iterrows()],
 'red_umbrales':t['T05_red_umbrales_area']
}
json.dump(C,open('app/data/cifras.json','w'),ensure_ascii=False,indent=0)
# ---- portada: composición cartográfica
plt.rcParams['font.family']='Liberation Sans'
import rasterio
r=lambda n: gpd.read_file(C1,layer=n).to_crs(3857)
lim=r('limite'); dis=r('distritos'); red=gpd.read_file(C1,layer='oferta_tramos').to_crs(3857)
fig=plt.figure(figsize=(14,9),facecolor='#f4f2ee'); ax=fig.add_axes([0,0,1,1]); ax.set_facecolor('#f4f2ee')
from PIL import Image
b=json.load(open('app/data/raster_bounds.json'))['sombreado']
from pyproj import Transformer
tf=Transformer.from_crs(4326,3857,always_xy=True)
x0,y0=tf.transform(b[0][1],b[0][0]); x1,y1=tf.transform(b[1][1],b[1][0])
ax.imshow(Image.open('app/img/sombreado.png'),extent=(x0,x1,y0,y1),zorder=1)
ax.imshow(Image.open('app/img/hipsometria.png'),extent=(x0,x1,y0,y1),alpha=.28,zorder=1)
dis.boundary.plot(ax=ax,color='#ffffff',lw=.8,zorder=2)
cel=json.load(open('app/data/celdas.json'))['celdas']
lat=np.array([c[0] for c in cel]); lon=np.array([c[1] for c in cel]); act=np.array([c[3] for c in cel])
X,Y=tf.transform(lon,lat)
ax.scatter(X[act==2],Y[act==2],s=2.2,marker='s',color='#c9bce6',lw=0,zorder=3)
ax.scatter(X[act==1],Y[act==1],s=2.2,marker='s',color='#5b3a99',lw=0,zorder=3)
red.plot(ax=ax,color='#2b302e',linewidth=np.clip(red.salidas/180,.25,2.4),alpha=.75,zorder=4)
lim.boundary.plot(ax=ax,color='#1d2321',lw=1.4,zorder=5)
bx=lim.total_bounds; cx=(bx[0]+bx[2])/2; cy=(bx[1]+bx[3])/2; w=(bx[2]-bx[0])*1.06
ax.set_xlim(cx-w/2,cx+w/2); h=w*9/14; ax.set_ylim(cy-h/2,cy+h/2); ax.axis('off')
fig.savefig('app/img/portada.jpg',dpi=110,facecolor='#f4f2ee',pil_kwargs={'quality':84}); print('ok')
