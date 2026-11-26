/* Catálogo ÚNICO de capas: lo usan el StoryMap y el Visor GIS. Cada ficha dice de dónde sale la capa,
   qué atributos tiene, cómo se dibuja por defecto y cómo se explica al consultarla. */
(function (M4) {
  'use strict';
  const C = { violet: '#5b3a99', violetL: '#c9bce6', naranja: '#f08c00', rojo: '#d62828', azulP: '#1c6fb8', green: '#1f7a4d', greenL: '#6cc08f', water: '#2f6fa8', ochre: '#c47a1d', ink: '#1d2321', teal: '#3f8f8a', magenta: '#b0307a', gris: '#8d9692', cobre: '#b5651d' };
  M4.COLORES = C;
  const json = (f) => () => M4.get(f);
  const robusto = (p) => p.robusta === 1 && p.minimo === 0;
  const CANALES = { canal: '#3f8f8a', acequia: '#7fbf9a', 'desagüe o colector': '#7a6aa8', 'curso de agua': '#2f6fa8' };
  const SIN_ROB = 'Se muestran solo las decisiones robustas (presentes en al menos el 70 % de 12 variantes del modelo) con 4 o más salidas por día.';

  M4.GRUPOS = ['Referencias', 'Población', 'Crecimiento urbano', 'Colectivos hoy', 'Red propuesta', 'Relieve', 'Agua y escurrimiento'];
  M4.GRUPO_DESC = { 'Referencias': 'Límites, localidades y rutas para ubicarse.', 'Población': 'Quién vive a más de 400 m de una parada.', 'Crecimiento urbano': 'Hacia dónde crece Maipú y qué dice el PMOT.', 'Colectivos hoy': 'Calles con servicio y paradas actuales.', 'Red propuesta': 'Lo que propone la alternativa elegida (A3).', 'Relieve': 'Terreno del corredor de la RP 50.', 'Agua y escurrimiento': 'Por dónde escurriría el agua y qué paradas revisar.' };

  M4.CATALOGO = [
    // ---------------- Base territorial
    { id: 'limite', grupo: 'Referencias', nombre: 'Límite de Maipú', geom: 'poligono', carga: json('limite.json'), campos: [],
      desc: 'Límite departamental de Maipú.', fuente: 'IGN, WFS (28/10/2026)', estilo: { modo: 'unico', color: '#2b302e', ancho: 2, soloBorde: true, guiones: '8 3 2 3', etiqueta: 'Límite departamental' }, interactiva: false },
    { id: 'rutas', grupo: 'Referencias', nombre: 'Rutas nacionales y provinciales', geom: 'linea', carga: json('rutas.json'), campos: [['ruta', 'Ruta', 'txt'], ['jurisdiccion', 'Jurisdicción', 'cat'], ['longitud_km', 'Largo del tramo (km)', 'num', 1]],
      desc: 'Red vial nacional y provincial, para ubicarse (RN 7 Acceso Este, RP 50, etc.).', fuente: 'IGN, capa de rutas (WFS, 28/10/2026)',
      estilo: { modo: 'categorizado', campo: 'jurisdiccion', ancho: 2.6, categorias: { nacional: '#a61e1e', provincial: '#e4572e' } }, rotulo: { campo: 'ruta', clase: 'ruta', filtro: p => p.rot === 1 }, titulo: p => p.ruta, buscar: ['ruta'] },
    { id: 'distritos', grupo: 'Referencias', nombre: 'Distritos', geom: 'poligono', carga: json('distritos.json'), campos: [['distrito', 'Distrito', 'cat']],
      desc: 'Los 12 distritos de Maipú.', fuente: 'Municipalidad de Maipú / IGN', estilo: { modo: 'unico', color: '#7d8682', ancho: 1, soloBorde: true, etiqueta: 'Límite de distrito' },
      rotulo: { campo: 'distrito', clase: 'dist' }, titulo: p => 'Distrito ' + p.distrito, buscar: ['distrito'] },
    { id: 'localidades', grupo: 'Referencias', nombre: 'Localidades', geom: 'punto', carga: json('localidades.json'), campos: [['fna', 'Nombre', 'txt'], ['nivel', 'Tipo', 'cat']],
      filtroBase: p => p.nivel === 'localidad', desc: 'Localidades del IGN (BAHRA).', fuente: 'IGN / BAHRA', estilo: { modo: 'unico', color: '#2b302e', radio: 3, etiqueta: 'Localidad' },
      rotulo: { campo: 'fna', clase: '' }, titulo: p => p.fna, buscar: ['fna'] },

    // ---------------- Población
    { id: 'celdas', grupo: 'Población', nombre: 'Población 2051 por celda (100 m)', geom: 'poligono', carga: () => M4.celdasGeo(),
      campos: [['poblacion_2051', 'Población 2051 (hab.)', 'num', 1], ['situacion_actual', 'Situación actual', 'cat'], ['con_A1', 'Con A1 (paradas)', 'cat'], ['con_A2', 'Con A2 (red completa)', 'cat'], ['con_A3', 'Con A3 (elegida)', 'cat'], ['efecto_A3', 'Efecto de A3', 'cat'], ['salidas_dia_A2', 'Salidas/día cercanas (A2)', 'num'], ['sin_transbordo_A2', 'Sin transbordo (A2)', 'cat']],
      desc: 'Celdas de 100 × 100 m con población estimada al 2051 (escenario A) y su distancia, caminando por calles, a la parada más cercana en cada alternativa. Solo se incluyen las celdas que en 2051 quedan a más de 400 m sin cambios en la red.',
      fuente: 'Etapas 7, 8 y 11b (INDEC 2022, proyección propia)',
      estilo: { modo: 'categorizado', campo: 'situacion_actual', relleno: .85, ancho: 0, categorias: { 'Lejos en 2022': C.violet, 'Se suma en 2051': C.naranja } },
      titulo: p => 'Celda de 100 × 100 m', explica: 'Distancia medida caminando por calles hasta la parada más cercana (umbral 400 m). La población por celda es una estimación a partir de radios censales.' },

    // ---------------- Crecimiento
    { id: 'uit', tecnica: true, grupo: 'Crecimiento urbano', nombre: 'UIT del PMOT', geom: 'poligono', carga: json('uit.json'), campos: [['uit', 'Unidad de Integración Territorial', 'cat']],
      desc: 'Unidades de Integración Territorial del Plan Municipal de Ordenamiento Territorial (Ord. 6886/21), digitalizadas con ±150 m. No es zonificación.', fuente: 'PMOT de Maipú, digitalización propia',
      estilo: { modo: 'categorizado', campo: 'uit', relleno: .38, ancho: .6, borde: '#a7a091', categorias: { Urbana: '#ffffff', Rural: '#f1e7c9', Industrial: '#d9d2e6', 'Ecosistemas Naturales': '#cfe2d4' } },
      titulo: p => 'UIT ' + p.uit, explica: 'El PMOT orienta el crecimiento urbano dentro de la UIT Urbana. Límite digitalizado con ±150 m.' },
    { id: 'uit_urbana', grupo: 'Crecimiento urbano', nombre: 'Contorno de la UIT Urbana', geom: 'poligono', carga: async () => { const d = await M4.get('uit.json'); return { type: 'FeatureCollection', features: d.features.filter(f => f.properties.uit === 'Urbana') }; },
      campos: [['uit', 'UIT', 'cat']], desc: 'Contorno de la UIT Urbana del PMOT, donde el plan orienta el crecimiento.', fuente: 'PMOT de Maipú', estilo: { modo: 'unico', color: C.ink, ancho: 2.2, soloBorde: true, etiqueta: 'UIT Urbana (PMOT)' }, interactiva: false },
    { id: 'franja', tecnica: true, grupo: 'Crecimiento urbano', nombre: 'Franja RP 50 – río', geom: 'poligono', carga: json('franja.json'), campos: [],
      desc: 'Franja entre la RP 50 y el río Mendoza que el PMOT marca como la más vulnerable.', fuente: 'PMOT de Maipú', estilo: { modo: 'unico', color: C.magenta, relleno: .08, ancho: 1, guiones: '4 3', etiqueta: 'Franja RP 50 – río' }, interactiva: false },
    { id: 'expansion', grupo: 'Crecimiento urbano', nombre: 'Mancha urbana observada (GHSL)', geom: 'poligono', carga: json('expansion.json'), campos: [['periodo', 'Período', 'cat']],
      desc: 'Celdas con al menos 20 % de superficie construida según GHSL. Las épocas 2010 y 2020 son interpolación y extrapolación del productor.', fuente: 'JRC Global Human Settlement Layer R2023A',
      estilo: { modo: 'categorizado', campo: 'periodo', relleno: .75, ancho: 0, categorias: { '≤2000': '#c9c3b5', '2000-2010': '#e9b66b', '2010-2020': C.ochre } },
      titulo: p => 'Mancha urbana ' + p.periodo },
    { id: 'escA', grupo: 'Crecimiento urbano', nombre: 'Escenario A 2051 (tendencial)', geom: 'poligono', carga: () => M4.escenarioGeo('escA_2051_nuevo.json'), campos: [['probabilidad_pct', 'Probabilidad de urbanizarse (%)', 'num'], ['fuera_uit_urbana', 'Fuera de la UIT Urbana', 'cat']],
      desc: 'Probabilidad de que cada celda de 100 m se urbanice al 2051 si sigue la tendencia 2000-2020. No es una predicción.', fuente: 'Etapa 7 (modelo de localización)',
      estilo: { modo: 'graduado', campo: 'probabilidad_pct', metodo: 'manual', cortes: [0, 25, 50, 75, 100], paleta: 'violetas', relleno: .85, ancho: 0 }, titulo: () => 'Escenario A 2051' },
    { id: 'escB', tecnica: true, grupo: 'Crecimiento urbano', nombre: 'Escenario B 2051 (orientado por el PMOT)', geom: 'poligono', carga: () => M4.escenarioGeo('escB_2051_nuevo.json'), campos: [['probabilidad_pct', 'Probabilidad (%)', 'num'], ['fuera_uit_urbana', 'Fuera de la UIT Urbana', 'cat']],
      desc: 'La misma población ubicada dentro de la UIT Urbana y cerca de paradas. Mide compatibilidad aproximada con los lineamientos del plan, no su cumplimiento.', fuente: 'Etapa 7',
      estilo: { modo: 'graduado', campo: 'probabilidad_pct', metodo: 'manual', cortes: [0, 25, 50, 75, 100], paleta: 'verdes', relleno: .85, ancho: 0 }, titulo: () => 'Escenario B 2051' },

    // ---------------- Transporte actual
    { id: 'red_actual', grupo: 'Colectivos hoy', nombre: 'Calles con colectivo', geom: 'linea', carga: json('red_actual.json'), campos: [['calle', 'Calle', 'txt'], ['lineas', 'Líneas', 'txt'], ['n_lineas', 'Cantidad de líneas', 'num'], ['salidas', 'Salidas por día hábil', 'num']],
      desc: 'Cada cuadra con las líneas que pasan y sus salidas por día hábil (horarios Mendotran).', fuente: 'Mendotran (trazas y horarios, 03/10/2026); tabla tramo × línea del proyecto',
      estilo: { modo: 'graduado', campo: 'salidas', metodo: 'manual', cortes: [0, 40, 120, 250, 1200], paleta: 'tinta', ancho: 2.4 },
      titulo: p => p.calle || 'Calle sin nombre', explica: 'Oferta actual: suma de los servicios de todas las líneas que recorren esta cuadra (ida y vuelta juntas).', buscar: ['calle', 'lineas'] },
    { id: 'paradas_exist', grupo: 'Colectivos hoy', nombre: 'Paradas actuales', geom: 'punto', carga: json('paradas.json'), filtroBase: p => p.tipo_parada.startsWith('existente'),
      campos: [['ref', 'Referencia', 'txt'], ['distrito', 'Distrito', 'cat'], ['clase', 'Clase por escurrimiento', 'cat']], desc: 'Paradas de colectivo en Maipú.', fuente: 'SSP / Wara (04/11/2025)',
      estilo: { modo: 'unico', color: C.rojo, borde: '#ffffff', bordeAncho: .6, radio: 3, etiqueta: 'Parada actual' }, titulo: p => 'Parada actual', buscar: ['ref'] },

    // ---------------- Propuesta
    { id: 'prop_mod', grupo: 'Red propuesta', nombre: 'Líneas existentes modificadas', geom: 'linea', carga: json('p_modificaciones.json'), filtroBase: robusto,
      campos: [['linea', 'Línea', 'cat'], ['tipo', 'Operación (M1 extensión, M2 ramal, M3 desvío)', 'cat'], ['zona', 'Zona que atiende', 'txt'], ['km_nuevos', 'Km nuevos', 'num', 1], ['salidas_dia', 'Salidas por día', 'num', 1], ['COB', 'Población que acerca', 'num'], ['pct_robustez', 'Robustez (% de variantes)', 'num']],
      desc: 'Tramos nuevos de líneas existentes (extensiones cortas, ramales o desvíos) que no cambian la naturaleza de la línea. ' + SIN_ROB, fuente: 'Etapa 11b',
      estilo: { modo: 'unico', color: '#e8590c', ancho: 4.5, etiqueta: 'Tramo nuevo de línea existente' }, titulo: p => 'Línea ' + p.linea + ' modificada', explica: 'Sin transbordo: la gente sube a una línea que ya existe. Hay que verificar en terreno que la calle sea apta para colectivos.', buscar: ['linea'] },
    { id: 'prop_ali', grupo: 'Red propuesta', nombre: 'Alimentadores', geom: 'linea', carga: json('p_alimentadores.json'), filtroBase: robusto,
      campos: [['zona', 'Zona', 'txt'], ['servicio_tipo', 'Régimen', 'cat'], ['salidas_dia', 'Salidas por día', 'num'], ['km', 'Largo (km)', 'num', 1], ['COB', 'Población que acerca', 'num'], ['pct_robustez', 'Robustez (%)', 'num']],
      desc: 'Combis o minibuses desde una zona lejana hasta una parada de línea troncal, donde se hace transbordo. ' + SIN_ROB, fuente: 'Etapa 11b',
      estilo: { modo: 'unico', color: C.azulP, ancho: 3, guiones: '7 4', etiqueta: 'Alimentador (combi a troncal)' }, titulo: p => 'Alimentador ' + p.zona, explica: 'Con transbordo. "Continuo" = 16 salidas por día (cada hora); "particular" = pocas salidas en horas pico.', buscar: ['zona'] },
    { id: 'prop_dir', grupo: 'Red propuesta', nombre: 'Directos al centro del distrito', geom: 'linea', carga: json('p_directos.json'), filtroBase: robusto,
      campos: [['zona', 'Zona', 'txt'], ['nodo', 'Destino', 'cat'], ['servicio_tipo', 'Régimen', 'cat'], ['salidas_dia', 'Salidas por día', 'num'], ['km', 'Largo (km)', 'num', 1], ['COB', 'Población que acerca', 'num'], ['pct_robustez', 'Robustez (%)', 'num']],
      desc: 'Servicios que salen de la zona lejana y van sin paradas intermedias al centro del distrito. ' + SIN_ROB, fuente: 'Etapa 11b',
      estilo: { modo: 'unico', color: C.magenta, ancho: 3, guiones: '10 3 2 3', etiqueta: 'Directo al centro del distrito' }, titulo: p => 'Directo ' + p.zona + ' → ' + p.nodo, explica: 'El destino es un supuesto: la encuesta origen-destino disponible es de 2010 y por departamento.' },
    { id: 'prop_paradas', grupo: 'Red propuesta', nombre: 'Paradas de los servicios propuestos', geom: 'punto', carga: json('p_paradas_e11b.json'), filtroBase: p => p.robusta === 1 && p.salidas >= 4,
      campos: [['zona', 'Servicio', 'txt'], ['tipo', 'Tipo de servicio', 'cat'], ['salidas', 'Salidas por día', 'num', 1]], desc: 'Paradas candidatas de los servicios propuestos, a verificar en terreno.', fuente: 'Etapa 11b',
      estilo: { modo: 'unico', color: C.green, radio: 3.8, etiqueta: 'Parada de servicio propuesto' }, titulo: () => 'Parada de servicio propuesto' },
    { id: 'paradas_v1', grupo: 'Red propuesta', nombre: 'Paradas nuevas sobre recorridos actuales', geom: 'punto', carga: json('paradas.json'), filtroBase: p => p.tipo_parada.startsWith('nueva V1'),
      campos: [['distrito', 'Distrito', 'cat'], ['clase', 'Clase por escurrimiento', 'cat']], desc: 'Las 62 paradas de la Etapa 8, elegidas para acercar la mayor población posible sobre las líneas que ya pasan.', fuente: 'Etapa 8 (modelo de cobertura máxima)',
      estilo: { modo: 'unico', color: '#ffffff', borde: C.green, bordeAncho: 1.8, radio: 4.2, etiqueta: 'Parada nueva sobre recorrido actual' }, titulo: () => 'Parada nueva sobre recorrido actual' },
    { id: 'prop_nodos', tecnica: true, grupo: 'Red propuesta', nombre: 'Destinos de los directos', geom: 'punto', carga: json('p_nodos_directos.json'), campos: [['nombre', 'Nombre', 'txt'], ['salidas_dia', 'Salidas por día en el nodo', 'num']],
      desc: 'Centros de distrito usados como destino supuesto de los directos.', fuente: 'Etapa 11b', estilo: { modo: 'unico', color: '#ffffff', borde: C.magenta, bordeAncho: 2.4, radio: 7, etiqueta: 'Destino supuesto de directos' }, titulo: p => p.nombre },
    { id: 'prop_zonas', grupo: 'Red propuesta', nombre: 'Zonas de déficit y su solución', geom: 'poligono', carga: json('p_zonas.json'),
      campos: [['zona', 'Zona', 'txt'], ['P_z', 'Población lejos (hab.)', 'num'], ['distrito', 'Distrito', 'cat'], ['uit_dominante', 'UIT', 'cat'], ['causa_dominante', 'Causa', 'cat'], ['solucion_E11b_piso', 'Solución en A3', 'cat'], ['solucion_E11b', 'Solución en A2', 'cat']],
      desc: 'Agrupamientos de población lejana (156 zonas) y el tipo de solución que les asigna la alternativa A3.', fuente: 'Etapa 11b',
      estilo: { modo: 'categorizado', campo: 'solucion_E11b_piso', relleno: .35, ancho: .6, borde: '#777', categorias: { modificar: '#e8590c', alimentador: C.azulP, directo: C.magenta, ninguna: '#9a9a9a' } }, titulo: p => 'Zona ' + p.zona },
    { id: 'prop_norob', tecnica: true, grupo: 'Red propuesta', nombre: 'Candidatos descartados', geom: 'linea', carga: async () => { const fs = []; for (const f of ['p_alimentadores.json', 'p_directos.json', 'p_modificaciones.json']) (await M4.get(f)).features.forEach(x => { if (!robusto(x.properties)) fs.push(x); }); return { type: 'FeatureCollection', features: fs }; },
      campos: [['zona', 'Zona', 'txt'], ['salidas_dia', 'Salidas por día', 'num', 1], ['pct_robustez', 'Robustez (%)', 'num']], desc: 'Servicios que no se repiten en la mayoría de las variantes o que tienen menos de 4 salidas por día. No forman parte de la propuesta.', fuente: 'Etapa 11b',
      estilo: { modo: 'unico', color: '#8fb9a2', ancho: 1.6, guiones: '3 3', etiqueta: 'Candidato descartado' }, titulo: () => 'Candidato descartado' },

    // ---------------- Relieve
    { id: 'area_detalle', tecnica: true, grupo: 'Relieve', nombre: 'Área de detalle (corredor RP 50)', geom: 'poligono', carga: json('e14_area_detalle.json'), campos: [['nombre', 'Nombre', 'txt']],
      desc: 'Corredor de la RP 50 (Acceso Este – Rodeo del Medio – Fray Luis Beltrán), 11,5 × 9,5 km, donde se hizo el análisis de terreno.', fuente: 'Etapa 14', estilo: { modo: 'unico', color: C.cobre, ancho: 2, soloBorde: true, guiones: '6 4', etiqueta: 'Área de detalle' }, interactiva: false },
    { id: 'hipsometria', grupo: 'Relieve', nombre: 'Hipsometría', tipo: 'raster', img: 'hipsometria.webp', clave: 'hipsometria', opacidad: .55, desc: 'Elevación por color, del verde (≈ 620 m) al marrón (≈ 940 m).', fuente: 'Copernicus DEM GLO-30 (MDS 30 m)',
      leyenda: [{ grad: 'linear-gradient(90deg,#40785a,#a0b46e,#d6c48c,#b08c64)', texto: '620 → 940 m' }] },
    { id: 'sombreado', tecnica: true, grupo: 'Relieve', nombre: 'Sombreado (todo Maipú)', tipo: 'raster', img: 'sombreado.webp', clave: 'sombreado', opacidad: 1, desc: 'Iluminación desde el noroeste (azimut 315°, altura 45°, factor vertical 4).', fuente: 'Copernicus DEM GLO-30' },
    { id: 'sombreado_corr', grupo: 'Relieve', nombre: 'Sombreado del corredor', tipo: 'raster', img: 'sombreado_corredor.webp', clave: 'sombreado_corredor', opacidad: 1, desc: 'Azimut 315°, altura 45°, factor vertical 3. Sirve para leer formas; las sombras no son pendientes.', fuente: 'Copernicus DEM GLO-30' },
    { id: 'curvas', grupo: 'Relieve', nombre: 'Curvas de nivel (5 m)', geom: 'linea', carga: json('e14_curvas_5m.json'), campos: [['cota_m', 'Cota (m)', 'num'], ['tipo', 'Tipo', 'cat']],
      desc: 'Equidistancia 5 m, maestras cada 25 m, derivadas del MDE suavizado. No agregan precisión al MDE (error ≈ 3,3 m).', fuente: 'Etapa 14',
      estilo: { modo: 'categorizado', campo: 'tipo', ancho: 1.1, categorias: { maestra: '#7a5a24', intermedia: '#c2a57a' } }, rotulo: { campo: 'cota_m', clase: 'cota', filtro: p => p.tipo === 'maestra' }, titulo: p => 'Curva de ' + p.cota_m + ' m' },
    { id: 'cotas', grupo: 'Relieve', nombre: 'Cotas C1 a C3', geom: 'punto', carga: json('e14_cotas.json'), campos: [['id', 'Id', 'txt'], ['cota_m', 'Cota (m)', 'num', 1], ['descripcion', 'Descripción', 'txt']],
      desc: 'Tres puntos representativos con su cota leída del MDE. No son puntos acotados oficiales.', fuente: 'Etapa 14', estilo: { modo: 'unico', color: C.ink, radio: 4.5, etiqueta: 'Cota derivada del MDE' },
      rotulo: { campo: 'id', clase: 'cota', fn: p => p.id + ' · ' + M4.fmt(p.cota_m, 1) + ' m' }, titulo: p => p.id + ' · ' + M4.fmt(p.cota_m, 1) + ' m' },
    { id: 'pendientes', grupo: 'Relieve', nombre: 'Pendientes (clases en %)', tipo: 'raster', img: 'pendientes.png', clave: 'pendientes', opacidad: .85, desc: 'Pendiente en %: < 1 plano, 1–2 muy suave, 2–5 suave, ≥ 5 moderada o artificial (bordes, terraplenes, edificios).', fuente: 'Etapa 14',
      leyenda: [{ forma: 'poligono', color: '#edf0e4', texto: '< 1 % plano' }, { forma: 'poligono', color: '#cbd6a6', texto: '1–2 % muy suave' }, { forma: 'poligono', color: '#deb05a', texto: '2–5 % suave' }, { forma: 'poligono', color: '#b45a3c', texto: '≥ 5 % moderada o artificial' }] },
    { id: 'perfiles', grupo: 'Relieve', nombre: 'Trazas de perfiles', geom: 'linea', carga: json('e14_perfiles_trazas.json'), campos: [['perfil', 'Perfil', 'cat'], ['longitud_m', 'Longitud (m)', 'num']],
      desc: 'L01 sobre la RP 50 (de NO a SE) y T01 a T03 perpendiculares (de SO a NE). Al tocar una traza se abre su perfil.', fuente: 'Etapa 14',
      estilo: { modo: 'unico', color: '#1d2321', ancho: 2.8, guiones: '8 4', etiqueta: 'Traza de perfil' }, rotulo: { campo: 'perfil', clase: '', inicio: true }, titulo: p => 'Perfil ' + p.perfil, perfil: true },

    // ---------------- Drenaje
    { id: 'acumulacion', grupo: 'Agua y escurrimiento', nombre: 'Acumulación de flujo', tipo: 'raster', img: 'acumulacion.webp', clave: 'acumulacion', opacidad: .9, desc: 'Superficie que drena a través de cada celda (dirección D8 sobre el MDE acondicionado). Escala logarítmica solo como recurso gráfico: no es caudal.', fuente: 'Etapas 12 y 14',
      leyenda: [{ grad: 'linear-gradient(90deg,rgba(220,235,250,.5),#5f9bd0,#14469e)', texto: '≈ 1 ha → 5.000 ha (logarítmica)' }] },
    { id: 'red_18', tecnica: true, grupo: 'Agua y escurrimiento', nombre: 'Red derivada · umbral 18 ha', geom: 'linea', carga: json('e14_red_derivada_18ha.json'), campos: [], desc: 'Celdas que drenan 18 ha o más (200 celdas). Red densa.', fuente: 'Etapa 14', estilo: { modo: 'unico', color: '#9ec5e8', ancho: 1, etiqueta: 'Umbral 18 ha' }, interactiva: false },
    { id: 'red_36', grupo: 'Agua y escurrimiento', nombre: 'Red derivada · umbral 36 ha (elegido)', geom: 'linea', carga: json('e14_red_derivada_36ha.json'), campos: [], desc: 'Celdas que drenan 36 ha o más (400 celdas). Elegido porque es el que mejor coincide con ríos y arroyos observados.', fuente: 'Etapa 14',
      estilo: { modo: 'unico', color: C.water, ancho: 1.8, etiqueta: 'Umbral 36 ha (elegido)' }, titulo: () => 'Red de escurrimiento derivada (36 ha)', explica: 'Por acá tendería a escurrir el agua según el MDE. No es un cauce observado.' },
    { id: 'red_180', tecnica: true, grupo: 'Agua y escurrimiento', nombre: 'Red derivada · umbral 180 ha', geom: 'linea', carga: json('e14_red_derivada_180ha.json'), campos: [], desc: 'Celdas que drenan 180 ha o más (2.000 celdas). Solo las líneas principales.', fuente: 'Etapa 14', estilo: { modo: 'unico', color: '#123f6b', ancho: 3, etiqueta: 'Umbral 180 ha' }, interactiva: false },
    { id: 'red_escurrimiento', grupo: 'Agua y escurrimiento', nombre: 'Red derivada de todo Maipú', geom: 'linea', carga: json('red_escurrimiento.json'), campos: [['orden', 'Orden de Strahler', 'num'], ['area_aporte_ha', 'Área de aporte (ha)', 'num']],
      desc: 'Red de 36 ha en todo el departamento con orden de Strahler (1 en las cabeceras; sube cuando se juntan dos del mismo orden).', fuente: 'Etapa 12',
      estilo: { modo: 'categorizado', campo: 'orden', ancho: 1.6, categorias: { 1: '#b8d3ea', 2: '#7fb0d8', 3: '#4a88bf', 4: '#2f6fa8', 5: '#163f6b' } }, titulo: p => 'Red derivada · orden ' + p.orden },
    { id: 'canales', grupo: 'Agua y escurrimiento', nombre: 'Canales, acequias y desagües', geom: 'linea', carga: json('canales.json'), campos: [['nombre', 'Nombre', 'txt'], ['clase', 'Tipo', 'cat'], ['fuente', 'Fuente', 'cat']],
      desc: 'Red de agua observada: riego del Departamento General de Irrigación (2024), colectores aluvionales y cursos.', fuente: 'DGI e IDE Mendoza, IGN, OSM',
      estilo: { modo: 'categorizado', campo: 'clase', ancho: 1.4, categorias: CANALES }, titulo: p => p.nombre || p.clase, explica: 'En Maipú, acequias y canales desvían gran parte del escurrimiento que el MDE no ve.', buscar: ['nombre'] },
    { id: 'cuenca', grupo: 'Agua y escurrimiento', nombre: 'Cuenca aportante a la RP 50', geom: 'poligono', carga: json('e14_cuenca_aportante.json'), campos: [['area_ha', 'Superficie (ha)', 'num']],
      desc: 'Superficie que, según el terreno, drena hacia el tramo anegado de la RP 50 en Rodeo del Medio.', fuente: 'Etapa 14', estilo: { modo: 'unico', color: C.water, relleno: .16, ancho: 2, etiqueta: 'Cuenca aportante' },
      titulo: () => 'Cuenca aportante', explica: 'Delimitada aguas arriba de la salida con la dirección de flujo D8. No toca el borde del recorte: no está truncada.' },
    { id: 'cauce', grupo: 'Agua y escurrimiento', nombre: 'Cauce principal derivado', geom: 'linea', carga: json('e14_cuenca_cauce_principal.json'), campos: [['longitud_m', 'Longitud (m)', 'num']], desc: 'Recorrido de mayor acumulación dentro de la cuenca, desde la cabecera hasta la salida.', fuente: 'Etapa 14',
      estilo: { modo: 'unico', color: '#0b2a4a', ancho: 3, etiqueta: 'Cauce principal derivado' }, titulo: () => 'Cauce principal derivado' },
    { id: 'salida', tecnica: true, grupo: 'Agua y escurrimiento', nombre: 'Salida de la cuenca', geom: 'punto', carga: json('e14_cuenca_salida.json'), campos: [['cota_m', 'Cota (m)', 'num', 1], ['area_aporte_ha', 'Área de aporte (ha)', 'num'], ['nombre', 'Ubicación', 'txt']],
      desc: 'Punto de interés: celda de mayor acumulación a 60 m o menos del tramo de la RP 50 anegado.', fuente: 'Etapa 14', estilo: { modo: 'unico', color: C.cobre, radio: 7, bordeAncho: 2, etiqueta: 'Salida (punto de interés)' }, titulo: () => 'Salida de la cuenca' },
    { id: 'tramo_anegado', grupo: 'Agua y escurrimiento', nombre: 'Tramo anegado de la RP 50', geom: 'linea', carga: json('tramo_anegado.json'), campos: [['ubicacion', 'Ubicación', 'txt']],
      desc: 'Tramos de la RP 50 reportados anegados en el temporal del 12-13/10/2026 (prensa).', fuente: 'Prensa (Los Andes, MDZ), 13/10/2026', estilo: { modo: 'unico', color: C.cobre, ancho: 6, opacidadTrazo: .75, etiqueta: 'Tramo anegado (prensa)' }, titulo: () => 'Tramo anegado de la RP 50' },
    { id: 'paradas_clase', grupo: 'Agua y escurrimiento', nombre: 'Paradas según escurrimiento', geom: 'punto', carga: json('paradas.json'),
      campos: [['clase', 'Clase', 'cat'], ['tipo_parada', 'Tipo', 'cat'], ['distrito', 'Distrito', 'cat'], ['area_max15_ha', 'Área que drena junto a la parada (ha)', 'num', 1]],
      desc: 'Paradas actuales y nuevas de la propuesta, clasificadas según su relación con la red derivada. ALTA = a verificar (sobre una línea que drena 180 ha o más, o en un bajo). Es prioridad de verificación, no riesgo.', fuente: 'Etapa 12',
      estilo: { modo: 'categorizado', campo: 'clase', radio: 4, categorias: { ALTA: C.rojo, MEDIA: '#f4a261', BAJA: '#c9cfcc' } }, titulo: p => 'Parada · clase ' + p.clase },
    { id: 'reubicaciones', grupo: 'Agua y escurrimiento', nombre: 'Paradas nuevas reubicadas', geom: 'punto', carga: json('reubicaciones.json'), campos: [['posicion', 'Posición', 'cat'], ['calle', 'Calle', 'txt'], ['distrito', 'Distrito', 'cat'], ['clase_original', 'Clase original', 'cat'], ['nueva_clase', 'Clase nueva', 'cat']],
      desc: 'Paradas nuevas que caían en clase ALTA y se movieron unos metros por la misma calle.', fuente: 'Etapa 12', estilo: { modo: 'categorizado', campo: 'posicion', radio: 6, categorias: { original: '#ffffff', nueva: C.cobre }, borde: C.cobre, bordeAncho: 2 }, titulo: p => 'Parada · posición ' + p.posicion }
  ];
  M4.CAT = Object.fromEntries(M4.CATALOGO.map(c => [c.id, c]));
  M4.estiloInicial = (id) => JSON.parse(JSON.stringify(Object.assign({ modo: 'unico', color: '#5b3a99', ancho: 1.5, radio: 4, relleno: .6 }, M4.CAT[id].estilo || {})));
})(window.M4);
