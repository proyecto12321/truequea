/* ===================================================================
   TRUEQUEA PE · Utilidades de pantalla, listado y mapa dibujado
   Archivo: js/03-interfaz.js
   =================================================================== */

/* =====================================================================
   Interfaz: utilidades, render y eventos
   ===================================================================== */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const App = { filtros:{ q:'', cat:'', ciudad:'', cond:'', orden:'recientes' },
              fotos:[], fotoAnuncio:null, fotoYape:null, fotoLogo:null, fotoPago:null,
              fotoSolicitud:null, chat:null, puntaje:0, confirmar:null, modoAuth:'login',
              filtroVip:'', pagoTipo:'premium', pagoDatos:null, pagoArt:null, publicandoVip:false };

function avisar(msg, tipo = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast on ' + tipo;
  clearTimeout(window._t);
  window._t = setTimeout(() => t.className = 'toast', 3200);
}
function fechaTxt(iso) {
  if (!iso) return '';
  const d = new Date(iso), p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function relativo(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}
function estrellas(n) { const v = Math.round(n || 0); return '★'.repeat(v) + '☆'.repeat(5 - v); }
function foto(a) { return (a && a.fotos && a.fotos[0]) ? a.fotos[0] : SIN_FOTO; }
function avatarHTML(u, clase = 'mini-av') {
  if (!u) return `<div class="${clase}">?</div>`;
  return u.avatar ? `<div class="${clase}"><img src="${u.avatar}" alt=""></div>`
                  : `<div class="${clase}">${esc(u.nombre[0].toUpperCase())}</div>`;
}
function usuario(id) { return BD.usuarios.find(u => u.id === id); }
function reputacion(id) {
  const r = BD.resenas.filter(x => x.para === id);
  if (!r.length) return { prom: 5, total: 0 };
  return { prom: r.reduce((s, x) => s + x.puntaje, 0) / r.length, total: r.length };
}
/* Distancia real en kilómetros entre dos coordenadas (fórmula del semiverseno) */
function distanciaKm(la1, lo1, la2, lo2) {
  if ([la1, lo1, la2, lo2].some(v => typeof v !== 'number' || isNaN(v))) return null;
  const R = 6371, r = Math.PI / 180;
  const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const x = Math.sin(dLa / 2) ** 2 +
            Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function distanciaDeMi(a) {
  const u = yo();
  if (!u || !u.lat || !a.lat) return 1e9;
  const d = distanciaKm(u.lat, u.lon, a.lat, a.lon);
  return d === null ? 1e9 : d;
}
function distanciaTxt(km) {
  if (km === null || km >= 1e8) return '';
  return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`;
}
function truequesDe(id) {
  return BD.intercambios.filter(x => (x.de === id || x.para === id) && x.estado === 'completado').length;
}
function abrir(id) { $('#' + id).classList.add('on'); }
function cerrar(id) { $('#' + id).classList.remove('on'); }
function cerrarTodo() { $$('.capa').forEach(c => c.classList.remove('on')); }
function confirmar(titulo, texto, cb, etiqueta = 'Sí, continuar', extra = '') {
  $('#confTitulo').textContent = titulo;
  $('#confTexto').textContent = texto;
  $('#confSi').textContent = etiqueta;
  $('#confExtra').innerHTML = extra;
  App.confirmar = cb;
  abrir('mConfirmar');
}
/* Lee un archivo y, si es una foto, la achica antes de guardarla.
   Así la base de datos no se llena y todo viaja rápido a la nube.
   OJO: esto deja la foto como texto base64 metido en el JSON — úsalo
   solo como respaldo cuando no hay nube disponible. Para fotos que van
   a la base de datos compartida, usa subirFoto() en su lugar. */
function leerArchivo(file, cb, maxLado = 600, calidad = 0.6) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    if (!/^image\//.test(file.type || '')) return cb(fr.result);
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (w > maxLado || h > maxLado) {
          const e = maxLado / Math.max(w, h);
          w = Math.round(w * e); h = Math.round(h * e);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const chico = c.toDataURL('image/jpeg', calidad);
        cb(chico.length < fr.result.length ? chico : fr.result);
      } catch (e) { cb(fr.result); }
    };
    img.onerror = () => cb(fr.result);
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* Sube una foto a Supabase Storage y entrega un link corto (URL pública)
   en vez de meter el archivo entero (base64) dentro del JSON de la base
   de datos. Esto es lo que evita el error "almacenamiento del navegador
   lleno" y hace que subir/publicar sea rápido, porque ya no se mueve
   toda la base de datos cada vez, solo el link de la foto.
   Si por algo falla la subida (sin internet, bucket no configurado, etc.)
   cae de respaldo al modo viejo (base64) para que la app no se rompa. */
function subirFoto(file, carpeta, cb, maxLado = 1024, calidad = 0.75) {
  if (!file) return;
  if (!/^image\//.test(file.type || '')) { leerArchivo(file, cb, maxLado, calidad); return; }

  const frOriginal = new FileReader();
  frOriginal.onload = () => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (w > maxLado || h > maxLado) {
          const e = maxLado / Math.max(w, h);
          w = Math.round(w * e); h = Math.round(h * e);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(blob => {
          if (!blob || typeof subirBlobANube !== 'function') { leerArchivo(file, cb, maxLado, calidad); return; }
          subirBlobANube(blob, carpeta, url => {
            if (url) { cb(url); return; }
            // sin nube disponible: seguimos con el modo viejo para no romper la app
            const r = new FileReader();
            r.onload = () => cb(r.result);
            r.onerror = () => leerArchivo(file, cb, maxLado, calidad);
            r.readAsDataURL(blob);
          });
        }, 'image/jpeg', calidad);
      } catch (e) { leerArchivo(file, cb, maxLado, calidad); }
    };
    img.onerror = () => leerArchivo(file, cb, maxLado, calidad);
    img.src = frOriginal.result;
  };
  frOriginal.onerror = () => leerArchivo(file, cb, maxLado, calidad);
  frOriginal.readAsDataURL(file);
}
function notificar(uid, titulo, cuerpo) {
  BD.notis.unshift({ id: nuevoId(), usuario: uid, titulo, cuerpo, leida: false, creado: new Date().toISOString() });
  guardar();
}

/* La web cambia de traje: azul y naranja para todos, negro y dorado
   para las cuentas Premium. */
function aplicarPlan() {
  const u = yo();
  const pro = !!(u && u.premium);
  const antes = document.documentElement.dataset.plan;
  document.documentElement.dataset.plan = pro ? 'pro' : 'free';
  if (antes !== document.documentElement.dataset.plan) aplicarMarca();
  const nota = document.getElementById('planNota');
  if (nota) nota.textContent = pro ? '👑 Modo Premium activo' : '';
}

/* El precio del Premium sale SIEMPRE de la configuración: si el admin
   lo cambia, cambia en toda la web de una sola vez. */
function precioPro()  {
  const p = (BD && BD.config && BD.config.precioPremium != null) ? BD.config.precioPremium : 5;
  return Number(p).toFixed(2).replace(/\.00$/, '');
}
function precioProF() {
  const p = (BD && BD.config && BD.config.precioPremium != null) ? BD.config.precioPremium : 5;
  return Number(p).toFixed(2);
}

/* ---------------- tema y marca ---------------- */
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;
  BD.config.tema = t; guardar();
}
function aplicarMarca() {
  const c = BD.config;
  const logo = c.logo || LOGO_DEFECTO;
  $('#logoNav').src = logo; $('#logoPie').src = logo; $('#logoAuth').src = logo;
  const partes = (c.nombre || 'Truequea PE').split(' ');
  const html = partes.length > 1
    ? `${esc(partes.slice(0, -1).join(' '))}<b>${esc(partes.at(-1))}</b>` : esc(c.nombre);
  $('#nombreNav').innerHTML = html; $('#nombrePie').innerHTML = html;
  $('#cinta').textContent = c.lema || '';
  /* el color elegido manda en la cuenta gratis; en Premium manda el dorado */
  if (document.documentElement.dataset.plan === 'pro') {
    document.documentElement.style.removeProperty('--azul');
  } else if (/^#[0-9a-f]{6}$/i.test(c.color || '')) {
    document.documentElement.style.setProperty('--azul', c.color);
  }
  document.title = (c.nombre || 'Truequea PE') + ' — Intercambia lo que tienes por lo que necesitas';
  $('#patronPortada').style.backgroundImage = `url("${PATRON}")`;
  $('#ilusPortada').style.backgroundImage = `url("${ILUSTRACION}")`;
}

/* ---------------- navegación ---------------- */
function irA(v) {
  $$('.vista').forEach(x => x.classList.remove('on'));
  $('#v-' + v)?.classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (v === 'admin')   pintarAdmin();
  if (v === 'cuenta')  pintarCuenta();
  if (v === 'premium') pintarPremium();
}
function irListado() { $('#listado').scrollIntoView({ behavior: 'smooth' }); }

/* ---------------- barra superior ---------------- */
function pintarNav() {
  const u = yo(), cont = $('#navDer');
  aplicarPlan();
  if (!u) {
    cont.innerHTML = `<button class="btn suave sm" data-accion="publicar">Publicar</button>
      <button class="btn pri sm" data-accion="entrar">Entrar</button>`;
    return;
  }
  const noLeidas = BD.notis.filter(n => n.usuario === u.id && !n.leida).length;
  const msgs = BD.mensajes.filter(m => {
    const c = BD.chats.find(x => x.id === m.chat);
    return c && c.usuarios.includes(u.id) && m.de !== u.id && !m.leido;
  }).length;
  const props = BD.intercambios.filter(x => x.para === u.id && x.estado === 'pendiente').length;
  const rep = reputacion(u.id);

  cont.innerHTML = `
    <button class="btn pri sm" data-accion="publicar">+ Publicar</button>
    <button class="ico-btn" data-accion="mensajes" title="Mensajes">💬${msgs ? `<span class="globo">${msgs}</span>` : ''}</button>
    <button class="ico-btn" data-accion="notis" title="Notificaciones">🔔${noLeidas ? `<span class="globo">${noLeidas}</span>` : ''}</button>
    <div class="menu">
      <div class="avatar ${u.premium ? 'pro' : ''}" data-accion="menu">${u.avatar ? `<img src="${u.avatar}" alt="">` : esc(u.nombre[0].toUpperCase())}</div>
      <div class="menu-caja" id="menuCaja">
        <div class="menu-cab">
          <b>${esc(u.nombre)} ${u.premium ? `<span class="pro-badge">👑 ${esc(nivelPro(u).nombre)}</span>` : ''}</b>
          <small>${esc(u.email)}</small>
          <div class="estrellas" style="margin-top:4px">${estrellas(rep.prom)}
            <span class="n">${rep.prom.toFixed(1)} · ${truequesDe(u.id)} trueques</span></div>
        </div>
        <button data-ir="cuenta">📦 Mi cuenta ${props ? `<span class="mini-glob">${props}</span>` : ''}</button>
        <button data-accion="mensajes">💬 Mis mensajes</button>
        ${!u.premium ? `<button data-accion="premium">👑 Hazte Premium — S/ ${precioPro()}</button>` : ''}
        ${u.rol === 'admin' ? '<button data-ir="admin">🛠️ Administración</button>' : ''}
        <button data-accion="tema">🌗 Cambiar tema</button>
        <button class="rojo" data-accion="salir">↪ Cerrar sesión</button>
      </div>
    </div>`;
}

/* ---------------- categorías ---------------- */
function pintarCategorias() {
  $('#categorias').innerHTML = CATEGORIAS.map((c, i) => {
    const n = BD.articulos.filter(a => a.categoria === i + 1 && a.estado === 'disponible').length;
    return `<button class="cat" data-cat="${i + 1}" aria-pressed="${App.filtros.cat == i + 1}">
      <span class="emo">${c[1]}</span><span class="nom">${c[0]}</span>
      <span class="num">${n} artículo${n === 1 ? '' : 's'}</span></button>`;
  }).join('');
  const ops = CATEGORIAS.map((c, i) => `<option value="${i + 1}">${c[1]} ${c[0]}</option>`).join('');
  $('#fCat').innerHTML = '<option value="">Todas</option>' + ops;
  $('#fCat').value = App.filtros.cat;
  $('#pubCat').innerHTML = '<option value="">Elige una categoría</option>' + ops;
  flechasCat();
}
function flechasCat() {
  const c = $('#categorias');
  if (!c) return;
  const max = c.scrollWidth - c.clientWidth - 4;
  $('#catIzq').disabled = c.scrollLeft <= 2;
  $('#catDer').disabled = c.scrollLeft >= max;
}
function pintarCiudades() {
  const ops = LISTA_CIUDADES.map(c => `<option value="${c}">${c}</option>`).join('');
  $('#fCiudad').innerHTML = '<option value="">Todas</option>' + ops;
  ['#pubCiudad', '#aCiudad', '#gCiudad', '#pfCiudad', '#nuCiudad', '#exCiudad']
    .forEach(s => { if ($(s)) $(s).innerHTML = ops; });
}

/* ---------------- listado ---------------- */
function filtrar() {
  vencerImpulsos();
  let l = BD.articulos.filter(a => a.estado !== 'oculto' && !a.vip);
  const f = App.filtros;
  if (f.q) {
    const q = f.q.toLowerCase();
    l = l.filter(a => (a.titulo + ' ' + a.busca + ' ' + a.ciudad + ' ' + (a.desc || '')).toLowerCase().includes(q));
  }
  if (f.cat)    l = l.filter(a => a.categoria == f.cat);
  if (f.ciudad) l = l.filter(a => a.ciudad === f.ciudad);
  if (f.cond)   l = l.filter(a => a.condicion === f.cond);

  const rep = a => reputacion(a.usuario).prom;
  const ord = {
    recientes: (a, b) => new Date(b.creado) - new Date(a.creado),
    antiguos:  (a, b) => new Date(a.creado) - new Date(b.creado),
    reputacion:(a, b) => rep(b) - rep(a),
    cerca:     (a, b) => distanciaDeMi(a) - distanciaDeMi(b),
  }[f.orden] || ((a, b) => new Date(b.creado) - new Date(a.creado));
  /* orden: 1) el número uno del Super VIP  2) lo impulsado (pagado)
            3) lo destacado del Premium      4) lo que elija la persona */
  const uno = x => (x.numeroUno && new Date(x.numeroUno.hasta) > new Date()) ? 1 : 0;
  return l.sort((a, b) =>
    uno(b) - uno(a) ||
    (impulsoActivo(b) ? 1 : 0) - (impulsoActivo(a) ? 1 : 0) ||
    (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || ord(a, b));
}

function tarjeta(a, candado = false) {
  const d = usuario(a.usuario), r = reputacion(a.usuario);
  const u = yo();
  const fav = u && BD.favoritos.some(f => f.usuario === u.id && f.articulo === a.id);
  const res = reservaActiva(a);
  const imp = impulsoActivo(a);
  const bloq = bloqueadoPorReserva(a, u);
  const esUno = a.numeroUno && new Date(a.numeroUno.hasta) > new Date();
  const sello = esUno ? '<span class="sello uno">🥇 N.º 1 en tendencia</span>'
    : imp ? '<span class="sello azulf">🚀 Impulsado</span>'
    : res ? '<span class="sello mora">🔒 Apartado por Premium</span>'
    : a.destacado ? '<span class="sello oro">⭐ Destacado</span>'
    : a.estado === 'intercambiado' ? '<span class="sello verde">✓ Intercambiado</span>' : '';
  const km = u && u.lat && a.lat ? distanciaTxt(distanciaKm(u.lat, u.lon, a.lat, a.lon)) : '';
  const conf = confianza(d);
  return `<article class="art ${bloq ? 'bloqueada' : ''} ${a.vip ? 'esvip' : ''} ${esUno ? 'esuno' : ''}" data-art="${a.id}">
    <div class="art-foto">
      <img src="${foto(a)}" alt="${esc(a.titulo)}" loading="lazy">
      ${sello}
      ${a.vip ? `<span class="sello vip">💎 VIP</span>` : ''}
      ${candado ? `<div class="capa-candado"><span>🔒</span><b>Solo Premium</b></div>` : ''}
      ${u && !candado ? `<button class="fav ${fav ? 'on' : ''}" data-fav="${a.id}" aria-label="Favorito">${fav ? '❤️' : '🤍'}</button>` : ''}
    </div>
    <div class="art-cuerpo">
      <span class="art-cat">${a.vip ? '💎 ' + esc(a.vip) : CATEGORIAS[a.categoria - 1][1] + ' ' + CATEGORIAS[a.categoria - 1][0]}</span>
      <h3 class="art-tit">${esc(a.titulo)}</h3>
      <p class="art-dato">🔁 ${esc(a.busca)}</p>
      <p class="art-dato">📍 ${esc(a.ciudad)}${km ? ' · ' + km : ''} · ${CONDICIONES[a.condicion]}</p>
      <p class="art-dato">🕓 ${fechaTxt(a.creado)}</p>
      ${res ? `<p class="art-dato blo">🔒 Apartado · quedan ${restanteTxt(res.hasta)}</p>` : ''}
      ${(a.favs || 0) ? `<p class="art-dato">❤️ ${a.favs} interesado${a.favs === 1 ? '' : 's'}</p>` : ''}
      <div class="art-pie">
        <span class="mini-user" title="${esc(conf.etiqueta)}">${avatarHTML(d)}${esc(d ? d.nombre : '—')}${d && d.premium ? ' 👑' : ''}
          <i class="punto ${conf.nivel}"></i></span>
        <span class="estrellas">${estrellas(r.prom)}<span class="n">${r.prom.toFixed(1)}</span></span>
      </div>
    </div></article>`;
}

function tarjetaAnuncio(ad) {
  return `<article class="anuncio" data-anuncio="${ad.id}" tabindex="0">
    <div class="cara">
      <div class="anuncio-foto">
        <img src="${ad.img || SIN_FOTO}" alt="${esc(ad.titulo)}" loading="lazy">
        <div class="anuncio-brillo"></div>
      </div>
      <div class="anuncio-cuerpo">
        <span class="marca-pub">PUBLICIDAD</span>
        <h4>${esc(ad.titulo)}</h4>
        <p>${esc(ad.desc)}</p>
        ${ad.tel ? `<p style="font-size:13px;margin-top:7px;font-weight:700">📞 ${esc(ad.tel)}</p>` : ''}
        <p style="font-size:12px;margin-top:8px;color:var(--sub)">Toca para ver la información 👆</p>
      </div>
    </div></article>`;
}

/* Solo salen al público los anuncios aprobados y activos */
function anunciosPublicos() {
  return BD.anuncios.filter(a => a.activo && a.estado === 'aprobado');
}

/* --- Sección "Anúnciate en TRUEQUEA.PE" --- */
function pintarVitrina() {
  const ads = anunciosPublicos();
  const hueco = `<div class="hueco-pub" data-accion="anunciate">
      <span class="em">📣</span><b>Tu anuncio puede ir aquí</b>
      <span>Toca para dejar tus datos</span></div>`;
  $('#vitrinaPub').innerHTML = ads.length
    ? ads.slice(0, 7).map(tarjetaAnuncio).join('') + hueco
    : `<div class="vitrina-vacia">Todavía no hay anuncios publicados.<br>
        <b>Este espacio puede ser el de tu negocio.</b></div>` + hueco;
  activar3D();
  pintarContacto();
}
function pintarContacto() {
  const c = BD.config.contacto || {};
  const tel = String(c.telefono || '').replace(/\D/g, '');
  const wa = tel.length >= 9 ? linkWA(tel, `Hola ${c.nombre || ''}, quiero publicar un anuncio en Truequea PE.`)
                             : (c.wa || 'https://wa.me/qr/Z6T6N7FJTXCNH1');
  $('#contactoCaja').innerHTML = `
    <div class="sello-marca">📣</div>
    <div class="quien">
      <h3>${esc(c.nombre || 'Angel Levano')}</h3>
      <p class="cargo">${esc(c.cargo || 'Administrador de Truequea PE')}</p>
      <div class="contacto-datos">
        ${c.telefono ? `<a href="tel:${esc(String(c.telefono).replace(/\s/g, ''))}">📞 ${esc(c.telefono)}</a>` : ''}
        ${c.email ? `<a href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>` : ''}
        ${c.horario ? `<span>🕓 ${esc(c.horario)}</span>` : ''}
      </div>
      ${c.texto ? `<p style="font-size:14px;color:var(--sub);margin-top:12px;max-width:430px">${esc(c.texto)}</p>` : ''}
    </div>
    <div class="contacto-acc">
      <a class="wa" target="_blank" rel="noopener" href="${esc(wa)}">💬 Escribir por WhatsApp</a>
      <button class="btn pri" data-accion="anunciate">📣 Quiero mi anuncio aquí</button>
    </div>`;
}

function pintarLista() {
  liberarReservas();
  const l = filtrar(), u = yo();
  $('#conteo').textContent = `${l.length} ${l.length === 1 ? 'artículo' : 'artículos'}`;
  pintarChips();

  const cont = $('#lista');
  if (!l.length) {
    cont.innerHTML = `<div class="vacio"><div class="em">🔍</div><p>No hay artículos con esos filtros.</p>
      <button class="btn suave sm" style="margin-top:12px" onclick="limpiarFiltros()">Quitar filtros</button></div>`;
    return;
  }
  // los usuarios Premium no ven publicidad
  const ads = (u && u.premium) ? [] : anunciosPublicos().filter(a => !a.destacado);
  let html = '', k = 0;
  l.forEach((a, i) => {
    html += tarjeta(a);
    if ((i + 1) % 4 === 0 && ads.length) { html += tarjetaAnuncio(ads[k % ads.length]); k++; }
  });
  cont.innerHTML = html;
  activar3D();

  const dest = (u && u.premium) ? null : anunciosPublicos().find(a => a.destacado);
  $('#bannerPub').innerHTML = dest ? `
    <div class="banner-pub" data-anuncio="${dest.id}">
      <img src="${dest.img || SIN_FOTO}" alt="">
      <div style="flex:1;min-width:200px">
        <span class="marca-pub">PUBLICIDAD</span>
        <h3>${esc(dest.titulo)}</h3><p>${esc(dest.desc)}</p>
      </div>
      ${dest.wa ? `<span class="wa">💬 WhatsApp</span>` : ''}
    </div>` : '';
  if (dest) { dest.vistas = (dest.vistas || 0) + 1; guardar(); }
  pintarVitrina();
  pintarVip();
  pintarRanking();
  if (typeof mapaRealInicio === 'function') mapaRealInicio();
}

/* efecto 3D de los anuncios al mover el mouse */
function activar3D() {
  $$('.anuncio').forEach(el => {
    const cara = el.querySelector('.cara');
    const brillo = el.querySelector('.anuncio-brillo');
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cara.style.transform = `rotateY(${(px - .5) * 16}deg) rotateX(${(.5 - py) * 16}deg) scale(1.02)`;
      if (brillo) { brillo.style.setProperty('--bx', px * 100 + '%'); brillo.style.setProperty('--by', py * 100 + '%'); }
    });
    el.addEventListener('mouseleave', () => { cara.style.transform = ''; });
  });
}

function pintarChips() {
  const f = App.filtros, chips = [];
  if (f.q)      chips.push(['q', '🔍 ' + f.q]);
  if (f.cat)    chips.push(['cat', CATEGORIAS[f.cat - 1][1] + ' ' + CATEGORIAS[f.cat - 1][0]]);
  if (f.ciudad) chips.push(['ciudad', '📍 ' + f.ciudad]);
  if (f.cond)   chips.push(['cond', CONDICIONES[f.cond]]);
  $('#chips').innerHTML = chips.map(([k, t]) =>
    `<span class="chip">${esc(t)}<button data-quitar="${k}">✕</button></span>`).join('');
}
function limpiarFiltros() {
  App.filtros = { q:'', cat:'', ciudad:'', cond:'', orden:'recientes' };
  $('#buscador').value = ''; $('#fCat').value = ''; $('#fCiudad').value = '';
  $('#fCond').value = ''; $('#fOrden').value = 'recientes';
  pintarCategorias(); pintarLista(); pintarMapa();
}

/* ---------------- MAPA ---------------- */
const MAPA = { w:800, h:420, minLat:-14.95, maxLat:-11.95, minLon:-77.25, maxLon:-74.85 };

/* El mapa se acerca solo a la zona donde hay artículos */
function calcularZoom(puntos) {
  if (!puntos.length) { Object.assign(MAPA, { minLat:-14.4, maxLat:-13.2, minLon:-76.5, maxLon:-75.5 }); return; }
  let minLa = 90, maxLa = -90, minLo = 180, maxLo = -180;
  puntos.forEach(p => {
    minLa = Math.min(minLa, p.lat); maxLa = Math.max(maxLa, p.lat);
    minLo = Math.min(minLo, p.lon); maxLo = Math.max(maxLo, p.lon);
  });
  // margen mínimo para que un solo punto no quede pegado al borde
  const mLa = Math.max((maxLa - minLa) * 0.35, 0.14);
  const mLo = Math.max((maxLo - minLo) * 0.25, 0.22);
  minLa -= mLa; maxLa += mLa; minLo -= mLo; maxLo += mLo;
  // respetar la proporción del lienzo para que no se deforme
  const propLienzo = MAPA.w / MAPA.h;
  const anchoLo = maxLo - minLo, altoLa = maxLa - minLa;
  if (anchoLo / altoLa < propLienzo) {
    const nuevo = altoLa * propLienzo, c = (minLo + maxLo) / 2;
    minLo = c - nuevo / 2; maxLo = c + nuevo / 2;
  } else {
    const nuevo = anchoLo / propLienzo, c = (minLa + maxLa) / 2;
    minLa = c - nuevo / 2; maxLa = c + nuevo / 2;
  }
  Object.assign(MAPA, { minLat: minLa, maxLat: maxLa, minLon: minLo, maxLon: maxLo });
}
function proyectar(lat, lon) {
  const x = ((lon - MAPA.minLon) / (MAPA.maxLon - MAPA.minLon)) * MAPA.w;
  const y = ((MAPA.maxLat - lat) / (MAPA.maxLat - MAPA.minLat)) * MAPA.h;
  return [x, y];
}
function dentro(x, y) { return x > -30 && x < MAPA.w + 30 && y > -30 && y < MAPA.h + 30; }

function pintarMapa() {
  const svg = $('#mapa');
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  const tierra = oscuro ? '#1b2534' : '#eef4ea';
  const tierra2= oscuro ? '#141d2a' : '#dfeada';
  const mar    = oscuro ? '#0d1826' : '#bfe0f5';
  const mar2   = oscuro ? '#091220' : '#dff0fb';
  const linea  = oscuro ? '#33415a' : '#b6cdb1';
  const texto  = oscuro ? '#93a0b5' : '#5c6b7a';

  const u = yo();
  const arts = filtrar().filter(a => a.estado !== 'oculto' && a.lat && a.lon);
  const puntos = [...arts];
  if (u && u.lat) puntos.push({ lat: u.lat, lon: u.lon });
  calcularZoom(puntos);

  // costa aproximada del litoral (Lima sur → Nasca)
  const costa = [[-11.95,-77.15],[-12.20,-77.10],[-12.60,-76.85],[-13.10,-76.55],
                 [-13.45,-76.30],[-13.75,-76.28],[-14.10,-76.10],[-14.50,-75.90],
                 [-14.95,-75.55]].map(c => proyectar(c[0], c[1]));
  const linCosta = costa.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');

  let capas = `
    <defs>
      <radialGradient id="gMar" cx="30%" cy="20%" r="90%">
        <stop offset="0%" stop-color="${mar2}"/><stop offset="100%" stop-color="${mar}"/>
      </radialGradient>
      <linearGradient id="gTierra" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${tierra}"/><stop offset="100%" stop-color="${tierra2}"/>
      </linearGradient>
      <filter id="sombraPin" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".35"/>
      </filter>
      <radialGradient id="gYo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0a5fc4" stop-opacity=".5"/>
        <stop offset="100%" stop-color="#0a5fc4" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${MAPA.w}" height="${MAPA.h}" fill="url(#gMar)"/>
    <path d="${linCosta} L${MAPA.w + 200},${MAPA.h + 200} L${MAPA.w + 200},-200 Z" fill="url(#gTierra)"/>
    <path d="${linCosta}" fill="none" stroke="${linea}" stroke-width="2.5"/>
    <g opacity="${oscuro ? .1 : .14}" stroke="${linea}" stroke-width="1">
      ${[...Array(9)].map((_, i) => `<line x1="0" y1="${i * 52}" x2="${MAPA.w}" y2="${i * 52}"/>`).join('')}
      ${[...Array(12)].map((_, i) => `<line x1="${i * 70}" y1="0" x2="${i * 70}" y2="${MAPA.h}"/>`).join('')}
    </g>`;

  // etiquetas de ciudad: una por zona, sin encimarse con otra etiqueta
  const puestas = [];
  capas += [...new Set(arts.map(a => a.ciudad))].map(c => {
    if (!CIUDADES[c]) return '';
    let [x, y] = proyectar(CIUDADES[c][0], CIUDADES[c][1]);
    y = Math.min(Math.max(y + 34, 18), MAPA.h - 10);   // debajo del pin, dentro del lienzo
    if (!dentro(x, y)) return '';
    if (puestas.some(p => Math.hypot(p[0] - x, p[1] - y) < 62)) return '';   // ya hay una etiqueta cerca
    puestas.push([x, y]);
    return `<text x="${x}" y="${y}" font-size="12.5" font-weight="700" font-family="sans-serif"
      text-anchor="middle" fill="${texto}"
      style="paint-order:stroke;stroke:${oscuro ? '#0d1826' : '#ffffff'};stroke-width:4">${esc(c)}</text>`;
  }).join('');

  // zonas seguras
  capas += ZONAS_SEGURAS.map(z => {
    const [x, y] = proyectar(z.lat, z.lon);
    if (!dentro(x, y)) return '';
    return `<g class="pin"><circle cx="${x}" cy="${y}" r="8" fill="#12703c" opacity=".92"/>
      <text x="${x}" y="${y + 4}" font-size="9" text-anchor="middle" fill="#fff">🛡</text>
      <title>Zona segura: ${esc(z.nombre)}</title></g>`;
  }).join('');

  // artículos (separando los que caen en el mismo punto)
  const usados = [];
  capas += arts.map(a => {
    let [x, y] = proyectar(a.lat, a.lon);
    let intentos = 0;
    while (usados.some(p => Math.hypot(p[0] - x, p[1] - y) < 26) && intentos < 14) {
      const ang = intentos * 1.2, rad = 26 + intentos * 3;
      x += Math.cos(ang) * rad * .5; y += Math.sin(ang) * rad * .5; intentos++;
    }
    usados.push([x, y]);
    if (!dentro(x, y)) return '';
    const color = a.destacado ? '#d99a1f' : '#0a5fc4';
    const icono = (CATEGORIAS[a.categoria - 1] || [])[1] || '📦';
    return `<g class="pin" data-pin="${a.id}" style="cursor:pointer" filter="url(#sombraPin)"
        transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
      <path d="M0 5 C-9.5 -6.5 -12 -14.5 -6.5 -19.5 C-1 -24.5 6.5 -22.5 8.5 -16 C10.5 -9.5 6 -1 0 5 Z"
        fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="1" cy="-14.5" r="7" fill="#fff"/>
      <text x="1" y="-11.7" font-size="9.5" text-anchor="middle">${icono}</text>
      ${a.destacado ? '<text x="9" y="-19" font-size="10">⭐</text>' : ''}
      <title>${esc(a.titulo)} · ${esc(a.ciudad)}</title></g>`;
  }).join('');

  // mi ubicación
  if (u && u.lat && u.lon) {
    const [x, y] = proyectar(u.lat, u.lon);
    if (dentro(x, y)) {
      capas += `<g style="pointer-events:none">
        <circle cx="${x}" cy="${y}" r="16" fill="url(#gYo)"><animate attributeName="r" values="12;20;12"
          dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.2;.9" dur="2.2s" repeatCount="indefinite"/></circle>
        <circle cx="${x}" cy="${y}" r="6.5" fill="#0a5fc4" stroke="#fff" stroke-width="2.5"/>
        <text x="${x}" y="${y - 15}" font-size="12" font-weight="700" text-anchor="middle" fill="#0a5fc4"
          style="paint-order:stroke;stroke:${oscuro ? '#0d1826' : '#fff'};stroke-width:3.5">📍 Estás aquí</text></g>`;
    }
  }
  svg.innerHTML = capas;
}

/* =====================================================================
   MAPA AVANZADO PREMIUM
   Usa la ubicación real de cada publicación, marca la distancia
   hasta ti y deja filtrar por radio en kilómetros.
   ===================================================================== */
const MAPA_PRO = { w:800, h:520, minLat:-14.95, maxLat:-11.95, minLon:-77.25, maxLon:-74.85 };
App.radioPro = 0;

function zoomPro(puntos) {
  if (!puntos.length) { Object.assign(MAPA_PRO, { minLat:-13.55, maxLat:-13.28, minLon:-76.28, maxLon:-76.02 }); return; }
  let minLa = 90, maxLa = -90, minLo = 180, maxLo = -180;
  puntos.forEach(p => {
    minLa = Math.min(minLa, p.lat); maxLa = Math.max(maxLa, p.lat);
    minLo = Math.min(minLo, p.lon); maxLo = Math.max(maxLo, p.lon);
  });
  const mLa = Math.max((maxLa - minLa) * .3, .035);
  const mLo = Math.max((maxLo - minLo) * .22, .05);
  minLa -= mLa; maxLa += mLa; minLo -= mLo; maxLo += mLo;
  const prop = MAPA_PRO.w / MAPA_PRO.h, anLo = maxLo - minLo, alLa = maxLa - minLa;
  if (anLo / alLa < prop) { const n = alLa * prop, c = (minLo + maxLo) / 2; minLo = c - n / 2; maxLo = c + n / 2; }
  else { const n = anLo / prop, c = (minLa + maxLa) / 2; minLa = c - n / 2; maxLa = c + n / 2; }
  Object.assign(MAPA_PRO, { minLat:minLa, maxLat:maxLa, minLon:minLo, maxLon:maxLo });
}
function proyectarPro(lat, lon) {
  return [((lon - MAPA_PRO.minLon) / (MAPA_PRO.maxLon - MAPA_PRO.minLon)) * MAPA_PRO.w,
          ((MAPA_PRO.maxLat - lat) / (MAPA_PRO.maxLat - MAPA_PRO.minLat)) * MAPA_PRO.h];
}

/* Artículos que el Premium ve en su mapa, ya ordenados por cercanía */
function articulosPro() {
  const u = yo();
  if (!u) return [];
  liberarReservas();
  let l = BD.articulos.filter(a => a.estado !== 'oculto' && a.estado !== 'intercambiado'
                                && a.usuario !== u.id && a.lat && a.lon);
  l = l.map(a => ({ ...a, km: (u.lat ? distanciaKm(u.lat, u.lon, a.lat, a.lon) : null) }));
  if (App.radioPro && u.lat) l = l.filter(a => a.km !== null && a.km <= App.radioPro);
  return l.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
}

function pintarMapaPro() {
  const svg = $('#mapaPro');
  const u = yo();
  if (!svg || !u || !u.premium) return;

  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  const tierra = oscuro ? '#1b2534' : '#eef3ea';
  const mar    = oscuro ? '#0d1826' : '#cfe3f7';
  const linea  = oscuro ? '#33415a' : '#b8ccb4';
  const texto  = oscuro ? '#93a0b5' : '#5f6b7c';

  const arts = articulosPro();
  const puntos = arts.map(a => ({ lat:a.lat, lon:a.lon }));
  if (u.lat) puntos.push({ lat:u.lat, lon:u.lon });
  zoomPro(puntos);

  const costa = [[-11.95,-77.15],[-12.20,-77.10],[-12.60,-76.85],[-13.10,-76.55],
                 [-13.45,-76.30],[-13.75,-76.28],[-14.10,-76.10],[-14.50,-75.90],
                 [-14.95,-75.55]].map(c => proyectarPro(c[0], c[1]));
  const lin = costa.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');

  let capas = `<rect width="${MAPA_PRO.w}" height="${MAPA_PRO.h}" fill="${mar}"/>
    <path d="${lin} L${MAPA_PRO.w + 300},${MAPA_PRO.h + 300} L${MAPA_PRO.w + 300},-300 Z" fill="${tierra}"/>
    <path d="${lin}" fill="none" stroke="${linea}" stroke-width="2.5"/>
    <g opacity="${oscuro ? .1 : .18}" stroke="${linea}" stroke-width="1">
      ${[...Array(11)].map((_, i) => `<line x1="0" y1="${i * 52}" x2="${MAPA_PRO.w}" y2="${i * 52}"/>`).join('')}
      ${[...Array(13)].map((_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="${MAPA_PRO.h}"/>`).join('')}
    </g>`;

  /* círculos de distancia alrededor de mi ubicación */
  if (u.lat && u.lon) {
    const [cx, cy] = proyectarPro(u.lat, u.lon);
    const gradoKm = (MAPA_PRO.maxLat - MAPA_PRO.minLat) * 111;
    [1, 3, 10].forEach(km => {
      const r = (km / gradoKm) * MAPA_PRO.h;
      if (r > 12 && r < MAPA_PRO.w) {
        capas += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none"
          stroke="#7b3fe4" stroke-width="1.2" stroke-dasharray="5 6" opacity=".45"/>
          <text x="${cx}" y="${(cy - r + 13).toFixed(1)}" font-size="11" font-weight="700"
            text-anchor="middle" fill="#7b3fe4" opacity=".8">${km} km</text>`;
      }
    });
  }

  /* etiquetas de ciudad */
  const puestas = [];
  capas += [...new Set(arts.map(a => a.ciudad))].map(c => {
    if (!CIUDADES[c]) return '';
    let [x, y] = proyectarPro(CIUDADES[c][0], CIUDADES[c][1]);
    y = Math.min(Math.max(y + 36, 20), MAPA_PRO.h - 12);
    if (x < -20 || x > MAPA_PRO.w + 20) return '';
    if (puestas.some(p => Math.hypot(p[0] - x, p[1] - y) < 66)) return '';
    puestas.push([x, y]);
    return `<text x="${x}" y="${y}" font-size="12.5" font-weight="700" font-family="sans-serif"
      text-anchor="middle" fill="${texto}"
      style="paint-order:stroke;stroke:${oscuro ? '#0d1826' : '#ffffff'};stroke-width:4">${esc(c)}</text>`;
  }).join('');

  /* pines con la ubicación exacta */
  const usados = [];
  capas += arts.map(a => {
    let [x, y] = proyectarPro(a.lat, a.lon);
    let n = 0;
    while (usados.some(p => Math.hypot(p[0] - x, p[1] - y) < 24) && n < 14) {
      x += Math.cos(n * 1.2) * 13; y += Math.sin(n * 1.2) * 13; n++;
    }
    usados.push([x, y]);
    if (x < -30 || x > MAPA_PRO.w + 30 || y < -30 || y > MAPA_PRO.h + 30) return '';
    const res = reservaActiva(a);
    const mia = res && res.por === u.id;
    const color = mia ? '#d99a1f' : res ? '#8b93a5' : '#0a5fc4';
    return `<g class="pin" data-pinpro="${a.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
      <ellipse cx="0" cy="7" rx="7" ry="2.6" fill="rgba(0,0,0,.22)"/>
      <path d="M0 6 C-9 -6 -11 -13 -6 -18 C-1 -23 6 -21 8 -15 C10 -9 6 -1 0 6 Z"
        fill="${color}" stroke="#fff" stroke-width="1.8"/>
      <circle cx="1" cy="-14" r="3.6" fill="#fff"/>
      <title>${esc(a.titulo)} · ${esc(a.ciudad)}${a.km !== null ? ' · ' + distanciaTxt(a.km) : ''}</title></g>`;
  }).join('');

  /* mi punto */
  if (u.lat && u.lon) {
    const [x, y] = proyectarPro(u.lat, u.lon);
    capas += `<g><circle cx="${x}" cy="${y}" r="17" fill="#7b3fe4" opacity=".18"/>
      <circle cx="${x}" cy="${y}" r="7" fill="#7b3fe4" stroke="#fff" stroke-width="2.6"/>
      <text x="${x}" y="${y - 15}" font-size="12.5" font-weight="800" text-anchor="middle" fill="#7b3fe4"
        style="paint-order:stroke;stroke:${oscuro ? '#0d1826' : '#fff'};stroke-width:3.4">Tú</text></g>`;
  } else {
    capas += `<text x="${MAPA_PRO.w / 2}" y="26" font-size="13.5" font-weight="700" text-anchor="middle"
      fill="#7b3fe4" style="paint-order:stroke;stroke:${oscuro ? '#0d1826' : '#fff'};stroke-width:4">
      Marca tu ubicación en Mi cuenta → Perfil para ver las distancias</text>`;
  }
  svg.innerHTML = capas;
}
