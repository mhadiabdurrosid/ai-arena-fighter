// enemy.js - Enemy AI with FSM + Wave Variants
const EnemyState = { IDLE:'IDLE', CHASE:'CHASE', ATTACK:'ATTACK', DODGE:'DODGE', DEAD:'DEAD' };

const ENEMY_TYPES = {
  grunt:   { name:'GRUNT',   color:'#cc2200', eyeColor:'#ff8800', xpReward:20, coinReward:5,  hpMult:1.0, dmgMult:1.0, spdMult:1.0, dodgeProb:0.3 },
  speeder: { name:'SPEEDER', color:'#cc00cc', eyeColor:'#ff44ff', xpReward:30, coinReward:8,  hpMult:0.8, dmgMult:0.9, spdMult:1.6, dodgeProb:0.6 },
  tank:    { name:'TANK',    color:'#cc6600', eyeColor:'#ffcc00', xpReward:50, coinReward:15, hpMult:2.2, dmgMult:1.4, spdMult:0.65,dodgeProb:0.15 },
  phantom: { name:'PHANTOM', color:'#006666', eyeColor:'#00ffee', xpReward:45, coinReward:12, hpMult:1.1, dmgMult:1.2, spdMult:1.3, dodgeProb:0.8 },
  berserker:{name:'BERSERKER',color:'#990000',eyeColor:'#ff0000',xpReward:60, coinReward:20, hpMult:1.5, dmgMult:1.8, spdMult:1.2, dodgeProb:0.4 },
};

function getEnemyTypeForWave(wave) {
  if (wave <= 2) return 'grunt';
  if (wave <= 4) return Math.random()<0.5 ? 'grunt' : 'speeder';
  if (wave <= 6) return ['speeder','tank'][Math.floor(Math.random()*2)];
  if (wave <= 9) return ['tank','phantom','berserker'][Math.floor(Math.random()*3)];
  return ['phantom','berserker','tank'][Math.floor(Math.random()*3)];
}

class Enemy {
  constructor(x, y, difficulty, wave) {
    this.x = x; this.y = y;
    this.width = 42; this.height = 58;
    this.facingRight = false; this.isDead = false;
    this.wave = wave || 1;
    this.typeName = getEnemyTypeForWave(this.wave);
    this.type = ENEMY_TYPES[this.typeName];
    this.state = EnemyState.IDLE;
    this.stateTimer = 0; this.prevState = null; this.stateLabel = 'IDLE'; this.stateLabelAlpha = 0;
    this.applyDifficulty(difficulty);
    this.applyWaveScaling();
    this.hp = this.maxHp;
    this.isAttacking = false; this.attackTimer = 0; this.attackDuration = 15; this.attackCooldown = 0;
    this.dodgeVX = 0; this.dodgeVY = 0; this.dodgeTimer = 0; this.dodgeDuration = 0;
    this.particles = []; this.isHurt = false; this.hurtTimer = 0; this.hurtDuration = 20;
    this.glowIntensity = 0; this.trailPositions = [];
    this.idleTimer = 0; this.idleOffset = 0;
    // XP/coin reward
    this.xpReward = Math.floor(this.type.xpReward * (1 + (wave-1)*0.2));
    this.coinReward = Math.floor(this.type.coinReward * (1 + (wave-1)*0.15));
  }

  applyDifficulty(diff) {
    const d = { easy:{spd:2.2,dmg:8,cd:70,det:250,rng:65,rDelay:40}, medium:{spd:3.2,dmg:12,cd:45,det:320,rng:70,rDelay:20}, hard:{spd:4.8,dmg:18,cd:28,det:420,rng:80,rDelay:5} }[diff] || { spd:3.2,dmg:12,cd:45,det:320,rng:70,rDelay:20 };
    this.baseSpeed=d.spd; this.baseAttackDamage=d.dmg; this.baseAttackCooldownMax=d.cd;
    this.detectionRange=d.det; this.attackRange=d.rng; this.reactionDelay=d.rDelay;
  }

  applyWaveScaling() {
    const t = this.type; const wv = this.wave;
    const waveScale = 1 + (wv-1)*0.18;
    this.maxHp = Math.floor((60 + wv*18) * t.hpMult);
    this.attackDamage = Math.floor(this.baseAttackDamage * t.dmgMult * waveScale);
    this.speed = this.baseSpeed * t.spdMult * (1 + (wv-1)*0.05);
    this.attackCooldownMax = Math.max(18, Math.floor(this.baseAttackCooldownMax / (t.dmgMult * (1+(wv-1)*0.05))));
    this.dodgeProbability = Math.min(0.92, t.dodgeProb + (wv-1)*0.04);
    // Size scaling for tank
    if (this.typeName === 'tank') { this.width = 52; this.height = 68; }
    if (this.typeName === 'speeder') { this.width = 36; this.height = 50; }
  }

  update(player, cW, cH) {
    if (this.isDead) { this.updateParticles(); return; }
    if (this.isHurt) { this.hurtTimer--; if (this.hurtTimer<=0) this.isHurt=false; }
    this.idleTimer++; this.idleOffset = Math.sin(this.idleTimer*0.05)*3;
    if (this.attackCooldown>0) this.attackCooldown--;
    this.stateTimer++;
    const dist = this.distanceTo(player);
    this.runFSM(player, dist, cW, cH);
    const pad=20;
    this.x=Math.max(pad,Math.min(cW-this.width-pad,this.x));
    this.y=Math.max(pad+55,Math.min(cH-this.height-pad-25,this.y));
    this.facingRight = player.cx() > this.cx();
    if (this.state===EnemyState.CHASE||this.state===EnemyState.DODGE) {
      this.trailPositions.unshift({x:this.cx(),y:this.cy(),alpha:0.35});
      if (this.trailPositions.length>6) this.trailPositions.pop();
    }
    this.trailPositions.forEach(t=>t.alpha-=0.07);
    this.trailPositions=this.trailPositions.filter(t=>t.alpha>0);
    if (this.prevState!==this.state) { this.stateLabel=this.state; this.stateLabelAlpha=1.5; this.prevState=this.state; }
    if (this.stateLabelAlpha>0) this.stateLabelAlpha-=0.015;
    if (this.glowIntensity>0) this.glowIntensity-=0.04;
    this.updateParticles();
  }

  runFSM(player, dist, cW, cH) {
    if (this.hp<=0) { this.transitionTo(EnemyState.DEAD); this.isDead=true; this.spawnDeathParticles(); return; }
    switch(this.state) {
      case EnemyState.IDLE:   this.behaviorIdle(dist); break;
      case EnemyState.CHASE:  this.behaviorChase(player,dist); break;
      case EnemyState.ATTACK: this.behaviorAttack(player,dist); break;
      case EnemyState.DODGE:  this.behaviorDodge(player,cW,cH); break;
    }
  }
  behaviorIdle(dist) { if (dist<this.detectionRange&&this.stateTimer>this.reactionDelay) this.transitionTo(EnemyState.CHASE); }
  behaviorChase(player,dist) {
    const dx=player.cx()-this.cx(), dy=player.cy()-this.cy(), len=Math.sqrt(dx*dx+dy*dy)||1;
    this.x+=dx/len*this.speed; this.y+=dy/len*this.speed;
    if (dist<this.attackRange&&this.attackCooldown===0) this.transitionTo(EnemyState.ATTACK);
    if (dist>this.detectionRange*1.3) this.transitionTo(EnemyState.IDLE);
  }
  behaviorAttack(player,dist) {
    if (this.attackTimer===0&&!this.isAttacking) {
      this.isAttacking=true; this.attackTimer=this.attackDuration; this.glowIntensity=1.0;
      if (dist<this.attackRange+10) player.takeDamage(this.attackDamage);
      this.attackCooldown=this.attackCooldownMax;
    }
    if (this.attackTimer>0) { this.attackTimer--; }
    else { this.isAttacking=false; this.transitionTo(Math.random()<this.dodgeProbability?EnemyState.DODGE:EnemyState.CHASE); }
  }
  behaviorDodge(player,cW,cH) {
    if (this.dodgeTimer===0) {
      const dx=this.cx()-player.cx(), dy=this.cy()-player.cy(), len=Math.sqrt(dx*dx+dy*dy)||1;
      const px=-dy/len, py=dx/len, sign=Math.random()<0.5?1:-1;
      this.dodgeVX=(dx/len*0.5+px*sign*0.5)*this.speed*2.2;
      this.dodgeVY=(dy/len*0.5+py*sign*0.5)*this.speed*2.2;
      this.dodgeDuration=18+Math.floor(Math.random()*14);
    }
    this.x+=this.dodgeVX; this.y+=this.dodgeVY;
    this.dodgeVX*=0.9; this.dodgeVY*=0.9; this.dodgeTimer++;
    if (this.dodgeTimer>=this.dodgeDuration) { this.dodgeTimer=0; this.transitionTo(EnemyState.CHASE); }
  }
  transitionTo(s) {
    this.state=s; this.stateTimer=0;
    if (s===EnemyState.DODGE) this.dodgeTimer=0;
    if (s===EnemyState.ATTACK) { this.attackTimer=0; this.isAttacking=false; }
  }
  takeDamage(amount) {
    if (this.isDead) return;
    this.hp=Math.max(0,this.hp-amount);
    this.isHurt=true; this.hurtTimer=this.hurtDuration;
  }
  cx() { return this.x+this.width/2; } cy() { return this.y+this.height/2; }
  distanceTo(o) { const dx=this.cx()-o.cx(),dy=this.cy()-o.cy(); return Math.sqrt(dx*dx+dy*dy); }
  spawnHitParticles(x,y,color) {
    for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*4;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.0,decay:0.06+Math.random()*0.04,size:3+Math.random()*5,color});}
  }
  spawnDeathParticles() {
    for(let i=0;i<40;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*7;this.particles.push({x:this.cx(),y:this.cy(),vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.0,decay:0.015+Math.random()*0.025,size:5+Math.random()*10,color:this.type.color});}
  }
  updateParticles() {
    this.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.92;p.vy*=0.92;p.life-=p.decay;});
    this.particles=this.particles.filter(p=>p.life>0);
  }

  draw(ctx) {
    this._drawParticles(ctx);
    this.trailPositions.forEach((t,i)=>{
      ctx.save(); ctx.globalAlpha=t.alpha;
      const sc=1-(i/this.trailPositions.length)*0.5;
      this._drawBody(ctx,t.x-this.width*sc/2,t.y-this.height*sc/2,this.width*sc,this.height*sc,0.25);
      ctx.restore();
    });
    if (this.isDead) return;
    ctx.save();
    if (this.isHurt&&Math.floor(this.hurtTimer/3)%2===0) ctx.globalAlpha=0.3;
    if (this.glowIntensity>0){ctx.shadowColor=this.type.color;ctx.shadowBlur=30*this.glowIntensity;}
    const drawY=this.y+(this.state===EnemyState.IDLE?this.idleOffset:0);
    this._drawBody(ctx,this.x,drawY,this.width,this.height,1.0);
    if (this.isAttacking&&this.attackTimer>0){
      const p=1-this.attackTimer/this.attackDuration;
      const aX=this.facingRight?this.x+this.width:this.x;
      ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle=this.type.eyeColor;ctx.lineWidth=3;
      ctx.shadowColor=this.type.eyeColor;ctx.shadowBlur=20;
      ctx.beginPath();ctx.arc(aX,this.cy(),this.attackRange*p,Math.PI-Math.PI/3,Math.PI+Math.PI/3);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // Type label
    ctx.save();
    ctx.font='bold 9px "Courier New",monospace'; ctx.textAlign='center';
    ctx.fillStyle=this.type.color+'cc'; ctx.fillText('['+this.type.name+']',this.cx(),this.y-20);
    ctx.restore();
    // State popup
    if (this.stateLabelAlpha>0&&this.stateLabelAlpha<1.0){
      const sc={IDLE:'#aaa',CHASE:'#ffcc00',ATTACK:'#ff4444',DODGE:'#00ff88',DEAD:'#666'}[this.stateLabel]||'#fff';
      ctx.save();ctx.globalAlpha=Math.min(1,this.stateLabelAlpha);
      ctx.font='bold 10px "Courier New",monospace';ctx.textAlign='center';
      ctx.fillStyle=sc;ctx.shadowColor=sc;ctx.shadowBlur=8;
      ctx.fillText('['+this.stateLabel+']',this.cx(),this.y-8);
      ctx.restore();
    }
  }
  _drawBody(ctx,x,y,w,h,alpha) {
    ctx.save(); ctx.globalAlpha=alpha;
    const grad=ctx.createLinearGradient(x,y,x+w,y+h);
    grad.addColorStop(0,this.type.color+'ff');grad.addColorStop(0.5,this.type.color);grad.addColorStop(1,'#0a0000');
    ctx.fillStyle=grad; ctx.shadowColor=this.type.color; ctx.shadowBlur=15;
    const cx=x+w/2;
    ctx.beginPath();ctx.arc(cx,y+14,Math.min(13,w*0.31),0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.roundRect(x+w*0.15,y+22,w*0.7,h*0.5,5);ctx.fill();
    ctx.beginPath();ctx.roundRect(x+w*0.1,y+h*0.68,w*0.3,h*0.32,4);ctx.fill();
    ctx.beginPath();ctx.roundRect(x+w*0.6,y+h*0.68,w*0.3,h*0.32,4);ctx.fill();
    ctx.fillStyle=this.type.eyeColor;ctx.shadowColor=this.type.eyeColor;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(cx-4,y+13,3,0,Math.PI*2);ctx.arc(cx+4,y+13,3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=this.type.color+'88';ctx.lineWidth=1;ctx.shadowBlur=5;
    ctx.beginPath();ctx.moveTo(cx,y+26);ctx.lineTo(cx,y+h*0.65);ctx.moveTo(cx-8,y+h*0.4);ctx.lineTo(cx+8,y+h*0.4);ctx.stroke();
    ctx.restore();
  }
  _drawParticles(ctx) {
    this.particles.forEach(p=>{ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill();ctx.restore();});
  }
}