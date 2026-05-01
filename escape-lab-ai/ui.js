// ui.js - HUD + FSM Panel + Post-Game Overlay
class UI {
  constructor(canvas) {
    this.canvas = canvas;
    this.messages = [];
    this.levelUpAnim = 0;
  }

  drawHUD(ctx, player, enemy, wave, difficulty) {
    const W = this.canvas.width, H = this.canvas.height;
    // Player HP
    this.drawHPBar(ctx, 18, 18, 200, 20, player.hp, player.maxHp, 'PLAYER', '#00aaff', '#002255', true);
    // Enemy HP
    this.drawHPBar(ctx, W-218, 18, 200, 20, enemy.hp, enemy.maxHp, enemy.type.name, '#ff3333', '#330000', false);

    // Wave badge center
    ctx.save();
    ctx.font='bold 13px "Orbitron","Courier New",monospace';
    ctx.textAlign='center'; ctx.fillStyle='#ffcc00'; ctx.shadowColor='#ffcc00'; ctx.shadowBlur=12;
    ctx.fillText(`WAVE ${wave}`, W/2, 22);
    ctx.font='10px "Courier New",monospace'; ctx.fillStyle='#aaaacc'; ctx.shadowBlur=0;
    ctx.fillText(difficulty.toUpperCase(), W/2, 35);
    ctx.restore();

    // Player stats row (left, below HP)
    this.drawPlayerStats(ctx, player, 18, 48);
    // Enemy type info (right, below HP)
    this.drawEnemyInfo(ctx, enemy, W-218, 48);
    // XP bar (bottom left)
    this.drawXPBar(ctx, player, 18, H-42);
    // Item quickbar (bottom center)
    this.drawItemBar(ctx, player, W/2, H-42);
    // FSM panel (bottom right)
    this.drawFSMPanel(ctx, enemy, W, H);
    // Controls hint
    ctx.save(); ctx.globalAlpha=0.4; ctx.font='10px "Courier New",monospace'; ctx.textAlign='center'; ctx.fillStyle='#8899bb';
    ctx.fillText('WASD=Move  SPACE/J=Attack  Q=Potion', W/2, H-10);
    ctx.restore();
    // Pop messages
    this.drawMessages(ctx);
    // Level up flash
    if (this.levelUpAnim > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, this.levelUpAnim/40)*0.18;
      ctx.fillStyle='#ffff00'; ctx.fillRect(0,0,W,H);
      ctx.restore(); this.levelUpAnim--;
    }
  }

  drawHPBar(ctx, x, y, w, h, hp, maxHp, label, fill, bg, leftAlign) {
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.strokeStyle=fill+'33'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(x-4,y-16,w+8,h+20,5); ctx.fill(); ctx.stroke();
    ctx.font='bold 10px "Courier New",monospace'; ctx.fillStyle=fill; ctx.shadowColor=fill; ctx.shadowBlur=6;
    ctx.textAlign=leftAlign?'left':'right'; ctx.fillText(label,leftAlign?x:x+w,y-3);
    ctx.font='9px "Courier New",monospace'; ctx.fillStyle='#ffffff'; ctx.shadowBlur=0;
    ctx.textAlign=leftAlign?'right':'left'; ctx.fillText(`${Math.ceil(hp)}/${maxHp}`,leftAlign?x+w:x,y-3);
    ctx.fillStyle=bg; ctx.shadowBlur=0; ctx.beginPath(); ctx.roundRect(x,y,w,h,3); ctx.fill();
    const ratio=Math.max(0,hp/maxHp);
    if (ratio>0) {
      const bw=w*ratio;
      const grad=ctx.createLinearGradient(x,y,x+bw,y+h);
      if(ratio>0.5){grad.addColorStop(0,fill);grad.addColorStop(1,fill+'88');}
      else if(ratio>0.25){grad.addColorStop(0,'#ffcc00');grad.addColorStop(1,'#ff8800');}
      else{grad.addColorStop(0,'#ff3333');grad.addColorStop(1,'#880000');}
      ctx.fillStyle=grad; ctx.shadowColor=fill; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.roundRect(x,y,bw,h,3); ctx.fill();
    }
    ctx.strokeStyle=fill+'66'; ctx.lineWidth=1.2; ctx.shadowColor=fill; ctx.shadowBlur=4;
    ctx.beginPath(); ctx.roundRect(x,y,w,h,3); ctx.stroke();
    ctx.restore();
  }

  drawPlayerStats(ctx, player, x, y) {
    ctx.save(); ctx.font='10px "Courier New",monospace'; ctx.textAlign='left';
    const stats = [
      { label:'LV', val:player.level, color:'#ffcc00' },
      { label:'COIN', val:player.coins, color:'#ffd700' },
      { label:'ATK', val:player.attackDamage, color:'#ff8844' },
    ];
    stats.forEach((s,i)=>{
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(x+i*68,y,62,16,3); ctx.fill();
      ctx.fillStyle=s.color; ctx.shadowColor=s.color; ctx.shadowBlur=4;
      ctx.fillText(`${s.label}:${s.val}`, x+i*68+5, y+11);
    });
    ctx.restore();
  }

  drawEnemyInfo(ctx, enemy, x, y) {
    ctx.save(); ctx.font='10px "Courier New",monospace'; ctx.textAlign='right';
    const col = enemy.type.color;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(x,y,200,16,3); ctx.fill();
    ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=4;
    ctx.fillText(`TYPE: ${enemy.type.name}  |  STATE: ${enemy.state}`, x+196, y+11);
    ctx.restore();
  }

  drawXPBar(ctx, player, x, y) {
    const w = 180;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(x-2,y-14,w+4,28,5); ctx.fill();
    ctx.font='bold 9px "Courier New",monospace'; ctx.textAlign='left'; ctx.fillStyle='#aaccff'; ctx.shadowBlur=0;
    ctx.fillText(`LV ${player.level}  XP: ${player.xp}/${player.xpToNext}`, x, y-2);
    ctx.fillStyle='#111133'; ctx.beginPath(); ctx.roundRect(x,y,w,8,3); ctx.fill();
    const xpRatio=player.xp/player.xpToNext;
    const xpGrad=ctx.createLinearGradient(x,y,x+w,y);
    xpGrad.addColorStop(0,'#8844ff'); xpGrad.addColorStop(1,'#cc44ff');
    ctx.fillStyle=xpGrad; ctx.shadowColor='#aa44ff'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.roundRect(x,y,w*xpRatio,8,3); ctx.fill();
    ctx.restore();
  }

  drawItemBar(ctx, player, cx, y) {
    // Quick-use items display
    const items = [
      { icon:'🧪', label:'Q', count:player.items.hpPotions, color:'#00ff88', tip:'HP+40' },
      { icon:'⚔️',  label:'', count:player.items.attackBoost, color:'#ff8844', tip:'ATK UP' },
      { icon:'👟',  label:'', count:player.items.speedBoost, color:'#44ccff', tip:'SPD UP' },
      { icon:'🛡️',  label:'', count:player.items.shield, color:'#8888ff', tip:'Shield' },
    ];
    const slotW=48, slotH=36, total=items.length, startX=cx-total*slotW/2;
    items.forEach((item,i)=>{
      const sx=startX+i*slotW;
      ctx.save();
      ctx.fillStyle=item.count>0?'rgba(0,0,0,0.7)':'rgba(0,0,0,0.4)';
      ctx.strokeStyle=item.count>0?item.color+'55':'#333';
      ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(sx,y-slotH+4,slotW-4,slotH,5); ctx.fill(); ctx.stroke();
      // Icon
      ctx.font='16px serif'; ctx.textAlign='center';
      ctx.globalAlpha=item.count>0?1.0:0.3;
      ctx.fillText(item.icon, sx+slotW/2-2, y-slotH+22);
      // Count badge
      if (item.count>0) {
        ctx.font='bold 10px "Courier New",monospace'; ctx.fillStyle=item.color; ctx.shadowColor=item.color; ctx.shadowBlur=4;
        ctx.fillText('x'+item.count, sx+slotW/2-2, y-2);
      }
      // Hotkey
      if (item.label) {
        ctx.font='8px "Courier New",monospace'; ctx.fillStyle='#888888'; ctx.shadowBlur=0;
        ctx.fillText('['+item.label+']', sx+slotW/2-2, y+10);
      }
      ctx.restore();
    });
  }

  drawFSMPanel(ctx, enemy, W, H) {
    if (enemy.isDead) return;
    const px=W-162, py=H-170, pw=148, ph=155;
    ctx.save(); ctx.globalAlpha=0.88;
    ctx.fillStyle='rgba(0,0,10,0.88)'; ctx.strokeStyle='#222255'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(px,py,pw,ph,8); ctx.fill(); ctx.stroke();
    ctx.globalAlpha=1.0;
    ctx.font='bold 9px "Courier New",monospace'; ctx.fillStyle='#555599'; ctx.textAlign='left';
    ctx.fillText('FSM STATES', px+8, py+14);
    const states=[
      {key:'IDLE',color:'#aaaaaa',desc:'Menunggu'},
      {key:'CHASE',color:'#ffcc00',desc:'Mengejar'},
      {key:'ATTACK',color:'#ff4444',desc:'Menyerang'},
      {key:'DODGE',color:'#00ff88',desc:'Menghindar'},
      {key:'DEAD',color:'#666666',desc:'Mati'},
    ];
    states.forEach((s,i)=>{
      const sy=py+26+i*23, active=enemy.state===s.key;
      if(active){ctx.fillStyle=s.color+'1a';ctx.beginPath();ctx.roundRect(px+4,sy-10,pw-8,19,3);ctx.fill();ctx.strokeStyle=s.color+'66';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(px+4,sy-10,pw-8,19,3);ctx.stroke();}
      ctx.fillStyle=active?s.color:s.color+'44'; ctx.shadowColor=active?s.color:'transparent'; ctx.shadowBlur=active?8:0;
      ctx.beginPath(); ctx.arc(px+16,sy,3.5,0,Math.PI*2); ctx.fill();
      ctx.font=active?'bold 9px "Courier New",monospace':'9px "Courier New",monospace';
      ctx.fillStyle=active?s.color:s.color+'77'; ctx.textAlign='left'; ctx.shadowBlur=active?4:0;
      ctx.fillText(s.key, px+26, sy+3);
      ctx.font='8px "Courier New",monospace'; ctx.fillStyle=active?'#ffffff88':'#ffffff22'; ctx.shadowBlur=0;
      ctx.fillText(s.desc, px+82, sy+3);
    });
    ctx.restore();
  }

  addMessage(text, color='#fff', duration=90) {
    this.messages.push({ text, color, alpha:1.0, duration, timer:0, y:0 });
  }

  triggerLevelUp() { this.levelUpAnim = 80; }

  drawMessages(ctx) {
    const W=this.canvas.width;
    this.messages.forEach((m,i)=>{
      m.timer++; m.alpha=Math.min(1,(m.duration-m.timer)/30);
      const ty=this.canvas.height/2-20-i*40;
      m.y+=(ty-m.y)*0.15;
      ctx.save(); ctx.globalAlpha=Math.max(0,m.alpha);
      ctx.font='bold 26px "Orbitron","Courier New",monospace';
      ctx.textAlign='center'; ctx.fillStyle=m.color; ctx.shadowColor=m.color; ctx.shadowBlur=25;
      ctx.fillText(m.text, W/2, m.y||ty);
      ctx.restore();
    });
    this.messages=this.messages.filter(m=>m.timer<m.duration);
  }
}