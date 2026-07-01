import { ANCHO, ALTO, ESTADO_INTERMISION2 } from '../constants.js';

export class Tutorial1State {
  constructor(game) { this.game = game; }
  enter() {}
  exit() {}

  update(dt) {
    const g = this.game;
    if (g.input.justPressed('Space')) {
      for (const a of g.astrosGrupo) a.kill();
      if (g.camara) { g.camara.x = ANCHO / 2 - 100; g.camara.y = ALTO / 2 - 70; g.camara._updateCenter(); }
      g.tiempoInicio.intermision2 = g.ticks;
      g.estadoActual = ESTADO_INTERMISION2;
      return;
    }
    if (g.camara) {
      g.camara.automatico();
    }
    if (g.ticks - (g.tiempoInicio.intermision1 || 0) >= 7000) {
      for (const a of g.astrosGrupo) a.kill();
      if (g.camara) { g.camara.x = ANCHO / 2 - 100; g.camara.y = ALTO / 2 - 70; g.camara._updateCenter(); }
      g.tiempoInicio.intermision2 = g.ticks;
      g.estadoActual = ESTADO_INTERMISION2;
    }
  }

  render(ctx) {
    const g = this.game;
    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    const posV = g.camara ? { x: g.camara.centerX, y: g.camara.centerY } : { x: ANCHO / 2, y: ALTO / 2 };
    for (const a of g.astrosGrupo) {
      a.updateVisual(posV.x, posV.y);
      a.render(ctx);
    }
    if (g.camara) {
      g.camara.render(ctx, g.ticks, false);
    }

    const movil = g.input.isTouchDevice;
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ancla = { x: ANCHO / 2, y: Math.floor(ALTO / 1.3) };
    ctx.fillStyle = '#fff';
    ctx.fillText('MUEVE LA CÁMARA Y ENCUENTRA LOS PLANETAS', ancla.x, ancla.y - 80);

    if (movil) {
      const jx = ancla.x, jy = ancla.y, r = 48, kr = 18;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(jx, jy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(jx + 12, jy - 8, kr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(jx + 12, jy - 8, kr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '18px Silkscreen';
      ctx.fillStyle = '#bbb';
      ctx.fillText('Mueve el joystick', ancla.x, ancla.y + r + 24);
    } else {
      const teclas = [
        { key: 'arrow_up', offX: 0, offY: -50 },
        { key: 'arrow_down', offX: 0, offY: 0 },
        { key: 'arrow_left', offX: -50, offY: 0 },
        { key: 'arrow_right', offX: 50, offY: 0 },
      ];
      for (const t of teclas) {
        const img = g.assets.getImg(t.key);
        if (img) {
          ctx.drawImage(img, ancla.x + t.offX - img.width / 2, ancla.y + t.offY - img.height / 2);
        }
      }
    }
    ctx.restore();
  }
}
