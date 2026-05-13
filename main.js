// ==============================================
// MOBILE / TOUCH SUPPORT
// ==============================================
const MobileInput = {
  joyX: 0, joyY: 0,
  active: false,

  init() {
    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      document.getElementById('mobile-controls').style.display = 'block';
      const escBtn = document.getElementById('mob-esc-btn');
      if (escBtn) escBtn.style.display = 'block';
    }

    // ---- Joystick ----
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const radius = 40;
    let joyId = null;

    const getZoneCenter = () => {
      const r = zone.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const moveKnob = (cx, cy) => {
      const o = getZoneCenter();
      let dx = cx - o.x, dy = cy - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) { dx = dx / dist * radius; dy = dy / dist * radius; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joyX = dx / radius;
      this.joyY = dy / radius;
    };

    const resetKnob = () => {
      knob.style.transform = 'translate(-50%,-50%)';
      this.joyX = 0; this.joyY = 0; joyId = null;
    };

    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyId = t.identifier;
      moveKnob(t.clientX, t.clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { moveKnob(t.clientX, t.clientY); break; }
      }
    }, { passive: false });

    zone.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { resetKnob(); break; }
      }
    }, { passive: false });

    // ---- Action buttons ----
    const setupBtn = (id, downFn, upFn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart',  e => { e.preventDefault(); downFn && downFn(); }, { passive: false });
      el.addEventListener('touchend',    e => { e.preventDefault(); upFn   && upFn();   }, { passive: false });
      el.addEventListener('touchcancel', e => { e.preventDefault(); upFn   && upFn();   }, { passive: false });
    };

    setupBtn('btn-mob-atk',
      () => { Input.keys['Space'] = true; Input.just['Space'] = true; },
      () => { Input.keys['Space'] = false; }
    );
    setupBtn('btn-mob-dash',
      () => { Input.just['ShiftLeft'] = true; },
      () => {}
    );
    setupBtn('mob-item-1',
      () => { Input.just['Digit1'] = true; },
      () => {}
    );
    setupBtn('mob-item-2',
      () => { Input.just['Digit2'] = true; },
      () => {}
    );
  },

  updateMobItemBtns() {
    [1, 2].forEach((si) => {
      const itemId = Save.equippedSlots[si];
      const item   = itemId ? ITEMS.find(i => i.id === itemId) : null;
      const el     = document.getElementById(`mob-item-${si}`);
      if (!el) return;
      el.innerHTML = item
        ? `<span class="m-icon">${item.icon}</span><span>[${si}]</span>`
        : `<span class="m-icon" style="opacity:.3">○</span><span>[${si}]</span>`;
    });
  }
};

// Patch Input.isDown to also read joystick
const _origIsDown = Input.isDown.bind(Input);
Input.isDown = function(code) {
  if (_origIsDown(code)) return true;
  const jx = MobileInput.joyX, jy = MobileInput.joyY;
  const dead = 0.25;
  if ((code === 'KeyA' || code === 'ArrowLeft')  && jx < -dead) return true;
  if ((code === 'KeyD' || code === 'ArrowRight') && jx >  dead) return true;
  if ((code === 'KeyW' || code === 'ArrowUp')    && jy < -dead) return true;
  if ((code === 'KeyS' || code === 'ArrowDown')  && jy >  dead) return true;
  return false;
};

// ==============================================
// BOOT SEQUENCE
// ==============================================
AudioEngine.init();
Save.load();
Input.init();
updateCoinDisplays();
initParticles();
AudioEngine.startMusic();
MobileInput.init();
MobileInput.updateMobItemBtns();
