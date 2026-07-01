import { ANCHO, ALTO, ESTADO_PUNTAJES, ESTADO_MENU, ESTADO_ALBUM_PUNTAJES } from '../constants.js';
import { ASTROS_DATA } from '../data.js';
import { calcularPosicionesPagina, obtenerPaginaSlot } from '../render.js';
import { FotoReporte } from '../fotoreporte.js';
import { dibujarBotonConHover } from '../render.js';

export class PuntajesState {
  constructor(game) { this.game = game; }
  enter() {}
  exit() {}

  update(dt) {
    const g = this.game;
    const input = g.input;

    if (input.justPressed('KeyM') || input.justPressed('Escape')) {
      g.estadoActual = ESTADO_MENU;
      return;
    }
    if (input.justPressed('ArrowUp')) {
      g.scrollOffset = Math.max(0, g.scrollOffset - 50);
    }
    if (input.justPressed('ArrowDown')) {
      g.scrollOffset += 50;
    }
    const scroll = input.consumeScroll();
    if (scroll !== 0) {
      g.scrollOffset = Math.max(0, g.scrollOffset - scroll * 40);
    }

    const click = input.consumeClick();
    if (click) {
      if (g._botonVolverRect && click.x >= g._botonVolverRect.x && click.x <= g._botonVolverRect.x + g._botonVolverRect.w &&
          click.y >= g._botonVolverRect.y && click.y <= g._botonVolverRect.y + g._botonVolverRect.h) {
        g.estadoActual = ESTADO_MENU;
        return;
      }
      for (const entry of g._puntajesRects || []) {
        if (click.x >= entry.rect.x && click.x <= entry.rect.x + entry.rect.w &&
            click.y >= entry.rect.y && click.y <= entry.rect.y + entry.rect.h) {
          g.albumPuntajesClave = entry.nombre;
          g.paginaActualAlbum = 0;
          g.fotosAlbumPuntajes = this._construirFotosAlbum(entry.datos.astros_descubiertos || []);
          g.pagSlideAlbumActiva = false;
          g.pagSlideAlbumSolicitada = 0;
          g.pagSlideAlbumCaptura = null;
          g.estadoActual = ESTADO_ALBUM_PUNTAJES;
          return;
        }
      }
    }
  }

  _construirFotosAlbum(astrosClaveList) {
    const g = this.game;
    const posicionesPagina = calcularPosicionesPagina(ASTROS_DATA);
    const fotos = [];
    for (const clave of astrosClaveList) {
      const astroData = ASTROS_DATA.find(a => a.nombre === clave);
      if (!astroData) continue;
      const pos = astroData.posicion;
      const pixelImg = g.assetsAstros[clave];
      const realImg = g.assetsReales[clave];
      if (!pixelImg || !realImg || pos === undefined) continue;
      const [pagina, slot] = obtenerPaginaSlot(pos);
      if (!posicionesPagina[pagina] || slot >= posicionesPagina[pagina].length) continue;
      const rectDest = posicionesPagina[pagina][slot];
      const foto = new FotoReporte(clave, astroData.texto || '', { x: 0, y: 0, w: 1, h: 1 }, rectDest, pixelImg, realImg, astroData.nombre_mostrar || clave);
      foto.pagina = pagina;
      foto.pegar(null, true);
      fotos.push(foto);
    }
    return fotos;
  }

  render(ctx) {
    const g = this.game;
    const jugadores = g.jugadoresOrdenados;

    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    ctx.save();
    ctx.font = '80px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.fillText('PUNTAJES', ANCHO / 2, 50);
    ctx.restore();

    g._botonVolverRect = dibujarBotonConHover(ctx, g.input.isTouchDevice ? 'VOLVER (X)' : 'VOLVER (M)', 50, ANCHO - 20 - 100, g.input.mousePos, g.ticks, '#63cfc2', '#000');

    const yInicio = 110, altoEntrada = 80;
    const areaY = ALTO - yInicio - 20;
    const totalAlto = jugadores.length * altoEntrada;
    const maxScroll = Math.max(0, totalAlto - areaY);
    g.scrollOffset = Math.min(g.scrollOffset, maxScroll);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, yInicio, ANCHO, ALTO - yInicio);
    ctx.clip();

    const mousePos = g.input.mousePos;
    g._puntajesRects = [];

    for (let i = 0; i < jugadores.length; i++) {
      const [nombre, datosJ] = jugadores[i];
      const y = yInicio + i * altoEntrada - g.scrollOffset;
      if (y + altoEntrada < yInicio || y > ALTO - 20) continue;

      const fontSize = i < 3 ? '30px Silkscreen' : '20px Silkscreen';
      ctx.font = fontSize;
      const rankStr = `${i + 1} - `;
      const nomStr = nombre;
      const ptsStr = `${datosJ.puntuacion_total} pts`;
      const rankW = ctx.measureText(rankStr).width;
      const nomW = ctx.measureText(nomStr).width;
      const entryW = 60 + rankW + nomW + 20 + ctx.measureText(ptsStr).width;

      const entryR = { x: 60, y, w: entryW, h: parseInt(fontSize) };
      const hover = mousePos && entryR.x <= mousePos.x && mousePos.x <= entryR.x + entryR.w &&
                    entryR.y <= mousePos.y && mousePos.y <= entryR.y + entryR.h;
      g._puntajesRects.push({ nombre, datos: datosJ, rect: entryR });

      const color = hover ? '#9630c8' : '#ffd700';
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.font = fontSize;
      ctx.fillText(rankStr, 60, y);
      ctx.fillText(nomStr, 60 + rankW, y);
      ctx.fillText(ptsStr, 60 + rankW + nomW + 20, y);

      ctx.font = '20px Silkscreen';
      ctx.fillStyle = '#9630c8';
      const info = `Nivel max: ${datosJ.nivel_maximo}  |  Astros: ${(datosJ.astros_descubiertos || []).length}  |  Partidas: ${datosJ.cantidad_partidas}`;
      ctx.fillText(info, 60, y + (i < 3 ? 35 : 20));
    }

    ctx.restore();
  }
}
