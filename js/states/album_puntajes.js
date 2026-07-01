import { ANCHO, ALTO, ESTADO_ALBUM_PUNTAJES, ESTADO_PUNTAJES, REC_W, REC_H, GAP, SEP, GROUP_W, START_Y, TAM_FLECHA, FLECHA_IZQ_X, FLECHA_DER_X, FLECHA_Y, PAG_SLIDE_DURACION } from '../constants.js';
import { ASTROS_DATA } from '../data.js';
import { calcularPosicionesPagina, obtenerPaginaSlot, dibujarSlotsAlbum, dibujarFlechasAlbum, dibujarOverlaySlide, dibujarBoton, wrapText } from '../render.js';

export class AlbumPuntajesState {
  constructor(game) { this.game = game; }
  enter() {}
  exit() {}

  update(dt) {
    const g = this.game;
    const input = g.input;

    const haySlide = g.pagSlideAlbumActiva || g.pagSlideAlbumSolicitada !== 0;

    if (input.justPressed('KeyM') || input.justPressed('Escape')) {
      g.estadoActual = ESTADO_PUNTAJES;
      return;
    }

    const totalPags = Object.keys(calcularPosicionesPagina(ASTROS_DATA)).length;

    if (input.justPressed('ArrowLeft') && !haySlide) {
      if (this._solicitarSlide(-1, totalPags, g)) { g.audio.play('cambio_pagina'); }
    }
    if (input.justPressed('ArrowRight') && !haySlide) {
      if (this._solicitarSlide(1, totalPags, g)) { g.audio.play('cambio_pagina'); }
    }

    const scroll = input.consumeScroll();
    if (scroll !== 0 && !haySlide) {
      const dir = scroll > 0 ? -1 : 1;
      if (this._solicitarSlide(dir, totalPags, g)) { g.audio.play('cambio_pagina'); }
    }

    const click = input.consumeClick();
    if (click) {
      if (g._botonVolverRect && click.x >= g._botonVolverRect.x && click.x <= g._botonVolverRect.x + g._botonVolverRect.w &&
          click.y >= g._botonVolverRect.y && click.y <= g._botonVolverRect.y + g._botonVolverRect.h) {
        g.estadoActual = ESTADO_PUNTAJES;
        return;
      }

      for (const f of g.fotosAlbumPuntajes) {
        if (f.estado === 'revelada') {
          const fRect = { x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h };
          if (click.x >= fRect.x && click.x <= fRect.x + fRect.w && click.y >= fRect.y && click.y <= fRect.y + fRect.h) {
            f.pegar(g.audio, true);
            return;
          }
        }
      }

      if (!g.fotosAlbumPuntajes.some(f => f.estado === 'revelada')) {
        for (const f of g.fotosAlbumPuntajes) {
          if (f.estado === 'pegada' && f.pagina === g.paginaActualAlbum) {
            const fRect = { x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h };
            if (click.x >= fRect.x && click.x <= fRect.x + fRect.w && click.y >= fRect.y && click.y <= fRect.y + fRect.h) {
              f.revelarAmpliado();
              return;
            }
          }
        }
      }

      if (haySlide) return;

      if (g.paginaActualAlbum > 0) {
        if (click.x >= FLECHA_IZQ_X && click.x <= FLECHA_IZQ_X + TAM_FLECHA && click.y >= FLECHA_Y && click.y <= FLECHA_Y + TAM_FLECHA) {
          if (this._solicitarSlide(-1, totalPags, g)) { g.audio.play('cambio_pagina'); return; }
        }
      }
      if (g.paginaActualAlbum < totalPags - 1) {
        if (click.x >= FLECHA_DER_X && click.x <= FLECHA_DER_X + TAM_FLECHA && click.y >= FLECHA_Y && click.y <= FLECHA_Y + TAM_FLECHA) {
          if (this._solicitarSlide(1, totalPags, g)) { g.audio.play('cambio_pagina'); return; }
        }
      }
    }

    for (const f of g.fotosAlbumPuntajes) {
      if (f.estado === 'girando') f.update(g.audio, g.ticks);
    }

    if (input.mousePos) {
      for (const f of g.fotosAlbumPuntajes) {
        if (f.estado === 'revelada') {
          const fRect = { x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h };
          f.hover = input.mousePos.x >= fRect.x && input.mousePos.x <= fRect.x + fRect.w &&
                    input.mousePos.y >= fRect.y && input.mousePos.y <= fRect.y + fRect.h;
        } else {
          f.hover = false;
        }
      }
    }
  }

  _solicitarSlide(direccion, totalPags, g) {
    if (g.pagSlideAlbumSolicitada !== 0) return false;
    const nueva = g.paginaActualAlbum + direccion;
    if (nueva < 0 || nueva >= totalPags) return false;
    g.pagSlideAlbumSolicitada = direccion;
    return true;
  }

  render(ctx) {
    const g = this.game;
    const posicionesPagina = calcularPosicionesPagina(ASTROS_DATA);
    const totalPags = Object.keys(posicionesPagina).length;

    if (g.pagSlideAlbumSolicitada !== 0 && !g.pagSlideAlbumActiva) {
      const oldPage = g.paginaActualAlbum;
      g.paginaActualAlbum += g.pagSlideAlbumSolicitada;
      if (g.paginaActualAlbum < 0 || g.paginaActualAlbum >= totalPags) {
        g.paginaActualAlbum = Math.max(0, Math.min(totalPags - 1, g.paginaActualAlbum));
        g.pagSlideAlbumSolicitada = 0;
      } else {
        const c = document.createElement('canvas');
        c.width = ANCHO; c.height = ALTO;
        const octx = c.getContext('2d');
        const uibookImg = g.assets.getImg('uibook');
        if (uibookImg) octx.drawImage(uibookImg, ANCHO / 2 - 415, 420 - 250, 830, 500);
        dibujarSlotsAlbum(octx, posicionesPagina[oldPage], oldPage);
        for (const f of g.fotosAlbumPuntajes) {
          if (f.estado === 'pegada' && f.pagina === oldPage) f.render(octx, g.ticks);
        }
        dibujarFlechasAlbum(octx, oldPage, totalPags, g.assets.getImg('arrow_left'), g.assets.getImg('arrow_right'));
        g.pagSlideAlbumCaptura = c;
        g.pagSlideAlbumInicio = g.ticks;
        g.pagSlideAlbumActiva = true;
        g.pagSlideAlbumSolicitada = 0;
      }
    }

    if (g.paginaActualAlbum >= totalPags) g.paginaActualAlbum = 0;

    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    ctx.save();
    ctx.font = '80px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Álbum de ${g.albumPuntajesClave}`, ANCHO / 2, 110);
    ctx.restore();

    g._botonVolverRect = dibujarBoton(ctx, g.input.isTouchDevice ? 'VOLVER (X)' : 'VOLVER (M)', 40, ANCHO - 20 - 100, '#63cfc2', '#000');

    const uibookImg = g.assets.getImg('uibook');
    if (uibookImg) {
      ctx.drawImage(uibookImg, ANCHO / 2 - 415, 420 - 250, 830, 500);
    }

    dibujarSlotsAlbum(ctx, posicionesPagina[g.paginaActualAlbum], g.paginaActualAlbum);

    for (const f of g.fotosAlbumPuntajes) {
      if (f.estado === 'pegada' && f.pagina === g.paginaActualAlbum) {
        f.render(ctx, g.ticks);
      }
    }
    for (const f of g.fotosAlbumPuntajes) {
      if (f.estado === 'girando') f.render(ctx, g.ticks);
    }
    for (const f of g.fotosAlbumPuntajes) {
      if (f.estado === 'revelada') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.627)';
        ctx.fillRect(0, 0, ANCHO, ALTO);
        ctx.restore();
        f.render(ctx, g.ticks);
        this._dibujarPanel(ctx, f);
        break;
      }
    }

    dibujarFlechasAlbum(ctx, g.paginaActualAlbum, totalPags, g.assets.getImg('arrow_left'), g.assets.getImg('arrow_right'));

    [g.pagSlideAlbumActiva, g.pagSlideAlbumCaptura] = dibujarOverlaySlide(ctx, g.pagSlideAlbumActiva, g.pagSlideAlbumCaptura, g.pagSlideAlbumInicio, g.ticks);
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
    let panelY = Math.max(margen, Math.min(fRect.centery || (fRect.y + fRect.h / 2) - panelH / 2, ALTO - margen - panelH));

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
}
