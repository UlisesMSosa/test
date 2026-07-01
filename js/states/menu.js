import { ANCHO, ALTO, ESTADO_MENU, ESTADO_INTERMISION1, ESTADO_PUNTAJES, ESTADO_JUGANDO, FOTOS_INICIALES, MAX_NOMBRE } from '../constants.js';
import { ASTROS_DATA } from '../data.js';
import { crearAstros } from '../astro.js';
import { roundRect } from '../render.js';

export class MenuState {
  constructor(game) {
    this.game = game;
    this._surfInstruccion = null;
    this._letraCache = {};
  }

  enter() {}
  exit() {}

  update(dt) {
    const g = this.game;
    const input = g.input;

    const click = input.consumeClick();
    if (click) {
      if (g._botonPuntajesRect && g._botonPuntajesRect.x <= click.x && click.x <= g._botonPuntajesRect.x + g._botonPuntajesRect.w &&
          g._botonPuntajesRect.y <= click.y && click.y <= g._botonPuntajesRect.y + g._botonPuntajesRect.h) {
        if (g.audio.ctx && g.audio.ctx.state === 'suspended') g.audio.ctx.resume();
        g.jugadoresOrdenados = g.scores.getJugadoresOrdenados();
        g.scrollOffset = 0;
        g.estadoActual = ESTADO_PUNTAJES;
        return;
      }
      if (g._botonSalirRect && g._botonSalirRect.x <= click.x && click.x <= g._botonSalirRect.x + g._botonSalirRect.w &&
          g._botonSalirRect.y <= click.y && click.y <= g._botonSalirRect.y + g._botonSalirRect.h) {
        g.salirJuego();
        return;
      }
    }

    if (input.justPressed('Escape')) {
      g.salirJuego();
    }
    if (input.justPressed('Space') || input.justPressed('Enter')) {
      if (g.audio.ctx && g.audio.ctx.state === 'suspended') g.audio.ctx.resume();
      if (g.nombreJugador && !g.scores.existeNombre(g.nombreJugador)) {
        g.astrosGrupo = [];
        g.puntuacion = 0;
        g.puntuacionTotalPartida = 0;
        g.tipoPausa = '';
        g.fotosTutorial = FOTOS_INICIALES;
        g.objetivoCompletado = true;
        g.sesionMejorPuntuacion = 0;
        g.sesionAstrosDescubiertos = new Set();
        g.sesionMejorNivel = 0;
        crearAstros(ASTROS_DATA, g.astrosGrupo, 1, g.assetsAstros);
        g.tiempoInicio.intermision1 = g.ticks;
        g.estadoActual = ESTADO_INTERMISION1;
        return;
      } else if (g.nombreJugador) {
        g.nombreErroneo = true;
      }
    }
    if (input.justPressed('Backspace')) {
      g.nombreJugador = g.nombreJugador.slice(0, -1);
      g.nombreErroneo = false;
    }
    const char = input.consumeTypedChar();
    if (char && g.nombreJugador.length < MAX_NOMBRE) {
      g.nombreJugador += char;
      g.nombreErroneo = g.scores.existeNombre(g.nombreJugador);
    }
  }

  render(ctx) {
    const g = this.game;
    const t = g.ticks / 1000;

    ctx.drawImage(g.assets.getImg('fondo_menu'), 0, 0, ANCHO, ALTO);

    ctx.save();
    ctx.font = '120px Audiowide';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const floatY = Math.floor(ALTO / 8 + Math.sin(t * 1.4) * 6);
    ctx.fillStyle = '#e8e838';
    ctx.fillText('ARCSPACE', ANCHO / 2, floatY);
    ctx.restore();

    ctx.save();
    ctx.font = '50px Audiowide';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2840f';
    ctx.fillText('INGRESA TU NOMBRE', ANCHO / 2, ALTO / 2);
    ctx.restore();

    const charW = 60, charH = 60, gap = 18;
    const totalW = MAX_NOMBRE * charW + (MAX_NOMBRE - 1) * gap;
    const startX = (ANCHO - totalW) / 2;
    const centerY = ALTO / 2 + 70;
    const pulse = 0.5 + 0.5 * Math.sin(g.ticks / 150);

    ctx.save();
    ctx.font = '60px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < MAX_NOMBRE; i++) {
      const x = startX + i * (charW + gap) + charW / 2;
      ctx.fillStyle = `rgba(150, 50, 200, ${80 + 175 * pulse})`;
      ctx.fillText('_', x, centerY);
      if (i < g.nombreJugador.length && !g.input.isTouchDevice) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText(g.nombreJugador[i], x, centerY - 6);
      }
    }
    ctx.restore();

    const pulse2 = 1.0 + 0.04 * Math.sin(t * 3.0);
    ctx.save();
    ctx.font = '50px Audiowide';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(ANCHO / 2, ALTO / 2 + 140);
    ctx.scale(pulse2, pulse2);
    ctx.fillStyle = '#f2840f';
    if (g.input.isTouchDevice) {
      const camImg = g.assets.getImg('camara');
      const txt = 'TOQUE ';
      const txt2 = ' PARA INICIAR';
      const cw = camImg ? 50 : 0;
      const t1w = ctx.measureText(txt).width;
      const t2w = ctx.measureText(txt2).width;
      const totalW = t1w + cw + t2w;
      const sx = -totalW / 2;
      ctx.textAlign = 'left';
      ctx.fillText(txt, sx, 0);
      if (camImg) ctx.drawImage(camImg, sx + t1w, -25, 50, 50);
      ctx.fillText(txt2, sx + t1w + cw, 0);
    } else {
      ctx.fillText('PRESIONE ESPACIO PARA INICIAR', 0, 0);
    }
    ctx.restore();

    g._botonSalirRect = this._drawBtn(ctx, 'SALIR (ESC)', floatY, ANCHO - 20, g.input.mousePos, g.ticks, '#63cfc2', '#000', 'right');
    g._botonPuntajesRect = this._drawBtn(ctx, 'PUNTAJES', floatY, 20, g.input.mousePos, g.ticks, '#63cfc2', '#000', 'left');

    if (g.nombreErroneo) {
      ctx.save();
      ctx.font = '50px Audiowide';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f00';
      ctx.fillText('YA EXISTE UN JUGADOR CON ESE NOMBRE', ANCHO / 2, ALTO - 130);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '20px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    const creadoTexto = 'Creado por Ulises Sosa';
    ctx.fillText(creadoTexto, ANCHO / 2, ALTO - 20);
    const creadoW = ctx.measureText(creadoTexto).width;
    const flagImg = g.assets.getImg('nacional');
    if (flagImg) {
      ctx.drawImage(flagImg, ANCHO / 2 + creadoW / 2 + 8, ALTO - 36, 32, 32);
    }
    ctx.restore();
  }

  _drawBtn(ctx, texto, yCenter, xPos, mousePos, ticks, colorFondo = '#63cfc2', colorTexto = '#000', align = 'right') {
    ctx.save();
    ctx.font = '30px Silkscreen';
    const tw = ctx.measureText(texto).width;
    const bw = tw + 24, bh = 42;
    let x;
    if (align === 'right') {
      x = xPos - bw;
    } else {
      x = xPos;
    }
    const y = yCenter - bh / 2;
    const hover = mousePos && x <= mousePos.x && mousePos.x <= x + bw && y <= mousePos.y && mousePos.y <= y + bh;
    if (hover) {
      const pulse = 0.5 + 0.5 * Math.sin(ticks / 200);
      const alpha = Math.floor(60 + 40 * pulse);
      ctx.save();
      ctx.fillStyle = `rgba(180, 80, 255, ${alpha / 255})`;
      roundRect(ctx, x - 18, y - 9, bw + 36, bh + 18, 12);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = colorFondo;
    roundRect(ctx, x, y, bw, bh, 8);
    ctx.fill();
    ctx.fillStyle = colorTexto;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, x + bw / 2, y + bh / 2);
    ctx.restore();
    return { x, y, w: bw, h: bh, hover };
  }
}
