import { ANCHO, ALTO, ESTADO_MENU, ESTADO_INTERMISION1, ESTADO_INTERMISION2, ESTADO_INTERMISION3, ESTADO_INTERMISION4, ESTADO_INTERMISION_MEJORA, ESTADO_INTERMISION_PAUSA, ESTADO_JUGANDO, ESTADO_REPORTE, ESTADO_PUNTAJES, ESTADO_ALBUM_PUNTAJES, ESTADO_FELICITACION, FOTOS_INICIALES, OBJETIVOS_POR_NIVEL, MAX_NOMBRE } from './constants.js';
import { ASTROS_DATA } from './data.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { ScoreManager } from './scores.js';
import { AssetManager } from './assets.js';
import { MenuState } from './states/menu.js';
import { Tutorial1State } from './states/tutorial1.js';
import { Tutorial2State } from './states/tutorial2.js';
import { Tutorial3State } from './states/tutorial3.js';
import { Tutorial4State } from './states/tutorial4.js';
import { PlayingState } from './states/playing.js';
import { PauseState } from './states/pause.js';
import { MejoraState } from './states/mejora.js';
import { ReporteState } from './states/reporte.js';
import { PuntajesState } from './states/puntajes.js';
import { AlbumPuntajesState } from './states/album_puntajes.js';
import { FelicitacionState } from './states/felicitacion.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new InputManager(canvas);
    this.audio = new AudioManager();
    this.assets = new AssetManager();
    this.scores = new ScoreManager();
    this.state = null;
    this.ticks = 0;
    this.lastTime = 0;
    this.running = false;

    this.astrosGrupo = [];
    this.camara = null;
    this.album = [];
    this.coleccion = [];
    this.fotosRepInstancias = [];
    this.fotosPermVista = [];
    this.fotosPegadasPerm = [];
    this.puntosFlotantes = [];

    this.puntuacion = 0;
    this.puntuacionTotalPartida = 0;
    this.nivel = 1;
    this.fotos = FOTOS_INICIALES;
    this.fotosTutorial = FOTOS_INICIALES;
    this.objetivoCompletado = true;
    this.objetivoNivel5Inicial = 0;

    this.nombreJugador = '';
    this.nombreErroneo = false;
    this.tiempoPausado = false;
    this.tipoPausa = '';
    this.ticksInicioJuego = 0;

    this.tiempoInicio = {};
    this.flashActivo = false;
    this.flashTiempo = 0;

    this.paginaActual = 0;
    this.paginaActualAlbum = 0;
    this.albumPuntajesClave = '';
    this.fotosAlbumPuntajes = [];
    this.jugadoresOrdenados = [];
    this.scrollOffset = 0;
    this.sesionMejorPuntuacion = 0;
    this.sesionAstrosDescubiertos = new Set();
    this.sesionMejorNivel = 0;

    this.pagSlideActiva = false;
    this.pagSlideInicio = 0;
    this.pagSlideCaptura = null;
    this.pagSlideSolicitada = 0;
    this.pagSlideAlbumActiva = false;
    this.pagSlideAlbumInicio = 0;
    this.pagSlideAlbumCaptura = null;
    this.pagSlideAlbumSolicitada = 0;
    this.felicitacionFotos = 0;
    this.felicitacionPuntaje = 0;
    this.felicitacionTicks = 0;
    this.felicitacionBotonJugarRect = null;
    this.felicitacionBotonMenuRect = null;

    this._menuMusicaSonando = false;
    this._juegoMusicaSonando = false;

    this._surfFlash = null;
    this._surfOverlay = null;
    this._thumbCache = {};

    this.datosTeclas = [];
    this.imgSpace = null;
    this.imgSpaceInst = null;
    this.imgArrowL = null;
    this.imgArrowR = null;
    this.imgMIcon = null;
    this.imgMouseIcon = null;
    this.imgCamaraIcon = null;

    this.states = {};
  }

  initStates() {
    this.states[ESTADO_MENU] = new MenuState(this);
    this.states[ESTADO_INTERMISION1] = new Tutorial1State(this);
    this.states[ESTADO_INTERMISION2] = new Tutorial2State(this);
    this.states[ESTADO_INTERMISION3] = new Tutorial3State(this);
    this.states[ESTADO_INTERMISION4] = new Tutorial4State(this);
    this.states[ESTADO_INTERMISION_MEJORA] = new MejoraState(this);
    this.states[ESTADO_INTERMISION_PAUSA] = new PauseState(this);
    this.states[ESTADO_JUGANDO] = new PlayingState(this);
    this.states[ESTADO_REPORTE] = new ReporteState(this);
    this.states[ESTADO_PUNTAJES] = new PuntajesState(this);
    this.states[ESTADO_ALBUM_PUNTAJES] = new AlbumPuntajesState(this);
    this.states[ESTADO_FELICITACION] = new FelicitacionState(this);
  }

  get estadoActual() { return this.state; }
  set estadoActual(s) {
    if (this.state === s) return;
    if (this.states[this.state]) this.states[this.state].exit();
    this.state = s;
    if (this.states[this.state]) this.states[this.state].enter();
  }

  objetivoActual() {
    if (this.nivel === 5) {
      const fotografiados = new Set();
      for (const a of this.album) fotografiados.add(a.nombre);
      for (const a of this.coleccion) fotografiados.add(a.nombre);
      return ASTROS_DATA.filter(a => !fotografiados.has(a.nombre))
        .reduce((sum, a) => sum + a.puntos * (a.cantidad || 1), 0);
    }
    return OBJETIVOS_POR_NIVEL[this.nivel] || 500;
  }

  get assetsAstros() {
    const map = {};
    for (const a of ASTROS_DATA) {
      map[a.nombre] = this.assets.getAstroImg(a.nombre);
    }
    return map;
  }

  get assetsReales() {
    const map = {};
    for (const a of ASTROS_DATA) {
      map[a.nombre] = this.assets.getRealImg(a.nombre, a.real);
    }
    return map;
  }

  salirJuego() {
    if (this.nombreJugador) {
      const puntTotal = this.puntuacionTotalPartida + this.puntuacion;
      const descubiertos = [...new Set([...this.album.map(a => a.nombre), ...this.coleccion.map(a => a.nombre)])];
      this.scores.registrarResultado(this.nombreJugador, puntTotal, this.nivel, descubiertos);
    }
  }

  _guardarSesion() {
    if (!this.nombreJugador) return;
    const descubiertos = [...this.sesionAstrosDescubiertos];
    this.scores.registrarResultado(this.nombreJugador, this.sesionMejorPuntuacion, this.sesionMejorNivel, descubiertos);
  }

  _resetearPartidaCompleta() {
    this.audio.stop('gameover');
    this.audio.stop('felicitaciones');
    this.audio.stop('giro');
    this.audio.stop('revelada');

    this.fotosPegadasPerm = [];
    this.album = [];
    this.coleccion = [];
    this.fotosRepInstancias = [];
    this.fotosPermVista = [];
    this.puntosFlotantes = [];
    this.nivel = 1;
    this.puntuacion = 0;
    this.puntuacionTotalPartida = 0;
    this.fotos = this.fotosTutorial = FOTOS_INICIALES;
    this.nombreJugador = '';
    this.tipoPausa = '';
    this.objetivoCompletado = true;
    this.objetivoNivel5Inicial = 0;
  }

  _iniciarNuevaPartidaFelicit() {
    this.fotosPegadasPerm = [];
    this.album = [];
    this.coleccion = [];
    this.fotosRepInstancias = [];
    this.fotosPermVista = [];
    this.puntosFlotantes = [];
    this.nivel = 1;
    this.puntuacion = 0;
    this.puntuacionTotalPartida = 0;
    this.fotos = this.fotosTutorial = FOTOS_INICIALES;
    this.tipoPausa = '';
    this.objetivoCompletado = true;
    this.objetivoNivel5Inicial = 0;
    this.astrosGrupo = [];
    if (this.camara) { this.camara.x = ANCHO / 2 - 100; this.camara.y = ALTO / 2 - 70; this.camara._updateCenter(); }
    this.paginaActual = 0;
    this.pagSlideActiva = false;
    this.pagSlideSolicitada = 0;
    this.pagSlideCaptura = null;
    this.tiempoInicio.intermision1 = this.ticks;
    this.estadoActual = ESTADO_INTERMISION1;
  }

  actualizarMusica() {
    const menuStates = [ESTADO_MENU, ESTADO_INTERMISION1, ESTADO_INTERMISION2, ESTADO_INTERMISION3, ESTADO_REPORTE, ESTADO_PUNTAJES, ESTADO_ALBUM_PUNTAJES];
    const juegoStates = [ESTADO_INTERMISION4, ESTADO_JUGANDO];

    if (menuStates.includes(this.estadoActual)) {
      if (!this._menuMusicaSonando) {
        this.audio.stopMusic();
        this._menuMusicaSonando = true;
        this._juegoMusicaSonando = false;
        this._menuMusicRetried = false;
      }
      if (!this._menuMusicRetried && this.audio.ctx && this.audio.ctx.state === 'running' && !this.audio._musicSource) {
        this._menuMusicRetried = true;
        this.audio.playMusic('./assets/Sonido/menu.ogg', 0.4);
      }
    } else if (juegoStates.includes(this.estadoActual)) {
      if (!this._juegoMusicaSonando) {
        this.audio.stopMusic();
        this._juegoMusicaSonando = true;
        this._menuMusicaSonando = false;
        this._juegoMusicRetried = false;
      }
      if (!this._juegoMusicRetried && this.audio.ctx && this.audio.ctx.state === 'running' && !this.audio._musicSource) {
        this._juegoMusicRetried = true;
        this.audio.playMusic('./assets/Sonido/juego.mp3', 0.4);
      }
    } else {
      if (this._menuMusicaSonando || this._juegoMusicaSonando) {
        this.audio.stopMusic();
        this._menuMusicaSonando = false;
        this._juegoMusicaSonando = false;
      }
      this._menuMusicRetried = false;
      this._juegoMusicRetried = false;
    }
  }

  mostrarFlash(ctx) {
    if (!this.flashActivo) return;
    const alpha = Math.max(0, 200 - Math.floor((this.ticks - this.flashTiempo) * 5));
    if (alpha <= 0) { this.flashActivo = false; return; }
    ctx.save();
    ctx.fillStyle = `rgba(220,220,220,${alpha/255})`;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.restore();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.ticks = now;
      this.update(dt);
      this.render();
      this.input.clearJustPressed();
      this.input.clearMouseClick();
      this.input.clearTouchAction();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    if (this.input.consumeTouchAction()) {
      this.input._justPressed['Space'] = true;
    }
    if (this.input.consumeTouchBack()) {
      this.input._justPressed['Escape'] = true;
    }
    if (this.state && this.states[this.state]) {
      this.states[this.state].update(dt);
    }
    this._syncNameInput();
    this.actualizarMusica();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ANCHO, ALTO);
    if (this.state && this.states[this.state]) {
      this.states[this.state].render(ctx);
    }
    this._updateTouchControls();
  }

  _updateTouchControls() {
    const tc = document.getElementById('touch-controls');
    if (!tc || !this.input.isTouchDevice) {
      if (tc) tc.classList.remove('show');
      return;
    }
    const st = this.estadoActual;
    const showJoystick = st === ESTADO_JUGANDO;
    const showAction = st !== null;
    const showBack = st !== ESTADO_MENU && st !== null;

    tc.classList.toggle('show', showJoystick || showAction || showBack);
    document.getElementById('joystick-area').style.display = showJoystick ? 'block' : 'none';
    document.getElementById('action-btn').classList.toggle('hidden', !showAction);
    document.getElementById('back-btn').classList.toggle('hidden', !showBack);

    const knob = document.getElementById('joystick-knob');
    if (knob) {
      if (this.input.joystickActive) {
        const maxDist = 35;
        knob.style.left = `calc(50% + ${this.input.joystickX * maxDist}px)`;
        knob.style.top = `calc(50% + ${this.input.joystickY * maxDist}px)`;
      } else {
        knob.style.left = '50%';
        knob.style.top = '50%';
      }
    }
    document.getElementById('action-btn').classList.toggle('pressed', !!this.input._touchActionPressed);
  }

  _syncNameInput() {
    const ni = document.getElementById('name-input');
    if (!ni) return;
    if (this.estadoActual === ESTADO_MENU && this.input.isTouchDevice) {
      ni.style.display = 'block';
      const rect = this.canvas.getBoundingClientRect();
      const sx = rect.width / ANCHO;
      const sy = rect.height / ALTO;
      const charW = 60, gap = 18;
      const totalW = MAX_NOMBRE * charW + (MAX_NOMBRE - 1) * gap;
      const inputX = rect.left + (rect.width - totalW * sx) / 2;
      const centerY = ALTO / 2 + 70;
      const inputY = rect.top + (centerY - 35) * sy;
      ni.style.left = `${inputX}px`;
      ni.style.top = `${inputY}px`;
      ni.style.width = `${totalW * sx}px`;
      ni.style.height = `${70 * sy}px`;
      ni.style.fontSize = `${50 * Math.min(sx, sy)}px`;
    } else {
      ni.style.display = 'none';
    }
  }
}
