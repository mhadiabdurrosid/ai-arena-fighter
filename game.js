// ==============================================
// AUDIO ENGINE
// ==============================================
const AudioEngine = {
  ctx: null,
  enabled: true,
  musicEnabled: true,
  vol: 0.7,
  musicNode: null,
  musicGain: null,

  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  _play(fn) {
    if (!this.enabled || !this.ctx) return;
    try { fn(); } catch(e) {}
  },

  swoosh() {
    this._play(() => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(600, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);
      g.gain.setValueAtTime(this.vol * 0.4, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      o.start(); o.stop(this.ctx.currentTime + 0.15);
    });
  },

  hit() {
    this._play(() => {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 2;
      src.buffer = buf; src.connect(f); f.connect(g); g.connect(this.ctx.destination);
      g.gain.setValueAtTime(this.vol * 0.9, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      src.start();
    });
  },

  heavyHit() {
    this._play(() => {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.2));
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 400;
      src.buffer = buf; src.connect(f); f.connect(g); g.connect(this.ctx.destination);
      g.gain.setValueAtTime(this.vol * 1.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      src.start();
    });
  },

  playerHurt() {
    this._play(() => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = 'square'; o.frequency.value = 180;
      o.frequency.setValueAtTime(180, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.2);
      g.gain.setValueAtTime(this.vol * 0.5, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      o.start(); o.stop(this.ctx.currentTime + 0.2);
    });
  },

  dash() {
    this._play(() => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = 'sine'; o.frequency.value = 800;
      o.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.08);
      g.gain.setValueAtTime(this.vol * 0.3, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      o.start(); o.stop(this.ctx.currentTime + 0.08);
    });
  },

  useItem(type) {
    this._play(() => {
      if (type === 'heal') {
        [600, 800, 1000].forEach((f, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.connect(g); g.connect(this.ctx.destination);
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.06);
          g.gain.linearRampToValueAtTime(this.vol * 0.3, this.ctx.currentTime + i * 0.06 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.06 + 0.1);
          o.start(this.ctx.currentTime + i * 0.06);
          o.stop(this.ctx.currentTime + i * 0.06 + 0.1);
        });
      } else if (type === 'shield') {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(this.ctx.destination);
        o.type = 'square'; o.frequency.value = 300;
        o.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
        g.gain.setValueAtTime(this.vol * 0.4, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        o.start(); o.stop(this.ctx.currentTime + 0.2);
      } else if (type === 'rage') {
        [200, 400, 800].forEach((f, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.connect(g); g.connect(this.ctx.destination);
          o.type = 'sawtooth'; o.frequency.value = f;
          g.gain.setValueAtTime(this.vol * 0.35, this.ctx.currentTime + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.05 + 0.1);
          o.start(this.ctx.currentTime + i * 0.05);
          o.stop(this.ctx.currentTime + i * 0.05 + 0.1);
        });
      }
    });
  },

  victory() {
    this._play(() => {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(this.ctx.destination);
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(this.vol * 0.4, this.ctx.currentTime + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.18);
        o.start(this.ctx.currentTime + i * 0.12);
        o.stop(this.ctx.currentTime + i * 0.12 + 0.2);
      });
    });
  },

  defeat() {
    this._play(() => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.6);
      g.gain.setValueAtTime(this.vol * 0.5, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
      o.start(); o.stop(this.ctx.currentTime + 0.6);
    });
  },

  startMusic() {
    if (!this.musicEnabled || !this.ctx) return;
    this.stopMusic();
    const bpm = 140, beat = 60 / bpm;
    const pattern     = [1,0,0,1,0,1,0,0,1,0,1,0,0,1,0,0];
    const bassPattern = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0];
    let step = 0, bass = 0;
    const mg = this.ctx.createGain(); mg.gain.value = 0.08; mg.connect(this.ctx.destination);
    this.musicGain = mg;

    const tick = () => {
      if (!this.musicEnabled) return;
      if (pattern[step % 16]) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(mg);
        o.type = 'square';
        const notes = [220, 277, 330, 370];
        o.frequency.value = notes[Math.floor(Math.random() * notes.length)] * 2;
        g.gain.setValueAtTime(0.5, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beat * 0.4);
        o.start(); o.stop(this.ctx.currentTime + beat * 0.4);
      }
      if (bassPattern[bass % 16]) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(mg);
        o.type = 'sawtooth';
        const b = [55, 73, 82, 73];
        o.frequency.value = b[Math.floor(bass / 4) % 4];
        g.gain.setValueAtTime(0.8, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beat * 0.9);
        o.start(); o.stop(this.ctx.currentTime + beat * 0.9);
      }
      step++; bass++;
      this.musicNode = setTimeout(tick, beat * 1000);
    };
    tick();
  },

  stopMusic() {
    if (this.musicNode) { clearTimeout(this.musicNode); this.musicNode = null; }
  }
};

// ==============================================
// SAVE / STATE
// ==============================================
const Save = {
  coins: 0,
  ownedItems: {},
  equippedSlots: [null, null],
  highScore: 0,
  diffLevels: { easy: 1, medium: 1, hard: 1 },
  selectedChar: 'striker',

  get currentLevel() { return this.diffLevels[Settings ? Settings.difficulty : 'easy'] || 1; },
  set currentLevel(v) { this.diffLevels[Settings ? Settings.difficulty : 'easy'] = v; },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('aaf_save') || '{}');
      this.coins         = d.coins         || 0;
      this.ownedItems    = d.ownedItems    || {};
      this.equippedSlots = d.equippedSlots || [null, null];
      this.highScore     = d.highScore     || 0;
      this.diffLevels    = d.diffLevels    || { easy: 1, medium: 1, hard: 1 };
      this.selectedChar  = d.selectedChar  || 'striker';
    } catch(e) {}
  },

  save() {
    try {
      localStorage.setItem('aaf_save', JSON.stringify({
        coins:         this.coins,
        ownedItems:    this.ownedItems,
        equippedSlots: this.equippedSlots,
        highScore:     this.highScore,
        diffLevels:    this.diffLevels,
        selectedChar:  this.selectedChar
      }));
    } catch(e) {}
  },

  addCoins(n) { this.coins += n; this.save(); updateCoinDisplays(); }
};

// ==============================================
// SHOP DATA
// ==============================================
const ITEMS = [
  { id: 'sword_blue',    name: 'AZURE BLADE',   icon: '⚔️', desc: 'Pedang berenergi biru. +20% damage setiap serangan.',           price: 200, type: 'weapon',     stat: { dmgMult: 1.2 },          slot: 'weapon'  },
  { id: 'sword_fire',    name: 'INFERNO BLADE',  icon: '🗡️', desc: 'Pedang api merah. +40% damage, efek burn.',                    price: 450, type: 'weapon',     stat: { dmgMult: 1.4, burn: true }, slot: 'weapon'  },
  { id: 'potion_hp',     name: 'HP VIAL',        icon: '🧪', desc: 'Pulihkan 30 HP instan saat digunakan.',                        price: 150, type: 'consumable',  stat: { heal: 30 },              uses: 3, slot: 'item' },
  { id: 'shield_orb',   name: 'SHIELD ORB',     icon: '🛡️', desc: 'Blok 1 serangan musuh selama 4 detik.',                        price: 250, type: 'consumable',  stat: { shield: 4 },             uses: 2, slot: 'item' },
  { id: 'rage_serum',   name: 'RAGE SERUM',     icon: '💉', desc: 'Tingkatkan speed +60% dan damage +50% selama 6 detik.',        price: 350, type: 'consumable',  stat: { rage: 6 },               uses: 2, slot: 'item' },
  { id: 'boots',         name: 'CYBER BOOTS',    icon: '👟', desc: 'Kecepatan gerak +25% permanen saat equipped.',                 price: 300, type: 'passive',     stat: { speedMult: 1.25 },       slot: 'passive' },
  { id: 'armor',         name: 'NANO ARMOR',     icon: '🦺', desc: 'Kurangi damage yang diterima sebesar 20%.',                    price: 400, type: 'passive',     stat: { defMult: 0.8 },          slot: 'passive' },
  { id: 'double_strike', name: 'DUAL STRIKE',    icon: '✦',  desc: 'Setiap serangan memiliki 30% chance untuk double hit.',        price: 500, type: 'passive',     stat: { doubleChance: 0.3 },     slot: 'passive' },
];

// ==============================================
// CHARACTER DEFINITIONS
// ==============================================
const CHARACTERS = [
  {
    id: 'striker',
    name: 'STRIKER',
    icon: '⚔️',
    tagline: 'Balanced fighter',
    price: 0,    // free / default
    colors: { body: '#0088cc', leg: '#005588', arm: '#006699', head: '#00aadd', visor: 'rgba(0,243,255,0.75)', glow: 'rgba(0,180,255,0.14)', trail: '#00f3ff' },
    stats: { maxHp: 100, baseSpeed: 4, baseAttackDmg: 12, attackRange: 72, dashCooldownBase: 38, dashDuration: 12 },
    desc: { hp: '●●●○○', spd: '●●●○○', dmg: '●●●○○', range: '●●●○○' },
    special: null
  },
  {
    id: 'tank',
    name: 'TANK',
    icon: '🛡️',
    tagline: 'Tough & hard-hitting',
    price: 300,
    colors: { body: '#556600', leg: '#334400', arm: '#445500', head: '#667700', visor: 'rgba(180,255,0,0.75)', glow: 'rgba(120,180,0,0.16)', trail: '#aaff00' },
    stats: { maxHp: 180, baseSpeed: 2.5, baseAttackDmg: 20, attackRange: 65, dashCooldownBase: 55, dashDuration: 10 },
    desc: { hp: '●●●●●', spd: '●○○○○', dmg: '●●●●○', range: '●●○○○' },
    special: 'Damage diterima -15% pasif'
  },
  {
    id: 'speedster',
    name: 'SPEEDSTER',
    icon: '⚡',
    tagline: 'Fast & agile',
    price: 350,
    colors: { body: '#770099', leg: '#440066', arm: '#660088', head: '#9900bb', visor: 'rgba(255,0,255,0.8)', glow: 'rgba(200,0,255,0.14)', trail: '#ff00ff' },
    stats: { maxHp: 70, baseSpeed: 6.5, baseAttackDmg: 9, attackRange: 68, dashCooldownBase: 18, dashDuration: 18 },
    desc: { hp: '●●○○○', spd: '●●●●●', dmg: '●●○○○', range: '●●●○○' },
    special: 'Dash 2× lebih cepat & pendek cooldown'
  },
  {
    id: 'mage',
    name: 'MAGE',
    icon: '🔮',
    tagline: 'Long-range burst damage',
    price: 400,
    colors: { body: '#880033', leg: '#550022', arm: '#770028', head: '#aa0044', visor: 'rgba(255,100,200,0.8)', glow: 'rgba(255,50,150,0.14)', trail: '#ff66cc' },
    stats: { maxHp: 75, baseSpeed: 3.5, baseAttackDmg: 22, attackRange: 120, dashCooldownBase: 45, dashDuration: 10 },
    desc: { hp: '●●○○○', spd: '●●○○○', dmg: '●●●●●', range: '●●●●●' },
    special: 'Attack range sangat jauh, burst damage tinggi'
  }
];

// ==============================================
// SETTINGS
// ==============================================
const Settings = {
  sfx: true, music: true, sfxVol: 0.7,
  difficulty: 'easy', showMonitor: true
};

// ==============================================
// MAIN GAME OBJECT
// ==============================================
const Game = {
  canvas: null, ctx: null,
  player: null, enemy: null,
  running: false, paused: false,
  startTime: 0, particles: [], gridOff: 0,
  bgStars: [],

  init() {
    this.canvas = document.getElementById('gc');
    this.ctx    = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bgStars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 900, y: Math.random() * 500,
      s: Math.random() * 1.5 + 0.3, b: Math.random()
    }));
  },

  resize() {
    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const mobileControlH = isMobile ? 188 : 0;
    const mw = Math.min(window.innerWidth - 10, 900);
    const mh = Math.min(window.innerHeight - 110 - mobileControlH, 520);
    if (this.canvas) { this.canvas.width = mw; this.canvas.height = Math.max(mh, 220); }
  },

  start(diff, level) {
    level = level || Save.currentLevel || 1;
    this.currentLevel = level;
    this.running = true; this.startTime = Date.now(); this.particles = [];
    const cw = this.canvas.width, ch = this.canvas.height;
    this.player = new Player(90, ch - 145, cw, ch);
    // Apply selected character base stats
    const charDef = CHARACTERS.find(c => c.id === Save.selectedChar) || CHARACTERS[0];
    this.player.applyCharacter(charDef);
    this.player.applyEquipment();
    this.player.itemUseCounts = {};
    this.enemy = new Enemy(cw - 130, ch - 145, cw, ch, diff, level);
    this.gridOff = 0;
    document.getElementById('diff-disp').textContent  = diff.toUpperCase();
    document.getElementById('level-disp').textContent = level;
    document.getElementById('ai-monitor').style.display = Settings.showMonitor ? 'block' : 'none';
    this.updateItemSlots();
    this.loop();
  },

  updateItemSlots() {
    const slots = document.getElementById('item-slots');
    slots.innerHTML = '';
    [1, 2].forEach((si) => {
      const itemId = Save.equippedSlots[si];
      const item   = itemId ? ITEMS.find(i => i.id === itemId) : null;
      const el     = document.createElement('div');
      el.className = 'item-slot' + (item ? ' ready' : '');
      el.innerHTML = item
        ? `<span class="slot-icon">${item.icon}</span><span class="slot-key">[${si}]</span>`
        : `<span class="slot-icon" style="opacity:.3">○</span><span class="slot-key">[${si}]</span>`;
      slots.appendChild(el);
    });
    MobileInput.updateMobItemBtns();
  },

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  },

  update() {
    const p = this.player, e = this.enemy;
    p.update(); e.update(p);

    // Player hits enemy
    if (p.isInAttackRange(e) && e.state !== S.DEAD) {
      let dmg = p.attackDmg;
      if (p.doubleChance > 0 && Math.random() < p.doubleChance) dmg *= 2;
      e.takeDamage(dmg);
      p.hitsLanded++;
      p.comboCount++;
      if (p.comboCount > p.bestCombo) p.bestCombo = p.comboCount;
      p.comboTimer = 70;
      const pts = 10 + p.comboCount * 5;
      p.addScore(pts);
      AudioEngine.hit();
      this.spawnHit(e.cx, e.cy, '#ff003c', true);
      if (p.weapon?.stat?.burn) this.spawnHit(e.cx, e.cy, '#ff8800', false);
    }

    // Particles
    this.particles = this.particles.filter(pt => pt.life > 0);
    this.particles.forEach(pt => pt.update());

    this.gridOff = (this.gridOff + 0.4) % 50;
    this._updateHUD();

    // Check end condition
    if ((p.hp <= 0 || e.hp <= 0) && this.running) {
      this.running = false;
      const won = e.hp <= 0;
      if (won) { AudioEngine.victory(); p.addScore(500 + p.hp * 2); }
      else AudioEngine.defeat();
      setTimeout(() => this.endGame(won), 700);
    }
    Input.clear();
  },

  spawnHit(x, y, color, big) {
    const n = big ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = big ? (3 + Math.random() * 5) : (2 + Math.random() * 3);
      this.particles.push(new Particle(x, y, color, { vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 18 + Math.random() * 16, size: big ? 3 : 2 }));
    }
    if (big) {
      this.particles.push(new Particle(x, y, color, { vx: 0, vy: 0, life: 12, size: 20, gravity: 0, shape: 'ring' }));
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        this.particles.push(new Particle(x, y, '#ffffff', { vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 - 1, life: 10, size: 1.5, gravity: 0.1 }));
      }
    }
  },

  spawnHeal(x, y) {
    for (let i = 0; i < 12; i++) {
      this.particles.push(new Particle(x, y - 10, '#00ff88', { vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 4 - 1, life: 30 + Math.random() * 20, size: 3, gravity: -0.05 }));
    }
  },

  _updateHUD() {
    const p = this.player, e = this.enemy;
    document.getElementById('p-hp-bar').style.width = (p.hp / p.maxHp * 100) + '%';
    document.getElementById('e-hp-bar').style.width = (e.hp / e.maxHp * 100) + '%';
    document.getElementById('p-hp-txt').textContent = `${p.hp}/${p.maxHp}`;
    document.getElementById('e-hp-txt').textContent = `${e.hp}/${e.maxHp}`;
    const eLabel = document.querySelectorAll('.hp-label')[1];
    if (eLabel && !eLabel._lvlSet) { eLabel._lvlSet = true; eLabel.textContent = `ENEMY AI Lv.${this.currentLevel || 1} ◈`; }
    document.getElementById('score-disp').textContent = p.score;
    const el = Math.floor((Date.now() - this.startTime) / 1000);
    document.getElementById('timer-disp').textContent = `${String(Math.floor(el / 60)).padStart(2,'0')}:${String(el % 60).padStart(2,'0')}`;
    // AI Monitor
    const states = { IDLE: 'ai-idle', CHASE: 'ai-chase', ATTACK: 'ai-attack', DODGE: 'ai-dodge', DEAD: 'ai-dead' };
    Object.entries(states).forEach(([s, id]) => {
      const el2 = document.getElementById(id);
      if (el2) el2.classList.toggle('lit', s === e.state);
    });
    // Item slot cooldown
    const slotEls = document.querySelectorAll('.item-slot');
    slotEls.forEach((el3, i) => {
      const cd = this.player.itemCooldowns[i];
      let cdEl = el3.querySelector('.slot-cd');
      if (cd > 0) {
        if (!cdEl) { cdEl = document.createElement('div'); cdEl.className = 'slot-cd'; el3.appendChild(cdEl); }
        cdEl.textContent = Math.ceil(cd / 60);
      } else if (cdEl) cdEl.remove();
    });
  },

  draw() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    const p = this.player, e = this.enemy;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#010c1e'); bg.addColorStop(1, '#020810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

    // Stars
    this.bgStars.forEach(s => {
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.002 + s.b * 10) * 0.2;
      ctx.fillStyle = '#aaddff';
      ctx.beginPath(); ctx.arc(s.x % cw, s.y, s.s, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Scrolling grid
    ctx.strokeStyle = 'rgba(0,243,255,0.07)'; ctx.lineWidth = 1;
    const gs = 50;
    for (let x = (-this.gridOff % gs); x < cw; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke(); }
    for (let y = 0; y < ch; y += gs)                     { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke(); }

    // Perspective floor grid
    const fy = ch - 80;
    for (let i = 0; i < 8; i++) {
      const t = i / 7, y2 = fy + t * (ch - fy);
      ctx.strokeStyle = `rgba(0,243,255,${0.05 + t * 0.12})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(cw, y2); ctx.stroke();
      if (i > 0) {
        ctx.strokeStyle = `rgba(0,243,255,${0.04 + t * 0.06})`;
        const sx = cw / 2, spread = t * cw;
        ctx.beginPath(); ctx.moveTo(sx, fy); ctx.lineTo(sx - spread / 2, ch); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, fy); ctx.lineTo(sx + spread / 2, ch); ctx.stroke();
      }
    }

    // Floor line
    const flg = ctx.createLinearGradient(0, fy, 0, fy + 12);
    flg.addColorStop(0, 'rgba(0,243,255,0.5)'); flg.addColorStop(1, 'rgba(0,243,255,0)');
    ctx.fillStyle = flg; ctx.fillRect(0, fy, cw, 12);
    ctx.strokeStyle = 'rgba(0,243,255,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(cw, fy); ctx.stroke();
    ctx.fillStyle = 'rgba(0,243,255,0.025)'; ctx.fillRect(0, fy, cw, ch - fy);

    // Arena pillars
    [0.15, 0.5, 0.85].forEach(t => {
      const px = cw * t;
      ctx.fillStyle = 'rgba(0,30,60,0.6)'; ctx.fillRect(px - 18, 60, 36, fy - 60);
      ctx.strokeStyle = 'rgba(0,243,255,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(px - 18, 60, 36, fy - 60);
      ctx.fillStyle = 'rgba(0,243,255,0.08)'; ctx.fillRect(px - 22, 58, 44, 10);
    });

    // Background energy lines
    const t = Date.now() * 0.001;
    ctx.globalAlpha = 0.06;
    [0.2, 0.5, 0.8].forEach((xp, i) => {
      const x2 = cw * xp + Math.sin(t + i) * 20;
      ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2 + Math.sin(t) * 40, fy); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Particles (behind chars)
    this.particles.filter(pt => pt.shape === 'ring').forEach(pt => pt.draw(ctx));

    // Characters
    e.draw(ctx); p.draw(ctx);

    // Particles (front)
    this.particles.filter(pt => pt.shape !== 'ring').forEach(pt => pt.draw(ctx));

    // Distance dot
    if (p && e && e.state !== S.DEAD) {
      const dist = Math.round(Math.sqrt(Math.pow(e.cx - p.cx, 2) + Math.pow(e.cy - p.cy, 2)));
      ctx.fillStyle = 'rgba(0,243,255,.2)';
      ctx.font = '10px "Share Tech Mono"';
      ctx.textAlign = 'left'; ctx.fillText(`DIST:${dist}`, 8, 16);
    }

    // Combo display
    if (p && p.comboTimer > 0 && p.comboCount >= 2) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.comboTimer / 25);
      ctx.font = `bold ${18 + p.comboCount * 2}px "Orbitron"`;
      ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 14;
      ctx.textAlign = 'center';
      ctx.fillText(`${p.comboCount}× COMBO!`, cw / 2, ch / 2 - 50);
      ctx.restore();
    }

    // Watermark
    ctx.fillStyle = 'rgba(0,243,255,.15)';
    ctx.font = '10px "Share Tech Mono"';
    ctx.textAlign = 'right';
    ctx.fillText(`AI:FSM v2.0  LVL ${this.currentLevel || 1}`, cw - 8, 16);
  },

  endGame(won) {
    const el = Math.floor((Date.now() - this.startTime) / 1000);
    const mm = String(Math.floor(el / 60)).padStart(2, '0');
    const ss = String(el % 60).padStart(2, '0');
    const lvlBonus = won ? this.currentLevel * 20 : 0;
    const cr = Math.floor(this.player.score / 10) + (won ? 50 + lvlBonus : 10);
    Save.addCoins(cr);
    if (this.player.score > Save.highScore) { Save.highScore = this.player.score; Save.save(); }

    if (won && this.currentLevel >= Save.diffLevels[Settings.difficulty]) {
      Save.diffLevels[Settings.difficulty] = this.currentLevel + 1;
      Save.save();
    }

    document.getElementById('r-time').textContent  = `${mm}:${ss}`;
    document.getElementById('r-score').textContent = this.player.score;
    document.getElementById('r-hits').textContent  = this.player.hitsLanded;
    document.getElementById('r-combo').textContent = this.player.bestCombo;
    document.getElementById('r-cr').textContent    = `+${cr} CR`;
    document.getElementById('res-coins').textContent    = `◈ CREDITS EARNED: +${cr} CR`;
    document.getElementById('res-level-tag').textContent = `LEVEL ${this.currentLevel}`;

    const title = document.getElementById('res-title'), sub = document.getElementById('res-sub');
    const nextBtn = document.getElementById('btn-next-level');
    if (won) {
      title.textContent = 'VICTORY'; title.className = 'result-title win';
      sub.textContent = `LEVEL ${this.currentLevel} CLEARED! ◈ ENEMY AI DEFEATED`;
      nextBtn.style.display = 'block'; nextBtn.textContent = `▶▶ LEVEL ${this.currentLevel + 1}`;
    } else {
      title.textContent = 'DEFEATED'; title.className = 'result-title lose';
      sub.textContent = 'PLAYER ELIMINATED'; nextBtn.style.display = 'none';
    }
    showScreen('gameover-screen');
  }
};
