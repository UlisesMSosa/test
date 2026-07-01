import { ANCHO, ALTO, ESTADO_REPORTE, ESTADO_INTERMISION_MEJORA, ESTADO_FELICITACION, ESTADO_MENU, REC_W, REC_H, GAP, SEP, GROUP_W, START_Y, TAM_FLECHA, FLECHA_IZQ_X, FLECHA_DER_X, FLECHA_Y, PAG_SLIDE_DURACION, FOTOS_INICIALES, OBJETIVOS_POR_NIVEL } from '../constants.js';
import { ASTROS_DATA } from '../data.js';
import { FotoReporte } from '../fotoreporte.js';
import { calcularSlotsAlbum, calcularPosicionesPagina, obtenerPaginaSlot, dibujarSlotsAlbum, dibujarFlechasAlbum, dibujarOverlaySlide, wrapText, roundRect } from '../render.js';

export class ReporteState {
  constructor(game) { this.game = game; }
  enter() {
    this._inicializar();
  }
  exit() {}

  _inicializar() {
    const g = this.game;
    const posicionesPagina = calcularPosicionesPagina(ASTROS_DATA);

    this._inicializarFotosPerm(posicionesPagina);
    this._inicializarFotosReporte(posicionesPagina);
  }

  _inicializarFotosPerm(posicionesPagina) {
    const g = this.game;
    for (const [clave, pag, slotIdx] of g.fotosPegadasPerm) {
      if (g.fotosPermVista.some(f => f.clave === clave)) continue;
      const astroData = ASTROS_DATA.find(a => a.nombre === clave);
      if (!astroData) continue;
      const pixelImg = g.assetsAstros[clave];
      const realImg = g.assetsReales[clave];
      if (!pixelImg || !realImg) continue;
      if (!posicionesPagina[pag] || slotIdx >= posicionesPagina[pag].length) continue;
      const rectDest = posicionesPagina[pag][slotIdx];
      const foto = new FotoReporte(clave, astroData.texto || '',
        { x: 0, y: 0, w: 1, h: 1 }, rectDest, pixelImg, realImg,
        astroData.nombre_mostrar || clave);
      foto.pagina = pag;
      foto.pegar(null, true);
      g.fotosPermVista.push(foto);
    }
  }

  _inicializarFotosReporte(posicionesPagina) {
    const g = this.game;
    if (g.album.length === 0) return;
    if (g.fotosRepInstancias.length > 0) return;
    const permanentesClaves = new Set(g.fotosPegadasPerm.map(e => e[0]));
    const vistas = new Set();
    const itemsUnicos = [];
    for (const item of g.album) {
      if (!vistas.has(item.nombre) && !permanentesClaves.has(item.nombre)) {
        vistas.add(item.nombre);
        itemsUnicos.push(item);
      }
    }
    if (itemsUnicos.length === 0) return;

    for (const item of itemsUnicos) {
      const clave = item.nombre;
      const astroData = ASTROS_DATA.find(a => a.nombre === clave);
      if (!astroData) { console.warn(`Reporte: astroData no encontrado para ${clave}`); continue; }
      const pos = astroData.posicion;
      const pixelImg = g.assetsAstros[clave];
      const realImg = g.assetsReales[clave];
      if (!pixelImg || !realImg || pos === undefined) {
        console.warn(`Reporte: saltando ${clave} — pixelImg:${!!pixelImg} realImg:${!!realImg} pos:${pos}`);
        continue;
      }
      const [pag, slot] = obtenerPaginaSlot(pos);
      if (!posicionesPagina[pag] || slot >= posicionesPagina[pag].length) continue;
      const rectDest = posicionesPagina[pag][slot];
      const foto = new FotoReporte(clave, astroData.texto || '',
        { x: 0, y: 0, w: 0, h: 0 }, rectDest, pixelImg, realImg,
        astroData.nombre_mostrar || clave);
      foto.pagina = pag;
      g.fotosRepInstancias.push(foto);
    }
  }

  update(dt) {
    const g = this.game;
    const input = g.input;

    const todasFotos = [...g.fotosRepInstancias, ...g.fotosPermVista];
    const todasPegadas = g.fotosRepInstancias.length > 0 && g.fotosRepInstancias.every(f => f.estado === 'pegada');
    const hayTransicion = todasFotos.some(f => ['girando', 'revelada', 'pegando'].includes(f.estado));
    const haySlide = g.pagSlideActiva || g.pagSlideSolicitada !== 0;

    for (const f of todasFotos) {
      f.update(g.audio, g.ticks);
    }

    const click = input.consumeClick();
    if (click) {
      for (const f of todasFotos) {
        if (f.estado === 'revelada') {
          f.pegar(g.audio, false, g.ticks);
          if (g.fotosRepInstancias.includes(f)) {
            const astroData = ASTROS_DATA.find(a => a.nombre === f.clave);
            if (astroData && astroData.posicion !== undefined) {
              const [pag, slot] = obtenerPaginaSlot(astroData.posicion);
              const entrada = JSON.stringify([f.clave, pag, slot]);
              if (!g.fotosPegadasPerm.some(e => JSON.stringify(e) === entrada)) {
                g.fotosPegadasPerm.push([f.clave, pag, slot]);
              }
              g.paginaActual = pag;
            }
          }
          return;
        }
      }
      if (hayTransicion || haySlide) return;

      for (const f of g.fotosRepInstancias) {
        if (f.estado === 'oculta_en_libro' && click.x >= f.rectMin.x && click.x <= f.rectMin.x + f.rectMin.w &&
            click.y >= f.rectMin.y && click.y <= f.rectMin.y + f.rectMin.h) {
          f.estado = 'girando';
          return;
        }
      }

      const totalPags = Object.keys(calcularPosicionesPagina(ASTROS_DATA)).length;

      if (g.paginaActual > 0) {
        if (click.x >= FLECHA_IZQ_X && click.x <= FLECHA_IZQ_X + TAM_FLECHA && click.y >= FLECHA_Y && click.y <= FLECHA_Y + TAM_FLECHA) {
          if (this._solicitarSlide(-1, totalPags, g)) { g.audio.play('cambio_pagina'); return; }
        }
      }
      if (g.paginaActual < totalPags - 1) {
        if (click.x >= FLECHA_DER_X && click.x <= FLECHA_DER_X + TAM_FLECHA && click.y >= FLECHA_Y && click.y <= FLECHA_Y + TAM_FLECHA) {
          if (this._solicitarSlide(1, totalPags, g)) { g.audio.play('cambio_pagina'); return; }
        }
      }
    }

    if (input.justPressed('Space')) {
      for (const f of todasFotos) {
        if (f.estado === 'revelada') {
          f.pegar(g.audio, false, g.ticks);
          if (g.fotosRepInstancias.includes(f)) {
            const astroData = ASTROS_DATA.find(a => a.nombre === f.clave);
            if (astroData && astroData.posicion !== undefined) {
              const [pag, slot] = obtenerPaginaSlot(astroData.posicion);
              const entrada = JSON.stringify([f.clave, pag, slot]);
              if (!g.fotosPegadasPerm.some(e => JSON.stringify(e) === entrada)) {
                g.fotosPegadasPerm.push([f.clave, pag, slot]);
              }
              g.paginaActual = pag;
            }
          }
          return;
        }
      }
      if (hayTransicion || haySlide) return;
      if (todasPegadas) {
        this._avanzarOReiniciar(g);
      } else {
        for (const f of g.fotosRepInstancias) {
          if (f.estado === 'oculta_en_libro') {
            f.estado = 'girando';
            break;
          }
        }
      }
    }

    if (input.justPressed('KeyM')) {
      const puntActual = g.puntuacionTotalPartida + g.puntuacion;
      if (puntActual > g.sesionMejorPuntuacion) {
        g.sesionMejorPuntuacion = puntActual;
        g.sesionMejorNivel = g.nivel;
      }
      for (const a of g.album) g.sesionAstrosDescubiertos.add(a.nombre);
      for (const a of g.coleccion) g.sesionAstrosDescubiertos.add(a.nombre);
      g._guardarSesion();
      g._resetearPartidaCompleta();
      g.estadoActual = ESTADO_MENU;
    }

    if (input.justPressed('ArrowLeft') && !haySlide && !hayTransicion) {
      const totalPags = Object.keys(calcularPosicionesPagina(ASTROS_DATA)).length;
      if (this._solicitarSlide(-1, totalPags, g)) { g.audio.play('cambio_pagina'); }
    }
    if (input.justPressed('ArrowRight') && !haySlide && !hayTransicion) {
      const totalPags = Object.keys(calcularPosicionesPagina(ASTROS_DATA)).length;
      if (this._solicitarSlide(1, totalPags, g)) { g.audio.play('cambio_pagina'); }
    }
  }

  _solicitarSlide(direccion, totalPags, g) {
    if (g.pagSlideSolicitada !== 0) return false;
    const nueva = g.paginaActual + direccion;
    if (nueva < 0 || nueva >= totalPags) return false;
    g.pagSlideSolicitada = direccion;
    return true;
  }

  _avanzarOReiniciar(g) {
    const objetivo = g.objetivoActual();
    if ((g.nivel === 5 && objetivo <= 0) || (g.nivel !== 5 && g.puntuacion >= objetivo)) {
      g.objetivoCompletado = true;
      if (g.nivel === 5) {
        g.felicitacionFotos = new Set([...g.album.map(a => a.nombre), ...g.coleccion.map(a => a.nombre)]).size;
        const puntActual = g.puntuacionTotalPartida + g.puntuacion;
        g.felicitacionPuntaje = puntActual;
        g.felicitacionTicks = g.ticks;
        if (puntActual > g.sesionMejorPuntuacion) {
          g.sesionMejorPuntuacion = puntActual;
          g.sesionMejorNivel = g.nivel;
        }
        for (const a of g.album) g.sesionAstrosDescubiertos.add(a.nombre);
        for (const a of g.coleccion) g.sesionAstrosDescubiertos.add(a.nombre);
        g.audio.play('felicitaciones');
        g.estadoActual = ESTADO_FELICITACION;
        return;
      } else {
        g.nivel++;
      }
      g.coleccion.push(...g.album);
      g.album = [];
    } else {
      g.objetivoCompletado = false;
      g.fotosPegadasPerm = [];
      g.album = [];
      g.coleccion = [];
      g.nivel = 1;
      g.puntuacionTotalPartida = 0;
      g.astrosGrupo = [];
    }

    g.puntuacion = 0;
    g.tipoPausa = '';
    g.fotos = g.fotosTutorial = FOTOS_INICIALES;
    if (g.camara) { g.camara.x = ANCHO / 2 - 100; g.camara.y = ALTO / 2 - 70; g.camara._updateCenter(); }
    g.fotosRepInstancias = [];
    g.fotosPermVista = [];
    g.puntosFlotantes = [];
    g.tiempoInicio.intermisionMejora = g.ticks;
    g.estadoActual = ESTADO_INTERMISION_MEJORA;
  }

  render(ctx) {
    const g = this.game;
    const posicionesPagina = calcularPosicionesPagina(ASTROS_DATA);
    const totalPags = Object.keys(posicionesPagina).length;

    if (g.pagSlideSolicitada !== 0 && !g.pagSlideActiva) {
      const oldPage = g.paginaActual;
      g.paginaActual += g.pagSlideSolicitada;
      if (g.paginaActual < 0 || g.paginaActual >= totalPags) {
        g.paginaActual = Math.max(0, Math.min(totalPags - 1, g.paginaActual));
        g.pagSlideSolicitada = 0;
      } else {
        const c = document.createElement('canvas');
        c.width = ANCHO; c.height = ALTO;
        const octx = c.getContext('2d');
      const uibookImg = g.assets.getImg('uibook');
      if (uibookImg) octx.drawImage(uibookImg, ANCHO / 2 - 415, 420 - 250, 830, 500);

        const slots = posicionesPagina[oldPage];
        dibujarSlotsAlbum(octx, slots, oldPage);
        for (const f of g.fotosPermVista) {
          if (f.estado === 'pegada' && f.pagina === oldPage) {
            f.render(octx, g.ticks);
          }
        }
        const clavesPerm = new Set(g.fotosPermVista.map(f => f.clave));
        for (const f of g.fotosRepInstancias) {
          if (f.estado === 'pegada' && f.pagina === oldPage && !clavesPerm.has(f.clave)) {
            f.render(octx, g.ticks);
          }
        }
        dibujarFlechasAlbum(octx, oldPage, totalPags, g.assets.getImg('arrow_left'), g.assets.getImg('arrow_right'));
        g.pagSlideCaptura = c;
        g.pagSlideInicio = g.ticks;
        g.pagSlideActiva = true;
        g.pagSlideSolicitada = 0;
      }
    }

    if (g.paginaActual >= totalPags) g.paginaActual = 0;
    const slots = posicionesPagina[g.paginaActual];

    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    this._dibujarCabecera(ctx);

    const uibookImg = g.assets.getImg('uibook');
    if (uibookImg) {
      ctx.drawImage(uibookImg, ANCHO / 2 - 415, 420 - 250, 830, 500);
    }

    dibujarSlotsAlbum(ctx, slots, g.paginaActual);

    for (const f of g.fotosPermVista) {
      if (f.estado === 'pegada' && f.pagina === g.paginaActual) {
        f.render(ctx, g.ticks);
      }
    }

    const clavesPerm = new Set(g.fotosPermVista.map(f => f.clave));
    for (const f of g.fotosRepInstancias) {
      if (f.estado === 'pegada' && f.pagina === g.paginaActual && !clavesPerm.has(f.clave)) {
        f.render(ctx, g.ticks);
      }
    }

    for (const f of g.fotosRepInstancias) {
      if (f.estado === 'girando' || f.estado === 'pegando') {
        f.render(ctx, g.ticks);
      }
    }

    for (const f of [...g.fotosRepInstancias, ...g.fotosPermVista]) {
      if (f.estado === 'revelada') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.627)';
        ctx.fillRect(0, 0, ANCHO, ALTO);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(f.x - f.w / 2 - 3, f.y - f.h / 2 - 3, f.w + 6, f.h + 6);
        ctx.restore();
        f.render(ctx, g.ticks);
        this._dibujarPanel(ctx, f);
        break;
      }
    }

    this._dibujarInstruccion(ctx, this.todasPegadas());

    dibujarFlechasAlbum(ctx, g.paginaActual, totalPags, g.assets.getImg('arrow_left'), g.assets.getImg('arrow_right'));

    ctx.save();
    ctx.font = '20px Silkscreen';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    if (g.input.isTouchDevice) {
      ctx.fillText('Toca ✕ para volver', 20, ALTO - 30);
    } else {
      ctx.fillText('Volver al menu', 20, ALTO - 30);
      const mImg = g.assets.getImg('key_m');
      if (mImg) {
        ctx.drawImage(mImg, 20 + ctx.measureText('Volver al menu').width + 10, ALTO - 45, 30, 30);
      }
    }
    ctx.restore();

    [g.pagSlideActiva, g.pagSlideCaptura] = dibujarOverlaySlide(ctx, g.pagSlideActiva, g.pagSlideCaptura, g.pagSlideInicio, g.ticks);
  }

  todasPegadas() {
    return this.game.fotosRepInstancias.length === 0 || this.game.fotosRepInstancias.every(f => f.estado === 'pegada');
  }

  _dibujarCabecera(ctx) {
    const g = this.game;
    const rx = Math.floor((ANCHO - ANCHO * 0.9) / 2);
    const rectW = Math.floor(ANCHO * 0.9), rectH = 110;
    ctx.save();
    ctx.fillStyle = '#6400b4';
    roundRect(ctx, rx, 0, rectW, rectH, 16);
    ctx.fill();
    ctx.strokeStyle = '#b478ff';
    ctx.lineWidth = 2;
    roundRect(ctx, rx, 0, rectW, rectH, 16);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '50px Silkscreen';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('fotos nuevas:', rx + 18, rectH / 2);
    const labelW = ctx.measureText('fotos nuevas:').width + 38;
    ctx.restore();

    if (g.album.length === 0) return;

    const tamano = 80, espacio = 20;
    const clavesPegadas = new Set(g.fotosRepInstancias.filter(f => f.estado === 'pegada').map(f => f.clave));
    for (const [c, ,] of g.fotosPegadasPerm) clavesPegadas.add(c);
    const items = g.album.filter(item => !clavesPegadas.has(item.nombre));
    const vistas = new Set();
    const itemsUnicos = [];
    for (const item of items) {
      if (!vistas.has(item.nombre)) {
        vistas.add(item.nombre);
        itemsUnicos.push(item);
      }
    }
    if (itemsUnicos.length === 0) return;

    let inicioX = rx + Math.floor((rectW - itemsUnicos.length * tamano - (itemsUnicos.length - 1) * espacio) / 2);
    inicioX = Math.max(inicioX, rx + labelW);
    const yFotos = Math.floor((rectH - tamano) / 2);

    const instPorClave = {};
    for (const f of g.fotosRepInstancias) {
      if (f.estado !== 'pegada') instPorClave[f.clave] = f;
    }

    for (let di = 0; di < itemsUnicos.length; di++) {
      const clave = itemsUnicos[di].nombre;
      const px = inicioX + di * (tamano + espacio);
      if (instPorClave[clave]) {
        const inst = instPorClave[clave];
        inst.rectMin = { x: px, y: yFotos, w: tamano, h: tamano };
        if (inst.estado === 'oculta_en_libro') {
          inst.x = px + tamano / 2;
          inst.y = yFotos + tamano / 2;
          inst.w = inst.tamanioNormal.w;
          inst.h = inst.tamanioNormal.h;
        }
      }

      ctx.save();
      ctx.fillStyle = '#d4c1be';
      ctx.fillRect(px - 6, yFotos - 6, tamano + 12, tamano + 12);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(px - 6, yFotos - 6, tamano + 12, tamano + 12);
      ctx.restore();

      const img = g.assetsAstros[clave];
      if (img) {
        if (!g._thumbCache) g._thumbCache = {};
        let thumb = g._thumbCache[clave];
        if (!thumb) {
          const sc = Math.min(tamano / img.width, tamano / img.height);
          const c2 = document.createElement('canvas');
          c2.width = Math.floor(img.width * sc);
          c2.height = Math.floor(img.height * sc);
          const ct = c2.getContext('2d');
          ct.drawImage(img, 0, 0, c2.width, c2.height);
          thumb = c2;
          g._thumbCache[clave] = thumb;
        }
        ctx.drawImage(thumb, px + (tamano - thumb.width) / 2, yFotos + (tamano - thumb.height) / 2);
      }
    }
  }

  _dibujarPanel(ctx, f) {
    const anchoMax = 260;
    ctx.save();
    ctx.font = '30px Silkscreen';
    const nombreLineas = wrapText(f.nombreMostrar.toUpperCase(), txt => ctx.measureText(txt).width, anchoMax);
    ctx.font = '20px Silkscreen';
    const textoLineas = wrapText(f.textoAstro, txt => ctx.measureText(txt).width, anchoMax);

    ctx.font = '30px Silkscreen';
    const nombreW = Math.max(...nombreLineas.map(l => ctx.measureText(l).width));
    const panelW = Math.max(nombreW, anchoMax) + 20;
    ctx.font = '20px Silkscreen';
    const panelH = nombreLineas.length * 30 + textoLineas.length * 20 + 20;
    const margen = 10;
    const fRect = { x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h };

    let panelX = fRect.x + fRect.w + margen;
    if (panelX + panelW > ANCHO - margen) {
      panelX = fRect.x - margen - panelW;
    }
    let panelY = Math.max(margen, Math.min(fRect.y + fRect.h / 2 - panelH / 2, ALTO - margen - panelH));

    ctx.fillStyle = '#000';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = '#fff';
    ctx.font = '30px Silkscreen';
    ctx.textBaseline = 'top';
    let yOff = panelY + 6;
    for (const l of nombreLineas) {
      ctx.fillText(l, panelX + 10, yOff);
      yOff += 30;
    }
    yOff += 4;
    ctx.fillStyle = '#9951b8';
    ctx.font = '20px Silkscreen';
    for (const l of textoLineas) {
      ctx.fillText(l, panelX + 10, yOff);
      yOff += 20;
    }

    if (f.hover) {
      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = 3;
      ctx.strokeRect(fRect.x, fRect.y, fRect.w, fRect.h);
    }
    ctx.restore();
  }

  _dibujarInstruccion(ctx, todasPegadas) {
    const g = this.game;
    const hayRevelada = [...g.fotosRepInstancias, ...g.fotosPermVista].some(f => f.estado === 'revelada');
    const hayGirando = g.fotosRepInstancias.some(f => f.estado === 'girando');
    const hayPegando = g.fotosRepInstancias.some(f => f.estado === 'pegando');

    if (hayGirando || hayPegando) return;

    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (todasPegadas) {
      const objetivo = g.objetivoActual();
      const cumplido = (g.nivel === 5 && objetivo <= 0) || (g.nivel !== 5 && g.puntuacion >= objetivo);
      ctx.fillStyle = cumplido ? '#ffd700' : '#f00';
      this._dibujarConEspacio(ctx, g, cumplido ? 'avanzar al siguiente nivel' : 'reintentar');
    } else if (hayRevelada) {
      ctx.fillStyle = this._colorPulsante(g.ticks);
      this._dibujarConEspacio(ctx, g, 'pegar en el album');
    } else {
      ctx.fillStyle = this._colorPulsante(g.ticks);
      this._dibujarConEspacio(ctx, g, 'revelar');
    }
    ctx.restore();
  }

  _dibujarConEspacio(ctx, g, accion) {
    const movil = g.input.isTouchDevice;
    if (movil) {
      const text1 = 'Toca ';
      const text2 = ` para ${accion}`;
      const camImg = g.assets.getImg('camara');
      const cw = camImg ? 44 : 0;
      const ch = camImg ? 44 : 0;
      const t1w = ctx.measureText(text1).width;
      const t2w = ctx.measureText(text2).width;
      const total = t1w + cw + t2w;
      const sx = ANCHO / 2 - total / 2;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillText(text1, sx, 140);
      if (camImg) {
        ctx.drawImage(camImg, sx + t1w, 140 - ch / 2, cw, ch);
      }
      ctx.fillText(text2, sx + t1w + cw, 140);
      ctx.restore();
      return;
    }
    const text1 = 'Presiona ';
    const text2 = ` para ${accion}`;
    const spaceImg = g.imgSpace || g.assets.getImg('space_key');
    const sw = spaceImg ? spaceImg.width : 0;
    const sh = spaceImg ? spaceImg.height : 0;
    const t1w = ctx.measureText(text1).width;
    const t2w = ctx.measureText(text2).width;
    const total = t1w + sw + t2w;
    const sx = ANCHO / 2 - total / 2;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillText(text1, sx, 140);
    if (spaceImg) {
      ctx.drawImage(spaceImg, sx + t1w, 140 - sh / 2);
    }
    ctx.fillText(text2, sx + t1w + sw, 140);
    ctx.restore();
  }

  _colorPulsante(ticks) {
    const t = (ticks % 3000) / 3000;
    if (t < 1/3) {
      const lt = t * 3;
      return `rgb(${Math.floor(255 - lt * 127)},${Math.floor(165 - lt * 165)},${Math.floor(lt * 128)})`;
    } else if (t < 2/3) {
      const lt = (t - 1/3) * 3;
      return `rgb(${Math.floor(128 - lt * 128)},0,${Math.floor(128 + lt * 127)})`;
    } else {
      const lt = (t - 2/3) * 3;
      return `rgb(${Math.floor(lt * 255)},${Math.floor(lt * 165)},${Math.floor(255 - lt * 255)})`;
    }
  }


}
