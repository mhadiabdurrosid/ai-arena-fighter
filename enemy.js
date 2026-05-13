// ==============================================
// ENEMY FSM AI
// ==============================================
const S = { IDLE: 'IDLE', CHASE: 'CHASE', ATTACK: 'ATTACK', DODGE: 'DODGE', DEAD: 'DEAD' };

class Enemy {
  constructor(x, y, cw, ch, diff, level) {
    this.x = x; this.y = y; this.w = 34; this.h = 52;
    this.cw = cw; this.ch = ch; this.groundY = ch - 80;
    level = level || 1;
    const lvl = Math.min(level, 20);
    const hpScale  = 1 + (lvl - 1) * 0.18;
    const dmgScale = 1 + (lvl - 1) * 0.12;
    const spdScale = 1 + (lvl - 1) * 0.05;
    const atkScale = 1 + (lvl - 1) * 0.04;
    const cfg = {
      easy:   { maxHp: 100, speed: 1.7, dmg: 8,  detect: 210, range: 62, atkRate: .012, dodgeP: .15, dodgeSpd: 2.5, reactionDelay: 18 },
      medium: { maxHp: 100, speed: 2.9, dmg: 14, detect: 310, range: 68, atkRate: .025, dodgeP: .35, dodgeSpd: 4.0, reactionDelay: 10 },
      hard:   { maxHp: 100, speed: 4.3, dmg: 22, detect: 420, range: 72, atkRate: .045, dodgeP: .62, dodgeSpd: 6.2, reactionDelay: 4  }
    }[diff] || { maxHp: 100, speed: 2.9, dmg: 14, detect: 310, range: 68, atkRate: .025, dodgeP: .35, dodgeSpd: 4.0, reactionDelay: 10 };
    Object.assign(this, cfg);
    this.maxHp    = Math.round(cfg.maxHp    * hpScale);
    this.dmg      = Math.round(cfg.dmg      * dmgScale);
    this.speed    = +(cfg.speed    * spdScale).toFixed(2);
    this.dodgeSpd = +(cfg.dodgeSpd * spdScale).toFixed(2);
    this.atkRate  = Math.min(cfg.atkRate * atkScale, 0.08);
    this.dodgeP   = Math.min(cfg.dodgeP  + (lvl - 1) * 0.015, 0.9);
    this.hp = this.maxHp; this.level = level;
    this.state = S.IDLE; this.prevState = null;
    this.attackTimer = 0; this.attackCooldown = 0;
    this.dodgeTimer = 0; this.dodgeDX = 0; this.dodgeDY = 0;
    this.hitFlash = 0; this.facingRight = false;
    this.wanderX = x; this.wanderTimer = 0;
    this.bodyAngle = 0; this.armSwing = 0; this.walkCycle = 0;
    this.swordAngle = 0; this.reactionTimer = 0;
    this.deathAlpha = 1; this.deathY = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  dist(p) {
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setState(s) { if (this.state !== s) { this.prevState = this.state; this.state = s; } }

  update(player) {
    if (this.hitFlash > 0)      this.hitFlash--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hp <= 0 && this.state !== S.DEAD) this.setState(S.DEAD);
    const d = this.dist(player);
    switch (this.state) {
      case S.IDLE:   this._idle(player, d);   break;
      case S.CHASE:  this._chase(player, d);  break;
      case S.ATTACK: this._attack(player, d); break;
      case S.DODGE:  this._dodge(player, d);  break;
      case S.DEAD:   this._dead();            break;
    }
  }

  _idle(p, d) {
    this.wanderTimer--;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 70 + Math.random() * 80;
      this.wanderX = this.x + (Math.random() - 0.5) * 90;
      this.wanderX = Math.max(60, Math.min(this.cw - 90, this.wanderX));
    }
    const dx = this.wanderX - this.cx;
    if (Math.abs(dx) > 8) { this.x += Math.sign(dx) * 0.9; this.facingRight = dx > 0; }
    this.bodyAngle = Math.sin(Date.now() * 0.0025) * 0.04;
    if (d < this.detect) {
      this.reactionTimer = this.reactionDelay;
      this.setState(S.CHASE);
    }
  }

  _chase(p, d) {
    if (this.reactionTimer > 0) { this.reactionTimer--; return; }
    const dx = p.cx - this.cx, dy = p.cy - this.cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x += (dx / len) * this.speed; this.y += (dy / len) * this.speed;
    this.facingRight = dx > 0; this.walkCycle += 0.15;
    this.bodyAngle = Math.sin(this.walkCycle) * 0.07;
    this.x = Math.max(0, Math.min(this.cw - this.w, this.x));
    this.y = Math.max(0, Math.min(this.groundY - this.h, this.y));
    if (d < this.range)           { this.setState(S.ATTACK); this.attackTimer = 28; this.didHit = false; }
    if (d > this.detect * 1.5)   this.setState(S.IDLE);
  }

  _attack(p, d) {
    this.attackTimer--;
    this.swordAngle = Math.sin((28 - this.attackTimer) * 0.3) * 1.6;
    this.facingRight = p.cx > this.cx;
    const dx = p.cx - this.cx, dy = p.cy - this.cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x += (dx / len) * this.speed * 0.35; this.y += (dy / len) * this.speed * 0.35;
    if (this.attackTimer === 11 && !this.didHit && d < this.range + 10) {
      this.didHit = true; p.takeDamage(this.dmg);
    }
    if (this.attackTimer <= 0) {
      this.swordAngle = 0;
      if (Math.random() < this.dodgeP) {
        this.setState(S.DODGE); this.dodgeTimer = 25 + Math.random() * 18;
        const a = Math.atan2(dy, dx);
        this.dodgeDX = -Math.cos(a); this.dodgeDY = -Math.sin(a) * 0.4;
      } else { this.attackCooldown = 18; this.setState(S.CHASE); }
    }
  }

  _dodge(p, d) {
    this.dodgeTimer--;
    this.x += this.dodgeDX * this.dodgeSpd; this.y += this.dodgeDY * this.dodgeSpd;
    this.x = Math.max(0, Math.min(this.cw - this.w, this.x));
    this.y = Math.max(0, Math.min(this.groundY - this.h, this.y));
    this.facingRight = p.cx > this.cx;
    this.bodyAngle = this.dodgeDX * 0.18;
    if (this.dodgeTimer <= 0) { this.bodyAngle = 0; this.setState(S.CHASE); }
  }

  _dead() {
    this.deathAlpha = Math.max(0, this.deathAlpha - 0.015);
    this.deathY += 1.5;
    this.bodyAngle += 0.04;
  }

  takeDamage(dmg) {
    if (this.state === S.DEAD) return;
    this.hp = Math.max(0, this.hp - dmg); this.hitFlash = 14;
    if (this.state === S.IDLE) this.setState(S.CHASE);
  }

  draw(ctx) {
    if (this.state === S.DEAD) ctx.globalAlpha = this.deathAlpha;
    const dead  = this.state === S.DEAD;
    const flash = this.hitFlash > 0 && this.hitFlash % 4 < 2;
    ctx.save();
    ctx.translate(this.cx, this.cy + (dead ? this.deathY : 0));
    if (!this.facingRight) ctx.scale(-1, 1);
    ctx.rotate(this.bodyAngle);
    if (flash) ctx.globalAlpha = 0.4;

    // Glow
    const eg = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    eg.addColorStop(0, 'rgba(255,0,60,0.12)'); eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg; ctx.fillRect(-24, -32, 48, 64);

    // Legs
    const legOff = Math.sin(this.walkCycle) * 5;
    ctx.fillStyle = dead ? '#220010' : '#770020';
    ctx.fillRect(-12, 10, 10, 20 + legOff); ctx.fillRect(2, 10, 10, 20 - legOff);

    // Body
    ctx.fillStyle = flash ? '#fff' : dead ? '#330010' : '#bb0028';
    ctx.fillRect(-14, -16, 28, 26);
    ctx.fillStyle = dead ? 'rgba(80,0,0,0.4)' : 'rgba(255,60,60,0.4)';
    ctx.fillRect(-7, -12, 14, 3); ctx.fillRect(-7, -6, 14, 3);

    // Left arm
    ctx.save(); ctx.translate(-17, -10); ctx.rotate(0.2);
    ctx.fillStyle = dead ? '#220010' : '#880018'; ctx.fillRect(-4, 0, 8, 17); ctx.restore();

    // Right arm + sword
    ctx.save(); ctx.translate(17, -10); ctx.rotate(this.swordAngle - 0.2);
    ctx.fillStyle = dead ? '#220010' : '#880018'; ctx.fillRect(-4, 0, 8, 17);
    this._drawEnemySword(ctx, 0, 17, dead);
    if (this.state === S.ATTACK && this.attackTimer > 9) {
      ctx.fillStyle = 'rgba(255,60,0,0.55)';
      ctx.beginPath(); ctx.arc(0, 28, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Head
    ctx.fillStyle = flash ? '#fff' : dead ? '#330010' : '#dd1133';
    ctx.fillRect(-11, -32, 22, 18);
    ctx.fillStyle = dead ? 'rgba(80,0,0,0.5)' : 'rgba(255,60,80,0.8)';
    ctx.fillRect(-9, -28, 18, 6);

    // Dodge trail
    if (this.state === S.DODGE) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.07 * (4 - i);
        ctx.fillStyle = '#ff003c';
        ctx.fillRect(-14 - i * 5 * this.dodgeDX, -16, 28, 26);
      }
    }
    ctx.globalAlpha = 1; ctx.restore();
    if (dead) ctx.globalAlpha = 1;

    if (this.state === S.ATTACK) {
      ctx.save(); ctx.translate(this.cx, this.cy);
      if (!this.facingRight) ctx.scale(-1, 1);
      const prog = 1 - this.attackTimer / 28;
      ctx.beginPath(); ctx.arc(0, 0, this.range, -0.7, 0.7);
      ctx.strokeStyle = `rgba(255,0,60,${0.18 + prog * 0.28})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
  }

  _drawEnemySword(ctx, x, y, dead) {
    ctx.save(); ctx.translate(x, y + 2);
    ctx.fillStyle = dead ? '#221100' : '#332211'; ctx.fillRect(-5, 0, 10, 8);
    ctx.fillStyle = dead ? '#332211' : '#554433'; ctx.fillRect(-7, 3, 14, 3);
    const blen = 32;
    ctx.fillStyle = dead ? '#440011' : '#cc2200';
    ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.lineTo(1, 8 + blen); ctx.lineTo(-1, 8 + blen); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dead ? 'rgba(80,0,0,0.5)' : '#ff4422';
    ctx.beginPath(); ctx.moveTo(-1, 8); ctx.lineTo(1, 8); ctx.lineTo(0.5, 8 + blen); ctx.lineTo(-0.5, 8 + blen); ctx.closePath(); ctx.fill();
    if (!dead) {
      ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 8 + blen);
      ctx.strokeStyle = 'rgba(255,80,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
