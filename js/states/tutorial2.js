import { ANCHO, ALTO, ESTADO_INTERMISION3 } from '../constants.js';
import { ASTROS_DATA } from '../data.js';
import { Astro } from '../astro.js';

export class Tutorial2State {
  constructor(game) {
    this.game = game;
    this._t2DemoAstros = [];
    this._t2Init = false;
    this._t2Indice = 0;
    this._t2Fotos = 5;
    this._t2FotoTomada = false;
  }

  enter() {
    this._t2Init = false;
    this._t2Indice = 0;
    this._t2Fotos = 5;
    this._t2FotoTomada = false;
    this._t2DemoAstros = [];
  }
  exit() {
    for (const a of this._t2DemoAstros) a.kill();
    this._t2DemoAstros = [];
  }

  update(dt) {
    const g = this.game;
    const cam = g.camara;
    if (!cam) return;

    if (!this._t2Init) {
      this._t2Init = true;
      this._t2Indice = 0;
      this._t2Fotos = 5;
      const nombres = ['Luna', 'Venus', 'Mercurio'];
      const posiciones = [
        { x: ANCHO / 2 + 200, y: ALTO / 2 },
        { x: ANCHO / 2 + 200, y: ALTO / 2 - 150 },
        { x: ANCHO / 2 - 100, y: ALTO / 2 - 50 },
      ];
      for (let i = 0; i < nombres.length; i++) {
        const data = ASTROS_DATA.find(d => d.nombre === nombres[i]);
        if (!data) continue;
        const img = g.assetsAstros[nombres[i]];
        if (!img) continue;
        const a = new Astro(data, posiciones[i], img);
        a.alpha = 255;
        this._t2DemoAstros.push(a);
      }
    }

    for (const a of this._t2DemoAstros) {
      a.alpha = 255;
    }

    if (g.input.justPressed('Space')) {
      for (const a of g.astrosGrupo) a.kill();
      for (const a of this._t2DemoAstros) a.kill();
      if (cam) { cam.x = ANCHO / 2 - 100; cam.y = ALTO / 2 - 70; cam._updateCenter(); }
      this.exit();
      g.tiempoInicio.intermision3 = g.ticks;
      g.estadoActual = ESTADO_INTERMISION3;
      return;
    }

    if (this._t2Indice < this._t2DemoAstros.length) {
      const astro = this._t2DemoAstros[this._t2Indice];
      const llego = cam.moverHacia(astro.x, astro.y);
      if (llego && !this._t2FotoTomada) {
        this._t2FotoTomada = true;
        g.flashActivo = true;
        g.flashTiempo = g.ticks;
        g.audio.play('camara');

        this._t2Fotos--;
        this._t2Indice++;
        if (astro) astro.kill();
        this._t2FotoTomada = false;
      }
    }

    if (this._t2Fotos <= 0 || g.ticks - (g.tiempoInicio.intermision2 || 0) >= 7000) {
      for (const a of g.astrosGrupo) a.kill();
      for (const a of this._t2DemoAstros) a.kill();
      this.exit();
      g.tiempoInicio.intermision3 = g.ticks;
      g.estadoActual = ESTADO_INTERMISION3;
    }
  }

  render(ctx) {
    const g = this.game;
    const cam = g.camara;
    ctx.drawImage(g.assets.getImg('fondo'), 0, 0, ANCHO, ALTO);

    for (const a of this._t2DemoAstros) {
      if (a.alive) a.render(ctx);
    }

    if (cam) cam.render(ctx, g.ticks, false);

    const movil = g.input.isTouchDevice;
    const ancla = { x: ANCHO / 2, y: Math.floor(ALTO / 1.3) };
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('TOMA FOTOS DEL ESPACIO', ancla.x, ancla.y - 80);
    if (movil) {
      const camImg = g.assets.getImg('camara');
      if (camImg) {
        ctx.drawImage(camImg, ancla.x - 40, ancla.y - 40, 80, 80);
      }
    } else {
      const spaceImg = g.imgSpace || g.assets.getImg('space_key');
      if (spaceImg) {
        ctx.drawImage(spaceImg, ancla.x - spaceImg.width / 2, ancla.y - spaceImg.height / 2);
      }
    }
    ctx.restore();

    this._mostrarCamaras(ctx, this._t2Fotos);
    g.mostrarFlash(ctx);
  }

  _mostrarCamaras(ctx, cuantas) {
    const camaraImg = g => g.assets.getImg('camara');
    ctx.save();
    ctx.font = '30px Silkscreen';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.fillText('FOTOS', 10, 5);
    const img = camaraImg(this.game);
    if (img) {
      for (let i = 0; i < cuantas; i++) {
        ctx.drawImage(img, 10 + i * 60, 35, 60, 60);
      }
    }
    ctx.restore();
  }
}
