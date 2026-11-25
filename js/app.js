/* Arranque y navegación: la Historia (StoryMap, portada de la plataforma), el Visor GIS y Acerca. */
(function (M4) {
  'use strict';
  const vistas = ['storymap', 'visor', 'acerca'];

  function acerca() { const el = document.getElementById('view-acerca'); if (el.dataset.ok) return; el.dataset.ok = 1; el.innerHTML = `<div class="acerca">${M4.ACERCA}</div>`; }

  async function rutear() {
    const h = location.hash.replace(/^#\/?/, '') || 'storymap';
    const [ruta, qs] = h.split('?'); const [seccion, sub] = ruta.split('/'); const vista = vistas.includes(seccion) ? seccion : 'storymap';
    document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== 'view-' + vista);
    document.querySelectorAll('.nav a').forEach(a => { const on = a.dataset.v === vista; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    document.body.dataset.vista = vista;
    const titulos = { storymap: 'Maipú a 400 metros', visor: 'Visor GIS · Maipú a 400 metros', acerca: 'Acerca · Maipú a 400 metros' };
    document.title = titulos[vista];
    if (vista === 'acerca') acerca();
    if (vista === 'storymap') await M4.storymap.abrir(sub ? +sub : 0);
    if (vista === 'visor') await M4.visor.abrir(new URLSearchParams(qs || ''));
    if (vista === 'acerca') document.getElementById('view-' + vista).scrollTop = 0;
  }

  (async () => {
    try { await M4.cargarCifras(); } catch (e) { console.error(e); }
    window.addEventListener('hashchange', rutear);
    await rutear();
  })();
})(window.M4);
