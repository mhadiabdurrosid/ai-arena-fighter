// player.js - Player with Level, XP, Items
class Player {
  constructor(x, y, saveData) {
    this.x = x; this.y = y;
    this.width = 42; this.height = 58;
    this.baseSpeed = 4.5; this.speed = 4.5;
    this.baseMaxHp = 100;
    this.baseAttackDamage = 15;
    this.attackRange = 72;
    this.attackCooldownMax = 30;

    // Progress (persists across waves)
    this.level = saveData?.level || 1;
    this.xp = saveData?.xp || 0;
    this.xpToNext = this.calcXpToNext();
    this.coins = saveData?.coins || 0;
    this.kills = saveData?.kills || 0;
    this.totalDamageDealt = saveData?.totalDamageDealt || 0;

    // Items / buffs
    this.items = saveData?.items || { hpPotions: 0, attackBoost: 0, speedBoost: 0, shield: 0 };
    this.shieldActive = false;

    // Per-battle state
    this.maxHp = this.calcMaxHp();
    this.hp = this.maxHp;
    this.attackDamage = this.calcAttackDamage();
    this.speed = this.calcSpeed();

    this.attackCooldown = 0;
    this.isAttacking = false; this.attackTimer = 0; this.attackDuration = 12;
    this.facingRight = true;
    this.isHurt = false; this.hurtTimer = 0; this.hurtDuration = 20;
    this.isDead = false;
    this.particles = []; this.trailPositions = [];
    this.glowIntensity = 0;
    this.idleTimer = 0;
    // Potion cooldown UI
    this.potionCooldown = 0;
  }

  calcXpToNext() { return 80 + this.level * 40; }
  calcMaxHp()  { return this.baseMaxHp  + (this.level - 1) * 12 + (this.items?.hpPotions || 0) * 0; } // potions used in battle
  calcAttackDamage() { return this.baseAttackDamage + (this.level - 1) * 3 + (this.items?.attackBoost || 0) * 5; }
  calcSpeed()  { return this.baseSpeed + (this.items?.speedBoost || 0) * 0.6; }

  gainXP(amount) {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.calcXpToNext();
      this.maxHp = this.calcMaxHp();
      this.hp = Math.min(this.hp + 30, this.maxHp); // heal on level up
      this.attackDamage = this.calcAttackDamage();
      this.speed = this.calcSpeed();
      leveled = true;
    }
    return leveled;
  }

  usePotion() {
    if (this.items.hpPotions > 0 && this.hp < this.maxHp && this.potionCooldown <= 0) {
      this.items.hpPotions--;
      this.hp = Math.min(this.maxHp, this.hp + 40);
      this.potionCooldown = 60;
      this.spawnHitParticles(this.cx(), this.cy(), '#00ff88');
      return true;
    }
    return false;
  }

  getSaveData() {
    return {
      level: this.level, xp: this.xp, coins: this.coins,
      kills: this.kills, totalDamageDealt: this.totalDamageDealt, items: this.items
    };
  }

  update(input, cW, cH, enemy) {
    if (this.isDead) { this.updateParticles(); return; }
    if (this.isHurt) { this.hurtTimer--; if (this.hurtTimer <= 0) this.isHurt = false; }
    if (this.potionCooldown > 0) this.potionCooldown--;
    this.idleTimer++;

    let vx = 0, vy = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  { vx -= this.speed; this.facingRight = false; }
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) { vx += this.speed; this.facingRight = true; }
    if (input.isDown('KeyW') || input.isDown('ArrowUp'))    vy -= this.speed;
    if (input.isDown('KeyS') || input.isDown('ArrowDown'))  vy += this.speed;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.x += vx; this.y += vy;

    if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      this.trailPositions.unshift({ x: this.cx(), y: this.cy(), alpha: 0.4 });
      if (this.trailPositions.length > 8) this.trailPositions.pop();
    }
    this.trailPositions.forEach(t => t.alpha -= 0.05);
    this.trailPositions = this.trailPositions.filter(t => t.alpha > 0);

    const pad = 20;
    this.x = Math.max(pad, Math.min(cW - this.width - pad, this.x));
    this.y = Math.max(pad + 55, Math.min(cH - this.height - pad - 25, this.y));

    if (this.attackCooldown > 0) this.attackCooldown--;

    // Use potion - Q key
    if (input.wasJustPressed('KeyQ')) this.usePotion();

    if ((input.wasJustPressed('Space') || input.wasJustPressed('KeyJ')) && this.attackCooldown === 0) {
      this.isAttacking = true; this.attackTimer = this.attackDuration;
      this.attackCooldown = this.attackCooldownMax; this.glowIntensity = 1.0;
      if (enemy && !enemy.isDead) {
        const dist = this.distanceTo(enemy);
        if (dist < this.attackRange) {
          const dmg = this.attackDamage;
          enemy.takeDamage(dmg);
          this.totalDamageDealt += dmg;
          this.spawnHitParticles(enemy.cx(), enemy.cy(), '#00ffff');
        }
      }
    }

    if (this.attackTimer > 0) { this.attackTimer--; if (this.attackTimer <= 0) this.isAttacking = false; }
    if (this.glowIntensity > 0) this.glowIntensity -= 0.05;
    this.updateParticles();
  }

  takeDamage(amount) {
    if (this.isDead) return;
    if (this.shieldActive) { this.shieldActive = false; this.spawnHitParticles(this.cx(), this.cy(), '#8888ff'); return; }
    this.hp = Math.max(0, this.hp - amount);
    this.isHurt = true; this.hurtTimer = this.hurtDuration;
    if (this.hp <= 0) { this.isDead = true; this.spawnDeathParticles(); }
  }

  cx() { return this.x + this.width / 2; }
  cy() { return this.y + this.height / 2; }
  distanceTo(o) { const dx = this.cx()-o.cx(), dy = this.cy()-o.cy(); return Math.sqrt(dx*dx+dy*dy); }

  spawnHitParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random()*Math.PI*2, s = 2+Math.random()*4;
      this.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1.0, decay: 0.06+Math.random()*0.04, size: 3+Math.random()*5, color });
    }
  }
  spawnDeathParticles() {
    for (let i = 0; i < 30; i++) {
      const a = Math.random()*Math.PI*2, s = 1+Math.random()*6;
      this.particles.push({ x: this.cx(), y: this.cy(), vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1.0, decay: 0.02+Math.random()*0.03, size: 4+Math.random()*8, color: '#3a9bff' });
    }
  }
  updateParticles() {
    this.particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.life-=p.decay; });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx) {
    this.trailPositions.forEach((t, i) => {
      ctx.save(); ctx.globalAlpha = t.alpha;
      const sc = 1-(i/this.trailPositions.length)*0.5;
      this._drawBody(ctx, t.x-this.width*sc/2, t.y-this.height*sc/2, this.width*sc, this.height*sc, '#1a6bff', 0.3);
      ctx.restore();
    });
    this._drawParticles(ctx);
    if (this.isDead) return;
    ctx.save();
    if (this.isHurt && Math.floor(this.hurtTimer/3)%2===0) ctx.globalAlpha = 0.3;
    if (this.glowIntensity > 0) { ctx.shadowColor='#00cfff'; ctx.shadowBlur=30*this.glowIntensity; }
    this._drawBody(ctx, this.x, this.y, this.width, this.height, '#1a6bff', 1.0);
    // Shield aura
    if (this.shieldActive) {
      ctx.save(); ctx.strokeStyle='rgba(150,150,255,0.7)'; ctx.lineWidth=3;
      ctx.shadowColor='#8888ff'; ctx.shadowBlur=15;
      ctx.beginPath(); ctx.arc(this.cx(), this.cy(), 32, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    if (this.isAttacking) {
      const p = 1-this.attackTimer/this.attackDuration;
      const aX = this.facingRight ? this.x+this.width : this.x;
      ctx.save(); ctx.globalAlpha=1-p; ctx.strokeStyle='#00ffff'; ctx.lineWidth=3;
      ctx.shadowColor='#00ffff'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(aX, this.cy(), this.attackRange*p, -Math.PI/3, Math.PI/3); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawBody(ctx, x, y, w, h, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    const grad = ctx.createLinearGradient(x,y,x+w,y+h);
    grad.addColorStop(0,'#00aaff'); grad.addColorStop(0.5,color); grad.addColorStop(1,'#001a4d');
    ctx.fillStyle=grad; ctx.shadowColor='#00cfff'; ctx.shadowBlur=15;
    const cx = x+w/2;
    ctx.beginPath(); ctx.arc(cx,y+14,13,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x+w*0.15,y+22,w*0.7,h*0.5,5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x+w*0.1,y+h*0.68,w*0.3,h*0.32,4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x+w*0.6,y+h*0.68,w*0.3,h*0.32,4); ctx.fill();
    ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(cx-4,y+13,3,0,Math.PI*2); ctx.arc(cx+4,y+13,3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(0,255,255,0.5)'; ctx.lineWidth=1; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.moveTo(cx,y+26); ctx.lineTo(cx,y+h*0.65);
    ctx.moveTo(cx-8,y+h*0.4); ctx.lineTo(cx+8,y+h*0.4); ctx.stroke();
    ctx.restore();
  }
  _drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
      ctx.shadowColor=p.color; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }
}