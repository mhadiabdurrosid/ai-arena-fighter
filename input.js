// ==============================================
// INPUT HANDLER
// ==============================================
const Input = {
  keys: {},
  just: {},

  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.just[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  },

  isDown(c)    { return !!this.keys[c]; },
  wasPressed(c){ return !!this.just[c]; },
  clear()      { this.just = {}; }
};
