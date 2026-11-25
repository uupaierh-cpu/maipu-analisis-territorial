import geopandas as gpd, pandas as pd, numpy as np, json, os, rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from pyproj import Transformer
from PIL import Image
U="/mnt/user-data/uploads/PROYECTO FINAL CARTO/"; G=U+"_BORRADOR_CARTA1/"; E14="/tmp/claude-0/-home-claude/9cffd1d6-bfc5-57d1-924a-6ed39eac9cc0/scratchpad/e14/"
OUT="app/data/"; IMG="app/img/"; os.makedirs(OUT,exist_ok=True); os.makedirs(IMG,exist_ok=True)
C1=G+'capas_carta1.gpkg'; EX=G+'capas_visor_extra.gpkg'; T14=E14+'out/capas/etapa14_terreno.gpkg'
def w(g,name,cols=None,simp=None,prec=6):
    g=g.copy()
    if cols is not None: g=g[cols+['geometry']]
    if simp: g['geometry']=g.geometry.simplify(simp,preserve_topology=True)
    g=g[~g.geometry.is_empty & g.geometry.notna()].to_crs(4326)
    for c in g.columns:
        if c!='geometry' and g[c].dtype.kind=='f': g[c]=g[c].round(2)
    s=g.to_json(drop_id=True,to_wgs84=False)
    d=json.loads(s); 
    def rnd(o):
        if isinstance(o,float): return round(o,prec)
        if isinstance(o,list): return [rnd(x) for x in o]
        return o
    for f in d['features']: f['geometry']['coordinates']=rnd(f['geometry']['coordinates'])
    open(OUT+name+'.json','w').write(json.dumps(d,ensure_ascii=False,separators=(',',':')))
    print(name,len(g),round(os.path.getsize(OUT+name+'.json')/1e3),'KB')
r=lambda f,n: gpd.read_file(f,layer=n)
# base
w(r(C1,'limite'),'limite',[] ,5)
d=r(C1,'distritos'); w(d,'distritos',['distrito'],10)
loc=r(C1,'localidades_ign'); loc['geometry']=loc.geometry.apply(lambda g:g.geoms[0] if g.geom_type=='MultiPoint' else g); w(loc,'localidades',['fna','nivel'])
# transporte
o=r(C1,'oferta_tramos'); w(o,'red_actual',['calle','lineas','n_lineas','salidas'],3,6)
p=r(EX,'paradas_e12'); p=p[p.en_maipu]; w(p,'paradas',['tipo_parada','id_parada','ref','distrito','clase','alta_robusta','area_max15_ha'])
for n,cols in [('p_alimentadores',['servicio','zona','destino','salidas_dia','servicio_tipo','minimo','transbordo','km','COB','robusta','pct_robustez']),
               ('p_directos',['servicio','zona','nodo','salidas_dia','servicio_tipo','minimo','transbordo','km','COB','robusta','pct_robustez']),
               ('p_modificaciones',['linea','tipo','zona','km_nuevos','salidas_dia','minimo','robusta','pct_robustez','COB']),
               ('p_tramos_quitados',['linea','tipo','zona','km']),
               ('p_nodos_directos',['nodo','nombre','salidas_dia']),
               ('p_paradas_e11b',['tipo','linea','zona','salidas','robusta','alta_e12']),
               ('p_zonas',['zona','P_z','distrito','uit_dominante','causa_dominante','solucion_E11b','solucion_E11b_piso','robusta'])]:
    w(r(C1,n),n,cols,3 if n!='p_zonas' else 30)
# celdas compactas: [lat,lon,pob,estado_actual(0 cerca,1 lejos22,2 suma51), lejos_A1, lejos_A2, lejos_A3, salidas, sin_transbordo]
cel=pd.read_csv(G+'celdas_todas.csv'); lej=r(C1,'lejos_2022_2051')[['i','clase','pob_2022']].rename(columns={'clase':'clase_lej'})
cel=cel.merge(lej,on='i',how='left')
cel=cel[cel.pob>0]
cel['act']=np.where(cel.clase_lej.isna(),0,np.where(cel.clase_lej.str.contains('2022'),1,2))
keep=(cel.act>0)|(cel.d_V1>400)|(cel.d_E11b>400)|(cel.d_E11b_piso>400)
cel=cel[keep]
print(cel.clase_lej.dropna().unique())
tf=Transformer.from_crs(5344,4326,always_xy=True); lon,lat=tf.transform(cel.x.values,cel.y.values)
arr=[[round(a,5),round(b,5),round(float(pp),1),int(ac),int(v1>400),int(e>400),int(pi>400),int(sl),int(st)] for a,b,pp,ac,v1,e,pi,sl,st in zip(lat,lon,cel.pob,cel.act,cel.d_V1,cel.d_E11b,cel.d_E11b_piso,cel.salidas,cel.sin_transbordo)]
json.dump({'campos':['lat','lon','pob2051','actual(0 cerca,1 lejos 2022,2 se suma 2051)','lejos_A1','lejos_A2','lejos_A3','salidas_A2','sin_transbordo_A2'],'celdas':arr},open(OUT+'celdas.json','w'),separators=(',',':'))
print('celdas',len(arr),round(os.path.getsize(OUT+'celdas.json')/1e3),'KB', 'pob act',cel[cel.act>0].pob.sum(),'A1',cel[cel.d_V1>400].pob.sum(),'A2',cel[cel.d_E11b>400].pob.sum(),'A3',cel[cel.d_E11b_piso>400].pob.sum())
# crecimiento
w(r(EX,'expansion_ghsl'),'expansion',['periodo'],10)
w(r(EX,'uit_pmot'),'uit',['uit'],10)
w(r(EX,'franja_rp50_rio'),'franja',[],10)
for n in ['escA_2051_nuevo','escB_2051_nuevo']:
    g=r(EX,n); lo,la=tf.transform(g.x.values,g.y.values)
    json.dump([[round(b,5),round(a,5),round(float(q),2),int(fu)] for a,b,q,fu in zip(lo,la,g.prob,g.fuera_urbana)],open(OUT+n+'.json','w'),separators=(',',':'))
# drenaje
w(r(EX,'red_escurrimiento'),'red_escurrimiento',['orden','area_aporte_ha'],10)
w(r(EX,'canales_e12'),'canales',['clase','nombre','fuente'],5)
w(r(EX,'tramo_anegado_prensa'),'tramo_anegado',['ubicacion'],2)
w(r(EX,'reubicaciones'),'reubicaciones',['id_parada','tipo_parada','posicion','clase_original','nueva_clase','calle','distrito'])
# corredor E14
for n,cols,s in [('area_detalle',['nombre'],None),('curvas_5m',['cota_m','tipo'],3),('cotas',['id','descripcion','cota_m'],None),('perfiles_trazas',['perfil','longitud_m'],None),
                 ('cuenca_aportante',['area_ha'],None),('cuenca_salida',['nombre','area_aporte_ha','cota_m'],None),('cuenca_cauce_principal',['longitud_m'],None),
                 ('red_derivada_18ha',[],5),('red_derivada_36ha',[],5),('red_derivada_180ha',[],5)]:
    w(r(T14,n),'e14_'+n,cols,s)
# perfiles -> json con lat/lon
pf={}
for k in ['L01','T01','T02','T03']:
    df=pd.read_csv(E14+f'out/perfiles/{k}_perfil.csv'); lo,la=tf.transform(df.x_5344.values,df.y_5344.values)
    cr=pd.read_csv(E14+f'out/perfiles/{k}_cruces.csv')
    pf[k]={'d':df.distancia_m.round(0).tolist(),'z':df.cota_m.round(2).tolist(),'lat':np.round(la,6).tolist(),'lon':np.round(lo,6).tolist(),'cruces':cr[['distancia_m','elemento']].round(0).values.tolist()}
json.dump(pf,open(OUT+'perfiles.json','w'),ensure_ascii=False,separators=(',',':'))
# tablas
tabs={}
for t in ['T02_cotas','T03_pendientes_clases','T04_perfiles_resumen','T05_red_umbrales_area','T07_cruces_area','T08_matriz_alternativas_larga','T09_restricciones_excluyentes']:
    tabs[t]=pd.read_csv(E14+f'out/tablas/{t}.csv').where(lambda x:x.notna(),None).to_dict(orient='records')
tabs['T06_cuenca']=json.load(open(E14+'out/tablas/T06_cuenca_aportante.json'))
import math
def _cl(o):
    if isinstance(o,float) and math.isnan(o): return None
    if isinstance(o,dict): return {k:_cl(v) for k,v in o.items()}
    if isinstance(o,list): return [_cl(v) for v in o]
    return o
json.dump(_cl(tabs),open(OUT+'tablas.json','w'),ensure_ascii=False,separators=(',',':'),allow_nan=False)
# ---------- rasters a PNG en 3857
def to3857(src_arr,src_tf,src_crs,name,colorize,res=None):
    dst_crs='EPSG:3857'
    h,wd=src_arr.shape
    left,top=src_tf*(0,0); right,bottom=src_tf*(wd,h)
    t,ww,hh=calculate_default_transform(src_crs,dst_crs,wd,h,left,bottom,right,top,resolution=res)
    dst=np.full((hh,ww),np.nan,'float32')
    reproject(src_arr.astype('float32'),dst,src_transform=src_tf,src_crs=src_crs,dst_transform=t,dst_crs=dst_crs,resampling=Resampling.bilinear,src_nodata=np.nan,dst_nodata=np.nan)
    rgba=colorize(dst); Image.fromarray(rgba,'RGBA').save(IMG+name+'.png',optimize=True)
    x0,y1=t*(0,0); x1,y0=t*(ww,hh); inv=Transformer.from_crs(3857,4326,always_xy=True)
    lo0,la0=inv.transform(x0,y0); lo1,la1=inv.transform(x1,y1)
    print(name,ww,hh,round(os.path.getsize(IMG+name+'.png')/1e3),'KB'); return [[la0,lo0],[la1,lo1]]
B=U+"Cartografia Aplicada Final-20261015T194015Z-1-001/Cartografia Aplicada Final/ETAPA12_MDE_FLUJO/datos/raster/"
with rasterio.open(B+'mde_cop30_hidro_5344_30m.tif') as s: Z=s.read(1).astype('float32'); T=s.transform; Z[Z==s.nodata]=np.nan
lim=r(C1,'limite').buffer(3000).total_bounds
from rasterio.transform import rowcol
r0,c0=rowcol(T,lim[0],lim[3]); r1,c1=rowcol(T,lim[2],lim[1])
Zc=Z[r0:r1,c0:c1]; Tc=T*rasterio.Affine.translation(c0,r0)
def hill(z,az=315,alt=45,zf=4,res=30):
    gy,gx=np.gradient(np.nan_to_num(z,nan=np.nanmean(z))*zf,res); sl=np.pi/2-np.arctan(np.hypot(gx,gy)); asp=np.arctan2(-gx,gy)
    a=np.radians(360-az+90); e=np.radians(alt); return np.clip(np.sin(e)*np.sin(sl)+np.cos(e)*np.cos(sl)*np.cos(a-asp),0,1)
H=hill(Zc)
def col_hill(a):
    v=np.nan_to_num(a,nan=0.7); g=(v*255).astype('uint8'); al=np.where(np.isnan(a),0,np.clip((0.78-v)*420,0,170)).astype('uint8')
    return np.dstack([np.full_like(g,40),np.full_like(g,45),np.full_like(g,50),al])
bnd={}
bnd['sombreado']=to3857(H,Tc,'EPSG:5344','sombreado',col_hill)
def col_hyp(a):
    lo,hi=620,940; t=np.clip((np.nan_to_num(a,nan=lo)-lo)/(hi-lo),0,1)
    stops=np.array([[0.0,(64,120,90)],[0.35,(160,180,110)],[0.6,(214,196,140)],[0.85,(176,140,100)],[1.0,(140,110,90)]],dtype=object)
    xs=[s[0] for s in stops]; cols=np.array([s[1] for s in stops])
    rgb=np.dstack([np.interp(t,xs,cols[:,k]) for k in range(3)]).astype('uint8')
    return np.dstack([rgb,np.where(np.isnan(a),0,255).astype('uint8')])
bnd['hipsometria']=to3857(Zc,Tc,'EPSG:5344','hipsometria',col_hyp)
acc=np.load(E14+'acc.npy')[r0:r1,c0:c1]*0.09
def col_acc(a):
    v=np.log10(np.clip(np.nan_to_num(a,nan=0),0.09,None))
    t=np.clip((v-0.5)/(4.7-0.5),0,1)
    r_=(220-200*t).astype('uint8'); g_=(235-140*t).astype('uint8'); b_=(250-90*t).astype('uint8')
    al=np.where(v<0.6,0,np.clip(60+195*t,0,255)).astype('uint8')
    return np.dstack([r_,g_,b_,al])
bnd['acumulacion']=to3857(acc,Tc,'EPSG:5344','acumulacion',col_acc)
with rasterio.open(E14+'out/raster/pendiente_clases_area.tif') as s: P=s.read(1); PT=s.transform
pal={1:(237,240,228),2:(203,214,166),3:(222,176,90),4:(180,90,60)}
def col_p(a):
    a=np.nan_to_num(a,nan=0).round().astype(int); out=np.zeros(a.shape+(4,),'uint8')
    for k,c in pal.items(): out[a==k]=list(c)+[200]
    return out
bnd['pendientes']=to3857(P.astype('float32'),PT,'EPSG:5344','pendientes',col_p)
with rasterio.open(E14+'out/raster/sombreado_az315_alt45_z3.tif') as s: S=s.read(1).astype('float32')/255; ST=s.transform
bnd['sombreado_corredor']=to3857(S,ST,'EPSG:5344','sombreado_corredor',lambda a:np.dstack([np.full(a.shape,30,'uint8')]*3+[np.where(np.isnan(a),0,np.clip((0.8-np.nan_to_num(a,nan=.8))*500,0,190)).astype('uint8')]))
json.dump(bnd,open(OUT+'raster_bounds.json','w'))
