# Plataforma "Maipú a 400 metros"

Aplicación web estática del Trabajo Final de Cartografía Aplicada (UMaza, 2026): HTML + JavaScript + Leaflet, sin compilación ni dependencias para instalar. Es una sola plataforma con navegación fija arriba:

| Sección | Dirección | Qué tiene |
|---|---|---|
| **Historia** (StoryMap, portada) | `#/storymap`, `#/storymap/1` … `#/storymap/8` | Se abre al entrar. Portada a pantalla completa, presentación y objetivos, índice de capítulos y los 8 capítulos (problema, crecimiento, red actual, relieve, agua, paradas y agua, alternativas, propuesta; el último incluye lo que la propuesta no resuelve). Cada capítulo: banner con imagen propia, texto de lectura, sección inmersiva (mapa a pantalla completa con tarjetas: al bajar, el mapa cambia de capas), banda de cifras, gráficos con texto al lado, nota metodológica y botón "Explorar este tema en el visor GIS". |
| **Visor GIS** | `#/visor`, `#/visor?tema=relieve` | Panel con tres pestañas. **Temas**: 8 mapas listos (uno por capítulo) con su guía de lectura y leyenda. **Capas**: las capas activas con su editor y el catálogo por grupos, con una línea que explica cada capa; las capas técnicas (umbrales alternativos, candidatos descartados, etc.) quedan ocultas salvo que se pidan. **Fondo**: mapa base. |
| **Acerca** | `#/acerca` | Equipo, metodología, fuentes, limitaciones y créditos. |

### Funciones del visor
- Prender y apagar capas, agruparlas, ordenarlas (arrastrar o ▴ ▾), acercarse a una capa (⌖), quitarla (✕).
- Editor por capa (⚙): transparencia, simbología **única, categorizada o graduada** (intervalos iguales, cuantiles, cortes naturales o **cortes manuales editables**), paleta, color, tamaño/grosor, relleno, filtro por atributo (=, ≠, >, <, ≥, ≤, contiene), rótulos y "restablecer".
- Leyenda dinámica que sigue la simbología elegida.
- Identificar (clic, varias capas a la vez), búsqueda (localidades, distritos, calles, líneas, canales), medir distancia y área, volver a Maipú, ir al corredor RP 50.
- Mapas de fondo: Argenmap gris y Argenmap (IGN), satelital (Esri), OpenStreetMap o sin fondo.
- Escala gráfica y numérica, coordenadas geográficas y POSGAR 2007 faja 2, norte.
- La dirección del navegador guarda capas, encuadre y fondo: se puede copiar y compartir una vista.
- En celular el panel de capas arranca plegado (botón ▸ para abrirlo).

## Abrir en tu computadora
Doble clic en **`ABRIR_VISOR.bat`**: levanta un servidor local con PowerShell (`servidor_local.ps1`, puertos 8765 a 8775) y abre el navegador. No hace falta instalar nada. Para cerrarlo, cerrar la ventana negra.

Alternativas: `python -m http.server 8000` dentro de la carpeta y abrir http://localhost:8000, o la extensión "Live Server" de VS Code. Abrir `index.html` con doble clic **no** funciona (el navegador bloquea la lectura de `data/`).

Hace falta internet para las librerías (cdnjs), las tipografías y los mapas de fondo.

## Publicar en Vercel
Opción 1, sin instalar nada: vercel.com → Add New → Project → arrastrar la carpeta `VISOR_WEB_MAIPU` (o importarla desde GitHub). Framework: **Other**. Build command: vacío. Output directory: `.`

Opción 2, con la terminal:
```
npm i -g vercel
cd VISOR_WEB_MAIPU
vercel
vercel --prod
```
`.vercelignore` deja afuera el `.bat`, el `.ps1` y `_fuente/`.

## Estructura (una sola fuente de datos)
```
index.html            estructura y navegación
css/app.css           estilos (colores y tipografías en :root)
js/datos.js           lectura de data/, formato de números, plantillas {{cifra}}
js/simbologia.js      paletas, clasificación, filtros y leyendas
js/catalogo.js        CATÁLOGO DE CAPAS: nombre, grupo, archivo, campos, estilo, descripción, fuente
js/mapa.js            mapa base, fondos y gestor de capas (orden, transparencia, identificar)
js/graficos.js        perfiles, barras y matriz de alternativas
js/contenido.js       TEXTOS del StoryMap (9 capítulos), gráficos y página Acerca
js/storymap.js        comportamiento de la Historia (banners, secciones inmersivas, progreso)
js/visor.js           comportamiento del Visor GIS
js/app.js             navegación (la Historia es la portada)
data/*.json           capas (GeoJSON WGS84) y tablas
data/cifras.json      cifras que se repiten en textos (lejos_2022, acercados_A3, …)
img/                  rásters en Web Mercator, logo y portada
_fuente/prep.py       genera data/ e img/ desde los GeoPackage del proyecto
_fuente/prep2.py      genera data/cifras.json
_fuente/prep3.py      genera las imágenes de portada y banners (img/banner_*.jpg)
_fuente/prep4.py      exporta las rutas del IGN a data/rutas.json
```
StoryMap y Visor usan **el mismo catálogo y los mismos archivos**: no hay datos duplicados.

### Cómo editar
- **Un texto de la Historia**: `js/contenido.js`, en `M4.CAPITULOS`. Cada capítulo tiene `kicker`, `titulo`, `bajada` (banner), `intro` (texto de lectura), `pasos` (tarjetas del mapa: `texto`, `capas` que se prenden y `leyenda`), `cifras`, `figuras` (gráfico + texto), `nota`, `vista` (`maipu` o `corredor`) y `visor` (capas que abre el botón al visor). Dentro del texto, `{{lejos_2022}}` se reemplaza por la cifra de `data/cifras.json`.
- **Las imágenes de los banners** (`img/banner_*.jpg`) se generan con `_fuente/prep3.py` a partir de los mismos datos de `data/`.
- **Un tema del visor**: `js/contenido.js`, en `M4.TEMAS` (`titulo`, `resumen`, `lectura`, `capas`, `leyenda`, `vista`, `cap`).
- **Una cifra**: `data/cifras.json` (cambia en todas las secciones a la vez).
- **Una capa nueva**: agregar el GeoJSON en `data/` y una entrada en `M4.CATALOGO` (`js/catalogo.js`) con `id`, `grupo`, `nombre`, `geom` (`punto`, `linea` o `poligono`), `carga: 'archivo.json'`, `campos`, `desc`, `fuente` y `estilo`. Aparece sola en el visor.
- **Colores del sitio**: variables al principio de `css/app.css`.

## Pendiente
- Parcelario (IDE Mendoza, Parcelas_Maipú) y sus cruces.
- Comparación temporal de imágenes (3 fechas).
- Capa exacta de los servicios de la alternativa A3 (hoy: servicios robustos de la corrida completa con 4 o más salidas por día, una aproximación).
