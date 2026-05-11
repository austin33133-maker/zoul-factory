import { CONFIG } from '../config.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { LEVELS, totalLevels } from '../game/levels.js';
import { drawPrincess, drawSpeech } from '../ui/princess.js';
import { drawRoundedRect, fillCircle, easeOutCubic } from '../utils.js';
import { modal } from '../ui/modal.js';

export class MapScene {
  constructor(sm) {
    this.sm = sm;
    this.scroll = 0;
    this.targetScroll = 0;
    this.dragStart = null;
    this.lastDragY = null;
    this.startY = null;
    this.startTime = 0;
    this.t = 0;

    // 计算每关节点位置（蜿蜒小道）
    this.nodes = LEVELS.map((lv, i) => {
      const baseY = 200 + i * 200;
      const x = CONFIG.CANVAS_W / 2 + Math.sin(i * 1.2) * 220;
      return { ...lv, x, y: baseY };
    });
    this.totalH = (LEVELS.length + 1) * 200 + 200;
  }

  enter() {
    Save.regenLives();
    const s = Save.get();
    // 滚动到当前关卡
    const target = this.nodes[Math.min(s.level, this.nodes.length) - 1] || this.nodes[0];
    this.targetScroll = Math.max(0, target.y - CONFIG.CANVAS_H * 0.55);
    this.scroll = this.targetScroll;
  }

  onPointerDown(x, y) {
    this.dragStart = y;
    this.lastDragY = y;
    this.dragScrollAt = this.scroll;
    this.dragMoved = false;
    this.tapX = x; this.tapY = y;
    this.startTime = performance.now();
  }
  onPointerMove(x, y) {
    if (this.dragStart == null) return;
    const dy = this.dragStart - y;
    if (Math.abs(dy) > 6) this.dragMoved = true;
    this.targetScroll = clamp(this.dragScrollAt + dy, 0, Math.max(0, this.totalH - CONFIG.CANVAS_H));
    this.lastDragY = y;
  }
  onPointerUp(x, y) {
    const moved = this.dragMoved;
    this.dragStart = null;
    if (moved) return;
    // 检查点击哪个节点
    const sy = this.tapY + this.scroll;
    for (const n of this.nodes) {
      const dx = n.x - this.tapX, dy = n.y - sy;
      if (dx * dx + dy * dy < 60 * 60) { this.tapNode(n); return; }
    }
    // 头部右上角设置按钮检测
    if (this.tapX > CONFIG.CANVAS_W - 100 && this.tapY < 100) this.openSettings();
  }

  async tapNode(n) {
    const s = Save.get();
    if (n.id > s.maxLevel) { Audio.invalid(); return; }
    Audio.click();
    const stars = s.stars[n.id] || 0;
    const best = s.bestScore[n.id] || 0;
    const html = `
      <p style="font-size:18px;color:#7c3a14">关卡 ${n.id} · <b>${n.name}</b></p>
      <p style="color:#7c3a14">${n.story}</p>
      <p style="margin-top:8px;color:#7c3a14">
        ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}　最佳 ${best}
      </p>
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
        await modal({ title: '生命已用尽', html: '<p>等待回复或观看广告获得（演示）</p>', buttons: [{ label: '获得 1 ❤️ (演示)', value: 'free' }, { label: '我先逛逛', value: 'cancel', style: 'ghost' }] }).then(v => {
          if (v === 'free') Save.giveLife(1);
        });
        return;
      }
      Save.consumeLife();
      Save.setLevel(n.id);
      this.sm.switchTo('game', { levelId: n.id });
    }
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
    // 滚动惯性平滑
    this.scroll += (this.targetScroll - this.scroll) * 0.18;
  }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#ffb066'); bg.addColorStop(1, '#ff6e4a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 装饰云
    for (let i = 0; i < 6; i++) {
      const y = (i * 240 + this.t * 0.01) % (h + 200) - 100;
      drawCloud(ctx, (i * 137) % w, y, 80 + (i % 3) * 18);
    }

    // 路径（虚线连接）
    ctx.save();
    ctx.translate(0, -this.scroll);
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

    // 公主在第一关上方
    const headerY = 130;
    drawPrincess(ctx, w / 2, headerY, 0.9, 'cheer', this.t);
    drawSpeech(ctx, w / 2, headerY + 130, '一起出发吧！🍊');
  }
}

function drawTopHUD(ctx, w) {
  const s = Save.get();
  // 生命
  drawRoundedRect(ctx, 20, 24, 220, 64, 32);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 26px sans-serif'; ctx.textBaseline = 'middle';
  // 心
  ctx.font = '34px sans-serif'; ctx.fillText('❤️', 32, 56);
  ctx.font = '700 26px sans-serif'; ctx.fillText(`${s.lives}/${5}`, 80, 56);
  // 倒计时
  const nl = Save.nextLifeIn();
  if (nl > 0) {
    const mm = Math.floor(nl / 60000), ss = Math.floor((nl % 60000) / 1000);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '500 18px sans-serif';
    ctx.fillText(`${mm}:${String(ss).padStart(2,'0')}`, 140, 56);
  }
  // 金币
  drawRoundedRect(ctx, w - 220, 24, 200, 64, 32);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.font = '34px sans-serif'; ctx.fillText('🪙', w - 200, 56);
  ctx.fillStyle = '#fff'; ctx.font = '700 26px sans-serif';
  ctx.fillText(`${s.coins}`, w - 150, 56);
  // 设置
  drawRoundedRect(ctx, w - 100, 24, 64, 64, 32);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.font = '32px sans-serif'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('⚙', w - 68, 60);
  ctx.textAlign = 'left';
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
  // 光环
  if (current) {
    const pulse = (Math.sin(t / 240) + 1) / 2;
    ctx.beginPath(); ctx.arc(n.x, n.y, r + 12 + pulse * 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + pulse * 0.2) + ')';
    ctx.fill();
  }
  // 阴影
  ctx.save();
  ctx.translate(n.x, n.y + r);
  ctx.scale(1, 0.3);
  fillCircle(ctx, 0, 0, r * 0.9, 'rgba(0,0,0,0.35)');
  ctx.restore();
  // 主体
  const g = ctx.createRadialGradient(n.x - 12, n.y - 12, 8, n.x, n.y, r);
  if (unlocked) { g.addColorStop(0, '#fff7e3'); g.addColorStop(1, '#ff8b3d'); }
  else { g.addColorStop(0, '#aaa'); g.addColorStop(1, '#555'); }
  ctx.fillStyle = g;
  fillCircle(ctx, n.x, n.y, r);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#7c3a14'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
  // 数字
  ctx.fillStyle = unlocked ? '#4a1500' : '#ddd';
  ctx.font = '700 38px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n.id, n.x, n.y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  // 星星
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
