/* Visor GIS: mapa protagonista, gestión de capas, simbología, identificar, medir, buscar, filtrar. */
(function (M4) {
  'use strict';
  const fmt = M4.fmt, esc = M4.esc;
  const POR_DEFECTO = ['localidades', 'distritos', 'limite', 'prop_mod', 'prop_ali', 'prop_dir', 'paradas_v1', 'red_actual', 'celdas'];
  let map, G, root, herramienta = 'identificar', iniciado = false, sincronizar = true;

  if (window.proj4) proj4.defs('EPSG:5344', '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

  const html = `
  <div class="visor">
    <aside class="v-panel" id="vPanel" aria-label="Capas del mapa">
      <div class="v-ph"><h2>Capas</h2><a class="link-sm" href="#/storymap" id="vVolver">← Volver a la investigación</a></div>
      <div class="v-scroll">
        <section><h3 class="v-h3">En el mapa <span class="muted" id="vCuenta"></span></h3><p class="v-hint">Arrastrá ⠿ para cambiar el orden. La capa de arriba se dibuja encima.</p><ol class="v-activas" id="vActivas"></ol></section>
        <section><h3 class="v-h3">Agregar capas</h3><div id="vCatalogo"></div></section>
        <section><h3 class="v-h3">Mapa de fondo</h3><div class="v-fondos" id="vFondos"></div></section>
      </div>
    </aside>
    <button class="v-plegar" id="vPlegar" aria-controls="vPanel" aria-expanded="true" title="Mostrar u ocultar el panel de capas">◂</button>
    <div class="v-mapwrap">
      <div id="vMap" class="v-map"></div>
      <div class="v-buscar"><input id="vBuscar" type="search" placeholder="Buscar localidad, distrito, calle, línea, canal…" aria-label="Buscar en el mapa" autocomplete="off"><ul id="vResultados" class="v-res" hidden></ul></div>
      <div class="v-info" id="vInfo" hidden><div class="v-info-h"><strong>Identificar</strong><button class="ico-btn" id="vInfoX" aria-label="Cerrar">✕</button></div><div id="vInfoB" class="v-info-b"></div></div>
      <div class="v-perfil" id="vPerfil" hidden></div>
      <div class="v-coords" id="vCoords">Mové el cursor sobre el mapa</div>
      <div class="v-escala" id="vEscala"></div>
    </div>
  </div>`;

  // ---------------- barra de herramientas (control Leaflet)
  const Herramientas = L.Control.extend({ options: { position: 'topleft' }, onAdd() {
    const d = L.DomUtil.create('div', 'ctl-tools');
    d.innerHTML = [['zin', '+', 'Acercar'], ['zout', '−', 'Alejar'], ['home', '⌂', 'Vista de todo Maipú'], ['corr', '◱', 'Vista del corredor RP 50'], ['sep'], ['identificar', 'i', 'Identificar: tocá el mapa para ver atributos'], ['dist', '↔', 'Medir distancia (doble clic para terminar)'], ['area', '▱', 'Medir superficie (doble clic para terminar)'], ['limpiar', '⌫', 'Borrar mediciones']]
      .map(([k, t, ti]) => k === 'sep' ? '<span class="sep"></span>' : `<button type="button" data-t="${k}" title="${ti}" aria-label="${ti}">${t}</button>`).join('');
    L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
    d.addEventListener('click', e => { const k = e.target.closest('button')?.dataset.t; if (!k) return;
      if (k === 'zin') map.zoomIn(); else if (k === 'zout') map.zoomOut(); else if (k === 'home') map.flyToBounds(M4.VISTAS.maipu, { duration: .6 }); else if (k === 'corr') map.flyToBounds(M4.VISTAS.corredor, { duration: .6 });
      else if (k === 'limpiar') medir.limpiar(); else setHerramienta(k); });
    return d; } });
  function setHerramienta(k) {
    herramienta = k; root.querySelectorAll('.ctl-tools [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === k));
    map.getContainer().style.cursor = k === 'identificar' ? '' : 'crosshair';
    if (k === 'dist' || k === 'area') { medir.empezar(k); map.doubleClickZoom.disable(); } else { medir.cancelar(); map.doubleClickZoom.enable(); }
  }

  // ---------------- medición geodésica
  const R = 6378137, rad = d => d * Math.PI / 180;
  const largo = pts => pts.reduce((s, p, i) => i ? s + map.distance(pts[i - 1], p) : 0, 0);
  const superficie = pts => { let a = 0; const n = pts.length; if (n < 3) return 0; for (let i = 0; i < n; i++) { const p1 = pts[i], p2 = pts[(i + 1) % n]; a += (rad(p2.lng) - rad(p1.lng)) * (2 + Math.sin(rad(p1.lat)) + Math.sin(rad(p2.lat))); } return Math.abs(a * R * R / 2); };
  const fL = m => m >= 1000 ? fmt(m / 1000, 2) + ' km' : fmt(m) + ' m';
  const fA = a => a >= 1e6 ? fmt(a / 1e6, 2) + ' km²' : a >= 1e4 ? fmt(a / 1e4, 2) + ' ha' : fmt(a) + ' m²';
  const medir = { grupo: null, modo: null, pts: [], tmp: null,
    empezar(m) { this.cancelar(); this.modo = m; this.pts = []; if (!this.grupo) this.grupo = L.layerGroup().addTo(map); },
    cancelar() { if (this.tmp) { this.grupo.removeLayer(this.tmp); this.tmp = null; } this.modo = null; this.pts = []; },
    limpiar() { if (this.grupo) this.grupo.clearLayers(); this.tmp = null; this.pts = []; if (this.modo) this.empezar(this.modo); },
    dibujar(extra) { const pts = extra ? this.pts.concat([extra]) : this.pts; if (this.tmp) this.grupo.removeLayer(this.tmp); if (pts.length < 2) return;
      const o = { color: '#b0307a', weight: 2.5, dashArray: '6 4', pane: 'resalte' };
      this.tmp = (this.modo === 'area' && pts.length > 2 ? L.polygon(pts, Object.assign({ fillOpacity: .12 }, o)) : L.polyline(pts, o)).addTo(this.grupo);
      this.tmp.bindTooltip(this.modo === 'area' && pts.length > 2 ? `${fA(superficie(pts))} · perímetro ${fL(largo(pts.concat([pts[0]])))}` : fL(largo(pts)), { permanent: true, direction: 'top', className: 'tt-medida' }).openTooltip(pts[pts.length - 1]); },
    clic(ll) { this.pts.push(ll); L.circleMarker(ll, { radius: 3, color: '#b0307a', fillOpacity: 1, pane: 'resalte' }).addTo(this.grupo); this.dibujar(); },
    terminar() { if (this.pts.length < 2) return; this.dibujar(); this.tmp = null; this.pts = []; }
  };

  // ---------------- identificar
  function valor(c, k, p) { const def = c.spec.campos.find(x => x[0] === k); const v = p[k]; if (!def) return esc(v); if (def[2] === 'num') return fmt(v, def[3] || 0); return esc(v === '' || v == null ? '—' : v); }
  let resalte = null;
  function identificar(latlng) {
    const res = G.identificar(latlng); const b = root.querySelector('#vInfoB'); const box = root.querySelector('#vInfo');
    if (resalte) { map.removeLayer(resalte); resalte = null; }
    if (!res.length) { b.innerHTML = '<p class="muted">No hay elementos de las capas visibles en ese punto.</p>'; box.hidden = false; return; }
    b.innerHTML = res.map(({ capa, features }) => `<section class="id-capa"><h4>${esc(capa.spec.nombre)}</h4>${features.slice(0, 4).map((f, j) => `
      <div class="id-el"><div class="id-t">${esc(capa.spec.titulo ? capa.spec.titulo(f.properties) : capa.spec.nombre)}</div>
      <table class="id-tab">${capa.spec.campos.map(([k, lab]) => `<tr><th>${esc(lab)}</th><td>${valor(capa, k, f.properties)}</td></tr>`).join('')}</table>
      ${capa.spec.explica ? `<p class="id-ex">${esc(capa.spec.explica)}</p>` : ''}${capa.spec.perfil ? `<button class="btn-sm" data-perfil="${esc(f.properties.perfil)}">Ver perfil ${esc(f.properties.perfil)}</button>` : ''}</div>`).join('')}
      ${features.length > 4 ? `<p class="muted">y ${features.length - 4} elementos más</p>` : ''}</section>`).join('');
    b.querySelectorAll('[data-perfil]').forEach(x => x.onclick = () => abrirPerfil(x.dataset.perfil));
    resalte = L.geoJSON(res[0].features[0], { pane: 'resalte', style: { color: '#f2b705', weight: 4, fill: false }, pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 10, color: '#f2b705', weight: 3, fill: false, pane: 'resalte' }), interactive: false }).addTo(map);
    box.hidden = false;
  }
  function abrirPerfil(k) { const el = root.querySelector('#vPerfil'); el.hidden = false; M4.perfil(el, map, k, { cerrar: () => { el.hidden = true; if (el._mk) map.removeLayer(el._mk); } }); }

  // ---------------- panel de capas
  function renderActivas() {
    const ol = root.querySelector('#vActivas'); const act = G.activas(); root.querySelector('#vCuenta').textContent = `(${act.length})`;
    const abiertas = new Set([...ol.querySelectorAll('.lyr.edit')].map(x => x.dataset.id));
    ol.innerHTML = act.map(c => { const ley = (c.spec.tipo === 'raster' ? (c.spec.leyenda || []) : M4.leyendaDe(c.spec, c.st)).map(M4.muestraHTML).join('');
      return `<li class="lyr${abiertas.has(c.id) ? ' edit' : ''}" data-id="${c.id}">
      <div class="lyr-row"><span class="h" title="Arrastrar para ordenar" aria-hidden="true">⠿</span>
        <input type="checkbox" ${c.visible ? 'checked' : ''} aria-label="Mostrar ${esc(c.spec.nombre)}" data-a="vis">
        <span class="lyr-n" title="${esc(c.spec.desc)}">${esc(c.spec.nombre)}</span>
        <span class="lyr-b"><button data-a="sube" title="Subir" aria-label="Subir">▴</button><button data-a="baja" title="Bajar" aria-label="Bajar">▾</button>${c.spec.tipo !== 'raster' ? '<button data-a="zoom" title="Acercar a la capa" aria-label="Acercar a la capa">⌖</button>' : ''}<button data-a="edit" title="Estilo, filtro y transparencia" aria-label="Estilo">⚙</button><button data-a="quitar" title="Quitar del mapa" aria-label="Quitar">✕</button></span></div>
      ${c.filtro && c.filtro.campo && c.filtro.valor !== '' ? `<div class="lyr-f">Filtro: ${esc(c.filtro.campo)} ${esc(c.filtro.op)} ${esc(c.filtro.valor)} · ${fmt(c.nVisibles)} elementos</div>` : ''}
      <div class="lyr-ley">${ley}</div>
      <div class="lyr-ed">${editor(c)}</div></li>`; }).join('');
    ol.querySelectorAll('.lyr').forEach(li => bindLyr(li));
    if (window.Sortable && !ol._s) ol._s = Sortable.create(ol, { handle: '.h', animation: 150, onEnd: () => G.mover([...ol.children].map(x => x.dataset.id)) });
    root.querySelectorAll('#vCatalogo input[type=checkbox]').forEach(cb => cb.checked = G.esta(cb.dataset.id));
    urlSync();
  }
  function opciones(arr, sel) { return arr.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(t)}</option>`).join(''); }
  function editor(c) {
    const op = `<label class="f">Transparencia <input type="range" min="0" max="100" value="${Math.round((1 - c.opacidad) * 100)}" data-a="op"> <output>${Math.round((1 - c.opacidad) * 100)} %</output></label>`;
    if (c.spec.tipo === 'raster') return op + `<p class="v-hint">${esc(c.spec.desc)} Fuente: ${esc(c.spec.fuente)}. Los rásters tienen paleta fija.</p>`;
    const st = c.st, s = c.spec, cat = s.campos.filter(x => x[2] !== 'num' || true), num = s.campos.filter(x => x[2] === 'num');
    let h = op + `<label class="f">Simbología <select data-a="modo">${opciones([['unico', 'Única'], ['categorizado', 'Categorizada'], ['graduado', 'Graduada']].filter(([m]) => m === 'unico' || (m === 'categorizado' ? s.campos.length : num.length)), st.modo)}</select></label>`;
    if (st.modo === 'unico') h += `<label class="f">Color <input type="color" value="${st.color && st.color.length === 7 ? st.color : '#5b3a99'}" data-a="color"></label>`;
    if (st.modo === 'categorizado') h += `<label class="f">Campo <select data-a="campo">${opciones(cat.map(x => [x[0], x[1]]), st.campo)}</select></label><div class="cats">${Object.entries(st.categorias || {}).map(([v, col]) => `<label class="cat"><input type="color" value="${col.length === 7 ? col : '#999999'}" data-cat="${esc(v)}"> ${esc(v)}</label>`).join('')}</div>`;
    if (st.modo === 'graduado') { const k = st.cortes || []; h += `<label class="f">Campo <select data-a="campo">${opciones(num.map(x => [x[0], x[1]]), st.campo)}</select></label>
      <label class="f">Método <select data-a="metodo">${opciones([['naturales', 'Cortes naturales (Jenks)'], ['cuantiles', 'Cuantiles'], ['iguales', 'Intervalos iguales'], ['manual', 'Manual']], st.metodo || 'naturales')}</select></label>
      <label class="f">Clases <select data-a="clases">${opciones([[3, 3], [4, 4], [5, 5], [6, 6], [7, 7]], st.clases || (k.length - 1) || 5)}</select></label>
      <label class="f">Paleta <select data-a="paleta">${opciones(Object.keys(M4.PALETAS).map(p => [p, p]), st.paleta || 'violetas')}</select></label>
      <div class="f"><span>Cortes</span><div class="cortes">${k.map((v, i) => `<input type="number" step="any" value="${v}" data-corte="${i}" aria-label="Corte ${i + 1}">`).join('')}</div></div>`; }
    if (s.geom === 'punto') h += `<label class="f">Tamaño <input type="range" min="1" max="14" step=".5" value="${st.radio}" data-a="radio"> <output>${st.radio}</output></label>`;
    else if (s.geom === 'linea' || st.soloBorde || st.ancho) h += `<label class="f">Grosor <input type="range" min="0" max="10" step=".2" value="${st.ancho || 0}" data-a="ancho"> <output>${st.ancho || 0}</output></label>`;
    if (s.geom === 'poligono' && !st.soloBorde) h += `<label class="f">Relleno <input type="range" min="0" max="100" value="${Math.round((st.relleno ?? .7) * 100)}" data-a="relleno"> <output>${Math.round((st.relleno ?? .7) * 100)} %</output></label>`;
    if (s.campos.length) { const f = c.filtro || {}; h += `<div class="f filtro"><span>Filtro</span><select data-f="campo"><option value="">(sin filtro)</option>${opciones(s.campos.map(x => [x[0], x[1]]), f.campo)}</select><select data-f="op">${opciones(['=', '≠', '>', '<', '≥', '≤', 'contiene'].map(o => [o, o]), f.op || '=')}</select><input data-f="valor" value="${esc(f.valor ?? '')}" placeholder="valor" list="dl_${c.id}"><datalist id="dl_${c.id}"></datalist><button class="btn-sm" data-a="filtrar">Aplicar</button><button class="btn-sm ghost" data-a="sinfiltro">Quitar</button></div>`; }
    if (s.rotulo) h += `<label class="f chk"><input type="checkbox" data-a="rotulos" ${c.rotulos ? 'checked' : ''}> Mostrar rótulos</label>`;
    h += `<p class="v-hint">${esc(s.desc)} <span class="muted">Fuente: ${esc(s.fuente)}.</span></p><button class="btn-sm ghost" data-a="reset">Restablecer estilo</button>`;
    return h;
  }
  function bindLyr(li) {
    const id = li.dataset.id, c = G.capas.get(id);
    const re = async () => { await G.restilizar(id); };
    li.addEventListener('click', async (e) => { const a = e.target.dataset.a; if (!a) return;
      if (a === 'edit') li.classList.toggle('edit');
      else if (a === 'quitar') G.desactivar(id);
      else if (a === 'zoom' && c.layer) { const b = c.layer.getBounds(); if (b.isValid()) map.flyToBounds(b, { duration: .6, maxZoom: 15 }); }
      else if (a === 'sube' || a === 'baja') { const o = G.orden.slice(), i = o.indexOf(id), j = a === 'sube' ? i - 1 : i + 1; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; G.mover(o); }
      else if (a === 'filtrar') { c.filtro = { campo: li.querySelector('[data-f=campo]').value, op: li.querySelector('[data-f=op]').value, valor: li.querySelector('[data-f=valor]').value }; await re(); }
      else if (a === 'sinfiltro') { c.filtro = null; await re(); }
      else if (a === 'reset') { c.st = M4.estiloInicial(id); c.filtro = c.spec.filtro ? Object.assign({}, c.spec.filtro) : null; await re(); } });
    li.addEventListener('change', async (e) => { const t = e.target, a = t.dataset.a;
      if (a === 'vis') return G.setVisible(id, t.checked);
      if (a === 'op') return G.setOpacidad(id, 1 - t.value / 100);
      if (a === 'rotulos') { c.rotulos = t.checked; return re(); }
      if (t.dataset.cat != null) { c.st.categorias[t.dataset.cat] = t.value; return re(); }
      if (t.dataset.corte != null) { c.st.cortes[+t.dataset.corte] = Number(t.value); c.st.metodo = 'manual'; return re(); }
      if (t.dataset.f === 'campo') { const dl = li.querySelector('datalist'); const vals = [...new Set(c.datos.map(f => f.properties[t.value]))].filter(v => v !== '' && v != null).slice(0, 60); dl.innerHTML = vals.map(v => `<option value="${esc(v)}">`).join(''); return; }
      if (!a) return;
      if (a === 'modo') { c.st.modo = t.value; if (t.value === 'categorizado') { c.st.campo = c.spec.campos[0][0]; c.st.categorias = {}; } if (t.value === 'graduado') { c.st.campo = c.spec.campos.find(x => x[2] === 'num')[0]; c.st.metodo = 'naturales'; c.st.clases = 5; c.st.paleta = c.st.paleta || 'violetas'; c.st.cortes = null; } }
      else if (a === 'campo') { c.st.campo = t.value; c.st.categorias = {}; c.st.cortes = null; if (c.st.metodo === 'manual') c.st.metodo = 'naturales'; }
      else if (a === 'metodo') { c.st.metodo = t.value; if (t.value !== 'manual') c.st.cortes = null; }
      else if (a === 'clases') { c.st.clases = +t.value; if (c.st.metodo === 'manual') c.st.metodo = 'naturales'; c.st.cortes = null; }
      else if (a === 'paleta') c.st.paleta = t.value;
      else if (a === 'color') c.st.color = t.value;
      else if (a === 'radio' || a === 'ancho') c.st[a] = +t.value;
      else if (a === 'relleno') c.st.relleno = t.value / 100;
      await re(); });
    li.addEventListener('input', (e) => { const t = e.target; const o = t.parentElement.querySelector('output'); if (o) o.textContent = t.dataset.a === 'op' || t.dataset.a === 'relleno' ? t.value + ' %' : t.value; if (t.dataset.a === 'op') G.setOpacidad(id, 1 - t.value / 100); });
  }
  function renderCatalogo() {
    const el = root.querySelector('#vCatalogo');
    el.innerHTML = M4.GRUPOS.map(g => `<details class="grp"><summary>${esc(g)}</summary>${M4.CATALOGO.filter(c => c.grupo === g).map(c => `<label class="cat-it" title="${esc(c.desc)}"><input type="checkbox" data-id="${c.id}"> <span>${esc(c.nombre)}</span></label>`).join('')}</details>`).join('');
    el.addEventListener('change', e => { const id = e.target.dataset.id; if (!id) return; e.target.checked ? G.activar(id) : G.desactivar(id); });
    const f = root.querySelector('#vFondos');
    f.innerHTML = Object.entries(M4.FONDOS).map(([k, v]) => `<label><input type="radio" name="vfondo" value="${k}" ${k === map.getFondo() ? 'checked' : ''}> ${esc(v.n)}</label>`).join('');
    f.addEventListener('change', e => { map.setFondo(e.target.value); urlSync(); });
  }

  // ---------------- búsqueda
  let indice = null;
  async function construirIndice() {
    if (indice) return indice; indice = [];
    const add = (texto, tipo, capa, feats) => indice.push({ texto, tipo, capa, feats, n: texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() });
    const L_ = async (id) => { const s = M4.CAT[id]; const d = await s.carga(); return s.filtroBase ? d.features.filter(f => s.filtroBase(f.properties)) : d.features; };
    (await L_('localidades')).forEach(f => add(f.properties.fna, 'Localidad', 'localidades', [f]));
    (await L_('distritos')).forEach(f => add(f.properties.distrito, 'Distrito', 'distritos', [f]));
    const calles = {}, lineas = {}; (await L_('red_actual')).forEach(f => { const p = f.properties; if (p.calle) (calles[p.calle] = calles[p.calle] || []).push(f); String(p.lineas || '').split(/[,; ]+/).filter(Boolean).forEach(l => (lineas[l] = lineas[l] || []).push(f)); });
    Object.entries(calles).forEach(([k, v]) => add(k, 'Calle con colectivo', 'red_actual', v));
    Object.entries(lineas).forEach(([k, v]) => add('Línea ' + k, 'Recorrido actual', 'red_actual', v));
    (await L_('prop_mod')).forEach(f => add('Línea ' + f.properties.linea + ' (modificación propuesta)', 'Propuesta', 'prop_mod', [f]));
    const can = {}; (await L_('canales')).forEach(f => { const n = f.properties.nombre; if (n) (can[n] = can[n] || []).push(f); }); Object.entries(can).forEach(([k, v]) => add(k, 'Canal o acequia', 'canales', v));
    return indice;
  }
  function bindBuscar() {
    const inp = root.querySelector('#vBuscar'), ul = root.querySelector('#vResultados'); let sel = [];
    inp.addEventListener('input', async () => { const q = inp.value.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); if (q.length < 2) { ul.hidden = true; return; }
      const idx = await construirIndice(); sel = idx.filter(x => x.n.includes(q)).sort((a, b) => (a.n.startsWith(q) ? 0 : 1) - (b.n.startsWith(q) ? 0 : 1) || a.n.length - b.n.length).slice(0, 12);
      ul.innerHTML = sel.length ? sel.map((x, i) => `<li><button type="button" data-i="${i}">${esc(x.texto)} <span>${esc(x.tipo)}</span></button></li>`).join('') : '<li class="muted">Sin resultados</li>'; ul.hidden = false; });
    ul.addEventListener('click', async e => { const b = e.target.closest('button'); if (!b) return; const x = sel[+b.dataset.i]; ul.hidden = true; inp.value = x.texto;
      if (!G.esta(x.capa)) await G.activar(x.capa);
      if (resalte) map.removeLayer(resalte);
      resalte = L.geoJSON({ type: 'FeatureCollection', features: x.feats }, { pane: 'resalte', style: { color: '#f2b705', weight: 5, fill: false }, pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 11, color: '#f2b705', weight: 3, fill: false, pane: 'resalte' }), interactive: false }).addTo(map);
      const bb = resalte.getBounds(); if (bb.isValid()) map.flyToBounds(bb, { maxZoom: 15, duration: .7, padding: [40, 40] }); });
    inp.addEventListener('keydown', e => { if (e.key === 'Escape') { ul.hidden = true; inp.blur(); } if (e.key === 'Enter') ul.querySelector('button')?.click(); });
  }

  // ---------------- URL
  let tUrl = null;
  function urlSync() {
    if (!sincronizar || !location.hash.startsWith('#/visor')) return; clearTimeout(tUrl);
    tUrl = setTimeout(() => { const c = map.getCenter(); const q = `c=${G.orden.join(',')}&v=${c.lat.toFixed(4)},${c.lng.toFixed(4)},${map.getZoom().toFixed(2)}&f=${map.getFondo()}`; history.replaceState(null, '', '#/visor?' + q); }, 250);
  }

  // ---------------- API
  M4.visor = {
    async abrir(params) {
      root = document.getElementById('view-visor');
      if (!iniciado) {
        iniciado = true; root.innerHTML = html;
        map = M4.crearMapa(root.querySelector('#vMap'), { fondo: params.get('f') || 'gris' });
        G = new M4.Gestor(map, { alClic: (e) => { if (herramienta === 'identificar') identificar(e.latlng); else medir.clic(e.latlng); } });
        G.on(renderActivas);
        new Herramientas().addTo(map); new M4.ControlNorte().addTo(map);
        L.control.scale({ metric: true, imperial: false, position: 'bottomright', maxWidth: 140 }).addTo(map);
        const esc_ = root.querySelector('#vEscala'); const upd = () => { esc_.textContent = 'Escala aprox. ' + M4.escalaNumerica(map) + ' (pantalla 96 ppp)'; }; map.on('zoomend', upd); upd();
        map.on('click', e => { if (herramienta === 'identificar') identificar(e.latlng); else medir.clic(e.latlng); });
        map.on('dblclick', () => { if (herramienta !== 'identificar') medir.terminar(); });
        map.on('mousemove', e => { if (medir.modo && medir.pts.length) medir.dibujar(e.latlng);
          const { lat, lng } = e.latlng; let t = `Lat ${lat.toFixed(5)}° · Lon ${lng.toFixed(5)}°`;
          if (window.proj4) { const [x, y] = proj4('EPSG:4326', 'EPSG:5344', [lng, lat]); t += ` · POSGAR 2007 faja 2: X ${fmt(x)} · Y ${fmt(y)}`; }
          root.querySelector('#vCoords').textContent = t; });
        map.on('moveend', urlSync);
        root.querySelector('#vInfoX').onclick = () => { root.querySelector('#vInfo').hidden = true; if (resalte) { map.removeLayer(resalte); resalte = null; } };
        root.querySelector('#vPlegar').onclick = (e) => { const p = root.querySelector('.visor'); p.classList.toggle('plegado'); const pl = p.classList.contains('plegado'); e.currentTarget.textContent = pl ? '▸' : '◂'; e.currentTarget.setAttribute('aria-expanded', !pl); setTimeout(() => map.invalidateSize(), 220); };
        if (window.matchMedia('(max-width: 900px)').matches) { const b = root.querySelector('#vPlegar'); root.querySelector('.visor').classList.add('plegado'); b.textContent = '▸'; b.setAttribute('aria-expanded', false); }
        renderCatalogo(); bindBuscar(); setHerramienta('identificar');
        const c = params.get('c'); await G.conjunto(c ? c.split(',').filter(id => M4.CAT[id]) : POR_DEFECTO);
      } else {
        const c = params.get('c'); if (c) { sincronizar = false; await G.conjunto(c.split(',').filter(id => M4.CAT[id])); sincronizar = true; }
        if (params.get('f')) { map.setFondo(params.get('f')); }
      }
      const v = params.get('v');
      if (v && M4.VISTAS[v]) map.fitBounds(M4.VISTAS[v]); else if (v) { const [la, lo, z] = v.split(',').map(Number); if (!isNaN(la)) map.setView([la, lo], z); }
      const back = params.get('desde'); root.querySelector('#vVolver').href = back ? '#/storymap/' + back : '#/storymap';
      setTimeout(() => map.invalidateSize(), 50); urlSync();
      if (params.get('perfil')) abrirPerfil(params.get('perfil'));
    }
  };
})(window.M4);
