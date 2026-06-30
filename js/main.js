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
      game.nombreErroneo = game.scores.existeNombre(game.nombreJugador);
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Done') {
        nameInput.blur();
        game.input._justPressed['Space'] = true;
      }
    });
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
