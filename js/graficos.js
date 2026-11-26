/* Gráficos compartidos (SVG propio): perfiles topográficos vinculados al mapa, barras y matriz de alternativas. */
(function (M4) {
  'use strict';
  const fmt = M4.fmt, esc = M4.esc;

  // Perfil topográfico. Al pasar el puntero sobre el gráfico se marca el punto en el mapa.
  M4.perfil = async (el, map, k, opts = {}) => {
    const pf = await M4.get('perfiles.json'); const P = pf[k];
    const tabs = Object.keys(pf).map(x => `<button type="button" class="${x === k ? 'on' : ''}" data-p="${x}">${x}</button>`).join('');
    const zmin = Math.min(...P.z), zmax = Math.max(...P.z), L_ = P.d[P.d.length - 1];
    el.innerHTML = `<div class="pf-head"><div class="seg" role="group" aria-label="Elegir perfil">${tabs}</div><span class="pf-info">${k} · ${fmt(L_)} m · cotas ${fmt(zmin, 1)}–${fmt(zmax, 1)} m · desnivel ${fmt(zmax - zmin, 1)} m</span>${opts.cerrar ? '<button type="button" class="ico-btn pf-x" aria-label="Cerrar perfil">✕</button>' : ''}</div><div class="pf-svg"></div><div class="pf-pie">Copernicus GLO-30 (MDS 30 m), muestreo cada 30 m · línea azul: cruce con la red derivada · verde agua: canal o acequia · exageración vertical según el alto del gráfico</div>`;
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => M4.perfil(el, map, b.dataset.p, opts));
    if (opts.cerrar) el.querySelector('.pf-x').onclick = opts.cerrar;
    const box = el.querySelector('.pf-svg'); const W = box.clientWidth || 700, H = box.clientHeight || 170, m = { l: 40, r: 10, t: 8, b: 20 };
    const lo = Math.floor((zmin - 2) / 5) * 5, hi = Math.ceil((zmax + 2) / 5) * 5;
    const x = d => m.l + d / L_ * (W - m.l - m.r), y = z => m.t + (hi - z) / (hi - lo) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Perfil ${k}: de ${fmt(P.z[0], 1)} a ${fmt(P.z[P.z.length - 1], 1)} m en ${fmt(L_)} m">`;
    for (let z = lo; z <= hi; z += 5) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(z)}" y2="${y(z)}" class="gr"/><text x="${m.l - 5}" y="${y(z) + 3.5}" text-anchor="end" class="tk">${z}</text>`;
    const step = L_ > 6000 ? 2000 : 500; for (let d = 0; d <= L_; d += step) s += `<text x="${x(d)}" y="${H - 5}" text-anchor="middle" class="tk">${fmt(d)}</text>`;
    P.cruces.forEach(([d, e]) => s += `<line x1="${x(d)}" x2="${x(d)}" y1="${m.t}" y2="${H - m.b}" class="${e.startsWith('red') ? 'cr-red' : 'cr-can'}"><title>${esc(e)} · ${fmt(d)} m</title></line>`);
    const pts = P.d.map((d, i) => `${x(d)},${y(P.z[i])}`).join(' ');
    s += `<polygon points="${x(0)},${H - m.b} ${pts} ${x(L_)},${H - m.b}" class="pf-area"/><polyline points="${pts}" class="pf-line"/>`;
    s += `<line class="pf-cur" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><text class="pf-txt"></text><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent" class="pf-hit"/></svg>`;
    box.innerHTML = s;
    const hit = box.querySelector('.pf-hit'), cur = box.querySelector('.pf-cur'), txt = box.querySelector('.pf-txt');
    let mk = el._mk;
    const mover = (ev) => { const r = box.getBoundingClientRect(); const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left; const sx = cx * W / r.width;
      const d = Math.max(0, Math.min(L_, (sx - m.l) / (W - m.l - m.r) * L_)); const i = Math.round(d / L_ * (P.d.length - 1));
      cur.setAttribute('x1', x(P.d[i])); cur.setAttribute('x2', x(P.d[i])); cur.setAttribute('visibility', 'visible');
      txt.setAttribute('x', Math.min(x(P.d[i]) + 6, W - 120)); txt.setAttribute('y', Math.max(14, y(P.z[i]) - 8)); txt.textContent = `${fmt(P.d[i])} m · ${fmt(P.z[i], 1)} m`;
      if (map) { const ll = [P.lat[i], P.lon[i]]; if (!mk) mk = el._mk = L.circleMarker(ll, { radius: 7, color: '#fff', weight: 2, fillColor: '#b5651d', fillOpacity: 1, pane: 'resalte' }); mk.setLatLng(ll).addTo(map); } };
    hit.addEventListener('mousemove', mover); hit.addEventListener('touchmove', mover, { passive: true });
    // Borra el cursor del perfil y el punto en el mapa (también se llama al salir del paso del perfil en la historia).
    el._limpiar = () => { cur.setAttribute('visibility', 'hidden'); txt.textContent = ''; if (mk && map) map.removeLayer(mk); };
    hit.addEventListener('mouseleave', el._limpiar);
  };

  // Barras horizontales agrupadas. datos: [{etiqueta, valores:[...]}], series: [{nombre, color}]
  M4.barras = (el, datos, series, opts = {}) => {
    const W = 520, fila = opts.fila || 26, gap = 6, izq = opts.izq || 150, der = 70, H = datos.length * (fila * series.length + gap) + 18;
    const max = opts.max || Math.max(...datos.flatMap(d => d.valores)) * 1.02;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.titulo || 'Gráfico de barras')}">`; let yy = 4;
    datos.forEach(d => {
      s += `<text x="${izq - 8}" y="${yy + fila * series.length / 2 + 4}" text-anchor="end" class="bl">${esc(d.etiqueta)}</text>`;
      d.valores.forEach((v, j) => { const w = (W - izq - der) * v / max; s += `<rect x="${izq}" y="${yy}" width="${Math.max(1, w)}" height="${fila - 4}" rx="2" fill="${series[j].color}"/><text x="${izq + w + 6}" y="${yy + fila / 2 + 2}" class="bv">${fmt(v)}${opts.unidad || ''}</text>`; yy += fila; });
      yy += gap;
    });
    s += '</svg>';
    const ley = series.length > 1 ? `<div class="gleg">${series.map(x => `<span><i style="background:${x.color}"></i>${esc(x.nombre)}</span>`).join('')}</div>` : '';
    el.innerHTML = (opts.titulo ? `<div class="gtit">${esc(opts.titulo)}</div>` : '') + ley + s + (opts.fuente ? `<div class="gfuente">${esc(opts.fuente)}</div>` : '');
  };

  // Matriz de alternativas (lee tablas.json, misma fuente que la pestaña de datos).
  M4.ALTS = ['Situación actual', 'A1 · Paradas nuevas sobre recorridos actuales (E8)', 'A2 · Paradas + red completa (E11b c)', 'A3 · Paradas + red con piso de 4 salidas (E11b c-piso)'];
  M4.matriz = async (sel, compacta) => {
    const t = await M4.get('tablas.json'); const larga = t.T08_matriz_alternativas_larga;
    let crits = [...new Set(larga.map(r => r.criterio))]; if (compacta) crits = crits.slice(0, 4);
    const v = (a, c) => larga.find(x => x.alternativa === a && x.criterio === c);
    const cls = (i) => i === sel ? ' class="sel"' : '';
    let h = `<table class="tabla"><thead><tr><th>Criterio</th>${['Actual', 'A1', 'A2', 'A3'].map((a, i) => `<th${cls(i)}>${a}</th>`).join('')}</tr></thead><tbody>`;
    crits.forEach(c => { const r0 = v(M4.ALTS[0], c); h += `<tr><td>${esc(c)}<div class="u">${esc(r0.unidad)} · ${esc(r0.sentido)}</div></td>${M4.ALTS.map((a, i) => { const r = v(a, c); return `<td${cls(i)}>${r.valor == null ? '<abbr title="pendiente de calcular">s/d</abbr>' : fmt(r.valor)}</td>`; }).join('')}</tr>`; });
    h += `<tr class="sep"><th colspan="5">Restricciones excluyentes</th></tr>`;
    t.T09_restricciones_excluyentes.forEach(r => { h += `<tr><td>${esc(r.restriccion)}</td>${M4.ALTS.map((a, i) => `<td${cls(i)}>${esc(r[a])}</td>`).join('')}</tr>`; });
    return h + '</tbody></table>';
  };
})(window.M4);
