/* StoryMap: relato de página completa. Portada, banners por capítulo, texto de lectura,
   secciones inmersivas (mapa a pantalla completa con tarjetas que cambian las capas al avanzar),
   bandas de cifras y figuras. Un solo mapa Leaflet que se mueve a la sección inmersiva activa. */
(function (M4) {
  'use strict';
  const esc = M4.esc, T = (s) => M4.tpl(s || '');
  let root, map, G, wrap, iniciado = false, capActual = -1, pasoActual = null, cola = Promise.resolve(), turno = 0;
  const num = (i) => String(i + 1).padStart(2, '0');
  const enlaceVisor = (cap, i) => `#/visor?tema=${cap.tema}&desde=${i + 1}`;

  function plantilla() {
    const caps = M4.CAPITULOS;
    const hero = `<header class="hero" id="sm-top" style="background-image:url('img/banner_portada.jpg')">
      <div class="hero-in">
        <p class="hero-k">Trabajo Final · Cartografía Aplicada · UMaza 2026</p>
        <h1>Maipú<br>a 400 metros</h1>
        <p class="hero-dek">Quién vive lejos del colectivo en Maipú, Mendoza, cómo cambia eso con el crecimiento urbano al 2051 y qué red de transporte lo reduce, considerando el relieve, el agua y el ordenamiento territorial.</p>
        <p class="hero-aut">L. De Angelis · C. Quiles · R. Sánchez</p>
        <div class="hero-acc"><a class="btn-hero" href="#cap-1" data-ir="0">Comenzar la historia ↓</a><a class="btn-hero ghost" href="#/visor">Abrir el visor GIS</a></div>
      </div>
      <div class="hero-cifras">
        <div><b>${T('{{lejos_2022}}')}</b><span>personas lejos de una parada en 2022</span></div>
        <div><b>${T('{{lejos_2051}}')}</b><span>en 2051 si nada cambia</span></div>
        <div><b class="g">${T('{{acercados_A3}}')}</b><span>se acercan con la red propuesta</span></div>
      </div>
    </header>`;
    const intro = `<section class="sm-presenta">
      <div class="col2">
        <div class="lectura-grande"><p class="capitular">Cinco minutos caminando. Esa es la distancia que, en general, una persona está dispuesta a hacer para tomar un colectivo. En Maipú, decenas de miles de personas viven más lejos que eso, y la ciudad sigue creciendo justo donde la red es menos densa.</p>
        <p>Este trabajo mide el problema, lo explica con el territorio (crecimiento, oferta de transporte, relieve y escurrimiento) y compara alternativas para resolverlo al 2051.</p></div>
        <aside class="objetivos"><h2>Objetivos</h2><ol>
          <li><b>Medir</b> cuánta población vive a más de 400 m caminando de una parada, hoy y en 2051.</li>
          <li><b>Explicar</b> dónde y por qué: crecimiento frente al PMOT, oferta de colectivos, relieve y escurrimiento.</li>
          <li><b>Proponer y comparar</b> alternativas de red con criterios explícitos y elegir la más defendible.</li></ol></aside>
      </div>
      <h2 class="sec-t">Capítulos</h2>
      <ol class="indice">${caps.map((c, i) => `<li><a href="#cap-${i + 1}" data-ir="${i}" style="background-image:url('img/banner_${i + 1}.jpg');--c:${c.color}"><span class="ix-n">${num(i)}</span><span class="ix-k">${esc(c.kicker)}</span><span class="ix-t">${esc(c.titulo)}</span></a></li>`).join('')}</ol>
    </section>`;
    const capitulos = caps.map((c, i) => `
    <article class="capitulo" id="cap-${i + 1}" data-i="${i}" style="--c:${c.color}">
      <header class="banner${c.claro ? ' claro' : ''}" style="background-image:url('img/banner_${i + 1}.jpg')">
        <div class="banner-in"><span class="b-num">${num(i)}</span><p class="b-k">${esc(c.kicker)}</p><h2>${esc(c.titulo)}</h2>${c.bajada ? `<p class="b-dek">${esc(c.bajada)}</p>` : ''}</div>
      </header>
      <div class="lectura">${T(c.intro)}</div>
      <section class="inmersivo" data-i="${i}" aria-label="Mapa del capítulo ${i + 1}">
        <div class="inm-slot"><div class="inm-ph"></div></div>
        <div class="inm-pasos">${c.pasos.map((p, j) => `<div class="paso${p.ancho ? ' ancho' : ''}" data-i="${i}" data-j="${j}"><span class="paso-n">${j + 1} / ${c.pasos.length}</span>${T(p.texto)}</div>`).join('')}</div>
      </section>
      ${c.cifras && c.cifras.length ? `<div class="banda-cifras n${c.cifras.length}">${c.cifras.map(([v, t, k]) => `<div><b class="${k}">${T(v)}</b><span>${T(t)}</span></div>`).join('')}</div>` : ''}
      ${(c.figuras || []).map(f => f.ancho ? `<figure class="figura ancha"><div class="fig-g tablewrap" data-g="${f.g}"></div></figure>` : `<figure class="figura"><div class="fig-g" data-g="${f.g}"></div><figcaption class="fig-txt">${T(f.texto)}</figcaption></figure>`).join('')}
      ${c.cierre ? `<div class="lectura cierre">${T(c.cierre)}</div>` : ''}
      ${c.nota ? `<aside class="nota-cap"><span>Para leer con cuidado</span><p>${T(c.nota)}</p></aside>` : ''}
      <div class="cap-pie"><a class="btn-visor" href="${enlaceVisor(c, i)}">Explorar este tema en el visor GIS <span aria-hidden="true">→</span></a>${i < caps.length - 1 ? `<a class="sig" href="#cap-${i + 2}" data-ir="${i + 1}">Siguiente: ${esc(caps[i + 1].kicker)} ↓</a>` : ''}</div>
    </article>`).join('');
    const fin = `<footer class="sm-cierre">
      <div class="cierre-in"><p class="hero-k">Fin del recorrido</p><h2>Todas las capas, para explorarlas libremente</h2>
      <p>El visor GIS organiza las capas del proyecto en temas listos para explorar. También se pueden combinar libremente, cambiar su simbología, filtrar, consultar y medir.</p>
      <div class="hero-acc"><a class="btn-hero" href="#/visor">Abrir el visor GIS</a><a class="btn-hero ghost" href="#/acerca">Fuentes y créditos</a></div></div>
      <div class="cierre-pie"><img src="img/logo_umaza.png" alt="" width="36" height="36"><span>Universidad Juan Agustín Maza · Ingeniería en Agrimensura · Cartografía Aplicada 2026 · Docentes: Ing. Agrim. L. Martínez e Ing. Agrim. É. Escudero</span></div>
    </footer>`;
    return `<div class="sm-progreso"><i id="smBarra"></i></div>
      <nav class="sm-puntos" aria-label="Capítulos">${caps.map((c, i) => `<a href="#cap-${i + 1}" data-ir="${i}" title="${i + 1}. ${esc(c.kicker)}"><span>${esc(c.kicker)}</span></a>`).join('')}</nav>
      ${hero}${intro}${capitulos}${fin}`;
  }

  function leyenda(paso) {
    const el = wrap.querySelector('#smLeyenda');
    const lista = (paso.leyenda || []).map(id => G.capas.get(id)).filter(Boolean);
    el.innerHTML = lista.map(c => { const it = (c.spec.tipo === 'raster' ? (c.spec.leyenda || []) : M4.leyendaDe(c.spec, c.st))
      .filter(e => !(c.filtro && c.filtro.op === '≠' && e.texto === c.filtro.valor) && !(c.filtro && c.filtro.op === '=' && e.texto && e.texto !== c.filtro.valor && c.st.modo === 'categorizado'));
      return it.length ? `<div class="lg-b"><div class="lg-t">${esc(c.spec.nombre)}</div>${it.map(M4.muestraHTML).join('')}</div>` : ''; }).join('');
  }

  // Mueve el mapa a la sección inmersiva del capítulo i.
  function llevarMapa(i) {
    const slot = root.querySelector(`.inmersivo[data-i="${i}"] .inm-slot`);
    if (wrap.parentNode !== slot) { slot.appendChild(wrap); map.invalidateSize(false); }
    if (capActual !== i) { capActual = i; const cap = M4.CAPITULOS[i]; map.fitBounds(M4.VISTAS[cap.vista], Object.assign({ animate: false }, encuadre())); }
  }
  const esMovil = () => window.matchMedia('(max-width: 900px)').matches;
  // En compu las tarjetas van a la izquierda; en celular, abajo: el encuadre deja ese espacio libre.
  const encuadre = () => esMovil() ? { paddingTopLeft: [0, 44], paddingBottomRight: [0, Math.round(root.clientHeight * .42)] } : { paddingTopLeft: [Math.min(480, innerWidth * .36), 0] };

  function irPaso(i, j) {
    const k = i + ':' + j; if (pasoActual === k) return; pasoActual = k;
    llevarMapa(i);
    const cap = M4.CAPITULOS[i], paso = cap.pasos[j];
    root.querySelectorAll('.paso').forEach(p => p.classList.toggle('activo', p.dataset.i == i && p.dataset.j == j));
    wrap.querySelector('#smCap').textContent = `${num(i)} · ${cap.kicker}`;
    const t = ++turno;
    // Pequeña espera: si se baja rápido y se saltean pasos, solo se dibuja el último.
    cola = cola.then(() => new Promise(r => setTimeout(r, 90))).then(async () => { if (t !== turno) return; await G.conjunto(paso.capas); if (t === turno) leyenda(paso); }).catch(console.error);
  }

  function marcarCapitulo(i) {
    root.querySelectorAll('.sm-puntos a').forEach((a, k) => a.classList.toggle('on', k === i));
    const h = i >= 0 ? `#/storymap/${i + 1}` : '#/storymap';
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  function graficos() {
    root.querySelectorAll('[data-g]').forEach(el => {
      const g = el.dataset.g;
      if (g === 'perfil') M4.perfil(el, map, 'L01');
      else if (g === 'matriz') M4.matriz(3, false).then(h => el.innerHTML = `<div class="gtit">Matriz de alternativas (columna resaltada: A3, la elegida)</div>${h}`);
      else if (M4.GRAFICOS[g]) M4.GRAFICOS[g](el);
    });
  }

  function irA(i) {
    const el = i < 0 ? root.querySelector('#sm-top') : root.querySelector('#cap-' + (i + 1));
    if (el) root.scrollTo({ top: el.offsetTop, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  M4.storymap = {
    async abrir(n) {
      root = document.getElementById('view-storymap');
      if (!iniciado) {
        iniciado = true; root.innerHTML = plantilla();
        wrap = document.createElement('div'); wrap.className = 'inm-mapa';
        wrap.innerHTML = '<div id="smMap"></div><div class="sm-cap" id="smCap"></div><div class="sm-leyenda" id="smLeyenda" aria-live="polite"></div>';
        root.querySelector('.inmersivo .inm-slot').appendChild(wrap);
        const movil = window.matchMedia('(max-width: 900px)').matches;
        map = M4.crearMapa(wrap.querySelector('#smMap'), { scrollWheelZoom: false, dragging: !movil, tap: false, touchZoom: !movil, doubleClickZoom: !movil, minZoom: 7 });
        L.control.zoom({ position: 'topright' }).addTo(map); L.control.scale({ metric: true, imperial: false, position: 'bottomright', maxWidth: 110 }).addTo(map);
        G = new M4.Gestor(map, { alClic: (e) => {
          const r = G.identificar(e.latlng)[0]; if (!r) return; const f = r.features[0], s = r.capa.spec;
          L.popup({ maxWidth: 280 }).setLatLng(e.latlng).setContent(`<div class="pp"><b>${esc(s.titulo ? s.titulo(f.properties) : s.nombre)}</b>${s.campos.slice(0, 4).map(([k, l, t, d]) => `<div><span class="muted">${esc(l)}:</span> ${t === 'num' ? M4.fmt(f.properties[k], d || 0) : esc(f.properties[k])}</div>`).join('')}<div class="muted small" style="margin-top:4px">Más detalle en el visor GIS.</div></div>`).openOn(map); } });
        graficos();

        // Pasos: el que cruza la franja media de la pantalla manda.
        const obsPaso = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) irPaso(+en.target.dataset.i, +en.target.dataset.j); }), { root, rootMargin: esMovil() ? '-62% 0px -30% 0px' : '-45% 0px -45% 0px' });
        root.querySelectorAll('.paso').forEach(p => obsPaso.observe(p));
        // Apenas una sección inmersiva asoma, el mapa ya está ahí con su primer paso.
        const obsInm = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting && pasoActual?.split(':')[0] != en.target.dataset.i) irPaso(+en.target.dataset.i, 0); }), { root, rootMargin: '0px 0px -20% 0px' });
        root.querySelectorAll('.inmersivo').forEach(s => obsInm.observe(s));
        // Capítulo activo (puntos laterales y dirección de la página).
        const obsCap = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) marcarCapitulo(+en.target.dataset.i); }), { root, rootMargin: '-50% 0px -50% 0px' });
        root.querySelectorAll('.capitulo').forEach(s => obsCap.observe(s));
        const obsTop = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) marcarCapitulo(-1); }), { root, rootMargin: '-50% 0px -50% 0px' });
        obsTop.observe(root.querySelector('.sm-presenta')); obsTop.observe(root.querySelector('#sm-top'));
        // Barra de progreso
        const barra = root.querySelector('#smBarra');
        // La barra de progreso se actualiza una vez por cuadro, no en cada evento de scroll.
        let pendiente = false, pasado = false;
        root.addEventListener('scroll', () => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false;
          const p = root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight); barra.style.transform = `scaleX(${p.toFixed(4)})`;
          const ps = root.scrollTop > root.clientHeight * .8; if (ps !== pasado) { pasado = ps; root.classList.toggle('pasado', ps); } }); }, { passive: true });
        root.addEventListener('click', (e) => { const a = e.target.closest('[data-ir]'); if (!a) return; e.preventDefault(); irA(+a.dataset.ir); });
        irPaso(0, 0);
        // Precarga en segundo plano de los datos de toda la historia, para que no se lean recién al llegar a cada capítulo.
        const ids = new Set(); M4.CAPITULOS.forEach(c => c.pasos.forEach(p => p.capas.forEach(x => ids.add(typeof x === 'string' ? x : x.id))));
        const cola2 = [...ids].map(id => M4.CAT[id]).filter(sp => sp && sp.carga && sp.tipo !== 'raster');
        const ocio = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 200));
        const siguiente = () => { const sp = cola2.shift(); if (!sp) return; sp.carga().catch(() => {}).finally(() => ocio(siguiente)); };
        ocio(siguiente);
      }
      setTimeout(() => map.invalidateSize(), 60);
      if (n) { const el = root.querySelector('#cap-' + Math.max(1, Math.min(M4.CAPITULOS.length, n))); if (el) root.scrollTop = el.offsetTop; }
    }
  };
})(window.M4);
