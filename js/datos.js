/* Núcleo compartido: carga de datos (una sola caché), formato y cifras. */
window.M4 = window.M4 || {};
(function (M4) {
  'use strict';
  const cache = {};
  M4.get = (f) => cache[f] || (cache[f] = fetch('data/' + f).then(r => { if (!r.ok) throw new Error('No se pudo leer ' + f); return r.json(); }));
  // Un formateador por cantidad de decimales, creado una sola vez (toLocaleString crea uno nuevo en cada llamada y es lento).
  const NF = {};
  M4.fmt = (n, d = 0) => (n == null || n === '' || isNaN(n)) ? '—' : (NF[d] || (NF[d] = new Intl.NumberFormat('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }))).format(Number(n));
  M4.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Cifras: única fuente para los textos ({{clave}} se reemplaza por el valor formateado).
  M4.cifras = null;
  M4.cargarCifras = async () => (M4.cifras = await M4.get('cifras.json'));
  M4.tpl = (s) => String(s).replace(/\{\{(\w+)(?::(\d))?\}\}/g, (m, k, d) => {
    const v = M4.cifras && M4.cifras[k];
    return v == null ? m : (typeof v === 'number' ? M4.fmt(v, d ? +d : (Number.isInteger(v) ? 0 : 1)) : M4.esc(v));
  });

  // Celdas de población: de formato compacto a GeoJSON con atributos legibles (se arma una vez).
  const cuadrado = (la, lo, lado = 100) => {
    const dl = lado / 2 / 110574, dn = lado / 2 / (111320 * Math.cos(la * Math.PI / 180));
    return { type: 'Polygon', coordinates: [[[lo - dn, la - dl], [lo + dn, la - dl], [lo + dn, la + dl], [lo - dn, la + dl], [lo - dn, la - dl]]] };
  };
  let celdasGeo = null;
  M4.celdasGeo = async () => {
    if (celdasGeo) return celdasGeo;
    const { celdas } = await M4.get('celdas.json');
    // Solo celdas lejos en 2051 sin cambios (act 1 o 2). Las de act 0 son celdas casi vacías (≤ 0,5 hab.) que el
    // mapa del proyecto ya descartaba; sumadas son menos del 2 % y solo ensuciaban el dibujo.
    const lejos = (x) => x ? 'Sigue lejos' : 'Se acerca';
    celdasGeo = { type: 'FeatureCollection', features: celdas.filter(c => c[3] > 0).map(([la, lo, pob, act, a1, a2, a3, sl, st]) => ({
      type: 'Feature', geometry: cuadrado(la, lo),
      properties: {
        poblacion_2051: pob,
        situacion_actual: act === 1 ? 'Lejos en 2022' : 'Se suma en 2051',
        con_A1: lejos(a1), con_A2: lejos(a2), con_A3: lejos(a3), efecto_A3: lejos(a3),
        salidas_dia_A2: sl, sin_transbordo_A2: st ? 'sí' : 'no'
      } })) };
    return celdasGeo;
  };
  const escCache = {};
  M4.escenarioGeo = async (archivo) => {
    if (escCache[archivo]) return escCache[archivo];
    const rows = await M4.get(archivo);
    return (escCache[archivo] = { type: 'FeatureCollection', features: rows.map(([la, lo, p, fu]) => ({ type: 'Feature', geometry: cuadrado(la, lo),
      properties: { probabilidad_pct: Math.round(p * 100), fuera_uit_urbana: fu ? 'sí' : 'no' } })) });
  };
})(window.M4);
