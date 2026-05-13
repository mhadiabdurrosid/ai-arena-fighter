// ==============================================
// PARTICLE CLASS
// ==============================================
class Particle {
  constructor(x, y, color, options = {}) {
    this.x = x; this.y = y; this.color = color;
    this.vx = options.vx !== undefined ? options.vx : (Math.random() - 0.5) * 6;
    this.vy = options.vy !== undefined ? options.vy : (Math.random() * -4 - 1);
    this.life = options.life !== undefined ? options.life : (20 + Math.random() * 20);
    this.maxLife = this.life;
    this.size = options.size !== undefined ? options.size : (2 + Math.random() * 3);
    this.gravity = options.gravity !== undefined ? options.gravity : 0.18;
    this.shape = options.shape || 'circle';
    this.rot = Math.random() * Math.PI * 2;
    this.rotV = (Math.random() - 0.5) * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.97;
    this.life--;
    this.rot += this.rotV;
  }

  draw(ctx) {
    const a = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    if (this.shape === 'spark') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillRect(-this.size / 2, -this.size * 2, this.size, this.size * 4);
    } else if (this.shape === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * (1 - a) * 20, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ==============================================
// PLAYER
// ==============================================
class Player {
  constructor(x, y, cw, ch) {
    this.x = x; this.y = y; this.w = 34; this.h = 52;
    this.cw = cw; this.ch = ch; this.groundY = ch - 80;
    this.maxHp = 100; this.hp = 100;
    this.baseSpeed = 4; this.speed = 4;
    this.isDashing = false; this.dashTimer = 0; this.dashCooldown = 0;
    this.dashDuration = 12; this.dashCooldownBase = 38;
    this.isAttacking = false; this.attackTimer = 0; this.attackCooldown = 0;
    this.attackRange = 72; this.baseAttackDmg = 12; this.attackDmg = 12;
    this.facingRight = true;
    this.hitFlash = 0; this.invincible = 0;
    this.hitsLanded = 0; this.comboCount = 0; this.comboTimer = 0; this.bestCombo = 0;
    this.score = 0;
    this.bodyAngle = 0; this.armSwing = 0; this.walkCycle = 0;
    // Items
    this.shieldActive = false; this.shieldTimer = 0;
    this.rageActive = false; this.rageTimer = 0;
    this.burnTimer = 0;
    this.itemCooldowns = [0, 0];
    this.itemUseCounts = {};
    // Weapon
    this.weapon = null; this.swordAngle = 0;
    // Passives
    this.speedMult = 1; this.defMult = 1; this.dmgMult = 1; this.doubleChance = 0;
    // Character appearance & special
    this.charId = 'striker';
    this.charColors = CHARACTERS[0].colors;
    this.charSpecial = null;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  applyCharacter(charDef) {
    this.charId      = charDef.id;
    this.charColors  = charDef.colors;
    this.charSpecial = charDef.special;
    const s = charDef.stats;
    this.maxHp           = s.maxHp;
    this.hp              = s.maxHp;
    this.baseSpeed       = s.baseSpeed;
    this.speed           = s.baseSpeed;
    this.baseAttackDmg   = s.baseAttackDmg;
    this.attackDmg       = s.baseAttackDmg;
    this.attackRange     = s.attackRange;
    this.dashCooldownBase = s.dashCooldownBase;
    this.dashDuration    = s.dashDuration;
    // Tank passive: -15% damage taken
    if (charDef.id === 'tank') this.defMult = 0.85;
  }

  applyEquipment() {
    const w = Save.equippedSlots[0] ? ITEMS.find(i => i.id === Save.equippedSlots[0]) : null;
    this.weapon = w;
    this.dmgMult = w?.stat?.dmgMult || 1;
    this.speedMult = 1; this.defMult = 1; this.doubleChance = 0;
    ITEMS.filter(i => i.type === 'passive' && Save.ownedItems[i.id]).forEach(item => {
      if (item.stat.speedMult)    this.speedMult    = item.stat.speedMult;
      if (item.stat.defMult)      this.defMult      = item.stat.defMult;
      if (item.stat.doubleChance) this.doubleChance = item.stat.doubleChance;
    });
    this.speed     = this.baseSpeed * this.speedMult;
    this.attackDmg = Math.round(this.baseAttackDmg * this.dmgMult);
  }

  update() {
    if (this.hitFlash > 0)   this.hitFlash--;
    if (this.invincible > 0) this.invincible--;
    if (this.dashCooldown > 0)   this.dashCooldown--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.comboTimer > 0) this.comboTimer--;
    else this.comboCount = 0;
    if (this.shieldTimer > 0) this.shieldTimer--;
    else this.shieldActive = false;
    if (this.rageTimer > 0) {
      this.rageTimer--;
      if (this.rageTimer === 0) {
        this.rageActive = false;
        this.speed = this.baseSpeed * this.speedMult;
        this.attackDmg = Math.round(this.baseAttackDmg * this.dmgMult);
      }
    }
    if (this.itemCooldowns[0] > 0) this.itemCooldowns[0]--;
    if (this.itemCooldowns[1] > 0) this.itemCooldowns[1]--;

    let mx = 0, my = 0;
    if (this.isDashing) {
      this.dashTimer--;
      mx = this.facingRight ? 10 : -10;
      if (this.dashTimer <= 0) this.isDashing = false;
    } else {
      if (Input.isDown('KeyA') || Input.isDown('ArrowLeft'))  { mx -= this.speed; this.facingRight = false; }
      if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) { mx += this.speed; this.facingRight = true;  }
      if (Input.isDown('KeyW') || Input.isDown('ArrowUp'))    my -= this.speed;
      if (Input.isDown('KeyS') || Input.isDown('ArrowDown'))  my += this.speed;
      if (Input.wasPressed('ShiftLeft') && this.dashCooldown <= 0) {
        this.isDashing = true; this.dashTimer = this.dashDuration; this.dashCooldown = this.dashCooldownBase;
        AudioEngine.dash();
      }
    }

    if (this.isAttacking) {
      this.attackTimer--;
      this.swordAngle = Math.sin((18 - this.attackTimer) * 0.25) * 1.8 - 0.3;
      if (this.attackTimer <= 0) { this.isAttacking = false; this.swordAngle = 0; }
    }
    // Use isDown so mobile touchstart hold works; attackCooldown prevents spam
    if ((Input.wasPressed('Space') || Input.isDown('Space')) && this.attackCooldown <= 0) {
      this.isAttacking = true; this.attackTimer = 18; this.attackCooldown = 20;
      AudioEngine.swoosh();
    }

    // Item use
    const slots = Save.equippedSlots;
    if (Input.wasPressed('Digit1') && slots[1] && this.itemCooldowns[0] <= 0) this.useItem(0);
    if (Input.wasPressed('Digit2') && slots[2] && this.itemCooldowns[1] <= 0) this.useItem(1);

    this.x = Math.max(0, Math.min(this.cw - this.w, this.x + mx));
    this.y = Math.max(0, Math.min(this.groundY - this.h, this.y + my));

    if (mx !== 0 || my !== 0) { this.walkCycle += 0.18; this.bodyAngle = Math.sin(this.walkCycle) * 0.05; }
    else this.bodyAngle *= 0.9;
  }

  useItem(slotIdx) {
    const itemId = slotIdx === 0 ? Save.equippedSlots[1] : Save.equippedSlots[2];
    if (!itemId) return;
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return;
    const used = this.itemUseCounts[itemId] || 0;
    if (used >= (item.uses || 1)) { showNotif('OUT OF USES', 'warn'); return; }
    this.itemUseCounts[itemId] = used + 1;
    this.itemCooldowns[slotIdx] = 120;
    AudioEngine.useItem(item.id.includes('potion') ? 'heal' : item.id.includes('shield') ? 'shield' : 'rage');
    if (item.stat.heal)   { this.hp = Math.min(this.maxHp, this.hp + item.stat.heal); showNotif(`+${item.stat.heal} HP RESTORED`, 'success'); }
    if (item.stat.shield) { this.shieldActive = true; this.shieldTimer = item.stat.shield * 60; showNotif('SHIELD ACTIVE', 'success'); }
    if (item.stat.rage)   { this.rageActive = true; this.rageTimer = item.stat.rage * 60; this.speed = this.baseSpeed * this.speedMult * 1.6; this.attackDmg = Math.round(this.baseAttackDmg * this.dmgMult * 1.5); showNotif('RAGE MODE!', 'success'); }
  }

  takeDamage(dmg) {
    if (this.invincible > 0) return;
    if (this.shieldActive) { this.shieldActive = false; this.shieldTimer = 0; showNotif('SHIELD BLOCKED!'); AudioEngine.hit(); return; }
    const actual = Math.round(dmg * this.defMult);
    this.hp = Math.max(0, this.hp - actual);
    this.hitFlash = 14; this.invincible = 20;
    AudioEngine.playerHurt();
  }

  isInAttackRange(enemy) {
    if (!this.isAttacking || this.attackTimer !== 9) return false;
    const dx = enemy.cx - this.cx, dy = enemy.cy - this.cy;
    return Math.sqrt(dx * dx + dy * dy) < this.attackRange &&
      ((this.facingRight && dx > 0) || (!this.facingRight && dx < 0));
  }

  addScore(pts) { this.score += pts; }

  draw(ctx) {
    const cx = this.cx, cy = this.cy;
    const C = this.charColors; // shorthand
    ctx.save();
    ctx.translate(cx, cy);
    if (!this.facingRight) ctx.scale(-1, 1);
    ctx.rotate(this.bodyAngle);

    const flash = this.hitFlash > 0 && this.hitFlash % 4 < 2;
    ctx.globalAlpha = flash ? 0.5 : 1;

    // Shield bubble
    if (this.shieldActive) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.01) * 0.1;
      ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.08; ctx.fillStyle = '#00f3ff';
      ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Rage aura
    if (this.rageActive) {
      ctx.save();
      ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.02) * 0.08;
      ctx.fillStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(0, 2, 30, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Body glow
    const bg = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    bg.addColorStop(0, this.rageActive ? 'rgba(255,136,0,0.18)' : C.glow);
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg; ctx.fillRect(-24, -32, 48, 64);

    // TANK: wider body shape
    const bodyW = this.charId === 'tank' ? 18 : 14;
    const bodyH = this.charId === 'tank' ? 30 : 26;

    // Legs
    const legOff = Math.sin(this.walkCycle) * 6;
    ctx.fillStyle = this.rageActive ? '#774400' : C.leg;
    ctx.fillRect(-12, 10, 10, 20 + legOff);
    ctx.fillRect(2,  10, 10, 20 - legOff);
    // Boots
    if (Save.ownedItems['boots']) {
      ctx.fillStyle = '#00cc88';
      ctx.fillRect(-13, 26 + legOff, 11, 5);
      ctx.fillRect(1,   26 - legOff, 11, 5);
    }

    // Body
    const bodyColor = flash ? '#ffffff' : this.rageActive ? '#cc4400' : C.body;
    ctx.fillStyle = bodyColor; ctx.fillRect(-bodyW, -16, bodyW * 2, bodyH);
    // Armor overlay
    if (Save.ownedItems['armor']) {
      ctx.fillStyle = 'rgba(150,150,255,0.25)'; ctx.fillRect(-bodyW, -16, bodyW * 2, bodyH);
      ctx.strokeStyle = 'rgba(150,150,255,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(-bodyW, -16, bodyW * 2, bodyH);
    }
    // Chest detail lines
    const cc = this.rageActive ? 'rgba(255,150,0,0.5)' : C.visor.replace('0.75','0.45').replace('0.8','0.45');
    ctx.fillStyle = cc; ctx.fillRect(-7, -12, 14, 3); ctx.fillRect(-7, -6, 14, 3);

    // MAGE: robe flair at bottom
    if (this.charId === 'mage') {
      ctx.fillStyle = C.body + 'aa';
      ctx.beginPath();
      ctx.moveTo(-bodyW, 10); ctx.lineTo(-bodyW - 6, 22); ctx.lineTo(bodyW + 6, 22); ctx.lineTo(bodyW, 10);
      ctx.closePath(); ctx.fill();
    }

    // Left arm
    ctx.save(); ctx.translate(-17, -10); ctx.rotate(0.2);
    ctx.fillStyle = this.rageActive ? '#993300' : C.arm;
    ctx.fillRect(-4, 0, 8, 17); ctx.restore();

    // Right arm + weapon
    ctx.save(); ctx.translate(17, -10); ctx.rotate(this.swordAngle - 0.2);
    ctx.fillStyle = this.rageActive ? '#993300' : C.arm;
    ctx.fillRect(-4, 0, 8, 17);
    this._drawWeapon(ctx, 0, 17);
    if (this.isAttacking) {
      ctx.fillStyle = this.rageActive ? 'rgba(255,150,0,0.6)' : C.visor.replace('0.75','0.55').replace('0.8','0.55');
      ctx.beginPath(); ctx.arc(0, 28, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Head
    const headW = this.charId === 'tank' ? 13 : 11;
    ctx.fillStyle = flash ? '#ffffff' : this.rageActive ? '#cc3300' : C.head;
    ctx.fillRect(-headW, -32, headW * 2, 18);
    // Visor
    ctx.fillStyle = this.rageActive ? 'rgba(255,100,0,0.8)' : C.visor;
    ctx.fillRect(-headW + 2, -28, (headW - 2) * 2, 6);
    // SPEEDSTER: antenna
    if (this.charId === 'speedster') {
      ctx.strokeStyle = C.visor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, -42); ctx.stroke();
      ctx.fillStyle = C.visor;
      ctx.beginPath(); ctx.arc(0, -43, 3, 0, Math.PI * 2); ctx.fill();
    }
    // MAGE: pointy hat
    if (this.charId === 'mage') {
      ctx.fillStyle = C.body;
      ctx.beginPath();
      ctx.moveTo(-headW, -32); ctx.lineTo(headW, -32); ctx.lineTo(4, -50); ctx.lineTo(-4, -50);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.visor; ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Dash trail
    if (this.isDashing) {
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.07 * (5 - i);
        ctx.fillStyle = this.rageActive ? '#ff8800' : C.trail;
        ctx.fillRect(-14 + i * 5 * (!this.facingRight ? 1 : -1), -16, 28, 26);
      }
    }

    ctx.globalAlpha = 1; ctx.restore();

    // Attack arc indicator
    if (this.isAttacking) {
      ctx.save(); ctx.translate(cx, cy);
      if (!this.facingRight) ctx.scale(-1, 1);
      const prog = 1 - this.attackTimer / 18;
      ctx.beginPath(); ctx.arc(0, 0, this.attackRange, -0.7 + prog * 0.5, 0.7 - prog * 0.5);
      const ac = this.rageActive ? `rgba(255,136,0,${0.2 + prog * 0.3})` : C.trail + (prog > 0.5 ? '88' : '44');
      ctx.strokeStyle = ac; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  _drawWeapon(ctx, x, y) {
    const wid = this.weapon;
    const baseColor  = wid?.id === 'sword_fire' ? '#ff4400' : wid?.id === 'sword_blue' ? '#00aaff' : '#8888aa';
    const glowColor  = wid?.id === 'sword_fire' ? '#ff8800' : wid?.id === 'sword_blue' ? '#00f3ff' : '#aaaacc';
    ctx.save(); ctx.translate(x, y + 2);
    // Hilt
    ctx.fillStyle = '#334455'; ctx.fillRect(-5, 0, 10, 8);
    ctx.fillStyle = '#556677'; ctx.fillRect(-7, 3, 14, 3);
    // Blade
    const blen = wid ? 36 : 28;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(-3, 8); ctx.lineTo(3, 8);
    ctx.lineTo(1, 8 + blen); ctx.lineTo(-1, 8 + blen);
    ctx.closePath(); ctx.fill();
    // Edge highlight
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.moveTo(-1, 8); ctx.lineTo(1, 8);
    ctx.lineTo(0.5, 8 + blen); ctx.lineTo(-0.5, 8 + blen);
    ctx.closePath(); ctx.fill();
    // Glow
    if (wid) {
      ctx.shadowColor = glowColor; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 8 + blen);
      ctx.strokeStyle = glowColor + '88'; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
