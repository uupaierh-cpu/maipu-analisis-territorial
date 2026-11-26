/* Contenido de la Historia (StoryMap), de los temas del visor y de "Acerca".
   Las cifras {{clave}} se leen de data/cifras.json (única fuente). */
(function (M4) {
  'use strict';
  const C = M4.COLORES;
  const celdas = (campo, cats, filtro) => ({ id: 'celdas', estilo: { modo: 'categorizado', campo, relleno: .85, ancho: 0, categorias: cats }, filtro: filtro || null });
  const conAlt = (alt) => celdas('con_' + alt, { 'Sigue lejos': C.violet, 'Se acerca': C.greenL });
  M4.PRESETS = {
    actual: celdas('situacion_actual', { 'Lejos en 2022': C.violet, 'Se suma en 2051': C.naranja }),
    sinCambios: { id: 'celdas', estilo: { modo: 'unico', color: C.violet, relleno: .85, ancho: 0, etiqueta: 'Lejos de una parada en 2051' }, filtro: null },
    A1: conAlt('A1'), A2: conAlt('A2'), A3: conAlt('A3'), efecto: conAlt('A3')
  };
  const base = ['localidades', 'distritos', 'limite'];
  const lejos2022 = celdas('situacion_actual', { 'Lejos en 2022': C.violet, 'Se suma en 2051': C.naranja }, { campo: 'situacion_actual', op: '=', valor: 'Lejos en 2022' });
  const zonasSin = { id: 'prop_zonas', filtro: { campo: 'solucion_E11b_piso', op: '=', valor: 'ninguna' } };
  const redClara = { id: 'red_actual', estilo: { modo: 'unico', color: '#b9bfc2', ancho: 1.4, etiqueta: 'Calle con colectivo hoy' }, filtro: null };
  const paradasActClase = { id: 'paradas_clase', filtro: { campo: 'tipo_parada', op: 'contiene', valor: 'existente' } };
  const ubic = ['localidades', 'rutas'];
  M4.REF = { base, ubic, redClara, paradasActClase, zonasSin, lejos2022 };

  /* Cada capítulo se arma con bloques:
     banner (imagen img/banner_N.jpg + título + bajada) → intro (texto de lectura) → pasos (el mapa cambia con cada tarjeta)
     → cifras (banda de números) → figuras (gráficos con texto al lado) → cierre → nota → enlace al visor (tema).
     Las cifras entre {{ }} se leen de data/cifras.json. */
  M4.CAPITULOS = [
    { slug: 'problema', tema: 'poblacion', color: '#5b3a99', kicker: 'El problema', titulo: 'Miles de personas viven lejos de una parada, y van a ser más',
      bajada: 'Cuántas personas tienen el colectivo a más de cinco minutos caminando, hoy y en 2051.',
      intro: `<p>Medimos la distancia <b>caminando por las calles</b> desde cada manzana habitada hasta la parada más cercana. El umbral es <b>400 metros</b>, unos cinco minutos a pie, una referencia habitual en la planificación del transporte público.</p>
        <p>La población se reparte en celdas de 100 metros a partir de los radios del Censo 2022 y se proyecta al 2051 con el crecimiento tendencial del departamento.</p>`,
      pasos: [
        { texto: `<h3>2026</h3><p>Según el Censo 2022, aproximadamente <b>{{lejos_2022}} personas</b> viven hoy a más de 400 m de una parada. Cada cuadrado violeta es una celda de 100 m con población lejana.</p>`, capas: [...base, lejos2022], leyenda: ['celdas'] },
        { texto: `<h3>2051</h3><p>Si la red no cambia y la ciudad crece como viene creciendo, la cifra sube a <b>{{lejos_2051}}</b>. La mayor parte del aumento es más gente en las <b>mismas zonas</b> (violeta); en naranja, las celdas que se suman.</p>`, capas: [...base, M4.PRESETS.actual], leyenda: ['celdas'] },
        { texto: `<h3>Dónde</h3><p>Con la red de colectivos encima (líneas grises, más oscuras donde pasan más servicios) se ve el patrón: el problema se concentra en los <b>distritos del este</b>, donde el crecimiento es más rápido y la red es menos densa.</p>`, capas: [...base, 'red_actual', M4.PRESETS.actual], leyenda: ['celdas', 'red_actual'] }
      ],
      cifras: [['{{lejos_2022}}', 'personas a más de 400 m (Censo 2022)', 'v'], ['{{lejos_2051}}', 'en 2051 si nada cambia', 'v'], ['{{lejos_2051_baja}} – {{lejos_2051_alta}}', 'rango 2051 con población baja o alta', 'r']],
      figuras: [{ g: 'distritos', texto: `<p>Los distritos con más población lejana combinan dos cosas: <b>crecen rápido</b> y tienen <b>pocas calles con colectivo</b>. En 2051 la diferencia con los distritos del oeste urbano se amplía.</p><p>La suma por distrito sale de las celdas y puede diferir levemente del total por redondeo.</p>` }],
      nota: `2051 es un <b>escenario tendencial</b>, no una predicción. La población por celda se estima a partir de los radios censales 2022; con otro método de reparto (areal) la cifra de 2022 sería {{lejos_2022_M3}}.`,
      vista: 'maipu' },

    { slug: 'crecimiento', tema: 'crecimiento', color: '#b06a12', kicker: 'El crecimiento', titulo: 'Hacia dónde crece Maipú y hacia dónde lo orienta el plan',
      bajada: 'La mancha urbana observada, la tendencia al 2051 y la Unidad de Integración Territorial Urbana del PMOT.',
      intro: `<p>Maipú crece hacia el este, siguiendo la RP 50 y el Acceso Este. La pregunta no es solo cuánto crece, sino <b>dónde</b>: el Plan Municipal de Ordenamiento Territorial define una Unidad de Integración Territorial (UIT) Urbana donde se espera que se concentre la urbanización.</p>`,
      pasos: [
        { texto: `<h3>Lo observado</h3><p>En ocre, la mancha urbana detectada por satélite (GHSL) en tres momentos. Los tonos más oscuros son lo más reciente.</p>`, capas: [...base, 'expansion'], leyenda: ['expansion'] },
        { texto: `<h3>La tendencia al 2051</h3><p>En violeta, dónde es probable que se urbanice si se sigue la tendencia (escenario A). Cuanto más intenso, más probable.</p>`, capas: [...base, 'escA', 'expansion'], leyenda: ['escA', 'expansion'] },
        { texto: `<h3>El plan</h3><p>El contorno negro es la <b>UIT Urbana</b> del PMOT. Rodeo del Medio, Fray Luis Beltrán y San Roque están adentro. El conflicto es lo que se urbaniza <b>afuera</b>: en zona rural y en la franja entre la RP 50 y el río.</p>`, capas: [...base, 'uit_urbana', 'escA', 'expansion', 'franja'], leyenda: ['uit_urbana', 'franja', 'escA'] }
      ],
      figuras: [{ g: 'fuera_uit', texto: `<p>Entre 2010 y 2020, cerca de una cuarta parte del suelo que se urbanizó quedó fuera de la UIT Urbana. Si la tendencia sigue, esa proporción sube en el escenario A.</p><p>El escenario B supone que el crecimiento respeta los lineamientos del plan y consume menos suelo: es la referencia de lo que el ordenamiento podría evitar.</p>` }],
      nota: `La UIT está digitalizada con un margen de ±150 m y no es una zonificación. El escenario B mide compatibilidad aproximada con los lineamientos del plan, no su cumplimiento.`,
      vista: 'maipu' },

    { slug: 'red-actual', tema: 'red', color: '#2b302e', kicker: 'La red actual', titulo: 'Dónde pasan hoy los colectivos',
      bajada: 'Calles con servicio, frecuencia por día hábil y paradas actuales.',
      intro: `<p>Reconstruimos la oferta de colectivos a partir de las trazas y los horarios de Mendotran: para cada cuadra sumamos las <b>salidas por día hábil</b> de todas las líneas que pasan por ella, en ambos sentidos.</p>`,
      pasos: [
        { texto: `<h3>Frecuencia</h3><p>Cada calle con colectivo tiene un tono proporcional a las salidas diarias. Los ejes más oscuros (San Martín, Acceso Este, RP 50) concentran cientos de servicios.</p>`, capas: [...base, 'red_actual'], leyenda: ['red_actual'] },
        { texto: `<h3>Paradas</h3><p>Los puntos rojos son las <b>{{paradas_actuales}} paradas</b> actuales del departamento.</p>`, capas: [...base, 'paradas_exist', 'red_actual'], leyenda: ['paradas_exist', 'red_actual'] },
        { texto: `<h3>Los huecos</h3><p>Entre los ejes quedan huecos sin servicio, que coinciden con la población lejana del capítulo anterior (violeta y naranja).</p>`, capas: [...base, 'paradas_exist', 'red_actual', M4.PRESETS.actual], leyenda: ['paradas_exist', 'celdas'] }
      ],
      cifras: [['{{lineas_nucleo}}', 'líneas de colectivo recorren Maipú', ''], ['{{paradas_actuales}}', 'paradas actuales en el departamento', '']],
      figuras: [],
      nota: `La oferta se concentra en el oeste urbano (Ciudad de Maipú, Gutiérrez, Luzuriaga) y en los ejes hacia el este. Los datos de horarios son de octubre de 2026 y no incluyen la demanda ni los tiempos reales de viaje.`,
      vista: 'maipu' },

    { slug: 'relieve', tema: 'relieve', color: '#7a5a2c', kicker: 'El relieve', titulo: 'El terreno del corredor de la RP 50',
      bajada: 'Hipsometría, curvas de nivel, cotas y perfiles en el área de detalle.',
      intro: `<p>Para analizar el terreno elegimos un área de detalle: el <b>corredor de la RP 50</b> entre el Acceso Este, Rodeo del Medio y Fray Luis Beltrán. Ahí coinciden un tramo de ruta anegado en el temporal del 13/10/2026, una zona de crecimiento y servicios de la propuesta.</p>`,
      pasos: [
        { texto: `<h3>Dónde estamos</h3><p>El recuadro es el área de detalle. En rojo, las rutas: la <b>RP 50</b> lo cruza en diagonal, de noroeste a sureste, junto al Acceso Este (RN 7), pasando por Rodeo del Medio y Fray Luis Beltrán.</p>`, capas: [...ubic, 'area_detalle', 'sombreado_corr'], leyenda: ['rutas'] },
        { texto: `<h3>La pendiente</h3><p>El terreno baja suave, cerca de <b>1 %</b>, de suroeste a noreste. Los colores van de las cotas altas (ocre) a las bajas (verde).</p>`, capas: [...ubic, 'area_detalle', 'sombreado_corr', 'hipsometria'], leyenda: ['hipsometria', 'rutas'] },
        { texto: `<h3>Curvas y cotas</h3><p>Curvas cada <b>5 m</b> y cotas C1 a C3 del modelo de elevación (Copernicus GLO-30, error medido de {{mde_rmse}} m). La RP 50 corre casi paralela a las curvas en Rodeo del Medio: el agua que baja del oeste <b>cruza</b> la ruta en vez de seguirla.</p>`, capas: [...ubic, 'cotas', 'curvas', 'area_detalle', 'sombreado_corr', 'hipsometria'], leyenda: ['cotas', 'curvas', 'rutas'] },
        { ancho: true, texto: `<h3>Perfiles</h3><p>L01 recorre la RP 50 ({{L01_km}} km); T01 a T03 la cortan de forma transversal. Pasá el puntero por el perfil y vas a ver el punto en el mapa.</p><div class="grafico perfil-sm" data-g="perfil"></div>`, capas: ['localidades', 'cotas', 'perfiles', 'curvas', 'area_detalle', 'sombreado_corr', 'hipsometria'], leyenda: ['perfiles', 'curvas'] }
      ],
      cifras: [['≈ 1 %', 'de pendiente, de suroeste a noreste', ''], ['{{L01_km}} km', 'de perfil longitudinal sobre la RP 50', ''], ['{{mde_rmse}} m', 'de error medido del modelo de elevación', '']],
      figuras: [],
      nota: `El modelo es de superficie: los picos sueltos y los anillos en las curvas son edificios, terraplenes o arboledas, no relieve natural.`,
      vista: 'corredor' },

    { slug: 'agua', tema: 'agua', color: '#2f6fa8', kicker: 'El agua', titulo: 'Por dónde escurriría el agua en el corredor',
      bajada: 'Dirección y acumulación de flujo, red de escurrimiento derivada y cuenca aportante al tramo anegado.',
      intro: `<p>Con el modelo de elevación calculamos la <b>dirección de flujo</b> de cada celda (hacia cuál de sus 8 vecinas baja el agua) y la <b>acumulación</b> (cuánta superficie drena a través de ella). Las celdas con mucha superficie aguas arriba forman la <b>red de escurrimiento derivada</b>. Seguimos en el corredor de la RP 50, entre Rodeo del Medio y Fray Luis Beltrán.</p>`,
      pasos: [
        { texto: `<h3>Acumulación</h3><p>Cuanto más claro, más superficie drena a través de esa celda. Se dibujan líneas que bajan de suroeste a noreste, siguiendo la pendiente, y <b>cruzan la RP 50</b> (en rojo).</p>`, capas: [...ubic, 'area_detalle', 'acumulacion', 'sombreado_corr'], leyenda: ['acumulacion', 'rutas'] },
        { texto: `<h3>Red derivada y canales</h3><p>En azul, la red derivada con umbral de 36 ha. En verde agua, los canales y acequias reales del Departamento General de Irrigación: en Maipú gran parte del agua corre por ellos.</p>`, capas: [...ubic, 'red_36', 'canales', 'area_detalle', 'acumulacion', 'sombreado_corr'], leyenda: ['red_36', 'canales'] },
        { texto: `<h3>La cuenca del tramo anegado</h3><p>El polígono celeste es la <b>cuenca aportante</b> al punto anegado de la RP 50, al oeste de Rodeo del Medio: {{cuenca_km2}} km², {{cuenca_desnivel}} m de desnivel y un cauce principal de {{cuenca_cauce_km}} km que baja desde el suroeste.</p>`, capas: [...ubic, 'salida', 'tramo_anegado', 'cauce', 'red_36', 'canales', 'cuenca', 'area_detalle', 'acumulacion', 'sombreado_corr'], leyenda: ['tramo_anegado', 'cauce', 'cuenca', 'salida'] }
      ],
      cifras: [['{{cuenca_ha}} ha', 'drenan al tramo anegado de la RP 50', 'w'], ['{{cruces_rp50}}', 'cruces de la red derivada con la RP 50', 'w'], ['{{cuenca_cauce_km}} km', 'de cauce principal en la cuenca', 'w']],
      figuras: [{ g: 'umbrales', texto: `<p>La red derivada depende del <b>umbral</b> de superficie mínima que se elija: con umbrales chicos aparecen muchos cauces cortos; con umbrales grandes quedan solo los principales.</p><p>Elegimos el intermedio (36 ha) porque se parece más a la densidad de la red de riego real.</p>` }],
      nota: `La acumulación no es caudal. El modelo no ve acequias, alcantarillas ni colectores, que en Maipú desvían gran parte del agua. Que el tramo anegado coincida con la salida de una cuenca es algo a <b>verificar en terreno</b>, no una demostración.`,
      vista: 'corredor' },

    { slug: 'paradas-agua', tema: 'paradas_agua', color: '#3f5f86', kicker: 'Paradas y agua', titulo: '¿Hay paradas donde se concentra el escurrimiento?',
      bajada: 'Clasificación de las paradas según su relación con la red de escurrimiento derivada.',
      intro: `<p>Llevamos el análisis de escurrimiento a todo el departamento y clasificamos las <b>{{paradas_actuales}} paradas actuales</b> y también las nuevas de la propuesta: <b>ALTA</b> (a verificar) si está sobre una línea que drena mucha superficie o en un bajo del terreno, <b>MEDIA</b> si está cerca de la red y <b>BAJA</b> en el resto.</p>`,
      pasos: [
        { texto: `<h3>La red en todo Maipú</h3><p>Las líneas azules son la red derivada, más gruesas cuanto mayor es su orden.</p>`, capas: [...base, 'red_escurrimiento'], leyenda: ['red_escurrimiento'] },
        { texto: `<h3>Paradas actuales</h3><p>Sobre la red, las <b>paradas actuales</b> según su clase. Son {{paradas_alta}} de clase ALTA (en rojo) y {{paradas_media}} de clase MEDIA: se leen como <b>prioridad de verificación</b>.</p>`, capas: [...base, paradasActClase, 'red_escurrimiento'], leyenda: ['paradas_clase'] },
        { texto: `<h3>Paradas nuevas reubicadas</h3><p>Las paradas <b>nuevas de la propuesta</b> que caían en clase ALTA se movieron unos metros por la misma calle: <b>{{reubicadas}} reubicaciones</b>.</p>`, capas: [...base, 'reubicaciones', paradasActClase, 'red_escurrimiento'], leyenda: ['reubicaciones', 'paradas_clase'] }
      ],
      figuras: [{ g: 'clases', texto: `<p>La gran mayoría de las paradas actuales queda en clase BAJA. Las de clase ALTA están sobre cauces derivados de orden alto o en bajos cerrados del modelo.</p>` }],
      nota: `Al contrastar con los anegamientos registrados por Defensa Civil, la red derivada <b>no explicó</b> dónde ocurrieron: con un modelo de 30 m y una red de acequias que domina el agua, es lo esperable. Por eso la clase es una prioridad de verificación, no un riesgo.`,
      vista: 'maipu' },

    { slug: 'alternativas', tema: 'alternativas', color: '#5b3a99', claro: true, kicker: 'Las alternativas', titulo: 'Tres formas de acercar el colectivo',
      bajada: '',
      intro: `<p>Comparamos la situación sin cambios con tres alternativas de red para 2051. Los mapas muestran siempre las <b>mismas celdas</b> (la población que en 2051 quedaría lejos si no se hace nada): en <b>violeta</b> la que sigue lejos con cada alternativa y en <b>verde</b> la que pasa a tener una parada a 400 m o menos.</p>`,
      pasos: [
        { texto: `<h3>Sin cambios</h3><p>Con la red actual, en 2051 quedan lejos <b>{{lejos_2051}}</b> personas. Es el punto de partida para comparar.</p>`, capas: [...base, M4.PRESETS.sinCambios], leyenda: ['celdas'] },
        { texto: `<h3>A1 · Paradas nuevas</h3><p>Solo paradas nuevas sobre los recorridos actuales. Es barato, pero no llega a donde no pasa ningún colectivo: se acercan {{acercados_A1}} personas (verde) y siguen lejos <b>{{lejos_A1}}</b> (violeta).</p>`, capas: [...base, M4.PRESETS.A1], leyenda: ['celdas'] },
        { texto: `<h3>A2 · Red completa</h3><p>Paradas más modificaciones de líneas, alimentadores y directos. En el papel es la que más acerca: siguen lejos <b>{{lejos_A2}}</b>. Pero {{minimo_A2}} de las personas que acerca quedarían con un servicio de apenas 1 a 3 salidas por día.</p>`, capas: [...base, M4.PRESETS.A2], leyenda: ['celdas'] },
        { texto: `<h3>A3 · Mínimo de 4 salidas por día</h3><p>Es la misma red de A2, pero con una condición: un servicio cuenta solo si pasa <b>al menos 4 veces por día</b>. Con esa exigencia, <b>{{lejos_A3}} personas</b> siguen lejos de un colectivo con ese mínimo de servicio, y <b>{{acercados_A3}}</b> pasan a tenerlo a 400 m o menos. Es la alternativa elegida: acerca un poco menos que A2, pero con servicios que realmente se pueden usar.</p>`, capas: [...base, M4.PRESETS.A3], leyenda: ['celdas'] }
      ],
      figuras: [{ g: 'alternativas', texto: `<p>A2 acerca más gente en el papel, pero un servicio de 1 a 3 salidas por día no sirve como cobertura: nadie organiza su día alrededor de un colectivo que pasa dos veces. Por eso pusimos como condición (restricción R2) un mínimo de <b>4 salidas por día</b>.</p><p>A3 cumple las tres restricciones excluyentes y por eso es la alternativa elegida.</p>` }, { g: 'matriz', ancho: true }],
      vista: 'maipu' },

    { slug: 'propuesta', tema: 'propuesta', color: '#1f7a4d', kicker: 'La propuesta', titulo: 'La red propuesta para 2051',
      bajada: 'Paradas nuevas, retoques a líneas existentes, alimentadores y directos al centro del distrito.',
      intro: `<p>La alternativa A3 combina cuatro tipos de intervención, de la más simple a la más compleja. En el mapa se muestran solo las decisiones <b>robustas</b> (que se repiten en al menos el 70 % de 12 variantes del modelo) con 4 o más salidas por día. En gris claro, la red actual como referencia.</p>`,
      pasos: [
        { texto: `<h3>Retoques a líneas existentes</h3><p>En <b>naranja</b>, desvíos cortos de líneas actuales que <b>no cambian su naturaleza</b>: mismo origen, mismo destino, unas cuadras más.</p>`, capas: [...base, 'prop_mod', redClara], leyenda: ['prop_mod', 'red_actual'] },
        { texto: `<h3>Alimentadores y directos</h3><p>En <b>azul</b>, los alimentadores: combis desde zonas sin servicio hasta una línea troncal. En <b>magenta</b>, los directos: servicios hasta el centro del distrito, sin transbordo.</p>`, capas: [...base, 'prop_nodos', 'prop_mod', 'prop_ali', 'prop_dir', redClara], leyenda: ['prop_mod', 'prop_ali', 'prop_dir', 'prop_nodos'] },
        { texto: `<h3>Paradas nuevas</h3><p>Paradas sobre recorridos actuales (círculos blancos) y sobre los servicios nuevos.</p>`, capas: [...base, 'prop_nodos', 'paradas_v1', 'prop_paradas', 'prop_mod', 'prop_ali', 'prop_dir', redClara], leyenda: ['paradas_v1', 'prop_paradas'] },
        { texto: `<h3>El resultado</h3><p>En verde, la población que pasa a tener una parada a 400 m o menos: <b>{{acercados_A3}} personas</b>, {{sin_transbordo_A3}} de ellas sin transbordo. En violeta, la que sigue lejos.</p>`, capas: [...base, 'prop_mod', 'prop_ali', 'prop_dir', redClara, M4.PRESETS.efecto], leyenda: ['celdas', 'prop_mod', 'prop_ali', 'prop_dir'] },
        { texto: `<h3>Lo que queda</h3><p>Siguen lejos <b>{{lejos_A3}} personas</b>, sobre todo en <b>zona rural dispersa</b>. En gris, las {{zonas_sin}} zonas de déficit (de {{zonas_total}}) donde el modelo no encontró una alternativa razonable con colectivos.</p>`, capas: [...base, 'prop_mod', 'prop_ali', 'prop_dir', zonasSin, M4.PRESETS.efecto], leyenda: ['prop_zonas', 'celdas'] }
      ],
      cifras: [['{{acercados_A3}}', 'personas pasan a 400 m o menos', 'g'], ['{{sin_transbordo_A3}}', 'de ellas sin transbordo', 'g'], ['{{lejos_A3}}', 'siguen lejos, sobre todo en zona rural', 'v']],
      figuras: [{ g: 'niveles', texto: `<p>Una parte importante de la mejora viene de algo simple: <b>paradas nuevas</b> sobre recorridos que ya existen. El resto depende de servicios nuevos, y su valor depende de cuántas veces por día pasen.</p>` }],
      cierre: `<h3>Qué falta para pasar a un proyecto</h3><ol class="pendientes"><li><b>Datos operativos</b> de Mendotran (GTFS) y una encuesta origen-destino actual.</li><li><b>Verificación en terreno</b> de las calles de los servicios propuestos: ancho, giros, pavimento.</li><li><b>Drenaje</b>: verificar las paradas de clase ALTA y el tramo anegado de la RP 50.</li><li><b>Ordenamiento</b>: orientar el crecimiento dentro de la UIT Urbana, que es lo que más reduce el problema a largo plazo.</li></ol>`,
      nota: `Es un modelo de oferta y proximidad: no mide demanda ni uso. Los destinos de los directos son supuestos y las calles se deben verificar en terreno.`,
      vista: 'maipu' }
  ];

  /* Temas del visor: conjuntos de capas listos para explorar, con una guía de lectura. */
  M4.TEMAS = [
    { id: 'poblacion', titulo: 'Población lejos del colectivo', color: '#5b3a99', vista: 'maipu', cap: 1,
      resumen: 'Quién vive a más de 400 m de una parada, hoy y en 2051.',
      lectura: 'Cada cuadrado es una celda de 100 × 100 m con población que vive a más de 400 m caminando de una parada. Violeta: ya estaba lejos en 2022. Naranja: se suma al 2051. Las líneas grises son las calles con colectivo (más oscuras, más servicios). Tocá una celda para ver su población.',
      capas: [...base, 'red_actual', M4.PRESETS.actual], leyenda: ['celdas', 'red_actual'] },
    { id: 'crecimiento', titulo: 'Crecimiento urbano y PMOT', color: '#b06a12', vista: 'maipu', cap: 2,
      resumen: 'Mancha urbana observada, tendencia al 2051 y UIT Urbana.',
      lectura: 'Ocre: mancha urbana observada por satélite (más oscuro, más reciente). Violeta: probabilidad de urbanizarse al 2051 si sigue la tendencia. Contorno negro: UIT Urbana del PMOT, donde el plan espera el crecimiento.',
      capas: [...base, 'uit_urbana', 'escA', 'expansion'], leyenda: ['uit_urbana', 'escA', 'expansion'] },
    { id: 'red', titulo: 'Colectivos hoy', color: '#2b302e', vista: 'maipu', cap: 3,
      resumen: 'Calles con servicio, salidas por día y paradas actuales.',
      lectura: 'Cada calle con colectivo tiene un tono según las salidas por día hábil de todas las líneas que pasan. Los puntos rojos son las paradas actuales. Usá el buscador para encontrar una línea o una calle.',
      capas: [...base, 'paradas_exist', 'red_actual'], leyenda: ['red_actual', 'paradas_exist'] },
    { id: 'relieve', titulo: 'Relieve del corredor RP 50', color: '#7a5a2c', vista: 'corredor', cap: 4,
      resumen: 'Hipsometría, curvas, cotas y perfiles.',
      lectura: 'Colores de elevación (verde, bajo; ocre, alto) sobre el sombreado. Curvas cada 5 m y cotas C1 a C3. Tocá una traza de perfil (L01 sobre la RP 50, T01 a T03 transversales) y elegí "Ver perfil".',
      capas: [...ubic, 'cotas', 'perfiles', 'curvas', 'area_detalle', 'sombreado_corr', 'hipsometria'], leyenda: ['perfiles', 'curvas', 'cotas', 'hipsometria'] },
    { id: 'agua', titulo: 'Agua y escurrimiento', color: '#2f6fa8', vista: 'corredor', cap: 5,
      resumen: 'Acumulación de flujo, red derivada y cuenca del tramo anegado.',
      lectura: 'Fondo azul: acumulación de flujo (más claro, más superficie drena por ahí). Líneas azules: red de escurrimiento derivada. Verde agua: canales y acequias reales. Polígono celeste: cuenca que drena al tramo anegado de la RP 50.',
      capas: [...ubic, 'tramo_anegado', 'cauce', 'red_36', 'canales', 'cuenca', 'area_detalle', 'acumulacion', 'sombreado_corr'], leyenda: ['tramo_anegado', 'cauce', 'red_36', 'canales', 'cuenca'] },
    { id: 'paradas_agua', titulo: 'Paradas y escurrimiento', color: '#3f5f86', vista: 'maipu', cap: 6,
      resumen: 'Qué paradas revisar por su relación con el agua.',
      lectura: 'Paradas actuales y nuevas clasificadas según la red de escurrimiento derivada: ALTA (rojo) y MEDIA (naranja) son prioridad de verificación en terreno, no un riesgo comprobado.',
      capas: [...base, 'paradas_clase', 'red_escurrimiento'], leyenda: ['paradas_clase', 'red_escurrimiento'] },
    { id: 'alternativas', titulo: 'Comparar alternativas', color: '#5b3a99', vista: 'maipu', cap: 7, alternativas: true,
      resumen: 'Quién se acerca y quién sigue lejos con A1, A2 y A3.',
      lectura: 'Siempre las mismas celdas (población lejos en 2051 sin cambios). Verde: se acerca con la alternativa elegida abajo. Violeta: sigue lejos.',
      capas: [...base, M4.PRESETS.A3], leyenda: ['celdas'] },
    { id: 'propuesta', titulo: 'Red propuesta (A3)', color: '#1f7a4d', vista: 'maipu', cap: 8,
      resumen: 'Retoques a líneas, alimentadores, directos y paradas nuevas.',
      lectura: 'Naranja: tramos nuevos de líneas existentes. Azul: alimentadores (combi hasta una troncal). Magenta: directos al centro del distrito. Círculos blancos: paradas nuevas sobre recorridos actuales. Gris claro: red actual.',
      capas: [...base, 'paradas_v1', 'prop_paradas', 'prop_mod', 'prop_ali', 'prop_dir', redClara], leyenda: ['prop_mod', 'prop_ali', 'prop_dir', 'paradas_v1', 'prop_paradas'] }
  ];

  // Gráficos de cada capítulo (leen cifras.json y tablas.json)
  M4.GRAFICOS = {
    distritos: (el) => M4.barras(el, M4.cifras.distritos.slice(0, 8).map(d => ({ etiqueta: d.distrito, valores: [d.lejos_2022, d.lejos_2051] })), [{ nombre: '2022', color: C.violet }, { nombre: '2051 (escenario A)', color: C.violetL }], { titulo: 'Personas a más de 400 m, por distrito (los 8 con más)', fila: 13, fuente: 'Suma por celdas, Etapa 7. Puede diferir levemente del total oficial por redondeo de celdas.' }),
    fuera_uit: (el) => M4.barras(el, [{ etiqueta: 'Observado 2010-2020', valores: [M4.cifras.fuera_uit_obs_2010_2020_pct] }, { etiqueta: 'Escenario A 2051', valores: [M4.cifras.fuera_uit_A_pct] }, { etiqueta: 'Escenario B 2051', valores: [M4.cifras.fuera_uit_B_pct] }], [{ nombre: '%', color: C.ochre }], { titulo: 'Suelo urbanizado nuevo fuera de la UIT Urbana', unidad: ' %', max: 50, izq: 140, fuente: 'GHSL y Etapa 7. El valor observado es provisional (±150 m de la UIT).' }),
    umbrales: (el) => M4.barras(el, M4.cifras.red_umbrales.map(r => ({ etiqueta: M4.fmt(r.area_equivalente_ha) + ' ha' + (r.elegido ? ' (elegido)' : ''), valores: [Math.round(r.km_red_area)] })), [{ nombre: 'km', color: C.water }], { titulo: 'Kilómetros de red derivada en el corredor según el umbral', unidad: ' km', izq: 120 }),
    clases: (el) => M4.barras(el, [{ etiqueta: 'ALTA (a verificar)', valores: [M4.cifras.paradas_alta] }, { etiqueta: 'MEDIA', valores: [M4.cifras.paradas_media] }, { etiqueta: 'BAJA', valores: [M4.cifras.paradas_baja] }], [{ nombre: 'paradas', color: '#4a6f99' }], { titulo: 'Paradas actuales según su relación con el escurrimiento', izq: 130 }),
    alternativas: (el) => M4.barras(el, [['Situación actual', 'lejos_2051'], ['A1 · paradas', 'lejos_A1'], ['A2 · red completa', 'lejos_A2'], ['A3 · piso de 4 salidas', 'lejos_A3']].map(([e, k]) => ({ etiqueta: e, valores: [M4.cifras[k]] })), [{ nombre: 'personas', color: C.violet }], { titulo: 'Personas que siguen a más de 400 m en 2051', izq: 150 }),
    niveles: (el) => M4.barras(el, [['Paradas sobre recorridos actuales', 'acercados_A1'], ['Servicios con 16 o más salidas/día', 'A3_sal16'], ['Servicios con 6 a 15 salidas/día', 'A3_sal6_15'], ['Servicios con 4 o 5 salidas/día', 'A3_sal4_5']].map(([e, k]) => ({ etiqueta: e, valores: [M4.cifras[k]] })), [{ nombre: 'personas', color: C.green }], { titulo: 'Personas que se acercan con A3, según el servicio', izq: 210, fila: 22 })
  };

  M4.ACERCA = `<h2>Acerca del proyecto</h2>
  <p class="lead">«Maipú a 400 metros» es el Trabajo Final de Cartografía Aplicada de la carrera de Ingeniería en Agrimensura de la Universidad Juan Agustín Maza (2026). Analiza la relación entre el crecimiento urbano, el transporte público, el relieve y el drenaje en el departamento de Maipú, Mendoza, y propone una red de colectivos para 2051.</p>
  <div class="acerca-grid">
  <section><h3>Autores</h3><p>Lucas De Angelis, Cristian Quiles y Rocío Sánchez.</p><h3>Docentes</h3><p>Ing. Agrim. Lautaro Martínez e Ing. Agrim. Érica Escudero.</p>
  <h3>Método, en breve</h3><ol><li>Población 2022 por celda de 100 m a partir de radios censales y proyección al 2051 en tres escenarios.</li><li>Distancia a la parada más cercana caminando por la red de calles (umbral 400 m).</li><li>Paradas nuevas con un modelo de cobertura máxima; modificación de líneas, alimentadores y directos con un modelo de optimización y criterios del grupo.</li><li>Relieve y drenaje con un modelo digital de elevación de 30 m: dirección y acumulación de flujo, red derivada, cuenca aportante, perfiles.</li><li>Comparación de alternativas con restricciones excluyentes y robustez frente a 12 variantes.</li></ol></section>
  <section><h3>Fuentes</h3><ul class="fuentes">
  <li>Instituto Geográfico Nacional: Argenmap, límites, rutas, hidrografía (WFS, 28/10/2026) y nivelación de alta precisión.</li>
  <li>Copernicus DEM GLO-30 (ESA/Airbus), modelo de superficie de 30 m (30/10/2026).</li>
  <li>INDEC, Censo 2022 (radios censales) y proyecciones de población.</li>
  <li>JRC, Global Human Settlement Layer R2023A (mancha urbana).</li>
  <li>Mendotran (trazas y horarios, 03/10/2026), SSP/Wara (paradas, 04/11/2025) y SUBE.</li>
  <li>Departamento General de Irrigación (red de riego 2024) e IDE Mendoza (colectores, Defensa Civil, parcelario).</li>
  <li>PMOT de Maipú (Ord. 6886/21), Unidades de Integración Territorial digitalizadas.</li>
  <li>OpenStreetMap (ODbL), red de calles.</li></ul>
  <h3>Cómo leer las cifras</h3><p>Todas son estimaciones exploratorias. 2051 es un escenario, no una predicción. La red propuesta es un modelo de oferta y proximidad, no de demanda. El drenaje usa un modelo de 30 m que no ve el riego ni el desagüe urbano. Cada cifra está trazada a una tabla de las etapas del proyecto.</p>
  <p class="muted">Trabajo académico. No es cartografía oficial ni tiene aval de los organismos proveedores de datos.</p></section></div>`;
})(window.M4);
