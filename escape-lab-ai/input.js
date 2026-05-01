// input.js - Keyboard Input Handler
class InputHandler {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }
  isDown(c) { return !!this.keys[c]; }
  wasJustPressed(c) { return !!this.justPressed[c]; }
  update() { this.justPressed = {}; }
}