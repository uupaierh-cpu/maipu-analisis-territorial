/* Simbología: única, categorizada y graduada (intervalos iguales, cuantiles, cortes naturales o manuales). */
(function (M4) {
  'use strict';
  M4.PALETAS = {
    violetas: ['#efeaf7', '#c9bce6', '#9a82cf', '#6f4fb0', '#4a2a87', '#2e1660'],
    verdes: ['#e8f4ec', '#b9dcc8', '#7fbf9a', '#3f9a68', '#1f7a4d', '#0f5233'],
    azules: ['#e6f0f8', '#b8d3ea', '#7fb0d8', '#4a88bf', '#2f6fa8', '#163f6b'],
    ocres: ['#fbf1de', '#f2d39a', '#e6b05c', '#c47a1d', '#94570f', '#5e3608'],
    grises: ['#f1f2f1', '#d0d4d2', '#a8aeab', '#7d8682', '#545b58', '#2b302e'],
    divergente: ['#2f6fa8', '#8db6d9', '#e9ece9', '#e8b47c', '#c47a1d', '#7a4410']
  };
  M4.CUALITATIVA = ['#5b3a99', '#1f7a4d', '#2f6fa8', '#c47a1d', '#b0307a', '#3f8f8a', '#7d8682', '#8a6a3a', '#d1a64a', '#1d2321', '#9a82cf', '#7fbf9a'];

  const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  M4.rampa = (nombre, n) => {
    const p = M4.PALETAS[nombre] || M4.PALETAS.violetas; if (n <= 1) return [p[p.length - 2]];
    return Array.from({ length: n }, (_, i) => { const t = i / (n - 1) * (p.length - 1), a = Math.floor(t), b = Math.min(p.length - 1, a + 1), f = t - a;
      const A = hex(p[a]), B = hex(p[b]); return toHex(A.map((v, k) => v + (B[k] - v) * f)); });
  };

  // ---- clasificación
  function jenks(data, n) {
    const d = data.slice().sort((a, b) => a - b); const N = d.length; if (N <= n) return [...new Set(d)];
    const lc = Array.from({ length: N + 1 }, () => new Array(n + 1).fill(0)), vc = Array.from({ length: N + 1 }, () => new Array(n + 1).fill(Infinity));
    for (let j = 1; j <= n; j++) { lc[1][j] = 1; vc[1][j] = 0; }
    for (let l = 2; l <= N; l++) { let s1 = 0, s2 = 0, w = 0;
      for (let m = 1; m <= l; m++) { const i3 = l - m + 1, v = d[i3 - 1]; s2 += v * v; s1 += v; w++; const vv = s2 - s1 * s1 / w; const i4 = i3 - 1;
        if (i4 !== 0) for (let j = 2; j <= n; j++) if (vc[l][j] >= vv + vc[i4][j - 1]) { lc[l][j] = i3; vc[l][j] = vv + vc[i4][j - 1]; } }
      lc[l][1] = 1; vc[l][1] = s2 - s1 * s1 / w; }
    const k = new Array(n + 1); k[n] = d[N - 1]; k[0] = d[0]; let c = N;
    for (let j = n; j >= 2; j--) { const id = lc[c][j] - 2; k[j - 1] = d[id]; c = lc[c][j] - 1; }
    return k;
  }
  M4.clasificar = (valores, metodo, n) => {
    const v = valores.filter(x => x != null && !isNaN(x)).map(Number).sort((a, b) => a - b); if (!v.length) return [0, 1];
    const mn = v[0], mx = v[v.length - 1]; if (mn === mx) return [mn, mx];
    if (metodo === 'cuantiles') return Array.from({ length: n + 1 }, (_, i) => i === n ? mx : v[Math.floor(i / n * (v.length - 1))]);
    if (metodo === 'naturales') { const s = v.length > 1500 ? v.filter((_, i) => i % Math.ceil(v.length / 1500) === 0).concat([mx]) : v; return jenks(s, n); }
    return Array.from({ length: n + 1 }, (_, i) => mn + (mx - mn) * i / n);
  };
  const redondear = (x) => { const a = Math.abs(x); return a >= 100 ? Math.round(x) : a >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100; };

  // Completa un estado de estilo (categorías o cortes) a partir de los datos.
  M4.prepararEstilo = (st, features) => {
    if (st.modo === 'categorizado' && st.campo) {
      const vals = [...new Set(features.map(f => f.properties[st.campo]))].filter(v => v != null && v !== '').sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
      st.categorias = st.categorias || {}; let i = Object.keys(st.categorias).length;
      vals.slice(0, 24).forEach(v => { if (!st.categorias[v]) st.categorias[v] = M4.CUALITATIVA[i++ % M4.CUALITATIVA.length]; });
    }
    if (st.modo === 'graduado' && st.campo && (!st.cortes || st.metodo !== 'manual')) {
      st.cortes = M4.clasificar(features.map(f => f.properties[st.campo]), st.metodo || 'naturales', st.clases || 5).map(redondear);
    }
    return st;
  };
  const claseDe = (v, cortes) => { if (v == null || isNaN(v)) return -1; for (let i = 1; i < cortes.length; i++) if (v <= cortes[i]) return i - 1; return cortes.length - 2; };

  // Filtro por atributo
  M4.pasaFiltro = (props, fl) => {
    if (!fl || !fl.campo || fl.valor === '' || fl.valor == null) return true;
    const a = props[fl.campo], b = fl.valor, na = Number(a), nb = Number(b), num = !isNaN(na) && !isNaN(nb) && a !== '' && a != null;
    switch (fl.op) {
      case '=': return num ? na === nb : String(a) === String(b);
      case '≠': return num ? na !== nb : String(a) !== String(b);
      case '>': return num && na > nb; case '<': return num && na < nb; case '≥': return num && na >= nb; case '≤': return num && na <= nb;
      case 'contiene': return String(a ?? '').toLowerCase().includes(String(b).toLowerCase());
      default: return true;
    }
  };

  // Color de un elemento según el estado de estilo
  M4.colorDe = (st, p) => {
    if (st.modo === 'categorizado') return st.categorias?.[p[st.campo]] || '#b9bfbc';
    if (st.modo === 'graduado') { const i = claseDe(Number(p[st.campo]), st.cortes || [0, 1]); return i < 0 ? '#d0d4d2' : M4.rampa(st.paleta || 'violetas', (st.cortes || [0, 1]).length - 1)[i]; }
    return st.color;
  };
  M4.estiloLeaflet = (geom, st, p) => {
    const c = M4.colorDe(st, p);
    if (geom === 'linea') return { color: c, weight: st.ancho, opacity: st.opacidadTrazo ?? 1, dashArray: st.guiones || null, lineCap: 'butt' };
    if (geom === 'poligono') return st.soloBorde ? { color: c, weight: st.ancho, fill: false, dashArray: st.guiones || null } :
      { color: st.borde || c, weight: st.ancho ?? 0, stroke: (st.ancho ?? 0) > 0, fillColor: c, fillOpacity: st.relleno ?? .7, dashArray: st.guiones || null, smoothFactor: .3 };
    return { radius: st.radio, color: st.borde || '#ffffff', weight: st.bordeAncho ?? .8, fillColor: c, fillOpacity: 1 };
  };

  // Entradas de leyenda: [{color, texto}] + forma según geometría
  M4.leyendaDe = (spec, st) => {
    if (spec.tipo === 'raster') return spec.leyenda || [];
    const f = (c, t) => ({ forma: spec.geom, color: c, texto: t, st });
    if (st.modo === 'categorizado') return Object.entries(st.categorias || {}).map(([v, c]) => f(c, v));
    if (st.modo === 'graduado') { const k = st.cortes || [0, 1], r = M4.rampa(st.paleta || 'violetas', k.length - 1);
      const u = (spec.campos.find(x => x[0] === st.campo) || [])[1] || st.campo;
      return [{ titulo: u }].concat(r.map((c, i) => f(c, `${M4.fmt(k[i], k[i] % 1 ? 1 : 0)} – ${M4.fmt(k[i + 1], k[i + 1] % 1 ? 1 : 0)}`))); }
    return [f(st.color, st.etiqueta || spec.nombre)];
  };
  M4.muestraHTML = (e) => {
    if (e.titulo) return `<div class="lg-sub">${M4.esc(e.titulo)}</div>`;
    if (e.grad) return `<div class="lg-it"><i class="lg-grad" style="background:${e.grad}"></i><span>${M4.esc(e.texto)}</span></div>`;
    const st = e.st || {}; let i;
    if (e.forma === 'linea') i = `<i class="lg-ln" style="border-top:${Math.max(1.5, Math.min(6, st.ancho || 2))}px ${st.guiones ? 'dashed' : 'solid'} ${e.color}"></i>`;
    else if (e.forma === 'punto') i = `<i class="lg-pt" style="background:${e.color};${st.borde && st.borde !== '#ffffff' ? 'box-shadow:0 0 0 2px ' + st.borde : ''}"></i>`;
    else i = `<i class="lg-sq" style="background:${st.soloBorde ? 'transparent' : e.color};${st.soloBorde || st.ancho ? 'border:2px ' + (st.guiones ? 'dashed ' : 'solid ') + (st.borde || e.color) : ''}"></i>`;
    return `<div class="lg-it">${i}<span>${M4.esc(e.texto)}</span></div>`;
  };
})(window.M4);
