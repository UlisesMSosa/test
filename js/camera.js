import { ANCHO, ALTO } from './constants.js';

export class Camera {
  constructor(limiteAncho, limiteAlto) {
    this.limiteAncho = limiteAncho;
    this.limiteAlto = limiteAlto;
    this.velocidad = 4;
    this.radio = 50;
    this.x = limiteAncho / 2 - 100;
    this.y = limiteAlto / 2 - 70;
    this.w = this.radio * 2 + 100;
    this.h = this.radio * 2 + 80;
    this.centerX = this.x + 100;
    this.centerY = this.y + 70;
    this.mostrarTextoFoto = false;
    this.textoFoto = '';
    this.colorTextoFoto = '#fff';
    this.tiempoFoto = 0;
    this._dirAuto = 0;
    this._cambioDir = 0;
    this._ringSurfs = [];

    for (let ringR = this.radio; ringR < this.radio + 46; ringR++) {
      const c = document.createElement('canvas');
      c.width = ringR * 2 + 4;
      c.height = ringR * 2 + 4;
      const ctx = c.getContext('2d');
      ctx.strokeStyle = 'rgba(0,255,0,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ringR + 2, ringR + 2, ringR, 0, Math.PI * 2);
      ctx.stroke();
      this._ringSurfs.push(c);
    }
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get center() {
    return { x: this.x + 100, y: this.y + 70 };
  }

  _controlarBordes() {
    this.x = Math.max(this.x, -80);
    this.x = Math.min(this.x, this.limiteAncho + 80 - this.w);
    this.y = Math.max(this.y, -70);
    this.y = Math.min(this.y, this.limiteAlto + 70 - this.h);
  }

  movimiento(input) {
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.x -= this.velocidad;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.x += this.velocidad;
    if (input.isDown('ArrowUp') || input.isDown('KeyW')) this.y -= this.velocidad;
    if (input.isDown('ArrowDown') || input.isDown('KeyS')) this.y += this.velocidad;
    if (input.joystickActive) {
      this.x += input.joystickX * this.velocidad * 2;
      this.y += input.joystickY * this.velocidad * 2;
    }
    this._controlarBordes();
    this._updateCenter();
  }

  _updateCenter() {
    this.centerX = this.x + 100;
    this.centerY = this.y + 70;
  }

  automatico() {
    this._cambioDir++;
    if (this._cambioDir > 60) {
      this._dirAuto = Math.floor(Math.random() * 4);
      this._cambioDir = 0;
    }
    const v = this.velocidad;
    if (this._dirAuto === 0 && this.x - v >= 0) this.x -= v;
    else if (this._dirAuto === 1 && this.x + v <= ANCHO - this.w) this.x += v;
    else if (this._dirAuto === 2 && this.y - v >= 0) this.y -= v;
    else if (this._dirAuto === 3 && this.y + v <= ALTO - this.h) this.y += v;
    this._controlarBordes();
    this._updateCenter();
  }

  moverHacia(targetX, targetY, velocidad = 2) {
    const dx = targetX - this.centerX;
    const dy = targetY - this.centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > 10) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.x += velocidad * (dx > 0 ? 1 : -1);
      } else {
        this.y += velocidad * (dy > 0 ? 1 : -1);
      }
      this._controlarBordes();
      this._updateCenter();
      return false;
    }
    return true;
  }

  render(ctx, ticks, mostrarTexto = true) {
    const cx = 100, cy = 70;
    const t = ticks / 1000;

    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.6 + i / 3) % 1.0;
      const ringR = Math.floor(this.radio + phase * 45);
      const alpha = Math.floor(180 * (1 - phase));
      if (alpha > 0) {
        const idx = ringR - this.radio;
        if (idx >= 0 && idx < this._ringSurfs.length) {
          ctx.save();
          ctx.globalAlpha = alpha / 255;
          ctx.drawImage(this._ringSurfs[idx], this.x + cx - ringR - 2, this.y + cy - ringR - 2);
          ctx.restore();
        }
      }
    }

    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x + cx, this.y + cy, this.radio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x + cx - 5, this.y + cy);
    ctx.lineTo(this.x + cx + 5, this.y + cy);
    ctx.moveTo(this.x + cx, this.y + cy - 5);
    ctx.lineTo(this.x + cx, this.y + cy + 5);
    ctx.stroke();
    ctx.restore();

    if (mostrarTexto && this.mostrarTextoFoto && ticks - this.tiempoFoto <= 500) {
      ctx.save();
      ctx.font = '32px Silkscreen';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.colorTextoFoto;
      ctx.fillText(this.textoFoto, this.x + cx, this.y + cy + 90);
      ctx.restore();
    }
  }
}
