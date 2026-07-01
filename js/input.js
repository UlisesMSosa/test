import { ANCHO, ALTO } from './constants.js';

export class InputManager {
  constructor(canvas) {
    this.keys = {};
    this.keysJustPressed = {};
    this._justPressed = {};
    this.mousePos = { x: 0, y: 0 };
    this.mouseClick = null;
    this.scrollDelta = 0;
    this.canvas = canvas;
    this._typedChar = '';
    this._scaleX = 1;
    this._scaleY = 1;
    this._offsetX = 0;
    this._offsetY = 0;

    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;
    this._touchActionPressed = false;
    this._touchActionConsumed = false;
    this._touchBackPressed = false;

    document.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this._justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this._typedChar = e.key;
      }
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      this.mousePos = { x: mx, y: my };
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      this.mouseClick = { x: mx, y: my, button: e.button };
    });
    canvas.addEventListener('wheel', (e) => {
      this.scrollDelta += e.deltaY > 0 ? -1 : 1;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this._touchEvents(canvas);
  }

  _touchEvents(canvas) {
    const toLogical = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = toLogical(t.clientX, t.clientY);
        this.mousePos = { x: p.x, y: p.y };
        this.mouseClick = { x: p.x, y: p.y, button: 0 };
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', () => {}, { passive: true });
    canvas.addEventListener('touchcancel', () => {}, { passive: true });
  }

  consumeTouchAction() {
    if (this._touchActionPressed && !this._touchActionConsumed) {
      this._touchActionConsumed = true;
      return true;
    }
    return false;
  }

  clearTouchAction() {
    // Managed by DOM button touch events
  }

  setTouchBack() {
    this._touchBackPressed = true;
  }

  consumeTouchBack() {
    if (this._touchBackPressed) {
      this._touchBackPressed = false;
      return true;
    }
    return false;
  }

  isDown(code) {
    return !!this.keys[code];
  }

  justPressed(code) {
    return !!this._justPressed[code];
  }

  consumeClick() {
    const c = this.mouseClick;
    this.mouseClick = null;
    return c;
  }

  consumeScroll() {
    const d = this.scrollDelta;
    this.scrollDelta = 0;
    return d;
  }

  clearJustPressed() {
    this._justPressed = {};
  }

  clearMouseClick() {
    this.mouseClick = null;
  }

  consumeTypedChar() {
    const c = this._typedChar;
    this._typedChar = '';
    return c;
  }

  get isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
