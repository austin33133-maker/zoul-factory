import { CONFIG } from '../config.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { LEVELS, CHAPTERS, chapterOf } from '../game/levels.js';
import { TASK_POOL } from '../game/tasks.js';
import { drawPrincess, drawSpeech } from '../ui/princess.js';
import { drawRoundedRect, fillCircle } from '../utils.js';
import { modal } from '../ui/modal.js';

const CHAPTER_HEADER_H = 130;   // 每章节头部
const NODE_GAP = 200;           // 关卡节点间距

export class MapScene {
  constructor(sm) {
    this.sm = sm;
    this.scroll = 0;
    this.targetScroll = 0;
    this.dragStart = null;
    this.tapX = 0; this.tapY = 0;
    this.t = 0;

    // 计算节点 y 位置：每个章节有 header，节点之间均匀
    this.nodes = [];
    this.chapterHeaders = [];
    let y = 200;
    for (const ch of CHAPTERS) {
      this.chapterHeaders.push({ chapter: ch, y });
      y += CHAPTER_HEADER_H;
      const inChapter = LEVELS.filter(lv => lv.id >= ch.range[0] && lv.id <= ch.range[1]);
      inChapter.forEach((lv, i) => {
        const x = CONFIG.CANVAS_W / 2 + Math.sin(this.nodes.length * 1.2) * 220;
        this.nodes.push({ ...lv, x, y });
        y += NODE_GAP;
      });
      y += 60; // 章节间留白
    }
    this.totalH = y + 200;
  }

  enter() {
    Save.regenLives();
    Save.refreshDailyTasks(TASK_POOL);
    const s = Save.get();
    const target = this.nodes.find(n => n.id === s.level) || this.nodes[0];
    this.targetScroll = Math.max(0, target.y - CONFIG.CANVAS_H * 0.55);
    this.scroll = this.targetScroll;
  }

  onPointerDown(x, y) {
    this.dragStart = y;
    this.dragScrollAt = this.scroll;
    this.dragMoved = false;
    this.tapX = x; this.tapY = y;
  }
  onPointerMove(x, y) {
    if (this.dragStart == null) return;
    const dy = this.dragStart - y;
    if (Math.abs(dy) > 6) this.dragMoved = true;
    this.targetScroll = clamp(this.dragScrollAt + dy, 0, Math.max(0, this.totalH - CONFIG.CANVAS_H));
  }
  onPointerUp() {
    const moved = this.dragMoved;
    this.dragStart = null;
    if (moved) return;
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;

    // 顶部右上设置
    if (this.tapX > w - 100 && this.tapY < 100) { this.openSettings(); return; }
    // 顶部小入口：每日任务 / 轮盘 / 战令
    if (this.tapY > 100 && this.tapY < 180) {
      if (this.tapX > 16 && this.tapX < 16 + 70) { Audio.click(); this.sm.switchTo('wheel'); return; }
      if (this.tapX > 96 && this.tapX < 96 + 70) { Audio.click(); this.sm.switchTo('battlepass'); return; }
      if (this.tapX > 176 && this.tapX < 176 + 70) { this.showDailyTasks(); return; }
    }
    // 底部入口（商店 / 装修）
    const fy = h - 96;
    if (this.tapY > fy && this.tapY < fy + 80) {
      if (this.tapX > 30 && this.tapX < 30 + 110) { Audio.click(); this.sm.switchTo('shop'); return; }
      if (this.tapX > w - 140 && this.tapX < w - 30) { Audio.click(); this.sm.switchTo('decoration'); return; }
    }

    // 节点点击
    const sy = this.tapY + this.scroll;
    for (const n of this.nodes) {
      const dx = n.x - this.tapX, dy = n.y - sy;
      if (dx * dx + dy * dy < 60 * 60) { this.tapNode(n); return; }
    }
  }

  async tapNode(n) {
    const s = Save.get();
    if (n.id > s.maxLevel) { Audio.invalid(); return; }
    Audio.click();
    // 章节首关首次进入 → 章节剧情过场
    const ch = chapterOf(n.id);
    if (n.id === ch.range[0] && !Save.hasSeenChapter(ch.id)) {
      await this.showChapterIntro(ch);
      Save.markChapterSeen(ch.id);
    }
    const stars = s.stars[n.id] || 0;
    const best = s.bestScore[n.id] || 0;
    const html = `
      <p style="font-size:14px;color:#7c3a14">${ch.emoji} 第 ${ch.id} 章 · ${ch.name}</p>
      <p style="font-size:18px;color:#7c3a14;margin-top:4px">关卡 ${n.id} · <b>${n.name}</b></p>
      <p style="color:#7c3a14;margin-top:6px">${n.story}</p>
      <p style="margin-top:8px;color:#7c3a14">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}　最佳 ${best}</p>
    `;
    const choice = await modal({
      title: '出发吧',
      html,
      buttons: [
        { label: '返回', value: 'cancel', style: 'ghost' },
        { label: `开始 (-1 ❤)`, value: 'go' }
      ]
    });
    if (choice === 'go') {
      if (s.lives <= 0) {
        const v = await modal({ title: '生命已用尽', html: '<p>等待回复或观看广告获得（演示）</p>', buttons: [{ label: '获得 1 ❤️ (演示)', value: 'free' }, { label: '我先逛逛', value: 'cancel', style: 'ghost' }] });
        if (v === 'free') Save.giveLife(1);
        return;
      }
      Save.consumeLife();
      Save.setLevel(n.id);
      this.sm.switchTo('game', { levelId: n.id });
    }
  }

  async showChapterIntro(ch) {
    Audio.unlock();
    await modal({
      title: `${ch.emoji} 第 ${ch.id} 章`,
      html: `
        <p style="font-size:22px;color:#7c3a14;font-weight:700">${ch.name}</p>
        <p style="color:#7c3a14;margin-top:12px;line-height:1.5">${ch.intro}</p>
        <p style="color:#7c3a14;margin-top:12px;font-size:13px">本章关卡 ${ch.range[0]}–${ch.range[1]}</p>
      `,
      buttons: [{ label: '通过城门 →', value: 'go' }]
    });
  }

  async showDailyTasks() {
    Audio.click();
    Save.refreshDailyTasks(TASK_POOL);
    const tasks = Save.get().daily.tasks;
    const claimed = Save.get().daily.claimed || [];
    const html = tasks.map((t, i) => {
      const done = (t.progress || 0) >= t.target;
      const isClaimed = claimed.includes(i);
      const rewardStr = [
        t.reward.coins && `🪙${t.reward.coins}`,
        t.reward.lives && `❤️${t.reward.lives}`,
        t.reward.booster && `${{hammer:'🔨',bomb:'💣',swap:'🔀'}[t.reward.booster]}×${t.reward.boosterN||1}`
      ].filter(Boolean).join(' ');
      return `<div style="display:flex;align-items:center;justify-content:space-between;background:#fff7e3;border:2px solid #ffb066;border-radius:10px;padding:10px 12px;margin-bottom:8px">
        <div style="text-align:left;flex:1">
          <div style="font-weight:700;color:#4a1500">${t.label}</div>
          <div style="font-size:13px;color:#7c3a14">进度 ${Math.min(t.progress||0, t.target)}/${t.target}　奖励 ${rewardStr}</div>
        </div>
        <button class="btn ${isClaimed ? 'ghost' : ''}" data-idx="${i}" ${(!done || isClaimed) ? 'disabled style="opacity:.5"' : ''}>
          ${isClaimed ? '已领' : (done ? '领取' : '未达')}
        </button>
      </div>`;
    }).join('');
    await new Promise(resolve => {
      const overlay = document.getElementById('dom-overlay');
      const bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      const m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = `<h2>📅 每日任务</h2><div class="body">${html}</div>
        <div class="row" style="margin-top:8px"><button class="btn" data-close>关闭</button></div>`;
      bd.appendChild(m);
      overlay.appendChild(bd);
      m.querySelectorAll('button[data-idx]').forEach(btn => btn.onclick = () => {
        const idx = +btn.dataset.idx;
        const r = Save.claimTask(idx);
        if (r) { Audio.coin(); bd.remove(); resolve(); this.showDailyTasks(); }
      });
      m.querySelector('button[data-close]').onclick = () => { bd.remove(); resolve(); };
    });
  }

  async openSettings() {
    Audio.click();
    const v = await modal({
      title: '设置',
      html: `<p>音效：${Save.get().audio ? '🔊 开' : '🔇 关'}</p>`,
      buttons: [
        { label: '切换音效', value: 'audio' },
        { label: '重置存档', value: 'reset', style: 'danger' },
        { label: '关闭', value: 'close', style: 'ghost' }
      ]
    });
    if (v === 'audio') Save.toggleAudio();
    if (v === 'reset') {
      const c = await modal({ title: '确认重置？', html: '<p>所有进度将丢失</p>', buttons: [{ label: '取消', value: 'no', style: 'ghost' }, { label: '确定', value: 'yes', style: 'danger' }] });
      if (c === 'yes') Save.reset();
    }
  }

  update(dt) {
    this.t += dt;
    this.scroll += (this.targetScroll - this.scroll) * 0.18;
  }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    // 当前视野内章节，用于背景渐变
    const center = this.scroll + h / 2;
    let activeCh = this.chapterHeaders[0]?.chapter || CHAPTERS[0];
    for (const ch of this.chapterHeaders) if (ch.y < center) activeCh = ch.chapter;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#ffb066'); bg.addColorStop(0.5, activeCh.theme); bg.addColorStop(1, '#5a2810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 装饰云
    for (let i = 0; i < 6; i++) {
      const y = (i * 240 + this.t * 0.01) % (h + 200) - 100;
      drawCloud(ctx, (i * 137) % w, y, 80 + (i % 3) * 18);
    }

    // 主要内容（滚动）
    ctx.save();
    ctx.translate(0, -this.scroll);

    // 章节横幅
    for (const { chapter, y } of this.chapterHeaders) {
      drawChapterBanner(ctx, chapter, y, this.t);
    }

    // 路径
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 6; ctx.setLineDash([14, 14]); ctx.lineDashOffset = -this.t * 0.04;
    ctx.beginPath();
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i], b = this.nodes[i + 1];
      const midX = (a.x + b.x) / 2 + (i % 2 ? 60 : -60);
      const midY = (a.y + b.y) / 2;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 节点
    const s = Save.get();
    for (const n of this.nodes) {
      const unlocked = n.id <= s.maxLevel;
      const stars = s.stars[n.id] || 0;
      drawLevelNode(ctx, n, unlocked, stars, n.id === s.level, this.t);
    }
    ctx.restore();

    // 顶部 HUD
    drawTopHUD(ctx, w);

    // 顶部入口三连：轮盘 / 战令 / 任务
    drawTopShortcuts(ctx);

    // 当前章节 badge（不滚）
    drawCurrentChapter(ctx, w, activeCh);

    // 底部入口
    drawBottomEntries(ctx, w, h);
  }
}

function drawChapterBanner(ctx, ch, y, t) {
  const w = CONFIG.CANVAS_W;
  // 城门造型
  ctx.save();
  // 拱门
  const gw = 280, gh = 110;
  const x = w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  drawRoundedRect(ctx, x - gw / 2, y - 10, gw, gh, 18);
  ctx.fill();
  // 渐变带
  const g = ctx.createLinearGradient(x - gw/2, y, x + gw/2, y);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, ch.theme); g.addColorStop(1, '#fff');
  ctx.fillStyle = g;
  drawRoundedRect(ctx, x - gw / 2 + 6, y - 4, gw - 12, gh - 12, 14);
  ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  // 文字
  ctx.fillStyle = '#4a1500';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 22px sans-serif';
  ctx.fillText(`${ch.emoji} 第 ${ch.id} 章`, x, y + 30);
  ctx.font = '900 28px sans-serif';
  ctx.fillText(ch.name, x, y + 64);
  // 飘动光点
  for (let i = 0; i < 4; i++) {
    const px = x - gw/2 + 20 + i * (gw / 4) + Math.sin(t / 400 + i) * 6;
    fillCircle(ctx, px, y + 22 + Math.cos(t / 400 + i) * 4, 3, '#fff');
  }
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawCurrentChapter(ctx, w, ch) {
  drawRoundedRect(ctx, w / 2 - 100, 18, 200, 30, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 14px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${ch.emoji} ${ch.name}`, w / 2, 33);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawTopShortcuts(ctx) {
  // 三个 70×70 按钮位于左侧第 100~180 区间，避开 HUD
  const y = 100, sz = 70;
  const items = [
    { x: 16, icon: '🎡', label: '轮盘', badge: Save.canSpinWheel() },
    { x: 96, icon: '🎖️', label: '战令', badge: false },
    { x: 176, icon: '📅', label: '任务', badge: hasClaimableTask() }
  ];
  for (const it of items) {
    drawRoundedRect(ctx, it.x, y, sz, sz, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.font = '32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(it.icon, it.x + sz/2, y + sz/2 - 4);
    ctx.font = '700 12px sans-serif';
    ctx.fillText(it.label, it.x + sz/2, y + sz - 10);
    if (it.badge) {
      ctx.fillStyle = '#ff5e3a';
      fillCircle(ctx, it.x + sz - 10, y + 10, 8);
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function hasClaimableTask() {
  const d = Save.get().daily;
  if (!d || !d.tasks) return false;
  return d.tasks.some((t, i) => (t.progress || 0) >= t.target && !d.claimed.includes(i));
}

function drawBottomEntries(ctx, w, h) {
  const fy = h - 96;
  drawRoundedRect(ctx, 30, fy, 110, 80, 22);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '34px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏪', 30 + 55, fy + 32);
  ctx.font = '700 14px sans-serif'; ctx.fillText('商店', 30 + 55, fy + 60);

  drawRoundedRect(ctx, w - 140, fy, 110, 80, 22);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '34px sans-serif';
  ctx.fillText('🏰', w - 85, fy + 32);
  ctx.font = '700 14px sans-serif'; ctx.fillText('橙园别墅', w - 85, fy + 60);

  if (Save.starsAvailable() > 0) {
    ctx.fillStyle = '#ff5e3a';
    fillCircle(ctx, w - 36, fy + 8, 12);
    ctx.fillStyle = '#fff'; ctx.font = '700 14px sans-serif';
    ctx.fillText(`${Save.starsAvailable()}`, w - 36, fy + 10);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawTopHUD(ctx, w) {
  const s = Save.get();
  drawRoundedRect(ctx, 256, 24, 184, 64, 32);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.font = '34px sans-serif'; ctx.fillText('❤️', 270, 56);
  ctx.font = '700 26px sans-serif'; ctx.fillText(`${s.lives}/${5}`, 314, 56);
  const nl = Save.nextLifeIn();
  if (nl > 0) {
    const mm = Math.floor(nl / 60000), ss = Math.floor((nl % 60000) / 1000);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '500 18px sans-serif';
    ctx.fillText(`${mm}:${String(ss).padStart(2,'0')}`, 376, 56);
  }
  // 金币
  drawRoundedRect(ctx, w - 220, 24, 200, 64, 32);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '34px sans-serif'; ctx.fillText('🪙', w - 200, 56);
  ctx.font = '700 26px sans-serif'; ctx.fillText(`${s.coins}`, w - 150, 56);
  // 设置
  drawRoundedRect(ctx, w - 100, 24, 64, 64, 32);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.font = '32px sans-serif'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('⚙', w - 68, 60);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawCloud(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  fillCircle(ctx, x, y, r * 0.7);
  fillCircle(ctx, x + r * 0.6, y + 6, r * 0.55);
  fillCircle(ctx, x - r * 0.5, y + 8, r * 0.5);
  fillCircle(ctx, x + r * 0.15, y - r * 0.3, r * 0.5);
}

function drawLevelNode(ctx, n, unlocked, stars, current, t) {
  const r = 56;
  if (current) {
    const pulse = (Math.sin(t / 240) + 1) / 2;
    ctx.beginPath(); ctx.arc(n.x, n.y, r + 12 + pulse * 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + pulse * 0.2) + ')';
    ctx.fill();
  }
  ctx.save();
  ctx.translate(n.x, n.y + r);
  ctx.scale(1, 0.3);
  fillCircle(ctx, 0, 0, r * 0.9, 'rgba(0,0,0,0.35)');
  ctx.restore();
  const g = ctx.createRadialGradient(n.x - 12, n.y - 12, 8, n.x, n.y, r);
  if (unlocked) { g.addColorStop(0, '#fff7e3'); g.addColorStop(1, '#ff8b3d'); }
  else { g.addColorStop(0, '#aaa'); g.addColorStop(1, '#555'); }
  ctx.fillStyle = g;
  fillCircle(ctx, n.x, n.y, r);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#7c3a14'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = unlocked ? '#4a1500' : '#ddd';
  ctx.font = '700 38px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n.id, n.x, n.y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (unlocked && stars > 0) {
    for (let i = 0; i < 3; i++) {
      const sx = n.x - 28 + i * 28, sy = n.y + r - 6;
      drawStar(ctx, sx, sy, 10, i < stars);
    }
  }
}

function drawStar(ctx, x, y, r, filled) {
  ctx.fillStyle = filled ? '#ffd84d' : '#ccc';
  ctx.strokeStyle = '#5a2810'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.5;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
