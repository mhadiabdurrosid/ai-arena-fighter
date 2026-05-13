// ==============================================
// NOTIFICATIONS
// ==============================================
function showNotif(msg, type = '') {
  const div = document.createElement('div');
  div.className = 'notif-msg' + (type ? ' ' + type : '');
  div.textContent = msg;
  document.getElementById('notif').appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

function updateCoinDisplays() {
  document.getElementById('menu-coins').textContent = Save.coins;
  const sd = document.getElementById('shop-coins-disp');
  if (sd) sd.textContent = Save.coins;
  const cd = document.getElementById('char-coins-disp');
  if (cd) cd.textContent = Save.coins;
}

// ==============================================
// SCREEN MANAGEMENT
// ==============================================
function showScreen(id) {
  document.querySelectorAll('.screen,.subscreen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function showMenu() {
  showScreen('menu-screen');
  updateCoinDisplays();
  const diff = Settings.difficulty;
  const lvl  = Save.diffLevels[diff] || 1;
  const diffLabel = { easy: 'EASY', medium: 'MED', hard: 'HARD' }[diff];
  document.getElementById('btn-play').textContent = `▶ PLAY  —  ${diffLabel} LVL ${lvl}`;
  // Show selected char on play button area
  const charDef = CHARACTERS.find(c => c.id === Save.selectedChar) || CHARACTERS[0];
  document.getElementById('menu-char-badge').textContent = `${charDef.icon} ${charDef.name}`;
  AudioEngine.stopMusic();
  AudioEngine.startMusic();
}

// ==============================================
// CHARACTER SELECT UI
// ==============================================
function renderCharSelect() {
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  CHARACTERS.forEach(char => {
    const owned    = char.price === 0 || Save.ownedItems['char_' + char.id];
    const selected = Save.selectedChar === char.id;
    const cantAfford = !owned && Save.coins < char.price;
    const div = document.createElement('div');
    div.className = 'char-card' + (selected ? ' selected' : '') + (cantAfford ? ' cantafford' : '');
    div.innerHTML = `
      <div class="char-icon">${char.icon}</div>
      <div class="char-name">${char.name}</div>
      <div class="char-tag">${char.tagline}</div>
      <div class="char-bars">
        <div class="bar-row"><span>HP</span><span class="bar-dots">${char.desc.hp}</span></div>
        <div class="bar-row"><span>SPD</span><span class="bar-dots">${char.desc.spd}</span></div>
        <div class="bar-row"><span>DMG</span><span class="bar-dots">${char.desc.dmg}</span></div>
        <div class="bar-row"><span>RNG</span><span class="bar-dots">${char.desc.range}</span></div>
      </div>
      ${char.special ? `<div class="char-special">★ ${char.special}</div>` : ''}
      <div class="char-price">${owned ? (selected ? '✓ ACTIVE' : 'SELECT') : '◈ ' + char.price + ' CR'}</div>
      ${selected ? '<div class="char-badge active">ACTIVE</div>' : owned ? '<div class="char-badge owned">OWNED</div>' : ''}
    `;
    div.addEventListener('click', () => charSelectAction(char));
    grid.appendChild(div);
  });
}

function charSelectAction(char) {
  AudioEngine.resume();
  const owned = char.price === 0 || Save.ownedItems['char_' + char.id];
  if (!owned) {
    if (Save.coins < char.price) { showNotif('NOT ENOUGH CREDITS', 'warn'); return; }
    Save.coins -= char.price;
    Save.ownedItems['char_' + char.id] = true;
    Save.save(); updateCoinDisplays();
    showNotif(`${char.name} UNLOCKED!`, 'success');
    AudioEngine.useItem('heal');
  }
  Save.selectedChar = char.id;
  Save.save();
  showNotif(`${char.icon} ${char.name} SELECTED`, 'success');
  renderCharSelect();
}

// ==============================================
// SETTINGS UI
// ==============================================
function setSFX(on) {
  Settings.sfx = on; AudioEngine.enabled = on;
  document.getElementById('sfx-on').classList.toggle('active', on);
  document.getElementById('sfx-off').classList.toggle('active', !on);
}

function setMusic(on) {
  Settings.music = on; AudioEngine.musicEnabled = on;
  document.getElementById('mus-on').classList.toggle('active', on);
  document.getElementById('mus-off').classList.toggle('active', !on);
  if (!on) AudioEngine.stopMusic(); else AudioEngine.startMusic();
}

function setMonitor(on) {
  Settings.showMonitor = on;
  document.getElementById('mon-on').classList.toggle('active', on);
  document.getElementById('mon-off').classList.toggle('active', !on);
}

// ==============================================
// SHOP UI
// ==============================================
function renderShop() {
  document.getElementById('shop-coins-disp').textContent = Save.coins;
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';
  ITEMS.forEach(item => {
    const owned    = Save.ownedItems[item.id];
    const equipped = Save.equippedSlots.includes(item.id);
    const cantAfford = !owned && Save.coins < item.price;
    const div = document.createElement('div');
    div.className = 'shop-item' + (equipped ? ' equipped' : owned ? ' owned' : cantAfford ? ' cantafford' : '');
    div.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.desc}</div>
      <div class="item-price">${owned ? '<span style="color:var(--neon-green)">OWNED</span>' : '◈ ' + item.price + ' CR'}</div>
      ${equipped ? '<div class="item-badge equipped">EQUIPPED</div>' : owned ? '<div class="item-badge owned">OWNED</div>' : ''}
    `;
    div.addEventListener('click', () => shopAction(item));
    grid.appendChild(div);
  });
}

function shopAction(item) {
  AudioEngine.resume();
  if (!Save.ownedItems[item.id]) {
    if (Save.coins < item.price) { showNotif('NOT ENOUGH CREDITS', 'warn'); return; }
    Save.coins -= item.price; Save.ownedItems[item.id] = true; Save.save();
    showNotif(`${item.name} PURCHASED!`, 'success');
    AudioEngine.useItem('heal');
  }
  if (item.slot === 'weapon') {
    Save.equippedSlots[0] = Save.equippedSlots[0] === item.id ? null : item.id;
    showNotif(Save.equippedSlots[0] ? `${item.name} EQUIPPED` : 'WEAPON UNEQUIPPED');
  } else if (item.slot === 'item') {
    if      (Save.equippedSlots[1] === item.id) Save.equippedSlots[1] = null;
    else if (Save.equippedSlots[2] === item.id) Save.equippedSlots[2] = null;
    else if (!Save.equippedSlots[1])            Save.equippedSlots[1] = item.id;
    else if (!Save.equippedSlots[2])            Save.equippedSlots[2] = item.id;
    else { Save.equippedSlots[1] = item.id; showNotif('SLOT 1 REPLACED'); }
    showNotif(item.name + ' EQUIPPED TO SLOT');
  } else if (item.slot === 'passive') {
    showNotif(item.name + ' PASSIVE ACTIVE');
  }
  Save.save(); renderShop(); updateCoinDisplays();
}

// ==============================================
// MENU PARTICLES (decorative)
// ==============================================
function initParticles() {
  const c = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration  = (7 + Math.random() * 9) + 's';
    p.style.animationDelay    = (Math.random() * 9) + 's';
    p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
    c.appendChild(p);
  }
}

// ==============================================
// SETTINGS WIRING
// ==============================================
document.querySelectorAll('.diff-btn2').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn2').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); Settings.difficulty = b.dataset.d;
    // refresh play button so level shown matches selected difficulty
    const lvl = Save.diffLevels[Settings.difficulty] || 1;
    const diffLabel = { easy: 'EASY', medium: 'MED', hard: 'HARD' }[Settings.difficulty];
    document.getElementById('btn-play').textContent = `▶ PLAY  —  ${diffLabel} LVL ${lvl}`;
  });
});

document.getElementById('sfx-vol').addEventListener('input', e => {
  Settings.sfxVol = e.target.value / 100;
  AudioEngine.vol = Settings.sfxVol;
  document.getElementById('sfx-vol-label').textContent = e.target.value;
});

// ==============================================
// MENU BUTTON WIRING
// ==============================================
document.getElementById('btn-play').addEventListener('click', () => {
  AudioEngine.resume(); AudioEngine.stopMusic();
  showScreen('game-screen');
  if (!Game.canvas) Game.init(); else Game.resize();
  Game.start(Settings.difficulty, Save.currentLevel);
});

document.getElementById('btn-shop').addEventListener('click', () => {
  AudioEngine.resume(); renderShop(); showScreen('shop-screen');
});

document.getElementById('btn-char').addEventListener('click', () => {
  AudioEngine.resume(); renderCharSelect(); showScreen('char-screen');
});

document.getElementById('btn-info').addEventListener('click', () => { showScreen('info-screen'); });

document.getElementById('btn-settings').addEventListener('click', () => { showScreen('settings-screen'); });

document.getElementById('btn-retry').addEventListener('click', () => {
  AudioEngine.stopMusic(); showScreen('game-screen');
  if (!Game.canvas) Game.init(); else Game.resize();
  Game.start(Settings.difficulty, Game.currentLevel || Save.currentLevel);
});

document.getElementById('btn-next-level').addEventListener('click', () => {
  AudioEngine.resume(); AudioEngine.stopMusic();
  showScreen('game-screen');
  if (!Game.canvas) Game.init(); else Game.resize();
  const nextLvl = (Game.currentLevel || 1) + 1;
  Game.start(Settings.difficulty, nextLvl);
});

document.getElementById('btn-back-menu').addEventListener('click', () => showMenu());

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { AudioEngine.stopMusic(); showMenu(); Game.running = false; }
});

document.getElementById('gc') && document.getElementById('gc').addEventListener('touchstart', e => e.preventDefault(), { passive: false });
