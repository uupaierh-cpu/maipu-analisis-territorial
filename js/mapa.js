/* Fábrica de mapas y gestor de capas (lo usan StoryMap y Visor). */
(function (M4) {
  'use strict';
  M4.VISTAS = { maipu: [[-33.105, -68.865], [-32.84, -68.45]], corredor: [[-33.033, -68.738], [-32.947, -68.615]] };
  M4.FONDOS = {
    gris: { n: 'Argenmap gris (IGN)', url: 'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabasegris@EPSG%3A3857@png/{z}/{x}/{-y}.png', at: '<a href="https://www.ign.gob.ar" target="_blank" rel="noopener">Argenmap · IGN</a>' },
    argenmap: { n: 'Argenmap (IGN)', url: 'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png', at: '<a href="https://www.ign.gob.ar" target="_blank" rel="noopener">Argenmap · IGN</a>' },
    satelite: { n: 'Imagen satelital (Esri)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', at: 'Imágenes © Esri, Maxar, Earthstar Geographics' },
    osm: { n: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', at: '© colaboradores de OpenStreetMap' },
    ninguno: { n: 'Sin fondo', url: null }
  };

  M4.crearMapa = (el, opts = {}) => {
    const map = L.map(el, Object.assign({ zoomControl: false, minZoom: 9, maxZoom: 18, attributionControl: true, zoomSnap: .25 }, opts));
    map.fitBounds(M4.VISTAS[opts.vista || 'maipu']);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    let fondo = null, fondoId = null;
    map.setFondo = (k) => { if (fondo) map.removeLayer(fondo); fondoId = k; const f = M4.FONDOS[k]; fondo = f.url ? L.tileLayer(f.url, { maxZoom: 18, attribution: f.at }).addTo(map) : null; if (fondo) fondo.bringToBack(); map.fire('fondo', { id: k }); };
    map.getFondo = () => fondoId;
    map.setFondo(opts.fondo || 'gris');
    map.createPane('rotulos'); map.getPane('rotulos').style.zIndex = 640; map.getPane('rotulos').style.pointerEvents = 'none';
    map.createPane('resalte'); map.getPane('resalte').style.zIndex = 660;
    return map;
  };

  // ---------- Gestor de capas
  // Los elementos que no pasan el filtro se dibujan ocultos: así cambiar un filtro es solo reestilizar, no reconstruir.
  const OCULTO = { stroke: false, fill: false, opacity: 0, fillOpacity: 0, radius: 0 };
  // Al volver a mostrar un elemento hay que restituir explícitamente lo que OCULTO apagó.
  const VISIBLE = (g) => ({ stroke: true, opacity: 1, fill: g !== 'linea' });
  const ver = (g, st, p) => Object.assign(VISIBLE(g), M4.estiloLeaflet(g, st, p));
  const firmaGeo = (c) => JSON.stringify([c.rotulos, c.rotulos ? c.filtro : null]);
  class Gestor {
    constructor(map, opts = {}) { this.map = map; this.capas = new Map(); this.dormidas = new Map(); this.orden = []; this.oyentes = []; this.interactivo = opts.interactivo !== false; this.alClic = opts.alClic; }
    on(fn) { this.oyentes.push(fn); }
    avisar() { if (!this.silencio) this.oyentes.forEach(f => f(this)); }
    activas() { return this.orden.map(id => this.capas.get(id)).filter(Boolean); }
    esta(id) { return this.capas.has(id); }

    async activar(id, cfg = {}) {
      const spec = M4.CAT[id]; if (!spec) return;
      let c = this.capas.get(id);
      // Una capa que se apagó antes conserva sus geometrías: se reutiliza en vez de reconstruirla.
      if (!c && this.dormidas.has(id)) { c = this.dormidas.get(id); this.dormidas.delete(id); this.capas.set(id, c); this.orden.unshift(id); this.reordenar(); }
      if (!c) {
        const pane = 'p_' + id; if (!this.map.getPane(pane)) this.map.createPane(pane);
        c = { id, spec, pane, visible: true, opacidad: spec.tipo === 'raster' ? spec.opacidad : 1, st: spec.tipo === 'raster' ? null : M4.estiloInicial(id), filtro: spec.filtro ? Object.assign({}, spec.filtro) : null, rotulos: !!spec.rotulo, layer: null, rot: null, datos: null };
        this.capas.set(id, c); this.orden.unshift(id); this.reordenar();
      }
      if (cfg.reset && spec.tipo !== 'raster') { c.st = M4.estiloInicial(id); c.filtro = spec.filtro ? Object.assign({}, spec.filtro) : null; }
      if (cfg.estilo) c.st = Object.assign(M4.estiloInicial(id), cfg.estilo);
      if ('filtro' in cfg) c.filtro = cfg.filtro;
      if ('rotulos' in cfg) c.rotulos = cfg.rotulos;
      if ('opacidad' in cfg) c.opacidad = cfg.opacidad;
      // Si la capa ya está dibujada con la misma configuración, no se rehace (clave para que el scroll no se trabe).
      const firma = JSON.stringify([c.st, c.filtro, c.rotulos]);
      const volver = () => {
        if (c.layer && !this.map.hasLayer(c.layer)) {
          // Lienzo nuevo para la capa que vuelve (el anterior se descartó al apagarla).
          if (spec.tipo !== 'raster') { c.renderer = L.canvas({ pane: c.pane, padding: .3, tolerance: spec.geom === 'linea' ? 4 : 0 }); c.layer.eachLayer(l => { l.options.renderer = c.renderer; }); }
          c.layer.addTo(this.map);
        }
        if (c.rot && !this.map.hasLayer(c.rot)) c.rot.addTo(this.map); };
      if (c.layer && firma === c.firma) { volver(); this.aplicarOpacidad(c); return c; }
      // Mismo filtro y mismos rótulos, distinto estilo: se reestiliza sin reconstruir las geometrías.
      if (c.layer && spec.tipo !== 'raster' && c.firma && firmaGeo(c) === c.firmaGeo) {
        volver(); M4.prepararEstilo(c.st, c.datos); const st = c.st, g = spec.geom;
        const fl = c.filtro; c.nVisibles = c.datos.filter(f => M4.pasaFiltro(f.properties, fl)).length;
        c.layer.setStyle(f => M4.pasaFiltro(f.properties, fl) ? ver(g === 'punto' ? 'punto' : g, st, f.properties) : OCULTO);
        c.firma = firma; this.avisar(); return c;
      }
      await this.dibujar(c); c.firma = JSON.stringify([c.st, c.filtro, c.rotulos]); c.firmaGeo = firmaGeo(c); this.avisar(); return c;
    }
    desactivar(id) {
      const c = this.capas.get(id); if (!c) return;
      if (c.layer) this.map.removeLayer(c.layer); if (c.rot) this.map.removeLayer(c.rot); if (c.renderer) { this.map.removeLayer(c.renderer); c.renderer = null; }
      if (c.layer && c.spec.tipo !== 'raster') this.dormidas.set(id, c);
      this.capas.delete(id); this.orden = this.orden.filter(x => x !== id); if (!this.silencio) this.avisar();
    }
    // Deja activas exactamente las capas indicadas, en ese orden (la primera arriba).
    async conjunto(lista) {
      const ids = lista.map(x => typeof x === 'string' ? x : x.id);
      this.silencio = true;
      try {
        [...this.capas.keys()].forEach(id => { if (!ids.includes(id)) this.desactivar(id); });
        // Primero se cargan todos los datos en paralelo; después se dibuja.
        await Promise.all(ids.map(id => { const sp = M4.CAT[id]; return sp && sp.carga && sp.tipo !== 'raster' ? sp.carga() : null; }));
        for (const x of [...lista].reverse()) await this.activar(typeof x === 'string' ? x : x.id, typeof x === 'string' ? { reset: true } : Object.assign({ reset: true }, x));
      } finally { this.silencio = false; }
      this.orden = ids.filter(id => this.capas.has(id)); this.reordenar(); this.avisar();
    }
    reordenar() { const n = this.orden.length; this.orden.forEach((id, i) => { const p = this.map.getPane('p_' + id); if (p) p.style.zIndex = 300 + (n - i) * 5; }); }
    mover(ids) { this.orden = ids; this.reordenar(); this.avisar(); }
    setOpacidad(id, v) { const c = this.capas.get(id); if (!c) return; c.opacidad = v; this.aplicarOpacidad(c); }
    aplicarOpacidad(c) { const p = this.map.getPane(c.pane); if (p) p.style.opacity = c.visible ? (c.spec.tipo === 'raster' ? 1 : c.opacidad) : 0; if (c.layer && c.spec.tipo === 'raster') c.layer.setOpacity(c.opacidad); if (p) p.style.pointerEvents = c.visible ? '' : 'none'; if (c.rot) c.rot.eachLayer(m => { const e = m.getElement && m.getElement(); if (e) e.style.opacity = c.visible ? 1 : 0; }); }
    setVisible(id, v) { const c = this.capas.get(id); if (!c) return; c.visible = v; this.aplicarOpacidad(c); this.avisar(); }

    async dibujar(c) {
      const spec = c.spec;
      if (c.layer) this.map.removeLayer(c.layer); if (c.rot) { this.map.removeLayer(c.rot); c.rot = null; }
      if (spec.tipo === 'raster') {
        const b = (await M4.get('raster_bounds.json'))[spec.clave];
        c.layer = L.imageOverlay('img/' + spec.img, b, { pane: c.pane, opacity: c.opacidad, interactive: false }).addTo(this.map);
        this.aplicarOpacidad(c); return;
      }
      if (!c.datos) { const d = await spec.carga(); c.datos = spec.filtroBase ? d.features.filter(f => spec.filtroBase(f.properties)) : d.features; }
      M4.prepararEstilo(c.st, c.datos);
      const feats = c.datos.filter(f => M4.pasaFiltro(f.properties, c.filtro)), fl = c.filtro;
      c.nVisibles = feats.length;
      // Un solo lienzo por capa, reutilizado en cada redibujo (antes se creaba uno nuevo cada vez y se acumulaban).
      const renderer = c.renderer || (c.renderer = L.canvas({ pane: c.pane, padding: .3, tolerance: spec.geom === 'linea' ? 4 : 0 }));
      const st = c.st, g = spec.geom === 'punto' ? 'punto' : spec.geom;
      const estilo = (gg, p) => M4.pasaFiltro(p, fl) ? ver(gg, st, p) : OCULTO;
      c.layer = L.geoJSON({ type: 'FeatureCollection', features: c.datos }, {
        pane: c.pane, renderer, interactive: this.interactivo && spec.interactiva !== false,
        style: f => estilo(g, f.properties),
        pointToLayer: (f, ll) => L.circleMarker(ll, Object.assign({ pane: c.pane, renderer }, estilo('punto', f.properties)))
      });
      if (this.interactivo && spec.interactiva !== false) c.layer.on('click', (e) => { L.DomEvent.stopPropagation(e); this.alClic && this.alClic(e, c); });
      c.layer.addTo(this.map);
      if (spec.rotulo && c.rotulos) {
        const r = spec.rotulo; c.rot = L.layerGroup();
        feats.filter(f => !r.filtro || r.filtro(f.properties)).forEach(f => {
          let ll; const gm = f.geometry;
          if (gm.type === 'Point') ll = [gm.coordinates[1], gm.coordinates[0]];
          else if (r.inicio) { const cs = gm.type === 'LineString' ? gm.coordinates : gm.coordinates[0]; ll = [cs[0][1], cs[0][0]]; }
          else if (gm.type === 'LineString' || gm.type === 'MultiLineString') { const cs = gm.type === 'LineString' ? gm.coordinates : gm.coordinates[0]; const m = cs[Math.floor(cs.length / 2)]; ll = [m[1], m[0]]; }
          else ll = L.geoJSON(f).getBounds().getCenter();
          const txt = r.fn ? r.fn(f.properties) : f.properties[r.campo];
          L.marker(ll, { pane: 'rotulos', interactive: false, icon: L.divIcon({ className: 'lbl ' + (r.clase || ''), html: M4.esc(txt), iconSize: null, iconAnchor: gm.type === 'Point' ? [-6, 7] : [0, 0] }) }).addTo(c.rot);
        });
        c.rot.addTo(this.map);
      }
      this.aplicarOpacidad(c);
    }
    async restilizar(id) { if (this.capas.has(id)) await this.activar(id); }

    // Identificación: todos los elementos de todas las capas visibles bajo un punto.
    identificar(latlng, tolPx = 6) {
      const map = this.map, P = map.latLngToLayerPoint(latlng), res = [];
      const enPoligono = (pt, anillo) => { let ok = false; for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) { const a = anillo[i], b = anillo[j];
        if (((a.lat > pt.lat) !== (b.lat > pt.lat)) && (pt.lng < (b.lng - a.lng) * (pt.lat - a.lat) / (b.lat - a.lat) + a.lng)) ok = !ok; } return ok; };
      const aplanar = (x) => (!x.length ? [] : (x[0] instanceof L.LatLng ? [x] : x.flatMap(aplanar)));
      for (const c of this.activas()) {
        if (!c.visible || c.spec.tipo === 'raster' || !c.layer || c.spec.interactiva === false) continue;
        const hits = [];
        c.layer.eachLayer(l => {
          if (hits.length >= 6 || !M4.pasaFiltro(l.feature.properties, c.filtro)) return;
          if (l instanceof L.CircleMarker) { if (map.latLngToLayerPoint(l.getLatLng()).distanceTo(P) <= l.getRadius() + tolPx) hits.push(l.feature); return; }
          const b = l.getBounds(); if (!b.isValid()) return;
          if (l instanceof L.Polygon) {
            if (!b.contains(latlng)) return;
            const ll = l.getLatLngs(); const polys = Array.isArray(ll[0][0]) ? ll : [ll];
            for (const poly of polys) { if (enPoligono(latlng, poly[0]) && !poly.slice(1).some(h => enPoligono(latlng, h))) { hits.push(l.feature); break; } }
          } else if (l instanceof L.Polyline) {
            const w = (l.options.weight || 2) / 2 + tolPx;
            const bb = L.bounds(map.latLngToLayerPoint(b.getNorthWest()), map.latLngToLayerPoint(b.getSouthEast()));
            if (P.x < bb.min.x - w || P.x > bb.max.x + w || P.y < bb.min.y - w || P.y > bb.max.y + w) return;
            const lines = aplanar(l.getLatLngs());
            for (const ln of lines) { for (let i = 1; i < ln.length; i++) { if (L.LineUtil.pointToSegmentDistance(P, map.latLngToLayerPoint(ln[i - 1]), map.latLngToLayerPoint(ln[i])) <= w) { hits.push(l.feature); return; } } }
          }
        });
        if (hits.length) res.push({ capa: c, features: hits });
      }
      return res;
    }
  }
  M4.Gestor = Gestor;

  // ---------- Elementos cartográficos comunes
  M4.escalaNumerica = (map) => { const c = map.getCenter(); const mpp = 40075016.686 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, map.getZoom() + 8); const n = mpp * 96 / 0.0254; const r = Math.pow(10, Math.floor(Math.log10(n)) - 1); return '1:' + M4.fmt(Math.round(n / r) * r); };
  M4.ControlNorte = L.Control.extend({ options: { position: 'topright' }, onAdd() { const d = L.DomUtil.create('div', 'ctl-norte'); d.title = 'Norte'; d.innerHTML = '<svg viewBox="0 0 24 36" width="22" height="33" aria-label="Norte"><text x="12" y="10" text-anchor="middle" font-size="10" font-weight="700" fill="#1d2321">N</text><path d="M12 13 L18 33 L12 28 L6 33 Z" fill="#1d2321"/><path d="M12 13 L12 28 L6 33 Z" fill="#fff" stroke="#1d2321" stroke-width=".8"/></svg>'; return d; } });
})(window.M4);
