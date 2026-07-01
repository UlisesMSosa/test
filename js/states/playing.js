import { ANCHO, ALTO, ESTADO_INTERMISION_PAUSA, TIEMPO_INICIAL } from '../constants.js';

// Colisión AABB simple, equivalente a pygame.Rect.colliderect / spritecollide.
function rectsColisionan(r1, r2) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export class PlayingState {
  constructor(game) { this.game = game; }
  enter() {
    const g = this.game;
    if (g.nivel === 5) g.objetivoNivel5Inicial = g.objetivoActual();
  }
  exit() {}

  update(dt) {
    const g = this.game;
    const cam = g.camara;
    if (!cam) return;

    if (g.input.justPressed('Space') && !g.tiempoPausado && g.fotos > 0) {
      g.fotos--;
      g.flashActivo = true;
      g.flashTiempo = g.ticks;
      g.audio.play('camara');

      // Igual que pygame.sprite.spritecollide(camara.sprite, astros_grupo, False):
      // colisión de rectángulos real, no por distancia/radioDeteccion (ese radio
      // solo se usa para el fundido visual del astro, ver Astro.updateVisual).
      const camRect = cam.rect; // { x: cam.x, y: cam.y, w: 200, h: 180 }
      const colisiones = g.astrosGrupo.filter(a => a.alive && rectsColisionan(camRect, a.rect));

      if (colisiones.length === 0) {
        cam.mostrarTextoFoto = true;
        cam.tiempoFoto = g.ticks;
        cam.textoFoto = 'MAL';
        cam.colorTextoFoto = '#f00';
        if (g.fotos <= 0) {
          g.tiempoPausado = true;
          g.tipoPausa = 'fotos';
        }
        return;
      }
      // El "centro del visor" para elegir el astro más cercano y decidir
      // PERFECTO/BIEN es el punto visual (centerX, centerY), igual que
      // visor_center = (camara.sprite.rect.x + 100, camara.sprite.rect.y + 70)
      // en Python.
      const visorX = cam.centerX;
      const visorY = cam.centerY;
      const astro = colisiones.reduce((a, b) => {
        const da = Math.hypot(a.x - visorX, a.y - visorY);
        const db = Math.hypot(b.x - visorX, b.y - visorY);
        return da < db ? a : b;
      });
      const dx = visorX - astro.x;
      const dy = visorY - astro.y;
      const perfecto = Math.hypot(dx, dy) < 30;

      cam.mostrarTextoFoto = true;
      cam.tiempoFoto = g.ticks;
      cam.textoFoto = perfecto ? 'PERFECTO' : 'BIEN';
      cam.colorTextoFoto = perfecto ? '#800080' : '#0f0';

      g.puntosFlotantes.push({ puntos: astro.puntos, x: astro.x, y: astro.y, tiempo: g.ticks });
      g.album.push({ nombre: astro.nombre, puntos: astro.puntos });
      g.puntuacion += astro.puntos;
      g.puntuacionTotalPartida += astro.puntos;
      astro.kill();

      const objetivo = g.objetivoActual();
      if ((g.nivel === 5 && objetivo <= 0) || (g.nivel !== 5 && g.puntuacion >= objetivo)) {
        g.tiempoPausado = true;
        g.tipoPausa = 'objetivo';
      } else if (g.fotos <= 0) {
        g.tiempoPausado = true;
        g.tipoPausa = 'fotos';
      }
    }

    if (g.tiempoPausado) {
      g.audio.stop('gameover');
      if (g.tipoPausa === 'objetivo') g.audio.play('objetivocompleto');
      else g.audio.play('gameover');
      g.tiempoInicio.intermisionPausa = g.ticks;
      g.tiempoPausado = false;
      g.estadoActual = ESTADO_INTERMISION_PAUSA;
      return;
    }

    cam.movimiento(g.input);

    const tTranscurrido = (g.ticks - g.ticksInicioJuego) / 1000;
    const tiempoRestante = TIEMPO_INICIAL - tTranscurrido;
    if (tiempoRestante <= 0) {
      g.tipoPausa = 'tiempo';
      g.tiempoPausado = true;
    }
  }

  render(ctx) {
    const g = this.game;
    const cam = g.camara;

    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    // Orden de dibujo igual que main.py (ESTADO_JUGANDO):
    // barra de PUNTOS -> astros -> puntos flotantes -> cámara -> flash.
    // La cámara va justo antes del flash, por encima del texto de puntos
    // flotantes, no justo después de los astros.
    this._mostrarPuntosPartida(ctx);

    const tTranscurrido = (g.ticks - g.ticksInicioJuego) / 1000;
    const tiempoRestante = TIEMPO_INICIAL - tTranscurrido;
    if (tiempoRestante > 0) {
      this._mostrarTiempo(ctx, tiempoRestante);
      this._mostrarCamaras(ctx);
    }

    const visorX = cam.centerX;
    const visorY = cam.centerY;
    for (const a of g.astrosGrupo) {
      a.updateVisual(visorX, visorY);
      a.render(ctx);
    }

    const ahora = g.ticks;
    for (const e of g.puntosFlotantes) {
      if (ahora - e.tiempo < 2000) {
        ctx.save();
        ctx.font = '20px Lato-Thin';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        const txt = `+${e.puntos}`;
        ctx.strokeText(txt, e.x, e.y);
        ctx.fillText(txt, e.x, e.y);
        ctx.restore();
      }
    }
    g.puntosFlotantes = g.puntosFlotantes.filter(e => ahora - e.tiempo < 2000);

    cam.render(ctx, g.ticks);

    g.mostrarFlash(ctx);
  }

  _mostrarTiempo(ctx, tiempoRestante) {
    const barW = Math.floor(ANCHO * 0.8), barH = 20;
    const x = (ANCHO - barW) / 2, y = ALTO - 40;
    const fillW = Math.floor((tiempoRestante / TIEMPO_INICIAL) * barW);
    const color = tiempoRestante < TIEMPO_INICIAL * 0.2 ? '#f00' : '#fff';
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#fff';
    ctx.fillText('TIEMPO', ANCHO / 2, y - 5);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillW, barH);
    ctx.restore();
  }

  _mostrarCamaras(ctx) {
    const img = g => g.assets.getImg('camara');
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.fillText('FOTOS', 10, 5);
    const camaraImg = img(this.game);
    if (camaraImg) {
      for (let i = 0; i < this.game.fotos; i++) {
        ctx.drawImage(camaraImg, 10 + i * 60, 35, 60, 60);
      }
    }
    ctx.restore();
  }

  _mostrarPuntosPartida(ctx) {
    const barW = 20, barH = Math.floor(ALTO * 0.6);
    const x = ANCHO - 75, y = Math.floor((ALTO - barH) / 2);
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#fff';
    ctx.fillText('PUNTOS', x + barW / 2, y - 5);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);
    const g = this.game;
    const objetivo = g.nivel === 5 && g.objetivoNivel5Inicial > 0 ? g.objetivoNivel5Inicial : g.objetivoActual();
    if (objetivo > 0) {
      const fillH = Math.floor(barH * Math.min(g.puntuacion / objetivo, 1));
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x, y + barH - fillH, barW, fillH);
    }
    ctx.restore();
  }
}
