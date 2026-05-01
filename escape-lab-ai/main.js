// main.js - Scene Manager: Menu | Info | Game | Shop | Post-Game
class SceneManager {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scene = 'menu';
    this.selectedDifficulty = 'medium';
    this.currentGame = null;
    this.menuTime = 0;
    this.menuAnimFrame = null;
    // Persistent player progress
    this.playerSave = null;
    this.currentWave = 1;

    this.setupCanvas();
    this.bindStaticEvents();
    this.showMenu();
  }

  setupCanvas() {
    const resize = () => {
      const W=Math.min(window.innerWidth, 960);
      const H=Math.min(window.innerHeight, 560);
      this.canvas.width=W; this.canvas.height=H;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  // ==================== SCENE SWITCHERS ====================
  showMenu() {
    this.scene='menu';
    this._showOnly('menu-screen');
    document.getElementById('btn-menu-float').classList.add('hidden');
    if (this.currentGame) { this.currentGame.stop(); this.currentGame=null; }
    this.startMenuAnimation();
  }

  showInfo() {
    this.scene='info';
    this._showOnly('info-screen');
    this.stopMenuAnimation();
  }

  showDifficultySelect() {
    this.scene='select';
    this._showOnly('select-screen');
  }

  showShop(afterCallback) {
    this.scene='shop';
    this._showOnly('shop-screen');
    this._afterShop = afterCallback;
    this._renderShop();
    this.stopMenuAnimation();
  }

  startGame(difficulty, wave, playerSave) {
    this.scene='game';
    this._showOnly('game-screen');
    document.getElementById('btn-menu-float').classList.remove('hidden');
    this.stopMenuAnimation();
    if (this.currentGame) this.currentGame.stop();
    this.currentGame = new Game(
      this.canvas, difficulty, wave, playerSave,
      (result, save) => this.handleGameEnd(result, save)
    );
    this.currentGame.start();
    // Canvas click for end buttons
    this._setupCanvasClickForEnd();
  }

  handleGameEnd(result, playerSave) {
    // handled via canvas click overlay — game loop keeps running, overlay drawn in game.js
  }

  // ==================== BIND EVENTS ====================
  bindStaticEvents() {
    // Menu
    document.getElementById('btn-play').addEventListener('click', ()=>this.showDifficultySelect());
    document.getElementById('btn-info').addEventListener('click', ()=>this.showInfo());
    // Info back
    document.getElementById('btn-info-back').addEventListener('click', ()=>this.showMenu());
    // Difficulty
    document.querySelectorAll('.diff-btn').forEach(b=>{
      b.addEventListener('click', ()=>{
        document.querySelectorAll('.diff-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        this.selectedDifficulty=b.dataset.diff;
      });
    });
    document.getElementById('btn-start').addEventListener('click', ()=>{
      this.currentWave=1;
      this.playerSave=null;
      this.startGame(this.selectedDifficulty, 1, null);
    });
    document.getElementById('btn-back').addEventListener('click', ()=>this.showMenu());
    // Float menu
    document.getElementById('btn-menu-float').addEventListener('click', ()=>this.showMenu());
    // Shop: buy buttons
    document.getElementById('shop-content').addEventListener('click', e=>{
      const btn=e.target.closest('.shop-buy-btn');
      if (!btn) return;
      const item=btn.dataset.item, cost=parseInt(btn.dataset.cost);
      if (!this.playerSave) return;
      if (this.playerSave.coins>=cost) {
        this.playerSave.coins-=cost;
        this.playerSave.items=this.playerSave.items||{hpPotions:0,attackBoost:0,speedBoost:0,shield:0};
        this.playerSave.items[item]=(this.playerSave.items[item]||0)+1;
        this._renderShop();
      }
    });
    document.getElementById('btn-shop-done').addEventListener('click', ()=>{
      if (this._afterShop) this._afterShop();
    });
    // ESC
    window.addEventListener('keydown', e=>{
      if (e.code==='Escape') {
        if (this.scene==='game') this.showMenu();
        else if (this.scene==='info') this.showMenu();
        else if (this.scene==='shop') { if(this._afterShop) this._afterShop(); }
      }
    });
  }

  _setupCanvasClickForEnd() {
    // Remove old listener
    if (this._canvasClickHandler) this.canvas.removeEventListener('click', this._canvasClickHandler);
    this._canvasClickHandler = (e) => {
      if (!this.currentGame || !this.currentGame.gameOver || this.currentGame.endTimer>0) return;
      const rect=this.canvas.getBoundingClientRect();
      const mx=(e.clientX-rect.left)*(this.canvas.width/rect.width);
      const my=(e.clientY-rect.top)*(this.canvas.height/rect.height);
      const btns=this.currentGame._endButtons||[];
      btns.forEach(b=>{
        if (mx>=b.x-82&&mx<=b.x+82&&my>=b.y-18&&my<=b.y+16) {
          const save=this.currentGame.player.getSaveData();
          this.playerSave=save;
          this.currentGame.stop();
          this.currentGame=null;
          if (b.id==='btn-next') {
            this.currentWave++;
            this.showShop(()=>this.startGame(this.selectedDifficulty, this.currentWave, this.playerSave));
          } else if (b.id==='btn-shop') {
            this.showShop(()=>this.startGame(this.selectedDifficulty, this.currentWave, this.playerSave));
          } else if (b.id==='btn-retry') {
            this.startGame(this.selectedDifficulty, this.currentWave, this.playerSave);
          } else if (b.id==='btn-menu2') {
            this.showMenu();
          }
        }
      });
    };
    this.canvas.addEventListener('click', this._canvasClickHandler);
  }

  // ==================== SHOP ====================
  _renderShop() {
    const save=this.playerSave;
    if (!save) return;
    const items=[
      { id:'hpPotions', name:'HP Potion',    icon:'🧪', desc:'Pulihkan 40 HP (tekan Q)', cost:15, color:'#00ff88' },
      { id:'attackBoost',name:'ATK Module',  icon:'⚔️', desc:'+5 Attack Damage permanen',cost:30, color:'#ff8844' },
      { id:'speedBoost', name:'Speed Chip',  icon:'👟', desc:'+0.6 Speed permanen',       cost:25, color:'#44ccff' },
      { id:'shield',     name:'Nano Shield', icon:'🛡️', desc:'Blok 1 serangan berikutnya',cost:40, color:'#8888ff' },
    ];
    const coinEl=document.getElementById('shop-coins');
    if (coinEl) coinEl.textContent=`Coins: ${save.coins} ¢`;
    const waveEl=document.getElementById('shop-wave');
    if (waveEl) waveEl.textContent=`Sebelum Wave ${this.currentWave+1}`;
    const content=document.getElementById('shop-content');
    content.innerHTML='';
    items.forEach(item=>{
      const canBuy=save.coins>=item.cost;
      const owned=(save.items&&save.items[item.id])||0;
      const el=document.createElement('div');
      el.className='shop-item';
      el.innerHTML=`
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name" style="color:${item.color}">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          ${owned>0?`<div class="shop-owned">Dimiliki: x${owned}</div>`:''}
        </div>
        <button class="shop-buy-btn" data-item="${item.id}" data-cost="${item.cost}" ${canBuy?'':'disabled'} style="border-color:${canBuy?item.color:'#444'};color:${canBuy?item.color:'#555'}">
          BUY<br><span style="font-size:11px">${item.cost}¢</span>
        </button>
      `;
      content.appendChild(el);
    });
  }

  // ==================== MENU ANIMATION ====================
  startMenuAnimation() {
    this.stopMenuAnimation();
    const animate=()=>{
      this.menuTime+=0.5; this.drawMenuBG();
      this.menuAnimFrame=requestAnimationFrame(animate);
    };
    this.menuAnimFrame=requestAnimationFrame(animate);
  }
  stopMenuAnimation() {
    if (this.menuAnimFrame) { cancelAnimationFrame(this.menuAnimFrame); this.menuAnimFrame=null; }
  }
  drawMenuBG() {
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
    ctx.fillStyle='#00010a'; ctx.fillRect(0,0,W,H);
    const gs=50, off=(this.menuTime*0.5)%gs;
    ctx.strokeStyle='rgba(0,70,180,0.13)'; ctx.lineWidth=0.5;
    for(let x=-gs+off;x<W+gs;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=-gs+off;y<H+gs;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(let i=0;i<3;i++){
      const ph=(this.menuTime*0.02+i*0.33)%1, r=ph*Math.min(W,H)*0.6;
      ctx.save(); ctx.globalAlpha=(1-ph)*0.13;
      ctx.strokeStyle=i%2===0?'#0060ff':'#ff2200'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    for(let i=0;i<18;i++){
      const t=this.menuTime*0.02+i;
      const px=(Math.sin(t*0.3+i)*0.5+0.5)*W, py=(Math.cos(t*0.2+i*0.7)*0.5+0.5)*H;
      ctx.save(); ctx.globalAlpha=0.2+Math.sin(t)*0.15;
      ctx.fillStyle=i%3===0?'#0066ff':i%3===1?'#ff3333':'#00ffcc';
      ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(px,py,1.5+Math.sin(t)*0.8,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  _showOnly(id) {
    ['menu-screen','info-screen','select-screen','game-screen','shop-screen']
      .forEach(s=>document.getElementById(s).classList.toggle('hidden', s!==id));
  }
}

window.addEventListener('DOMContentLoaded',()=>{ window.sm=new SceneManager(); });