// game.js - Game Loop + Arena + Wave System
class Game {
  constructor(canvas, difficulty, wave, playerSaveData, onGameEnd) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.difficulty = difficulty;
    this.wave = wave || 1;
    this.onGameEnd = onGameEnd; // callback(result, playerSaveData)
    this.input = new InputHandler();
    this.ui = new UI(canvas);

    // Spawn positions
    const W=canvas.width, H=canvas.height;
    this.player = new Player(110, H/2-29, playerSaveData);
    this.enemy  = new Enemy(W-150, H/2-29, difficulty, this.wave);

    this.gameOver = false;
    this.gameResult = null; // 'win' | 'lose'
    this.endTimer = 0;       // delay before showing overlay
    this.animFrame = null;
    this.bgTime = 0; this.gridOffset = 0; this.scanlineY = 0;

    // Wave intro
    this.introTimer = 90;
  }

  start() {
    const loop = () => {
      this.update();
      this.draw();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
  }

  update() {
    this.bgTime += 0.5; this.gridOffset = (this.gridOffset+0.4)%40;
    this.scanlineY = (this.scanlineY+1)%this.canvas.height;
    if (this.introTimer > 0) { this.introTimer--; this.input.update(); return; }

    if (!this.gameOver) {
      this.player.update(this.input, this.canvas.width, this.canvas.height, this.enemy);
      this.enemy.update(this.player, this.canvas.width, this.canvas.height);

      // Check outcomes
      if (this.enemy.isDead && !this.gameOver) {
        this.gameOver = true; this.gameResult = 'win';
        // Award XP + Coins
        const leveled = this.player.gainXP(this.enemy.xpReward);
        this.player.coins += this.enemy.coinReward;
        this.player.kills++;
        if (leveled) { this.ui.addMessage('LEVEL UP!', '#ffff00', 110); this.ui.triggerLevelUp(); }
        this.ui.addMessage(`+${this.enemy.xpReward} XP   +${this.enemy.coinReward} ¢`, '#aaffaa', 90);
        this.endTimer = 120;
      }
      if (this.player.isDead && !this.gameOver) {
        this.gameOver = true; this.gameResult = 'lose'; this.endTimer = 120;
      }
    } else {
      if (this.endTimer > 0) this.endTimer--;
    }
    this.input.update();
  }

  draw() {
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
    this.drawBackground(ctx,W,H);
    this.drawArenaFloor(ctx,W,H);
    this.player.draw(ctx);
    this.enemy.draw(ctx);
    this.ui.drawHUD(ctx, this.player, this.enemy, this.wave, this.difficulty);
    // Wave intro
    if (this.introTimer > 0) {
      const alpha=Math.min(1,this.introTimer/30);
      ctx.save(); ctx.globalAlpha=alpha*0.7; ctx.fillStyle='#000010'; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=alpha;
      ctx.font='bold 40px "Orbitron","Courier New",monospace'; ctx.textAlign='center';
      const col=`hsl(${200-this.wave*15},100%,65%)`;
      ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=30;
      ctx.fillText(`WAVE ${this.wave}`, W/2, H/2-10);
      ctx.font='16px "Courier New",monospace'; ctx.fillStyle='#aaaacc'; ctx.shadowBlur=0;
      ctx.fillText(`ENEMY: ${this.enemy.type.name}`, W/2, H/2+20);
      ctx.restore();
    }
    if (this.gameOver && this.endTimer <= 0) {
      this.drawEndOverlay(ctx, W, H);
    }
    this.drawScanlines(ctx,W,H);
  }

  drawEndOverlay(ctx, W, H) {
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.78)'; ctx.fillRect(0,0,W,H);
    const won = this.gameResult==='win';
    const titleColor = won?'#00ffcc':'#ff3333';
    const title = won?`WAVE ${this.wave} CLEAR!`:'DEFEATED';

    // Title
    ctx.font='bold 46px "Orbitron","Courier New",monospace'; ctx.textAlign='center';
    ctx.fillStyle=titleColor; ctx.shadowColor=titleColor; ctx.shadowBlur=40;
    ctx.fillText(title, W/2, H/2-70);

    // Stats
    ctx.font='13px "Courier New",monospace'; ctx.shadowBlur=0; ctx.fillStyle='#aabbcc';
    if (won) {
      ctx.fillText(`XP Gained: +${this.enemy.xpReward}   Coins: +${this.enemy.coinReward}`, W/2, H/2-40);
      ctx.fillText(`Total Kills: ${this.player.kills}   Level: ${this.player.level}   Coins: ${this.player.coins}`, W/2, H/2-18);
    } else {
      ctx.fillText(`Reached Wave ${this.wave}   Total Kills: ${this.player.kills}`, W/2, H/2-40);
    }

    // Buttons — draw them, click handled by scene manager overlay
    const btns = won
      ? [
          { id:'btn-next',  label:`WAVE ${this.wave+1} →`, color:'#00ffcc', x:W/2-160, y:H/2+10 },
          { id:'btn-shop',  label:'🛒 SHOP',             color:'#ffd700',  x:W/2,     y:H/2+10 },
          { id:'btn-menu2', label:'MENU',                 color:'#8888aa',  x:W/2+160, y:H/2+10 },
        ]
      : [
          { id:'btn-retry', label:'RETRY WAVE', color:'#ffaa00', x:W/2-100, y:H/2+10 },
          { id:'btn-menu2', label:'MENU',        color:'#8888aa', x:W/2+100, y:H/2+10 },
        ];

    btns.forEach(b=>{
      ctx.save();
      ctx.font='bold 13px "Orbitron","Courier New",monospace'; ctx.textAlign='center';
      ctx.fillStyle=b.color+'22'; ctx.strokeStyle=b.color+'88'; ctx.lineWidth=1.5;
      ctx.shadowColor=b.color; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.roundRect(b.x-82,b.y-18,164,34,6); ctx.fill(); ctx.stroke();
      ctx.fillStyle=b.color; ctx.fillText(b.label, b.x, b.y+5);
      ctx.restore();
    });

    // ESC hint
    ctx.font='11px "Courier New",monospace'; ctx.fillStyle='#555577'; ctx.textAlign='center'; ctx.shadowBlur=0;
    ctx.fillText('Click button above  |  ESC = Menu', W/2, H/2+60);

    // Store buttons for click detection by scene manager
    this._endButtons = btns;
    ctx.restore();
  }

  drawBackground(ctx,W,H) {
    const grad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.8);
    grad.addColorStop(0,'#060818'); grad.addColorStop(0.5,'#03040f'); grad.addColorStop(1,'#000005');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    // Grid
    ctx.strokeStyle='rgba(20,50,120,0.22)'; ctx.lineWidth=0.5;
    const gs=40, ox=this.gridOffset%gs, oy=this.gridOffset%gs;
    for(let x=-gs+ox;x<W+gs;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=-gs+oy;y<H+gs;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // Corner decorations
    ctx.strokeStyle='rgba(0,180,255,0.15)'; ctx.lineWidth=1.5;
    const sz=40;
    [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]].forEach(([px,py,dx,dy])=>{
      ctx.beginPath();ctx.moveTo(px+dx*sz,py);ctx.lineTo(px,py);ctx.lineTo(px,py+dy*sz);ctx.stroke();
    });
  }

  drawArenaFloor(ctx,W,H) {
    const fy=H-25;
    const fg=ctx.createLinearGradient(0,fy,0,fy+25);
    fg.addColorStop(0,'rgba(0,80,180,0.15)'); fg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fg; ctx.fillRect(0,fy,W,25);
    ctx.save(); ctx.strokeStyle='rgba(0,140,255,0.3)'; ctx.lineWidth=1.5; ctx.shadowColor='#0080ff'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.moveTo(0,fy); ctx.lineTo(W,fy); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1; ctx.shadowBlur=0;
    ctx.setLineDash([8,14]); ctx.beginPath(); ctx.moveTo(W/2,50); ctx.lineTo(W/2,fy); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  drawScanlines(ctx,W,H) {
    ctx.save(); ctx.globalAlpha=0.03; ctx.fillStyle='#000';
    for(let y=0;y<H;y+=4) ctx.fillRect(0,y,W,2);
    ctx.globalAlpha=0.04; ctx.fillStyle='#fff'; ctx.fillRect(0,this.scanlineY,W,2);
    ctx.restore();
  }
}