import { ANCHO, ALTO, ESTADO_INTERMISION1, ESTADO_MENU } from '../constants.js';
import { roundRect } from '../render.js';

export class FelicitacionState {
  constructor(game) {
    this.game = game;
    this._stars = [];
    this._tituloSurf = null;
    this._subSurf = null;
    this._haloSurf = null;
    this._panelSurf = null;
    this._panelW = 760;
    this._panelH = 200;
    this._starSurf = null;
  }

  enter() {
    this._stars = [];
    for (let i = 0; i < 120; i++) {
      this._stars.push({
        x: Math.random() * ANCHO, y: Math.random() * ALTO,
        speed: 0.5 + Math.random() * 2, phase: Math.random() * Math.PI * 2
      });
    }
    const s = document.createElement('canvas');
    s.width = 6; s.height = 6;
    this._starSurf = s;
    this._tituloSurf = null;
  }

  exit() {
    this._stars = [];
  }

  update(dt) {
    const g = this.game;

    if (g.input.justPressed('Space')) {
      g.audio.stop('felicitaciones');
      g._iniciarNuevaPartidaFelicit();
      return;
    }
    if (g.input.justPressed('KeyM') || g.input.justPressed('Escape')) {
      g.audio.stop('felicitaciones');
      g._guardarSesion();
      g._resetearPartidaCompleta();
      g.estadoActual = ESTADO_MENU;
      return;
    }
    const click = g.input.consumeClick();
    if (click) {
      if (g.felicitacionBotonJugarRect && click.x >= g.felicitacionBotonJugarRect.x && click.x <= g.felicitacionBotonJugarRect.x + g.felicitacionBotonJugarRect.w &&
          click.y >= g.felicitacionBotonJugarRect.y && click.y <= g.felicitacionBotonJugarRect.y + g.felicitacionBotonJugarRect.h) {
        g.audio.stop('felicitaciones');
        g._iniciarNuevaPartidaFelicit();
        return;
      }
      if (g.felicitacionBotonMenuRect && click.x >= g.felicitacionBotonMenuRect.x && click.x <= g.felicitacionBotonMenuRect.x + g.felicitacionBotonMenuRect.w &&
          click.y >= g.felicitacionBotonMenuRect.y && click.y <= g.felicitacionBotonMenuRect.y + g.felicitacionBotonMenuRect.h) {
        g.audio.stop('felicitaciones');
        g._guardarSesion();
        g._resetearPartidaCompleta();
        g.estadoActual = ESTADO_MENU;
        return;
      }
    }
  }

  render(ctx) {
    const g = this.game;
    const t = g.ticks / 1000;

    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    const starCtx = this._starSurf.getContext('2d');
    for (const s of this._stars) {
      const a = Math.floor(120 + 120 * Math.sin(t * s.speed + s.phase));
      const sz = Math.max(1, Math.floor(1 + Math.sin(t * s.speed + s.phase + 1)));
      const colIdx = (Math.floor(s.x) + Math.floor(s.y)) % 3;
      const c = colIdx === 0 ? '#ffd700' : colIdx === 1 ? '#c896ff' : '#fff';
      starCtx.clearRect(0, 0, 6, 6);
      starCtx.fillStyle = c;
      starCtx.globalAlpha = a / 255;
      starCtx.beginPath();
      starCtx.arc(3, 3, sz, 0, Math.PI * 2);
      starCtx.fill();
      starCtx.globalAlpha = 1;
      ctx.drawImage(this._starSurf, s.x - sz, s.y - sz);
    }

    const floatY = Math.floor(ALTO / 6 + Math.sin(t * 1.2) * 8);

    if (!this._tituloSurf) {
      const c = document.createElement('canvas');
      const ct = c.getContext('2d');
      c.width = 900; c.height = 160;
      ct.font = '120px Audiowide';
      ct.textAlign = 'center';
      ct.textBaseline = 'middle';
      const grad = ct.createLinearGradient(0, 0, 900, 0);
      grad.addColorStop(0, '#ffd700');
      grad.addColorStop(1, '#c850ff');
      ct.fillStyle = grad;
      ct.fillText('¡FELICIDADES!', 450, 80);
      this._tituloSurf = c;

      const c2 = document.createElement('canvas');
      const ct2 = c2.getContext('2d');
      ct2.font = '50px Silkscreen';
      const subW = Math.ceil(ct2.measureText('Completaste el álbum').width) + 20;
      c2.width = subW; c2.height = 100;
      ct2.font = '50px Silkscreen';
      ct2.textAlign = 'center';
      ct2.textBaseline = 'middle';
      ct2.fillStyle = '#fff';
      ct2.fillText('Completaste el álbum', subW / 2, 50);
      this._subSurf = c2;

      const h = document.createElement('canvas');
      h.width = this._tituloSurf.width + 60;
      h.height = this._tituloSurf.height + 30;
      const ht = h.getContext('2d');
      ht.fillStyle = 'rgba(255,215,0,1)';
      ht.beginPath();
      ht.ellipse(h.width / 2, h.height / 2, h.width / 2, h.height / 2, 0, 0, Math.PI * 2);
      ht.fill();
      this._haloSurf = h;

      const p = document.createElement('canvas');
      p.width = this._panelW; p.height = this._panelH;
      const pt = p.getContext('2d');
      for (let px = 0; px < this._panelW; px++) {
        const gt = px / Math.max(this._panelW - 1, 1);
        const pr = Math.floor(40 + gt * 60);
        const pb = Math.floor(80 + gt * 80);
        pt.fillStyle = `rgba(${pr},0,${pb},0.824)`;
        pt.fillRect(px, 0, 1, this._panelH);
      }
      this._panelSurf = p;
    }

    const haloA = Math.floor(60 + 40 * Math.sin(t * 2));
    ctx.save();
    ctx.globalAlpha = haloA / 255;
    ctx.drawImage(this._haloSurf, ANCHO / 2 - this._haloSurf.width / 2, floatY - this._haloSurf.height / 2);
    ctx.restore();
    ctx.drawImage(this._tituloSurf, ANCHO / 2 - this._tituloSurf.width / 2, floatY - this._tituloSurf.height / 2);
    if (this._subSurf) ctx.drawImage(this._subSurf, ANCHO / 2 - this._subSurf.width / 2, floatY + 90 - this._subSurf.height / 2);

    const panelX = (ANCHO - this._panelW) / 2;
    const panelY = ALTO / 2 - 60;
    ctx.drawImage(this._panelSurf, panelX, panelY);
    const pulseB = 0.5 + 0.5 * Math.sin(t * 2.5);
    const ba = Math.floor(160 + 80 * pulseB);
    ctx.save();
    ctx.strokeStyle = `rgba(255,215,0,${ba/255})`;
    ctx.lineWidth = 3;
    roundRect(ctx, panelX, panelY, this._panelW, this._panelH, 20);
    ctx.stroke();
    ctx.restore();

    const camIcon = g.assets.getImg('camara');
    if (camIcon) ctx.drawImage(camIcon, panelX + 70, panelY + 50, 50, 50);
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.fillStyle = '#c8c8ff';
    ctx.textBaseline = 'top';
    ctx.fillText('FOTOS', panelX + 140, panelY + 30);
    ctx.font = '80px Silkscreen';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(String(g.felicitacionFotos), panelX + 140, panelY + 65);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,0,0.471)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX + this._panelW / 2, panelY + 20);
    ctx.lineTo(panelX + this._panelW / 2, panelY + this._panelH - 20);
    ctx.stroke();
    ctx.restore();

    const cxStar = panelX + this._panelW / 2 + 70;
    const cyStar = panelY + this._panelH / 2 - 25;
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = Math.PI / 180 * (-90 + i * 36);
      const r = i % 2 === 0 ? 28 : 11.2;
      pts.push({ x: cxStar + r * Math.cos(ang), y: cyStar + r * Math.sin(ang) });
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.fillStyle = '#c8c8ff';
    ctx.textBaseline = 'top';
    ctx.fillText('PUNTAJE', panelX + this._panelW / 2 + 110, panelY + 30);
    ctx.font = '80px Silkscreen';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(String(g.felicitacionPuntaje), panelX + this._panelW / 2 + 110, panelY + 65);
    ctx.restore();

    const btnY = panelY + this._panelH + 60;
    const mousePos = g.input.mousePos;
    const t2 = g.ticks / 1000;

    g.felicitacionBotonJugarRect = this._btn(ctx, 'JUGAR DE NUEVO', ANCHO / 2 - 170, btnY, mousePos, t2, true);
    g.felicitacionBotonMenuRect = this._btn(ctx, 'VOLVER AL MENU', ANCHO / 2 + 170, btnY, mousePos, t2, false);

    ctx.save();
    ctx.font = '20px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b4b4b4';
    if (g.input.isTouchDevice) {
      const camImg = g.assets.getImg('camara');
      const txt = '= Jugar de nuevo   |   X = Menú';
      const cw = camImg ? 22 : 0;
      const totalW = cw + ctx.measureText(txt).width;
      const sx = ANCHO / 2 - totalW / 2;
      ctx.textAlign = 'left';
      if (camImg) ctx.drawImage(camImg, sx, ALTO - 30 - 11, 22, 22);
      ctx.fillText(txt, sx + cw + 3, ALTO - 30);
    } else {
      ctx.fillText('ESPACIO = Jugar de nuevo   |   M = Menú', ANCHO / 2, ALTO - 30);
    }
    ctx.restore();
  }

  _btn(ctx, texto, cx, y, mousePos, t, highlight) {
    ctx.save();
    ctx.font = '30px Silkscreen';
    const metrics = ctx.measureText(texto);
    const bw = metrics.width + 30, bh = 42;
    const x = cx - bw / 2;
    const hover = mousePos && x <= mousePos.x && mousePos.x <= x + bw && y <= mousePos.y && mousePos.y <= y + bh;
    const pulse2 = 0.5 + 0.5 * Math.sin(t * 3 + cx);
    if (hover) {
      ctx.save();
      const ga2 = Math.floor(60 + 40 * pulse2);
      ctx.fillStyle = `rgba(200,100,255,${ga2/255})`;
      roundRect(ctx, x - 10, y - 10, bw + 20, bh + 20, 14);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = hover ? '#b450ff' : '#6400c8';
    roundRect(ctx, x, y, bw, bh, 10);
    ctx.fill();
    ctx.strokeStyle = highlight ? '#ffd700' : '#c864ff';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, bw, bh, 10);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, cx, y + bh / 2);
    ctx.restore();
    return { x, y, w: bw, h: bh };
  }


}
