import { ANCHO, ALTO, ESTADO_MENU, MAX_NOMBRE } from './constants.js';
import { Game } from './game.js';
import { Camera } from './camera.js';

const canvas = document.getElementById('game');
canvas.width = ANCHO;
canvas.height = ALTO;
const game = new Game(canvas);

function resizeCanvas() {
  const windowRatio = window.innerWidth / window.innerHeight;
  const gameRatio = ANCHO / ALTO;
  let w, h;
  if (windowRatio > gameRatio) {
    h = window.innerHeight;
    w = h * gameRatio;
  } else {
    w = window.innerWidth;
    h = w / gameRatio;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
window.addEventListener('resize', resizeCanvas);

async function init() {
  const loader = document.getElementById('loader');
  const bar = document.getElementById('loader-bar');
  const text = document.getElementById('loader-text');

  game.audio.init();

  text.textContent = 'Cargando imagenes y sonidos...';

  await game.assets.loadAll(game.audio);

  bar.style.width = '80%';

  text.textContent = 'Inicializando...';

  game.camara = new Camera(ANCHO, ALTO);

  const _imgSpaceOrig = game.assets.getImg('space_key');
  if (_imgSpaceOrig) {
    // Escalar proporcionamente a 128×56 (igual que main.py)
    const s1 = Math.min(128 / _imgSpaceOrig.width, 56 / _imgSpaceOrig.height);
    const w1 = Math.floor(_imgSpaceOrig.width * s1);
    const h1 = Math.floor(_imgSpaceOrig.height * s1);
    const c1 = document.createElement('canvas');
    c1.width = w1; c1.height = h1;
    c1.getContext('2d').drawImage(_imgSpaceOrig, 0, 0, w1, h1);
    game.imgSpace = c1;
    // Escalar la versión ya reducida a 96×42 (igual que img_space_inst)
    const s2 = Math.min(96 / w1, 42 / h1);
    const w2 = Math.floor(w1 * s2);
    const h2 = Math.floor(h1 * s2);
    const c2 = document.createElement('canvas');
    c2.width = w2; c2.height = h2;
    c2.getContext('2d').drawImage(c1, 0, 0, w2, h2);
    game.imgSpaceInst = c2;
  }
  game.imgArrowL = game.assets.getImg('arrow_left');
  game.imgArrowR = game.assets.getImg('arrow_right');
  game.imgMIcon = game.assets.getImg('key_m');
  game.imgMouseIcon = game.assets.getImg('mouse_left');
  game.imgCamaraIcon = game.assets.getImg('camara');

  game.initStates();
  game.estadoActual = ESTADO_MENU;

  const nameInput = document.getElementById('name-input');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      game.nombreJugador = nameInput.value.toUpperCase().slice(0, MAX_NOMBRE);
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Done') {
        nameInput.blur();
        game.input._justPressed['Space'] = true;
      }
    });
  }

  const actionBtn = document.getElementById('action-btn');
  if (actionBtn) {
    const clearAction = () => { game.input._touchActionPressed = false; };
    actionBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.input._touchActionPressed = true;
      game.input._touchActionConsumed = false;
    });
    actionBtn.addEventListener('touchend', clearAction);
    actionBtn.addEventListener('touchcancel', clearAction);
  }

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    const clearBack = () => { game.input._touchBackPressed = false; };
    backBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.input._touchBackPressed = true;
    });
    backBtn.addEventListener('touchend', clearBack);
    backBtn.addEventListener('touchcancel', clearBack);
  }

  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    const fs = {
      get element() { return document.fullscreenElement || document.webkitFullscreenElement; },
      request() {
        const el = document.documentElement;
        return (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      },
      exit() { return (document.exitFullscreen || document.webkitExitFullscreen).call(document); },
    };
    const toggleFs = () => {
      if (!fs.element) {
        fs.request().then(() => fullscreenBtn.classList.add('exit')).catch(() => {});
      } else {
        fs.exit().then(() => fullscreenBtn.classList.remove('exit')).catch(() => {});
      }
    };
    const onFsChange = () => { if (!fs.element) fullscreenBtn.classList.remove('exit'); };
    fullscreenBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFs();
    });
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFs();
    });
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
  }

  const joystickArea = document.getElementById('joystick-area');
  if (joystickArea) {
    let joyTouchId = null;
    joystickArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      game.input.joystickActive = true;
      game.input.joystickX = 0;
      game.input.joystickY = 0;
    }, { passive: false });
    joystickArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = joystickArea.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          const dx = t.clientX - cx;
          const dy = t.clientY - cy;
          const maxDist = 70;
          const dist = Math.hypot(dx, dy);
          if (dist > maxDist) {
            game.input.joystickX = dx / dist;
            game.input.joystickY = dy / dist;
          } else if (dist > 5) {
            game.input.joystickX = dx / maxDist;
            game.input.joystickY = dy / maxDist;
          } else {
            game.input.joystickX = 0;
            game.input.joystickY = 0;
          }
        }
      }
    }, { passive: false });
    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          joyTouchId = null;
          game.input.joystickActive = false;
          game.input.joystickX = 0;
          game.input.joystickY = 0;
        }
      }
    };
    joystickArea.addEventListener('touchend', endJoy);
    joystickArea.addEventListener('touchcancel', endJoy);
  }

  bar.style.width = '100%';
  text.textContent = 'Listo!';

  setTimeout(() => {
    loader.style.display = 'none';
    canvas.style.display = 'block';
    resizeCanvas();
    game.start();
  }, 500);
}

init();
