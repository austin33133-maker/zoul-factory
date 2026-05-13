import { CONFIG, COLOR_IDS } from '../config.js';
import { GameEngine, Phase } from '../game/engine.js';
import { SPECIAL, KIND } from '../game/board.js';
import { getLevel } from '../game/levels.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { drawPrincess, drawSpeech } from '../ui/princess.js';
import { drawRoundedRect, fillCircle, easeOutCubic, easeOutBack, clamp, lerp, rand, randInt, choice, showToast } from '../utils.js';
import { modal } from '../ui/modal.js';

// 棋盘几何
function geom() {
  const padX = CONFIG.BOARD_PAD;
  const boardW = CONFIG.CANVAS_W - padX * 2;
  const cell = boardW / CONFIG.COLS;
  const top = CONFIG.HUD_H + 16;
  const boardH = cell * CONFIG.ROWS;
  return { padX, top, cell, boardW, boardH, bottom: top + boardH };
}

export class GameScene {
  constructor(sm) {
    this.sm = sm;
    this.t = 0;
    this.sprites = new Map(); // pieceId -> {x,y,tx,ty,scale,tscale,alpha,talpha,wob}
    this.particles = [];
    this.floats = []; // +score popups
    this.dragging = null;
    this.princessMood = 'happy';
    this.princessSay = '';
    this.princessSayTimer = 0;
    this.boosterChoice = null;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.engine = null;
    this.beams = []; // 火箭尾迹特效
    this.flashAlpha = 0; // 全屏白闪
    this.outOfMovesShown = false;
  }

  async enter(params) {
    const level = getLevel(params.levelId);
    this.level = level;
    // 战前道具选卡
    const picks = await this.preGamePicker(level);
    if (picks === null) { this.sm.switchTo('map'); return; }
    const levelWithBoosters = { ...level, extraMoves: picks.extraMoves || 0 };
    this.engine = new GameEngine(levelWithBoosters, this.bindListeners());
    // 起始特殊棋子
    if (picks.startRocket || picks.startBomb) this.injectStarters(picks);
    this.initSprites();
    this.say('一起加油！🍊', 'cheer', 1800);
  }

  injectStarters(picks) {
    const grid = this.engine.grid;
    const candidates = [];
    for (let r = 0; r < CONFIG.ROWS; r++) for (let c = 0; c < CONFIG.COLS; c++) {
      const p = grid[r][c];
      if (p && p.kind === KIND.PIECE && !p.special) candidates.push([r, c]);
    }
    const pick = () => candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    if (picks.startRocket && candidates.length) {
      const [r, c] = pick();
      grid[r][c] = { ...grid[r][c], special: Math.random() < 0.5 ? SPECIAL.ROCKET_H : SPECIAL.ROCKET_V };
    }
    if (picks.startBomb && candidates.length) {
      const [r, c] = pick();
      grid[r][c] = { ...grid[r][c], special: SPECIAL.BOMB };
    }
  }

  async preGamePicker(level) {
    const s = Save.get();
    // 三选项卡片：+5 步 / 战前 1 火箭 / 战前 1 彩球。各需金币
    const html = `
      <p style="color:#7c3a14;font-size:15px">关卡 ${level.id} · <b>${level.name}</b></p>
      <p style="color:#7c3a14;font-size:14px;margin-top:6px">${level.story}</p>
      <p style="color:#7c3a14;margin-top:10px"><b>目标：</b>${objectiveText(level)}　<b>步数：</b>${level.moves}</p>
      <p style="color:#7c3a14;font-size:13px;margin-top:12px">勾选战前道具（消耗金币）</p>
      <div id="picker-cards" style="display:flex;gap:10px;justify-content:center;margin:8px 0 4px">
        <div data-key="extraMoves" data-cost="200" class="picker-card">
          <div style="font-size:32px">⏱️</div>
          <div style="font-size:14px;margin-top:4px">+5 步</div>
          <div style="font-size:11px;color:#5a2810;margin-top:2px">🪙 200</div>
        </div>
        <div data-key="startRocket" data-cost="150" class="picker-card">
          <div style="font-size:32px">🚀</div>
          <div style="font-size:14px;margin-top:4px">起始火箭 ×1</div>
          <div style="font-size:11px;color:#5a2810;margin-top:2px">🪙 150</div>
        </div>
        <div data-key="startBomb" data-cost="180" class="picker-card">
          <div style="font-size:32px">💣</div>
          <div style="font-size:14px;margin-top:4px">起始炸弹 ×1</div>
          <div style="font-size:11px;color:#5a2810;margin-top:2px">🪙 180</div>
        </div>
      </div>
      <p style="color:#7c3a14;font-size:13px;margin-top:8px">余额 🪙 ${s.coins}</p>
    `;
    // 注入样式 (只注入一次)
    if (!document.getElementById('picker-style')) {
      const st = document.createElement('style');
      st.id = 'picker-style';
      st.textContent = `
        .picker-card{width:96px;padding:10px 6px;background:#fff7e3;border:3px solid #ffb066;border-radius:14px;cursor:pointer;text-align:center;transition:transform .1s}
        .picker-card.on{background:#ffd84d;border-color:#ff5e3a;transform:translateY(-4px)}
        .picker-card.disabled{opacity:.4;cursor:not-allowed}
      `;
      document.head.appendChild(st);
    }
    const picks = {};
    let cost = 0;
    const result = await new Promise(resolve => {
      const overlay = document.getElementById('dom-overlay');
      const bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      const m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = `<h2>战前准备</h2><div class="body">${html}</div>
        <div class="row" style="margin-top:14px">
          <button class="btn ghost" data-act="back">返回</button>
          <button class="btn" data-act="go">开始</button>
        </div>`;
      bd.appendChild(m);
      overlay.appendChild(bd);
      const cards = m.querySelectorAll('.picker-card');
      cards.forEach(card => {
        const c = +card.dataset.cost;
        card.onclick = () => {
          const key = card.dataset.key;
          const isOn = card.classList.toggle('on');
          if (isOn) { picks[key] = true; cost += c; }
          else { delete picks[key]; cost -= c; }
          if (cost > Save.get().coins) {
            card.classList.remove('on'); delete picks[key]; cost -= c;
            showToast('金币不足');
          }
        };
      });
      m.querySelectorAll('button[data-act]').forEach(btn => {
        btn.onclick = () => { bd.remove(); resolve(btn.dataset.act === 'go' ? { picks, cost } : null); };
      });
    });
    if (result === null) return null;
    if (!Save.spendCoins(result.cost)) { showToast('金币不足'); return null; }
    Audio.coin();
    // 将选中道具转译为引擎可识别的预置
    const out = {};
    if (result.picks.extraMoves) out.extraMoves = 5;
    if (result.picks.startRocket) out.startRocket = true;
    if (result.picks.startBomb) out.startBomb = true;
    // 起始特殊棋子：在 sprite 初始化后注入
    this._pendingStarters = out;
    return out;
  }

  initSprites() {
    const g = geom();
    this.sprites.clear();
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const p = this.engine.grid[r][c];
        if (!p) continue;
        const px = g.padX + c * g.cell + g.cell / 2;
        const py = g.top + r * g.cell + g.cell / 2;
        this.sprites.set(p.id, {
          piece: p,
          x: px, y: -100, tx: px, ty: py,
          scale: 1, tscale: 1, alpha: 1, talpha: 1,
          rot: 0, trot: 0, wob: rand(0, Math.PI * 2)
        });
      }
    }
  }

  cleanupOrphanSprites() {
    const alive = new Set();
    for (let r = 0; r < CONFIG.ROWS; r++) for (let c = 0; c < CONFIG.COLS; c++) {
      const p = this.engine.grid[r][c]; if (p) alive.add(p.id);
    }
    for (const id of [...this.sprites.keys()]) if (!alive.has(id)) this.sprites.delete(id);
  }

  bindListeners() {
    return {
      swap: ({ from, to, invalid }) => {
        const g = geom();
        const a = this.engine.grid[to[0]] && this.engine.grid[to[0]][to[1]];
        const b = this.engine.grid[from[0]] && this.engine.grid[from[0]][from[1]];
        // a 现在在 to 位置（已交换），b 在 from 位置
        if (a) { const s = this.sprites.get(a.id); if (s) { s.tx = g.padX + to[1] * g.cell + g.cell / 2; s.ty = g.top + to[0] * g.cell + g.cell / 2; } }
        if (b) { const s = this.sprites.get(b.id); if (s) { s.tx = g.padX + from[1] * g.cell + g.cell / 2; s.ty = g.top + from[0] * g.cell + g.cell / 2; } }
        if (invalid) { Audio.invalid(); this.say('换不了…', 'worried', 900); }
        else Audio.swap();
      },
      clear: ({ cells, specialCreations, crateBreaks, crateDamages }) => {
        Audio.pop(0);
        const g = geom();
        cells.forEach(({ r, c, piece }) => this.burstAt(g.padX + c * g.cell + g.cell/2, g.top + r * g.cell + g.cell/2, piece.color));
        cells.forEach(({ piece }) => this.sprites.delete(piece.id));
        if (crateBreaks) crateBreaks.forEach(({ r, c, piece }) => {
          this.burstAt(g.padX + c * g.cell + g.cell/2, g.top + r * g.cell + g.cell/2, 'orange', 14);
          this.sprites.delete(piece.id);
          this.shake(3, 0.18);
        });
        // 受伤的木箱：抖一下（保留 sprite）
        if (crateDamages) crateDamages.forEach(({ piece }) => {
          const s = this.sprites.get(piece.id);
          if (s) { s.scale = 1.18; s.tscale = 1; }
        });
        specialCreations.forEach(sc => {
          const [r, c] = sc.pos;
          const p = this.engine.grid[r][c];
          if (!p) return;
          const x = g.padX + c * g.cell + g.cell/2, y = g.top + r * g.cell + g.cell/2;
          this.sprites.set(p.id, { piece: p, x, y, tx: x, ty: y, scale: 0.4, tscale: 1, alpha: 1, talpha: 1, rot: 0, trot: 0, wob: 0 });
          this.floatScore('特殊!', x, y - 30, '#ffd84d');
        });
        this.cleanupOrphanSprites();
      },
      explode: ({ cells, reason, origin, special, crateBreaks }) => {
        const g = geom();
        // 火箭尾迹
        if (origin && (special === SPECIAL.ROCKET_H || special === SPECIAL.ROCKET_V)) {
          const cx = g.padX + origin[1] * g.cell + g.cell / 2;
          const cy = g.top + origin[0] * g.cell + g.cell / 2;
          this.beams.push({
            x: cx, y: cy, dir: special === SPECIAL.ROCKET_H ? 'h' : 'v',
            life: 0, max: 0.5
          });
        }
        // 彩球闪光
        if (special === SPECIAL.LIGHTBALL || reason === 'lightball' || reason === 'combo') this.flashAlpha = 0.8;
        cells.forEach(({ r, c, piece }) => {
          const x = g.padX + c * g.cell + g.cell/2, y = g.top + r * g.cell + g.cell/2;
          this.burstAt(x, y, piece.color, 16);
          this.sprites.delete(piece.id);
        });
        if (crateBreaks) crateBreaks.forEach(({ r, c, piece }) => {
          this.burstAt(g.padX + c * g.cell + g.cell/2, g.top + r * g.cell + g.cell/2, 'orange', 18);
          this.sprites.delete(piece.id);
        });
        if (reason === 'combo' || reason === 'lightball') { Audio.lightball(); this.shake(10, 0.5); this.say('哇！', 'wow', 800); }
        else if (reason === 'booster') { Audio.bomb(); this.shake(7, 0.35); }
        else if (special === SPECIAL.BOMB) { Audio.bomb(); this.shake(6, 0.3); }
        else if (special === SPECIAL.ROCKET_H || special === SPECIAL.ROCKET_V) { Audio.rocket(); this.shake(5, 0.25); }
        else { Audio.bomb(); this.shake(4, 0.25); }
        this.cleanupOrphanSprites();
      },
      cascade: ({ falls, gen }) => {
        const g = geom();
        for (let r = 0; r < CONFIG.ROWS; r++) for (let c = 0; c < CONFIG.COLS; c++) {
          const p = this.engine.grid[r][c]; if (!p) continue;
          let s = this.sprites.get(p.id);
          const tx = g.padX + c * g.cell + g.cell/2, ty = g.top + r * g.cell + g.cell/2;
          if (!s) {
            this.sprites.set(p.id, { piece: p, x: tx, y: g.top - g.cell, tx, ty, scale: 1, tscale: 1, alpha: 1, talpha: 1, rot: 0, trot: 0, wob: rand(0, Math.PI * 2) });
          } else {
            s.tx = tx; s.ty = ty;
          }
        }
      },
      scoreChanged: () => { /* HUD 实时读取 engine.score */ },
      movesChanged: () => {},
      collectChanged: () => {
        // 检查接近目标时鼓励
        const o = this.level.objective;
        if (o.type === 'collectColor') {
          const cur = this.engine.collected[o.color] || 0;
          if (cur >= o.amount * 0.8 && cur < o.amount && this.princessMood !== 'cheer') {
            this.say('就差一点了！', 'cheer', 1400);
          }
        }
      },
      combo: lv => {
        Audio.combo(Math.min(4, lv)); Audio.callout(lv);
        const names = ['Sweet!', 'Tasty!', 'Awesome!', 'Incredible!', 'Insane!'];
        const colors = ['#ffd84d', '#ff8b3d', '#ff5e3a', '#b06bff', '#5bc6ff'];
        const name = names[Math.min(lv, names.length - 1)];
        this.bigCallout = { text: name, life: 0, max: 1.2, color: colors[Math.min(lv, colors.length - 1)] };
        this.floatScore(name, CONFIG.CANVAS_W / 2, CONFIG.HUD_H + 40, colors[Math.min(lv, colors.length - 1)]);
      },
      reshuffle: () => { showToast('棋盘重排'); this.shake(10, 0.5); },
      boardReset: () => { this.sprites.clear(); this.initSprites(); },
      win: async ({ score, stars }) => { await this.onWin(score, stars); },
      lose: async ({ score }) => { await this.onLose(score); }
    };
  }

  // ---- 输入 ----
  onPointerDown(x, y) {
    if (this.engine.phase !== Phase.IDLE) return;
    const g = geom();
    if (x < g.padX || x > g.padX + g.boardW || y < g.top || y > g.bottom) {
      // 检测底部 booster
      this.tryTapBooster(x, y);
      // 顶部退出按钮
      if (x > CONFIG.CANVAS_W - 80 && y < 80) this.askQuit();
      return;
    }
    const c = Math.floor((x - g.padX) / g.cell);
    const r = Math.floor((y - g.top) / g.cell);
    if (this.boosterChoice) {
      this.applyBooster([r, c]);
      return;
    }
    this.dragging = { r, c, startX: x, startY: y, fired: false };
  }
  onPointerMove(x, y) {
    if (!this.dragging || this.dragging.fired) return;
    const dx = x - this.dragging.startX, dy = y - this.dragging.startY;
    const dist = Math.hypot(dx, dy);
    const g = geom();
    if (dist < g.cell * 0.35) return;
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? [0, 1] : [0, -1])
      : (dy > 0 ? [1, 0] : [-1, 0]);
    const { r, c } = this.dragging;
    this.dragging.fired = true;
    this.engine.trySwap(r, c, r + dir[0], c + dir[1]);
  }
  onPointerUp() { this.dragging = null; }

  tryTapBooster(x, y) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    const baseY = h - 130, bw = 88, gap = 24;
    const totalW = bw * 3 + gap * 2;
    const startX = (w - totalW) / 2;
    const keys = ['hammer', 'bomb', 'swap'];
    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (bw + gap);
      if (x > bx && x < bx + bw && y > baseY && y < baseY + bw) {
        this.toggleBooster(keys[i]);
        return;
      }
    }
  }

  toggleBooster(key) {
    if (this.boosterChoice === key) { this.boosterChoice = null; Audio.click(); return; }
    if (!Save.get().boosters[key]) { showToast('道具不足'); Audio.invalid(); return; }
    this.boosterChoice = { type: key, picks: [], need: key === 'swap' ? 2 : 1 };
    Audio.click();
    showToast(key === 'hammer' ? '点选一个棋子' : key === 'bomb' ? '点选爆炸中心' : '点选要交换的两个');
  }

  applyBooster([r, c]) {
    const b = this.boosterChoice;
    b.picks.push([r, c]);
    if (b.picks.length < b.need) { showToast('再选一个'); return; }
    if (!Save.useBooster(b.type)) { this.boosterChoice = null; return; }
    this.engine.useBooster(b.type, b.picks);
    this.boosterChoice = null;
  }

  async askQuit() {
    const v = await modal({
      title: '退出关卡',
      html: '<p>未完成的进度将丢失，本次生命已扣除。</p>',
      buttons: [{ label: '继续游戏', value: 'no', style: 'ghost' }, { label: '退出', value: 'yes', style: 'danger' }]
    });
    if (v === 'yes') this.sm.switchTo('map');
  }

  async onWin(score, stars) {
    Audio.win();
    this.say('我们做到了！', 'cheer', 2400);
    const lv = this.level;
    Save.completeLevel(lv.id, score, stars);
    Save.addCoins(50 + stars * 20);
    // 燃放烟花
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const x = rand(80, CONFIG.CANVAS_W - 80), y = rand(200, 700);
        this.burstAt(x, y, choice(COLOR_IDS), 12);
      }, i * 80);
    }
    await sleep(800);
    const html = `
      <p style="font-size:60px">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
      <p>得分：<b>${score}</b></p>
      <p>奖励：🪙 ${50 + stars * 20}</p>
    `;
    const v = await modal({
      title: '关卡通过',
      html,
      buttons: [
        { label: '返回地图', value: 'map', style: 'ghost' },
        { label: '下一关', value: 'next' }
      ]
    });
    if (v === 'next') {
      const next = lv.id + 1;
      if (next > 15) { showToast('已是最后一关，期待续作 🍊'); this.sm.switchTo('map'); }
      else {
        if (Save.get().lives <= 0) { showToast('生命不足'); this.sm.switchTo('map'); return; }
        Save.consumeLife();
        Save.setLevel(next);
        this.sm.switchTo('game', { levelId: next });
      }
    } else this.sm.switchTo('map');
  }

  async onLose(score) {
    Audio.lose();
    this.say('再试一次吧…', 'sad', 2000);
    await sleep(500);

    // 第一次：先给购买 +5 步的机会（Royal Match 经典挽留弹窗）
    if (!this.outOfMovesShown) {
      this.outOfMovesShown = true;
      const cost = 200;
      const v = await modal({
        title: '步数差一点点！',
        html: `<p>本次得分 <b>${score}</b></p><p>用 🪙 ${cost} 继续游戏（+5 步）？</p><p style="font-size:13px;color:#7c3a14">余额 🪙 ${Save.get().coins}</p>`,
        buttons: [
          { label: '放弃', value: 'no', style: 'ghost' },
          { label: `+5 步 (🪙 ${cost})`, value: 'buy' }
        ]
      });
      if (v === 'buy') {
        if (Save.spendCoins(cost)) {
          Audio.coin();
          this.engine.addMoves(5);
          this.engine.phase = Phase.IDLE;
          this.say('谢谢你！', 'cheer', 2000);
          return;
        } else { showToast('金币不足'); }
      }
    }

    const v = await modal({
      title: '挑战失败',
      html: `<p>本次得分 <b>${score}</b></p><p>再试一次需要 1 ❤️</p>`,
      buttons: [
        { label: '返回地图', value: 'map', style: 'ghost' },
        { label: '再试一次', value: 'retry' }
      ]
    });
    if (v === 'retry') {
      if (Save.get().lives <= 0) { showToast('生命不足'); this.sm.switchTo('map'); return; }
      Save.consumeLife();
      this.sm.switchTo('game', { levelId: this.level.id });
    } else this.sm.switchTo('map');
  }

  // ---- 视觉 ----
  say(text, mood, ms = 1500) {
    this.princessSay = text;
    this.princessMood = mood || 'happy';
    this.princessSayTimer = ms;
    Audio.princess();
  }

  burstAt(x, y, color, n = 10) {
    const col = CONFIG.COLORS.find(c => c.id === color) || CONFIG.COLORS[0];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.3, 0.3);
      const sp = rand(80, 240);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(30, 90),
        life: rand(0.45, 0.9), max: 0.9, color: col.hex, size: rand(4, 9)
      });
    }
  }

  floatScore(text, x, y, color = '#fff') {
    this.floats.push({ text, x, y, vy: -1, life: 0, max: 0.9, color });
  }

  shake(mag, dur) { this.shakeMag = mag; this.shakeT = dur; }

  update(dt) {
    this.t += dt;
    // 提示气泡计时
    if (this.princessSayTimer > 0) {
      this.princessSayTimer -= dt;
      if (this.princessSayTimer <= 0) { this.princessSay = ''; this.princessMood = 'happy'; }
    }
    // sprite 平滑
    for (const s of this.sprites.values()) {
      s.x = lerp(s.x, s.tx, 0.32);
      s.y = lerp(s.y, s.ty, 0.32);
      s.scale = lerp(s.scale, s.tscale, 0.2);
      s.alpha = lerp(s.alpha, s.talpha, 0.25);
      s.wob += dt * 0.001;
    }
    // 粒子
    const dts = dt / 1000;
    this.particles = this.particles.filter(p => {
      p.life -= dts; if (p.life <= 0) return false;
      p.vy += 380 * dts;
      p.x += p.vx * dts; p.y += p.vy * dts;
      return true;
    });
    this.floats = this.floats.filter(f => {
      f.life += dts; f.y += f.vy * 60 * dts;
      return f.life < f.max;
    });
    if (this.shakeT > 0) this.shakeT -= dts;
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dts * 2.5);
    this.beams = this.beams.filter(b => { b.life += dts; return b.life < b.max; });
    if (this.bigCallout) {
      this.bigCallout.life += dts;
      if (this.bigCallout.life >= this.bigCallout.max) this.bigCallout = null;
    }
  }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    const g = geom();

    // 屏幕震动
    ctx.save();
    if (this.shakeT > 0) {
      const m = this.shakeMag * (this.shakeT / 0.5);
      ctx.translate(rand(-m, m), rand(-m, m));
    }

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#7a3df4'); bg.addColorStop(0.5, '#c14a93'); bg.addColorStop(1, '#ff5e3a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 顶部 HUD
    this.drawHUD(ctx);

    // 棋盘背景
    drawRoundedRect(ctx, g.padX - 8, g.top - 8, g.boardW + 16, g.boardH + 16, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    // 格子斜纹
    for (let r = 0; r < CONFIG.ROWS; r++) for (let c = 0; c < CONFIG.COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(g.padX + c * g.cell, g.top + r * g.cell, g.cell, g.cell);
    }

    // 棋子
    for (const s of this.sprites.values()) {
      if (s.piece) this.drawPiece(ctx, s.piece, s, g);
    }

    // 火箭尾迹
    for (const b of this.beams) {
      const k = b.life / b.max;
      const alpha = (1 - k) * 0.85;
      ctx.globalAlpha = alpha;
      const grad = ctx.createLinearGradient(0, 0, b.dir === 'h' ? CONFIG.CANVAS_W : 0, b.dir === 'h' ? 0 : CONFIG.CANVAS_H);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, '#ffd84d');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      const len = Math.max(g.cell * 0.8, g.cell * 2 * k * 3);
      if (b.dir === 'h') {
        ctx.fillRect(g.padX, b.y - 8, g.boardW, 16);
        // 火球
        fillCircle(ctx, b.x + g.boardW * k * 0.5, b.y, 12, '#fff');
        fillCircle(ctx, b.x - g.boardW * k * 0.5, b.y, 12, '#fff');
      } else {
        ctx.fillRect(b.x - 8, g.top, 16, g.boardH);
        fillCircle(ctx, b.x, b.y + g.boardH * k * 0.5, 12, '#fff');
        fillCircle(ctx, b.x, b.y - g.boardH * k * 0.5, 12, '#fff');
      }
      ctx.globalAlpha = 1;
    }

    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      fillCircle(ctx, p.x, p.y, p.size, p.color);
    }
    ctx.globalAlpha = 1;

    // 飘字
    for (const f of this.floats) {
      ctx.globalAlpha = 1 - f.life / f.max;
      ctx.fillStyle = f.color;
      ctx.font = '700 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';

    // 公主 + 底部 booster
    this.drawFooter(ctx);

    // 大型 Combo 喊话
    if (this.bigCallout) {
      const k = this.bigCallout.life / this.bigCallout.max;
      const scale = k < 0.3 ? easeOutBack(k / 0.3) : 1 + Math.sin((k - 0.3) * 6) * 0.05;
      const alpha = k < 0.8 ? 1 : (1 - (k - 0.8) / 0.2);
      ctx.save();
      ctx.translate(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2 - 100);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.bigCallout.color;
      ctx.font = '900 80px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
      ctx.strokeText(this.bigCallout.text, 0, 0);
      ctx.fillText(this.bigCallout.text, 0, 0);
      ctx.restore();
    }

    // 全屏闪光
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  drawPiece(ctx, piece, s, g) {
    if (piece.kind === KIND.CRATE) { this.drawCrate(ctx, piece, s, g); return; }
    const col = CONFIG.COLORS.find(c => c.id === piece.color) || CONFIG.COLORS[0];
    const r = g.cell * 0.42;
    const x = s.x, y = s.y;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.translate(x, y);
    ctx.scale(s.scale, s.scale);
    // 阴影
    ctx.save();
    ctx.translate(0, r * 0.85);
    ctx.scale(1, 0.3);
    fillCircle(ctx, 0, 0, r * 0.9, 'rgba(0,0,0,0.4)');
    ctx.restore();
    // 主球渐变
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    grad.addColorStop(0, lighten(col.hex, 0.5));
    grad.addColorStop(0.5, col.hex);
    grad.addColorStop(1, darken(col.hex, 0.25));
    ctx.fillStyle = grad;
    fillCircle(ctx, 0, 0, r);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // 描边
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

    // 特殊覆盖
    if (piece.special === SPECIAL.BOMB) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      fillCircle(ctx, 0, 0, r * 0.55);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${r * 0.7}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else if (piece.special === SPECIAL.ROCKET_H || piece.special === SPECIAL.ROCKET_V) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${r * 0.75}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save();
      if (piece.special === SPECIAL.ROCKET_V) ctx.rotate(Math.PI / 2);
      ctx.fillText('⇆', 0, 2);
      ctx.restore();
    } else if (piece.special === SPECIAL.LIGHTBALL) {
      const pulse = (Math.sin(this.t / 200) + 1) / 2;
      const lg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      lg.addColorStop(0, '#fff');
      lg.addColorStop(0.6, '#fff7c2');
      lg.addColorStop(1, '#ff8b3d');
      ctx.fillStyle = lg;
      fillCircle(ctx, 0, 0, r);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + pulse * 0.3) + ')';
      fillCircle(ctx, 0, 0, r * 0.7);
    } else {
      // 在球面上画水果 emoji
      ctx.font = `${r * 1.15}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(col.label, 0, r * 0.06);
    }
    ctx.restore();
  }

  drawCrate(ctx, piece, s, g) {
    const sz = g.cell * 0.78;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.scale, s.scale);
    // 阴影
    ctx.save();
    ctx.translate(0, sz * 0.45);
    ctx.scale(1, 0.3);
    fillCircle(ctx, 0, 0, sz * 0.45, 'rgba(0,0,0,0.4)');
    ctx.restore();
    // 木箱主体
    const grad = ctx.createLinearGradient(0, -sz/2, 0, sz/2);
    grad.addColorStop(0, '#c8884a');
    grad.addColorStop(1, '#7c4a1e');
    drawRoundedRect(ctx, -sz/2, -sz/2, sz, sz, 6);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#4a2810'; ctx.lineWidth = 2.5; ctx.stroke();
    // 木纹
    ctx.strokeStyle = 'rgba(74,40,16,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-sz/2 + 6, -sz/6); ctx.lineTo(sz/2 - 6, -sz/6);
    ctx.moveTo(-sz/2 + 6,  sz/6); ctx.lineTo(sz/2 - 6,  sz/6);
    ctx.stroke();
    // 钉子
    for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      fillCircle(ctx, dx * (sz/2 - 6), dy * (sz/2 - 6), 2.4, '#5a2810');
    }
    // 血量 (hp > 1 时显示 cracks 减少)
    if (piece.hp < piece.maxHp) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-sz * 0.2, -sz * 0.2); ctx.lineTo(sz * 0.1, 0); ctx.lineTo(-sz * 0.05, sz * 0.2);
      ctx.stroke();
    }
    if (piece.maxHp > 1) {
      // HP 标记
      ctx.fillStyle = '#fff';
      ctx.font = '700 14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`x${piece.hp}`, 0, 2);
    }
    ctx.restore();
  }

  drawHUD(ctx) {
    const w = CONFIG.CANVAS_W;
    // 步数环 / 分数 / 目标
    // 左上：退出
    drawRoundedRect(ctx, 16, 16, 64, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 32px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←', 48, 48);

    // 中部：步数大环
    const cx = w / 2, cy = 70;
    fillCircle(ctx, cx, cy, 48, 'rgba(0,0,0,0.4)');
    ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 36px sans-serif';
    ctx.fillText(this.engine.movesLeft, cx, cy + 2);
    ctx.font = '500 16px sans-serif';
    ctx.fillText('步数', cx, cy + 26);

    // 分数 / 目标
    const score = this.engine.score;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '700 22px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('得分', 20, 110);
    ctx.font = '700 28px sans-serif'; ctx.fillText(score, 20, 138);

    // 右侧目标（支持多类型）
    const o = this.level.objective;
    ctx.textAlign = 'right';
    ctx.font = '700 22px sans-serif'; ctx.fillText('目标', w - 20, 110);
    ctx.font = '700 24px sans-serif';
    if (o.type === 'collectColor') {
      const got = this.engine.collected[o.color] || 0;
      const fruit = (CONFIG.COLORS.find(c => c.id === o.color) || {}).label || '';
      ctx.fillText(`${fruit} ${got}/${o.amount}`, w - 20, 138);
    } else if (o.type === 'score') {
      ctx.fillText(`${Math.min(score, o.amount)}/${o.amount}`, w - 20, 138);
    } else if (o.type === 'crates') {
      ctx.fillText(`📦 ${this.engine.cratesBroken}/${o.amount}`, w - 20, 138);
    } else if (o.type === 'multiColor') {
      ctx.font = '600 18px sans-serif';
      const parts = o.items.map(it => {
        const got = this.engine.collected[it.color] || 0;
        const fruit = (CONFIG.COLORS.find(c => c.id === it.color) || {}).label || '';
        return `${fruit}${got}/${it.amount}`;
      });
      ctx.fillText(parts.join('  '), w - 20, 138);
    }
    // 右上 setting
    drawRoundedRect(ctx, w - 80, 16, 64, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '32px sans-serif';
    ctx.fillText('⏸', w - 48, 48);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  drawFooter(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    const footerY = h - CONFIG.FOOTER_H;
    // 公主 + 气泡
    drawPrincess(ctx, 120, footerY + 110, 0.85, this.princessMood, this.t);
    if (this.princessSay) drawSpeech(ctx, 260, footerY + 70, this.princessSay);

    // booster 按钮
    const baseY = h - 130, bw = 88, gap = 24;
    const totalW = bw * 3 + gap * 2;
    const startX = (w - totalW) / 2;
    const keys = ['hammer', 'bomb', 'swap'];
    const icons = ['🔨', '💣', '🔀'];
    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (bw + gap), by = baseY;
      drawRoundedRect(ctx, bx, by, bw, bw, 18);
      const isActive = this.boosterChoice && this.boosterChoice.type === keys[i];
      ctx.fillStyle = isActive ? '#ffd84d' : 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isActive ? '#4a1500' : '#fff';
      ctx.fillText(icons[i], bx + bw / 2, by + bw / 2);
      // 数量
      const n = Save.get().boosters[keys[i]];
      ctx.fillStyle = '#ff5e3a';
      fillCircle(ctx, bx + bw - 12, by + 12, 14);
      ctx.fillStyle = '#fff'; ctx.font = '700 18px sans-serif';
      ctx.fillText(n, bx + bw - 12, by + 14);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}

function objectiveText(level) {
  const o = level.objective;
  if (o.type === 'collectColor') {
    const fr = (CONFIG.COLORS.find(c => c.id === o.color) || {}).label || '';
    return `收集 ${fr} ×${o.amount}`;
  }
  if (o.type === 'score') return `得分 ${o.amount}`;
  if (o.type === 'crates') return `砸开 📦 ×${o.amount}`;
  if (o.type === 'multiColor') {
    return o.items.map(it => {
      const fr = (CONFIG.COLORS.find(c => c.id === it.color) || {}).label || '';
      return `${fr}×${it.amount}`;
    }).join(' ');
  }
  return '完成关卡';
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, r + (255 - r) * amt)|0},${Math.min(255, g + (255 - g) * amt)|0},${Math.min(255, b + (255 - b) * amt)|0})`;
}
function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${(r * (1 - amt))|0},${(g * (1 - amt))|0},${(b * (1 - amt))|0})`;
}
function hexToRgb(hex) {
  const h = hex.replace('#','');
  return { r: parseInt(h.substr(0,2),16), g: parseInt(h.substr(2,2),16), b: parseInt(h.substr(4,2),16) };
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
