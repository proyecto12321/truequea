/* ===================================================================
   TRUEQUEA PE · Todos los botones y el arranque del sistema
   Archivo: js/12-eventos.js
   =================================================================== */

/* =====================================================================
   Eventos y arranque
   ===================================================================== */

document.addEventListener('click', ev => {
  /* cerrar el menú del avatar al hacer clic fuera */
  if (!ev.target.closest('.menu')) $('#menuCaja')?.classList.remove('abierto');
  if (ev.target.classList.contains('capa') && !ev.target.dataset.obligatorio)
    ev.target.classList.remove('on');

  const t = ev.target.closest('[data-ir],[data-accion],[data-cerrar],[data-cat],[data-art],[data-fav],'
    + '[data-quitar],[data-anuncio],[data-editar],[data-borrar],[data-estado],[data-destacar],'
    + '[data-proponer],[data-chat],[data-chat-usuario],[data-abrirchat],[data-perfil],[data-resp],'
    + '[data-trueque],[data-cancelar-tq],[data-confirmar-tq],[data-encuentro],[data-calificar],'
    + '[data-foto],[data-quitarfoto],[data-info],[data-pin],[data-pago],[data-premium],[data-suspender],'
    + '[data-borraruser],[data-anpausa],[data-anborrar],[data-vercaptura],'
    + '[data-interes],[data-reservar],[data-soltar],[data-anaprobar],[data-frase],[data-pinpro],'
    + '[data-verfoto],[data-abrirwa],[data-vipcat],[data-interesados],[data-impulsar],[data-analizar],'
    + '[data-seguro],[data-pagarseguro],[data-verificarseg],[data-deseoedit],[data-deseopausa],'
    + '[data-deseoborrar],[data-impulsogratis],[data-bottema],[data-restaurar],'
    + '[data-rol],[data-clave],[data-numerouno],[data-quitaruno],[data-copiarclave],[data-atenderclave]');
  if (!t) return;
  const d = t.dataset;
  const u = yo();

  try {
    if (d.ir) irA(d.ir);
    if (d.cerrar !== undefined) t.closest('.capa').classList.remove('on');

    /* ---- acciones generales ---- */
    if (d.accion === 'entrar')   abrirAuth('login');
    if (d.accion === 'publicar') abrirPublicar();
    if (d.accion === 'menu')     { ev.stopPropagation(); $('#menuCaja').classList.toggle('abierto'); }
    if (d.accion === 'mensajes') listaChats();
    if (d.accion === 'premium')  irA('premium');
    if (d.accion === 'tema') aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
    if (d.accion === 'anunciate') { cerrarTodo(); abrir('mAnunciate'); }
    if (d.accion === 'nuevo-deseo') abrirDeseo();
    if (d.accion === 'asistente') abrirBot();
    if (d.accion === 'musica') abrirMusica();
    if (d.accion === 'voz') escucharVoz();
    if (d.bottema && d.bottema.startsWith('m_')) {
      const ordenes = { m_play:'reproduce musica', m_sig:'siguiente',
                        m_para:'para la musica', m_amb:'pon el ambiente' };
      const txt = ordenes[d.bottema];
      botDecir('yo', esc(txt));
      setTimeout(() => {
        botDecir('bot', ordenMusical(txt) || 'No pude con eso.');
        botChips(chipsMusica());
      }, 200);
      return;
    }
    if (d.bottema) {
      const tema = BOT_TEMAS.find(x => x.clave === d.bottema);
      if (tema) {
        botDecir('yo', esc(tema.chip));
        setTimeout(() => {
          botDecir('bot', tema.dice());
          botChips(BOT_TEMAS.filter(x => x.clave !== tema.clave).slice(0, 4));
        }, 220);
      }
    }
    if (d.restaurar !== undefined) restaurarCopia(Number(d.restaurar));
    if (d.rol) { const [id, r] = d.rol.split('|'); cambiarRol(id, r); }
    if (d.clave) {
      const us = BD.usuarios.find(x => String(x.id) === String(d.clave));
      if (us) {
        $('#claveId').value = us.id;
        $('#claveNombre').textContent = us.nombre;
        $('#claveNueva').value = '';
        $('#claveResultado').innerHTML = '';
        abrir('mClave');
      }
    }
    if (d.accion === 'usar-impulso') usarImpulsoGratis();
    if (d.impulsogratis) aplicarImpulsoGratis(d.impulsogratis);
    if (d.accion === 'publicar-vip') { App.publicandoVip = true; abrirPublicar(); }
    if (d.numerouno)  ponerNumeroUno(d.numerouno);
    if (d.quitaruno)  quitarNumeroUno(d.quitaruno);
    if (d.accion === 'pagar-premium') {
      abrirPagoYape('premium', BD.config.precioPremium, 'Activar Premium',
        'Sube la captura del Yape y el administrador activará tu cuenta Premium.');
    }
    if (d.accion === 'vertodos-anuncios') $('#anunciate').scrollIntoView({ behavior:'smooth' });
    if (d.accion === 'salir') {
      salir(); pintarNav(); irA('inicio'); pintarLista(); avisar('Sesión cerrada');
    }
    if (d.accion === 'notis') {
      if (!u) return abrirAuth('login');
      const mias = BD.notis.filter(n => n.usuario === u.id);
      $('#listaNotis').innerHTML = mias.length ? mias.map(n => `
        <div class="fila" style="${n.leida ? '' : 'border-color:var(--azul)'}">
          <div class="fila-info"><b>${esc(n.titulo)}</b><span>${esc(n.cuerpo)}</span>
          <span style="font-size:12px">${fechaTxt(n.creado)}</span></div>
          ${n.wa ? `<div class="fila-acc"><a class="wa" target="_blank" rel="noopener"
            href="${esc(n.wa)}">💬 WhatsApp</a></div>` : ''}</div>`).join('')
        : `<div class="vacio"><div class="em">🔔</div><p>No tienes notificaciones.</p></div>`;
      mias.forEach(n => n.leida = true); guardar();
      abrir('mNotis'); pintarNav();
    }

    /* ---- catálogo ---- */
    if (d.cat) {
      App.filtros.cat = App.filtros.cat == d.cat ? '' : d.cat;
      pintarCategorias(); pintarLista(); pintarMapa(); irListado();
    }
    if (d.quitar) {
      App.filtros[d.quitar] = '';
      $('#buscador').value = App.filtros.q;
      $('#fCat').value = App.filtros.cat; $('#fCiudad').value = App.filtros.ciudad;
      $('#fCond').value = App.filtros.cond;
      pintarCategorias(); pintarLista(); pintarMapa();
    }
    if (d.art && !d.fav) verArticulo(d.art);
    if (d.pin) verArticulo(d.pin);
    if (d.fav) {
      ev.stopPropagation();
      if (!u) { abrirAuth('login'); return avisar('Entra para guardar favoritos'); }
      const i = BD.favoritos.findIndex(f => f.usuario === u.id && f.articulo == d.fav);
      if (i >= 0) { BD.favoritos.splice(i, 1); avisar('Quitado de favoritos'); }
      else { BD.favoritos.push({ usuario: u.id, articulo: Number(d.fav) }); avisar('Guardado en favoritos', 'ok'); }
      guardar(); pintarLista(); pintarCuenta();
    }
    if (d.foto) {
      const a = BD.articulos.find(x => x.id == $('#ficha').querySelector('[data-proponer],[data-editar]')?.dataset.proponer);
      $('#fichaFoto').src = t.src;
      $$('.ficha-gal img').forEach(i => i.classList.toggle('on', i === t));
    }

    /* ---- anuncios ---- */
    if (d.anuncio) {
      const ad = BD.anuncios.find(a => a.id == d.anuncio);
      if (!ad) return;
      ad.clics = (ad.clics || 0) + 1; guardar();
      $('#detAnuncio').innerHTML = `
        <div style="position:relative">
          <img src="${ad.img || SIN_FOTO}" style="width:100%;aspect-ratio:16/10;object-fit:cover" alt="">
          <span class="marca-pub" style="position:absolute;top:12px;left:12px">PUBLICIDAD</span>
        </div>
        <div style="padding:20px 22px 24px">
          <h2 style="font-size:23px;margin-bottom:6px">${esc(ad.titulo)}</h2>
          <p style="color:var(--sub);margin-bottom:6px">${esc(ad.empresa || 'Anuncio')}</p>
          <p style="font-size:15px;margin-bottom:18px">${esc(ad.desc)}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${ad.tel ? `<a class="tel" href="tel:${esc(String(ad.tel).replace(/\s/g,''))}">📞 ${esc(ad.tel)}</a>` : ''}
            ${ad.wa ? `<a class="wa" target="_blank" rel="noopener" href="${esc(ad.wa)}">💬 Escribir por WhatsApp</a>` : ''}
            ${ad.web ? `<a class="btn sec" target="_blank" rel="noopener" href="${esc(ad.web)}">🌐 Ver página</a>` : ''}
          </div>
          <p class="legal" style="text-align:left;margin-top:16px">Anuncio publicado por el administrador de ${esc(BD.config.nombre)}.</p>
        </div>`;
      abrir('mAnuncio');
    }

    /* ---- artículos propios ---- */
    if (d.editar)  { cerrarTodo(); abrirPublicar(BD.articulos.find(a => a.id == d.editar)); }
    if (d.borrar) {
      confirmar('Eliminar publicación', 'Esta acción no se puede deshacer.', () => {
        BD.articulos = BD.articulos.filter(a => a.id != d.borrar); guardar();
        cerrarTodo(); avisar('Publicación eliminada', 'ok');
        pintarLista(); pintarCategorias(); pintarMapa(); pintarCuenta(); pintarAdmin();
      }, 'Sí, eliminar');
    }
    if (d.estado) {
      const [id, est] = d.estado.split('|');
      const a = BD.articulos.find(x => x.id == id); a.estado = est; guardar();
      cerrarTodo(); avisar('Estado actualizado', 'ok');
      pintarLista(); pintarMapa(); pintarCuenta();
    }
    if (d.destacar) {
      const a = BD.articulos.find(x => x.id == d.destacar);
      if (u && u.rol === 'admin') { a.destacado = !a.destacado; guardar(); avisar('Actualizado', 'ok'); pintarAdmin(); pintarLista(); }
      else if (u && u.premium) { a.destacado = true; guardar(); cerrarTodo(); avisar('Publicación destacada', 'ok'); pintarLista(); }
      else {
        cerrarTodo();
        confirmar('Destacar publicación', `Destacar es gratis con Premium (S/ ${precioPro()} al mes).`,
          () => irA('premium'), 'Ver Premium');
      }
    }

    /* ---- VIP, pedidos, análisis, impulso y seguro ---- */
    if (d.vipcat) {
      App.filtroVip = App.filtroVip === d.vipcat ? '' : d.vipcat;
      pintarVip();
    }
    if (d.interesados) verInteresados(d.interesados);
    if (d.impulsar)    abrirImpulso(d.impulsar);
    if (d.analizar)    analizarPropuesta(d.analizar);
    if (d.seguro)      abrirSeguro(d.seguro);
    if (d.pagarseguro) pedirSeguro(d.pagarseguro);
    if (d.verificarseg) {
      const s = BD.seguros.find(x => x.id == d.verificarseg);
      if (s) {
        s.estado = 'verificado'; s.verificado = new Date().toISOString();
        const x = BD.intercambios.find(i => i.id === s.intercambio);
        if (x) { if (x.seguro) x.seguro.estado = 'verificado';
          [x.de, x.para].forEach(uid => notificar(uid, '🛡️ Trueque verificado',
            'El administrador dio el visto bueno a su trueque.')); }
        guardar(); avisar('Trueque verificado ✔', 'ok'); pintarAdmin();
      }
    }
    if (d.deseoedit)   abrirDeseo(d.deseoedit);
    if (d.deseopausa) {
      const de = BD.deseos.find(x => x.id == d.deseopausa);
      de.activo = !de.activo; guardar();
      avisar(de.activo ? 'Pedido reactivado' : 'Pedido pausado', 'ok');
      pintarDeseos();
    }
    if (d.deseoborrar) {
      confirmar('Eliminar pedido', 'Dejaremos de avisarte cuando aparezca.', () => {
        BD.deseos = BD.deseos.filter(x => x.id != d.deseoborrar);
        guardar(); avisar('Pedido eliminado', 'ok'); pintarDeseos();
      }, 'Sí, eliminar');
    }

    /* ---- interés, reservas y publicidad ---- */
    if (d.pinpro) verArticulo(d.pinpro);
    if (d.interes)  marcarInteres(d.interes);
    if (d.reservar) abrirReserva(d.reservar);
    if (d.soltar) {
      confirmar('Liberar la reserva', 'La publicación vuelve a estar disponible para todos.',
        () => soltarReserva(d.soltar), 'Sí, liberar');
    }
    if (d.anaprobar) {
      const [id, si] = d.anaprobar.split('|');
      if (si === 'si') resolverAnuncio(id, true);
      else confirmar('Quitar la publicidad', 'Dejará de mostrarse en el sitio.',
        () => resolverAnuncio(id, false), 'Sí, quitarla');
    }
    if (d.copiarclave !== undefined) {
      navigator.clipboard?.writeText(d.copiarclave).then(() => avisar('Código copiado ✔', 'ok'))
        .catch(() => avisar('Selecciona el código y cópialo a mano'));
    }
    if (d.atenderclave) {
      atenderSolicitudCodigo(d.atenderclave);
      listaSolicitudesClave();
      avisar('Solicitud marcada como atendida', 'ok');
    }
    if (d.frase) { $('#chatTexto').value = d.frase; $('#chatTexto').focus(); }
    if (d.verfoto) {
      const m = BD.mensajes.find(x => x.id == d.verfoto);
      if (m && m.foto) {
        $('#infoCuerpo').innerHTML = `<h2>Foto del chat</h2>
          <img src="${m.foto}" style="width:100%;border-radius:14px" alt="Foto enviada en el chat">`;
        abrir('mInfo');
      }
    }

    /* ---- trueques ---- */
    if (d.proponer) abrirPropuesta(d.proponer);
    if (d.chat) {
      const a = BD.articulos.find(x => x.id == d.chat);
      abrirChatCon(a.usuario, a.id);
    }
    if (d.chatUsuario) { const [uid, aid] = d.chatUsuario.split('|'); abrirChatCon(Number(uid), Number(aid)); }
    if (d.abrirchat) { App.chat = Number(d.abrirchat); pintarChat(); cerrar('mMensajes'); abrir('mChat'); }
    if (d.resp) { const [id, r] = d.resp.split('|'); responderPropuesta(id, r); }
    if (d.trueque) verTrueque(d.trueque);
    if (d.confirmarTq) confirmarTrueque(d.confirmarTq);
    if (d.encuentro) {
      const x = BD.intercambios.find(i => i.id == d.encuentro);
      x.lugar = $('#tqLugar').value; x.fecha = $('#tqFecha').value; guardar();
      notificar(x.de === u.id ? x.para : x.de, 'Punto de encuentro',
        `${u.nombre} propuso: ${x.lugar || 'lugar por definir'} ${x.fecha ? '· ' + x.fecha.replace('T',' ') : ''}`);
      avisar('Encuentro guardado', 'ok');
    }
    if (d.cancelarTq) {
      confirmar('Cancelar trueque', 'Los artículos volverán a estar disponibles.', () => {
        const x = BD.intercambios.find(i => i.id == d.cancelarTq);
        x.estado = 'cancelado';
        [x.pido, x.ofrezco].filter(Boolean).forEach(id2 => {
          const a = BD.articulos.find(t2 => t2.id === id2);
          if (a && a.estado === 'reservado') a.estado = 'disponible';
        });
        guardar(); cerrarTodo(); avisar('Trueque cancelado');
        pintarCuenta(); pintarLista();
      }, 'Sí, cancelar');
    }
    if (d.calificar) {
      const x = BD.intercambios.find(i => i.id == d.calificar);
      const otro = usuario(x.de === u.id ? x.para : x.de);
      $('#calId').value = x.id;
      $('#calSub').textContent = `¿Cómo te fue con ${otro.nombre}?`;
      App.puntaje = 0; pintarEstrellas(0);
      abrir('mCalificar');
    }
    if (d.perfil) verPerfil(Number(d.perfil));
    if (d.quitarfoto !== undefined) { App.fotos.splice(Number(d.quitarfoto), 1); pintarMinis(); }
    if (d.info) {
      if (d.info === 'reiniciar') {
        confirmar('Reiniciar datos', 'Se borrarán todos los usuarios, artículos y mensajes de prueba.', () => {
          localStorage.removeItem(LLAVE); location.reload();
        }, 'Sí, reiniciar todo');
      } else {
        $('#infoCuerpo').innerHTML = TEXTOS[d.info] || '';
        abrir('mInfo');
      }
    }

    /* ---- administración ---- */
    if (d.pago) { const [id, si] = d.pago.split('|'); resolverPago(id, si === 'si'); }
    if (d.vercaptura) {
      const p = BD.pagos.find(x => x.id == d.vercaptura);
      $('#infoCuerpo').innerHTML = `<h2>Comprobante de pago</h2>
        <img src="${p.captura}" style="width:100%;border-radius:14px" alt="Comprobante">`;
      abrir('mInfo');
    }
    if (d.premium) {
      const us = usuario(Number(d.premium));
      us.premium = !us.premium;
      if (us.premium) { const h = new Date(); h.setMonth(h.getMonth() + 1); us.premiumHasta = h.toISOString(); }
      else us.premiumHasta = null;
      guardar(); avisar(us.premium ? 'Premium activado' : 'Premium retirado', 'ok');
      pintarAdmin(); pintarLista();
    }
    if (d.suspender) {
      const us = usuario(Number(d.suspender));
      us.estado = us.estado === 'activo' ? 'suspendido' : 'activo';
      guardar(); avisar('Usuario ' + us.estado, 'ok'); pintarAdmin();
    }
    if (d.borraruser) {
      const permiso = sePuedeBorrar(d.borraruser);
      if (!permiso.ok) return avisar('No se puede: ' + permiso.motivo, 'err');
      const us = BD.usuarios.find(x => String(x.id) === String(d.borraruser));
      confirmar('Eliminar usuario', `Se eliminará a ${us.nombre} con todas sus publicaciones.`, () => {
        BD.usuarios = BD.usuarios.filter(x => x.id != d.borraruser);
        BD.articulos = BD.articulos.filter(a => a.usuario != d.borraruser);
        guardar(); avisar('Usuario eliminado', 'ok');
        pintarAdmin(); pintarLista(); pintarMapa();
      }, 'Sí, eliminar');
    }
    if (d.anpausa) {
      const a = BD.anuncios.find(x => x.id == d.anpausa);
      a.activo = !a.activo; guardar(); pintarAdmin(); pintarLista();
      avisar(a.activo ? 'Anuncio activado' : 'Anuncio pausado', 'ok');
    }
    if (d.anborrar) {
      confirmar('Eliminar anuncio', '¿Seguro?', () => {
        BD.anuncios = BD.anuncios.filter(x => x.id != d.anborrar);
        guardar(); avisar('Anuncio eliminado', 'ok'); pintarAdmin(); pintarLista();
      }, 'Sí, eliminar');
    }
  } catch (err) {
    console.error(err);
    avisar('Ocurrió un problema: ' + err.message, 'err');
  }
});

/* pestañas */
document.addEventListener('click', e => {
  const p = e.target.closest('.pest');
  if (!p) return;
  const grupo = p.closest('.pestanas');
  grupo.querySelectorAll('.pest').forEach(x => x.setAttribute('aria-selected', 'false'));
  p.setAttribute('aria-selected', 'true');
  const cont = grupo.parentElement;
  cont.querySelectorAll('.panel').forEach(x => x.classList.remove('on'));
  cont.querySelector('#p-' + p.dataset.panel)?.classList.add('on');
});

/* mapa: globo al pasar el mouse */
document.addEventListener('mouseover', e => {
  const pin = e.target.closest('[data-pin],[data-pinpro]');
  const pro = pin && pin.dataset.pinpro !== undefined;
  const globo = $(pro ? '#globoPro' : '#globoMapa');
  if (!pin) {
    if (!e.target.closest('.globo-mapa')) $$('.globo-mapa').forEach(g => g.classList.remove('visible'));
    return;
  }
  const a = BD.articulos.find(x => x.id == (pro ? pin.dataset.pinpro : pin.dataset.pin));
  if (!a || !globo) return;
  const d = usuario(a.usuario), u = yo();
  const km = u && u.lat && a.lat ? distanciaTxt(distanciaKm(u.lat, u.lon, a.lat, a.lon)) : '';
  const caja = (pro ? $('#mapaPro') : $('#mapa')).getBoundingClientRect();
  const p = pin.getBoundingClientRect();
  globo.innerHTML = `<img src="${foto(a)}" alt=""><b>${esc(a.titulo)}</b>
    <small>📍 ${esc(a.ciudad)}${km ? ' · ' + km : ''} · ${esc(d ? d.nombre : '')}</small>
    ${pro ? `<small>Ubicación: ${Number(a.lat).toFixed(5)}, ${Number(a.lon).toFixed(5)}</small>` : ''}`;
  globo.style.left = Math.min(Math.max(p.left - caja.left - 100, 6), caja.width - 220) + 'px';
  globo.style.top  = Math.max(p.top - caja.top - 150, 6) + 'px';
  globo.classList.add('visible');
});

/* ---------------- formularios ---------------- */
function conectar() {
  /* auth */
  $('#formAuth').addEventListener('submit', async e => {
    e.preventDefault();
    $('#errAuth').hidden = true;
    const btn = $('#btnAuth');
    const texto = btn.textContent;
    btn.disabled = true; btn.textContent = 'Comprobando...';
    try {
      const dato = $('#aEmail').value, clave = $('#aPass').value;
      if (App.modoAuth === 'registro') {
        const r = await registrarSeguro({ nombre: $('#aNombre').value, email: dato,
                                          pass: clave, ciudad: $('#aCiudad').value });
        if (r.err) return errorAuth(r.err);
        trasEntrar(r.usuario, `¡Cuenta creada! Bienvenido, ${r.usuario.nombre}`);
        mostrarCodigo(r.usuario);
      } else {
        const r = await iniciarSesionSeguro(dato, clave);
        if (r.err) return errorAuth(r.err);
        trasEntrar(r.usuario);
      }
    } catch (err) {
      errorAuth('Ocurrió un problema: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = texto;
    }
  });
  $('#cambioAuth').addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
      App.modoAuth = App.modoAuth === 'login' ? 'registro' : 'login';
      refrescarAuth();
    }
  });
  $('#aPass').addEventListener('input', () => medir($('#aPass'), $('#medAuth')));

  /* ver / ocultar la contraseña */
  $('#ojoAuth').addEventListener('click', () => {
    const c = $('#aPass');
    c.type = c.type === 'password' ? 'text' : 'password';
    $('#ojoAuth').textContent = c.type === 'password' ? '👁️' : '🙈';
  });

  /* recuperar la cuenta con el código de respaldo */
  $('#btnOlvide').addEventListener('click', () => {
    $('#errRec').hidden = true;
    $('#recEmail').value = $('#aEmail').value;
    cerrar('mAuth'); abrir('mRecuperar');
  });
  $('#formRecuperar').addEventListener('submit', async e => {
    e.preventDefault();
    const r = await recuperarCuentaSegura($('#recEmail').value, $('#recCodigo').value, $('#recPass').value);
    if (r.err) { const c = $('#errRec'); c.textContent = r.err; c.hidden = false; return; }
    $('#formRecuperar').reset();
    trasEntrar(r.usuario, 'Clave cambiada. ¡Bienvenido de nuevo!');
    mostrarCodigo(r.usuario);    // el código anterior se quemó: este es el nuevo
  });

  /* copiar y descargar el código de respaldo */
  const copiar = txt => {
    navigator.clipboard?.writeText(txt).then(() => avisar('Copiado ✔', 'ok'))
      .catch(() => avisar('Selecciona el código y cópialo a mano'));
  };

  /* pedirle al administrador el código de respaldo, cuando tampoco se tiene */
  $('#btnNoTengoCodigo').addEventListener('click', () => {
    const caja = $('#cajaPedirCodigo');
    caja.hidden = !caja.hidden;
    if (!caja.hidden) $('#pcEmail').value = $('#recEmail').value || '';
  });
  $('#formPedirCodigo').addEventListener('submit', e => {
    e.preventDefault();
    const r = solicitarCodigoAdmin($('#pcEmail').value, $('#pcNota').value);
    const c = $('#errPedirCodigo');
    if (r.err) { c.textContent = r.err; c.hidden = false; return; }
    c.hidden = true;
    $('#formPedirCodigo').reset();
    $('#cajaPedirCodigo').hidden = true;
    avisar('Listo, tu solicitud llegó al administrador. Te escribirá con tu código.', 'ok');
  });
  $('#btnCopiarCodigo').addEventListener('click', () => copiar($('#codigoTxt').textContent));
  $('#btnBajarCodigo').addEventListener('click', () => {
    const u = yo(); if (!u) return;
    descargar('truequea-mis-datos.txt', textoAcceso(u), 'text/plain;charset=utf-8');
  });
  $('#btnCopiarMio').addEventListener('click', () => copiar($('#miCodigo').textContent));
  $('#btnBajarMio').addEventListener('click', () => {
    const u = yo(); if (!u) return;
    descargar('truequea-mis-datos.txt', textoAcceso(u), 'text/plain;charset=utf-8');
  });

  /* registro exprés */
  $('#btnExpress').addEventListener('click', abrirExpress);
  $('#formExpress').addEventListener('submit', e => { e.preventDefault(); crearExpress(); });
  $('#exPin').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('#exTel').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\d ]/g, ''); });

  /* publicar */
  $('#pubFotos').addEventListener('change', e => {
    const files = Array.from(e.target.files).slice(0, 6 - App.fotos.length);
    let pend = files.length;
    if (!pend) return;
    files.forEach(f => subirFoto(f, 'publicaciones', url => {
      App.fotos.push(url);
      if (--pend === 0) pintarMinis();
    }));
  });
  $('#formPublicar').addEventListener('submit', e => { e.preventDefault(); guardarPublicacion(); });

  /* propuesta: el semáforo se recalcula al cambiar lo que ofreces */
  $('#formPropuesta').addEventListener('submit', e => { e.preventDefault(); enviarPropuesta(); });
  $('#propOfrezco').addEventListener('change', pintarAnalisisPropuesta);

  /* pedidos "Quiero esto" */
  $('#formDeseo').addEventListener('submit', e => { e.preventDefault(); guardarDeseo(); });

  /* impulsar publicación */
  $('#formImpulso').addEventListener('submit', e => { e.preventDefault(); pedirImpulso(); });

  /* filtro de comprobantes */
  $('#filtroPagos').addEventListener('change', e => listaPagos(e.target.value));

  /* chat */
  $('#formChat').addEventListener('submit', e => {
    e.preventDefault();
    const txt = $('#chatTexto').value.trim();
    if (!txt) return;
    $('#chatTexto').value = '';
    enviarMensaje(txt, null);
  });
  /* chat Premium: enviar foto y buscar dentro de la conversación */
  $('#chatFoto').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    subirFoto(f, 'chat', url => { enviarMensaje('', url); avisar('Foto enviada', 'ok'); });
    e.target.value = '';
  });
  let tBusca;
  $('#chatBuscar').addEventListener('input', () => {
    clearTimeout(tBusca); tBusca = setTimeout(pintarChat, 220);
  });

  /* reserva Premium */
  $('#formReserva').addEventListener('submit', e => { e.preventDefault(); guardarReserva(); });

  /* solicitud de publicidad */
  $('#solImg').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) subirFoto(f, 'solicitudes', url => { App.fotoSolicitud = url; $('#zonaSol').innerHTML = `<img src="${url}" alt="">`; });
  });
  $('#formSolicitud').addEventListener('submit', e => { e.preventDefault(); enviarSolicitud(); });

  /* panel Premium: radio del mapa y avisos */
  $('#proRadio').addEventListener('change', e => {
    App.radioPro = Number(e.target.value) || 0;
    pintarPanelPro();
  });
  $('#proAvisos').addEventListener('change', e => {
    const u = yo(); if (!u) return;
    u.avisos = e.target.checked; guardar();
    avisar(u.avisos ? 'Avisos activados' : 'Avisos desactivados', 'ok');
  });

  /* calificar */
  $('#estEleg').addEventListener('click', e => {
    const b = e.target.closest('[data-v]');
    if (b) { App.puntaje = Number(b.dataset.v); pintarEstrellas(App.puntaje); }
  });
  $('#formCalificar').addEventListener('submit', e => {
    e.preventDefault();
    if (!App.puntaje) return avisar('Elige cuántas estrellas', 'err');
    const u = yo(), x = BD.intercambios.find(i => i.id == $('#calId').value);
    BD.resenas.push({ id: nuevoId(), trueque: x.id, de: u.id, para: x.de === u.id ? x.para : x.de,
      puntaje: App.puntaje, comentario: $('#calCom').value.trim(), creado: new Date().toISOString() });
    guardar(); cerrar('mCalificar'); $('#formCalificar').reset();
    avisar('¡Gracias por calificar!', 'ok');
    pintarCuenta(); pintarLista();
  });

  /* perfil */
  $('#perfilFoto').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) subirFoto(f, 'avatares', url => { $('#vistaAvatar').innerHTML = `<img src="${url}" alt="">`; App.avatarNuevo = url; });
  });
  $('#pfPass').addEventListener('input', () => medir($('#pfPass'), $('#medPerfil')));
  $('#formPerfil').addEventListener('submit', async e => {
    e.preventDefault();
    const u = yo(); if (!u) return;
    if ($('#pfPass').value) {
      const err = validarPass($('#pfPass').value);
      if (err) return avisar(err, 'err');
      await ponerClave(u, $('#pfPass').value);
      anotarEvento('clave', `${u.nombre} cambió su contraseña`, u.id);
      $('#pfPass').value = '';
    }
    u.nombre = $('#pfNombre').value.trim() || u.nombre;
    u.ciudad = $('#pfCiudad').value;
    u.telefono = $('#pfTel').value.trim();
    u.ref = $('#pfRef').value.trim();
    u.bio = $('#pfBio').value.trim();
    if (App.avatarNuevo) { u.avatar = App.avatarNuevo; App.avatarNuevo = null; }
    guardar(); avisar('Perfil actualizado', 'ok'); pintarNav(); pintarCuenta(); pintarLista();
  });
  $('#btnGps').addEventListener('click', () => {
    if (!navigator.geolocation) return avisar('Tu navegador no permite geolocalización', 'err');
    avisar('Buscando tu ubicación...');
    navigator.geolocation.getCurrentPosition(p => {
      $('#pfLat').value = p.coords.latitude.toFixed(6);
      $('#pfLon').value = p.coords.longitude.toFixed(6);
      avisar('Ubicación detectada, ahora guárdala', 'ok');
    }, () => avisar('No pudimos obtener tu ubicación', 'err'));
  });
  $('#btnGuardarUbic').addEventListener('click', () => {
    const u = yo(); if (!u) return;
    u.lat = Number($('#pfLat').value) || u.lat;
    u.lon = Number($('#pfLon').value) || u.lon;
    guardar(); avisar('Ubicación guardada', 'ok'); pintarMapa();
  });

  /* premium */
  $('#pagoImg').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) subirFoto(f, 'pagos', url => {
      App.fotoPago = url;
      $('#zonaPago').innerHTML = `<img src="${url}" alt="Comprobante">`;
    });
  });
  $('#formPago').addEventListener('submit', e => { e.preventDefault(); enviarPago(); });

  /* admin: anuncios */
  $('#anImg').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) subirFoto(f, 'anuncios', url => { App.fotoAnuncio = url; $('#zonaAn').innerHTML = `<img src="${url}" alt="">`; });
  });
  $('#formAnuncio').addEventListener('submit', e => {
    e.preventDefault();
    const destacado = $('#anDestacado').checked;
    if (destacado) BD.anuncios.forEach(a => a.destacado = false);
    BD.anuncios.unshift({
      id: nuevoId(), titulo: $('#anTitulo').value.trim(), desc: $('#anDesc').value.trim(),
      empresa: $('#anEmpresa').value.trim() || 'Publicidad', img: App.fotoAnuncio,
      tel: $('#anTel').value.trim(), wa: $('#anWa').value.trim(), web: $('#anWeb').value.trim(),
      destacado, activo: true, vistas: 0, clics: 0, creado: new Date().toISOString(),
    });
    guardar(); $('#formAnuncio').reset(); App.fotoAnuncio = null;
    $('#zonaAn').textContent = '🖼️ Clic para subir la imagen del anuncio';
    avisar('Anuncio publicado', 'ok'); pintarAdmin(); pintarLista();
  });

  /* admin: yape */
  $('#yapeImg').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) subirFoto(f, 'yape', url => { App.fotoYape = url; $('#vistaYape').innerHTML = `<img class="yape-qr" src="${url}" alt="">`; });
  });
  $('#formYape').addEventListener('submit', e => {
    e.preventDefault();
    if (App.fotoYape) { BD.config.yapeQr = App.fotoYape; App.fotoYape = null; }
    BD.config.yapeNombre = $('#yapeNom').value.trim() || 'Angel Levano';
    BD.config.yapeNumero = $('#yapeNum').value.trim();
    BD.config.precioPremium = Number($('#yapePrecio').value) || 1;
    BD.config.precioImpulso = Number($('#yapeImpulso').value) || 1;
    BD.config.precioSeguro  = Number($('#yapeSeguro').value) || 1;
    BD.config.autoYape      = $('#yapeAuto').checked;
    BD.config.yapeMinimo    = Number($('#yapePrecio').value) || 3;
    guardar(); avisar('Datos de cobro guardados', 'ok'); pintarPremium();
  });

  /* admin: marca */
  $('#marcaImg').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) subirFoto(f, 'logos', url => { App.fotoLogo = url;
      $('#vistaLogo').innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover" alt="">`; });
  });
  $('#btnQuitarLogo').addEventListener('click', () => {
    BD.config.logo = null; App.fotoLogo = null; guardar();
    aplicarMarca(); pintarAdmin(); avisar('Logo quitado');
  });
  $('#formMarca').addEventListener('submit', e => {
    e.preventDefault();
    if (App.fotoLogo) { BD.config.logo = App.fotoLogo; App.fotoLogo = null; }
    BD.config.nombre = $('#marcaNombre').value.trim() || 'Truequea PE';
    BD.config.lema = $('#marcaLema').value.trim();
    BD.config.color = $('#marcaColor').value;
    guardar(); aplicarMarca(); avisar('Identidad guardada', 'ok');
  });

  /* admin: contacto público y avisos */
  $('#formContacto').addEventListener('submit', e => {
    e.preventDefault();
    BD.config.contacto = {
      nombre: $('#coNombre').value.trim() || 'Angel Levano',
      cargo: $('#coCargo').value.trim() || 'Administrador de Truequea PE',
      telefono: $('#coTel').value.trim(),
      email: $('#coEmail').value.trim(),
      wa: $('#coWa').value.trim(),
      horario: $('#coHorario').value.trim(),
      texto: $('#coTexto').value.trim(),
    };
    BD.config.avisoWhatsApp = $('#coAviso').checked;
    BD.config.whatsapp = $('#coWhatsapp').value.trim();
    BD.config.waPublicar = true;   // el aviso al publicar es obligatorio
    guardar(); pintarContacto();
    avisar('Datos de contacto guardados', 'ok');
  });

  /* admin: nube */
  $('#btnSincronizar').addEventListener('click', () => {
    sincronizarAhora(); setTimeout(pintarEstadoNube, 1500);
  });
  $('#btnDiagnostico').addEventListener('click', verDiagnostico);
  $('#btnCopias').addEventListener('click', verCopias);
  $('#btnSeguridad').addEventListener('click', verSeguridad);
  $('#formClave').addEventListener('submit', async e => {
    e.preventDefault();
    const r = await cambiarClaveDe($('#claveId').value, $('#claveNueva').value.trim());
    if (r.err) return avisar(r.err, 'err');
    const u = r.usuario;
    const clave = $('#claveNueva').value.trim();
    $('#claveResultado').innerHTML = `
      <div class="ficha-nueva">
        <b>✅ Clave cambiada</b>
        <div class="datos-nuevos">
          <span>✉️ Entra con: <b>${esc(u.email)}</b>${u.telefono ? ' o <b>' + esc(u.telefono) + '</b>' : ''}</span>
          <span>🔑 Clave nueva: <b>${esc(clave)}</b></span>
          <span>🛟 Código de respaldo nuevo: <b>${esc(u.codigo)}</b></span>
        </div>
        ${u.telefono ? `<a class="wa" style="margin-top:10px" target="_blank" rel="noopener"
          href="${esc(linkWA(u.telefono, `Hola ${u.nombre}, tu clave de Truequea PE es: ${clave}`))}">
          💬 Pasársela por WhatsApp</a>` : ''}
      </div>`;
    avisar('Clave cambiada ✔', 'ok');
    pintarAdmin();
  });
  $('#formNuevoUsuario').addEventListener('submit', e => { e.preventDefault(); crearCuentaAdmin(); });

  /* asistente */
  $('#btnBot').addEventListener('click', abrirBot);
  $('#botCerrar').addEventListener('click', abrirBot);
  $('#botMic').addEventListener('click', () => escucharVoz());
  $('#botForm').addEventListener('submit', e => {
    e.preventDefault();
    const txt = $('#botTexto').value.trim();
    if (!txt) return;
    botDecir('yo', esc(txt));
    $('#botTexto').value = '';
    setTimeout(() => botResponder(txt), 260);
  });
  $('#btnReconectar').addEventListener('click', () => {
    reconectarNube().then(() => pintarEstadoNube());
  });
  $('#btnJsonNube').addEventListener('click', () => {
    descargar(`respaldo-nube-${new Date().toISOString().slice(0,10)}.json`,
      JSON.stringify({ ...BD, sesion: null }, null, 2), 'application/json');
    avisar('Copia descargada', 'ok');
  });

  /* admin: rango de los gráficos */
  $('#repRango').addEventListener('change', pintarReportes);

  /* admin: exportar */
  $('#btnCsvUsuarios').addEventListener('click', csvUsuarios);
  $('#btnJsonTodo').addEventListener('click', () => {
    descargar(`respaldo-truequea-${new Date().toISOString().slice(0,10)}.json`,
      JSON.stringify(BD, null, 2), 'application/json');
    avisar('Copia de seguridad descargada', 'ok');
  });
  $('#buscaUsr').addEventListener('input', e => tablaUsuarios(e.target.value));

  /* filtros */
  let temp;
  $('#buscador').addEventListener('input', e => {
    clearTimeout(temp);
    temp = setTimeout(() => { App.filtros.q = e.target.value; pintarLista(); pintarMapa(); }, 260);
  });
  ['fCat','fCiudad','fCond','fOrden'].forEach(id => {
    $('#' + id).addEventListener('change', () => {
      App.filtros.cat = $('#fCat').value; App.filtros.ciudad = $('#fCiudad').value;
      App.filtros.cond = $('#fCond').value; App.filtros.orden = $('#fOrden').value;
      pintarCategorias(); pintarLista(); pintarMapa();
    });
  });
  $('#btnLimpiar').addEventListener('click', limpiarFiltros);
  $('#catIzq').addEventListener('click', () => $('#categorias').scrollBy({ left: -320, behavior: 'smooth' }));
  $('#catDer').addEventListener('click', () => $('#categorias').scrollBy({ left: 320, behavior: 'smooth' }));
  $('#categorias').addEventListener('scroll', flechasCat);
  window.addEventListener('resize', flechasCat);
  $('#btnTema').addEventListener('click', () =>
    aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro'));
  $('#btnGpsMapa').addEventListener('click', () => marcarMiUbicacion());
  $('#btnMiUbic').addEventListener('click', () => {
    const u = yo();
    if (!u) { abrirAuth('login'); return avisar('Entra para marcar tu ubicación'); }
    irA('cuenta');
    setTimeout(() => { $('[data-panel="c-perf"]').click(); $('#btnGps').scrollIntoView({behavior:'smooth'}); }, 200);
  });
  $('#confSi').addEventListener('click', () => {
    cerrar('mConfirmar');
    if (App.confirmar) { const cb = App.confirmar; App.confirmar = null; cb(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    /* el aviso obligatorio de WhatsApp no se cierra con Escape */
    if (document.querySelector('.capa.on[data-obligatorio="1"]')) return;
    cerrarTodo();
  });

  /* el cartelito del pie se puede tocar para ver el diagnóstico */
  document.addEventListener('click', e => {
    if (e.target.closest('#modoDatos')) verDiagnostico();
  });
}

/* ---------------- arranque ---------------- */
function iniciar() {
  cargarBD();
  liberarReservas();
  if (typeof vencerSuperVip === 'function') vencerSuperVip();
  $('#anio').textContent = new Date().getFullYear();
  aplicarTema(BD.config.tema || 'claro');
  aplicarPlan();
  aplicarMarca();
  conectar();
  pintarCiudades();
  cargarMusica();
  pintarCategorias();
  pintarNav();
  pintarLista();
  pintarMapa();
  pintarPremium();

  const m = BD.articulos.filter(a => a.estado === 'disponible').length;
  $('#cifrasPortada').innerHTML = `
    <div><b>${m}</b><span>Artículos disponibles</span></div>
    <div><b>${BD.usuarios.length}</b><span>Usuarios</span></div>
    <div><b>${BD.intercambios.filter(x => x.estado === 'completado').length}</b><span>Trueques completados</span></div>
    <div><b>${new Set(BD.articulos.map(a => a.ciudad)).size}</b><span>Ciudades</span></div>`;

  const u = yo();
  registrarVisita(u ? u.id : null);
  if (u) {
    avisar(`Sesión activa: ${u.nombre}`, 'ok');
    /* avisos pendientes de lo que sigue el Premium */
    const sinLeer = BD.notis.filter(n => n.usuario === u.id && !n.leida).length;
    if (u.premium && sinLeer) setTimeout(() =>
      avisar(`Tienes ${sinLeer} aviso(s) nuevo(s) 🔔`, 'ok'), 3600);
  }

  /* las reservas vencen solas mientras la página está abierta */
  setInterval(() => {
    const antes = JSON.stringify(BD.articulos.map(a => !!a.reserva));
    liberarReservas();
    if (JSON.stringify(BD.articulos.map(a => !!a.reserva)) !== antes) {
      pintarLista(); pintarMapa();
      if (yo() && yo().premium) pintarPanelPro();
    }
  }, 60000);
}
document.addEventListener('DOMContentLoaded', iniciar);
