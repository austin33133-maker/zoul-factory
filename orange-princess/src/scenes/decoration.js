// 装修元玩法：橙园别墅。3 个房间各 5 件物品，用星星解锁。
import { CONFIG } from '../config.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { drawPrincess, drawSpeech } from '../ui/princess.js';
import { drawRoundedRect, fillCircle, showToast } from '../utils.js';
import { modal } from '../ui/modal.js';

const ROOMS = [
  {
    id: 'garden', name: '橙园花园',
    bg: ['#7be36b', '#5fb551'],
    slots: [
      { key: 'fountain', label: '橘子喷泉', emoji: '⛲', cost: 1, x: 200, y: 600, drawn: 'fountain' },
      { key: 'tree',     label: '橘子树',   emoji: '🌳', cost: 1, x: 520, y: 620, drawn: 'tree' },
      { key: 'bench',    label: '木椅',     emoji: '🪑', cost: 1, x: 360, y: 730, drawn: 'bench' },
      { key: 'lamp',     label: '路灯',     emoji: '💡', cost: 2, x: 100, y: 720, drawn: 'lamp' },
      { key: 'butterfly', label: '蝴蝶飞舞', emoji: '🦋', cost: 2, x: 580, y: 480, drawn: 'butterfly' }
    ]
  },
  {
    id: 'hall', name: '城堡大厅',
    bg: ['#c14a93', '#7a3df4'],
    slots: [
      { key: 'rug',     label: '红毯',   emoji: '🟥', cost: 1, x: 360, y: 720, drawn: 'rug' },
      { key: 'throne',  label: '橙王座', emoji: '👑', cost: 2, x: 360, y: 540, drawn: 'throne' },
      { key: 'chandelier', label: '吊灯', emoji: '🔆', cost: 2, x: 360, y: 280, drawn: 'chandelier' },
      { key: 'painting',label: '橙王画像', emoji: '🖼️', cost: 1, x: 580, y: 460, drawn: 'painting' },
      { key: 'vase',    label: '花瓶',   emoji: '🏺', cost: 1, x: 140, y: 620, drawn: 'vase' }
    ]
  },
  {
    id: 'kitchen', name: '橙汁厨房',
    bg: ['#ffd84d', '#ff8b3d'],
    slots: [
      { key: 'fridge', label: '冰箱',    emoji: '🧊', cost: 1, x: 140, y: 580, drawn: 'fridge' },
      { key: 'oven',   label: '橙香烤炉', emoji: '🔥', cost: 1, x: 360, y: 640, drawn: 'oven' },
      { key: 'cake',   label: '橙子蛋糕', emoji: '🍰', cost: 2, x: 580, y: 620, drawn: 'cake' },
      { key: 'juicer', label: '榨汁机',   emoji: '🍹', cost: 2, x: 240, y: 700, drawn: 'juicer' },
      { key: 'table',  label: '橡木桌',   emoji: '🪵', cost: 1, x: 460, y: 760, drawn: 'table' }
    ]
  }
];

export class DecorationScene {
  constructor(sm) { this.sm = sm; this.t = 0; this.roomIdx = 0; }
  enter() { this.t = 0; this.roomIdx = Save.get().decoration.room || 0; }

  onPointerDown(x, y) {
    // 返回
    if (x < 100 && y < 100) { Audio.click(); this.sm.switchTo('map'); return; }
    // 左右切换
    if (y > CONFIG.CANVAS_H / 2 - 60 && y < CONFIG.CANVAS_H / 2 + 60) {
      if (x < 80) { this.changeRoom(-1); return; }
      if (x > CONFIG.CANVAS_W - 80) { this.changeRoom(1); return; }
    }
    // 物品槽
    const room = ROOMS[this.roomIdx];
    for (const slot of room.slots) {
      const dx = x - slot.x, dy = y - slot.y;
      if (Math.hypot(dx, dy) < 60) { this.tapSlot(room, slot); return; }
    }
  }
  onPointerMove() {} onPointerUp() {}

  changeRoom(dir) {
    Audio.click();
    this.roomIdx = (this.roomIdx + dir + ROOMS.length) % ROOMS.length;
    Save.patch({ decoration: { ...Save.get().decoration, room: this.roomIdx } });
  }

  async tapSlot(room, slot) {
    const key = `${room.id}:${slot.key}`;
    const owned = !!Save.get().decoration.items[key];
    if (owned) { showToast(`${slot.label}：已解锁`); return; }
    const v = await modal({
      title: `解锁 ${slot.label}`,
      html: `<p>消耗 ⭐ ${slot.cost} 颗星星解锁</p><p style="font-size:13px;color:#7c3a14">当前可用 ⭐ ${Save.starsAvailable()}</p>`,
      buttons: [
        { label: '稍后再说', value: 'no', style: 'ghost' },
        { label: `解锁 (⭐ ${slot.cost})`, value: 'yes' }
      ]
    });
    if (v === 'yes') {
      if (Save.unlockDecoration(key, slot.cost)) { Audio.unlock(); showToast(`已解锁：${slot.label}`); }
      else { Audio.invalid(); showToast('星星不足，去刷高分关卡吧！'); }
    }
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    const room = ROOMS[this.roomIdx];
    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, room.bg[0]); bg.addColorStop(1, room.bg[1]);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // 地板（一段斜面）
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    ctx.lineTo(w, h * 0.45);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();

    // 返回按钮
    drawRoundedRect(ctx, 16, 24, 64, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 32px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←', 48, 56);

    // 标题
    ctx.fillStyle = '#fff'; ctx.font = '900 36px sans-serif';
    ctx.fillText(`🏰 ${room.name}`, w / 2, 64);

    // 星星余额
    drawRoundedRect(ctx, w - 220, 24, 200, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.font = '34px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('⭐', w - 200, 60);
    ctx.fillStyle = '#fff'; ctx.font = '700 26px sans-serif';
    ctx.fillText(`${Save.starsAvailable()}`, w - 150, 60);

    // 左右切换
    drawRoundedRect(ctx, 12, h / 2 - 40, 60, 80, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    drawRoundedRect(ctx, w - 72, h / 2 - 40, 60, 80, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = '40px sans-serif';
    ctx.fillText('‹', 42, h / 2);
    ctx.fillText('›', w - 42, h / 2);

    // 物品槽
    for (const slot of room.slots) {
      const key = `${room.id}:${slot.key}`;
      const owned = !!Save.get().decoration.items[key];
      ctx.save();
      ctx.translate(slot.x, slot.y);
      if (owned) {
        // 已解锁：圆角阴影 + emoji 大字
        ctx.font = '92px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // 阴影
        ctx.save();
        ctx.translate(0, 50); ctx.scale(1, 0.3);
        fillCircle(ctx, 0, 0, 50, 'rgba(0,0,0,0.4)');
        ctx.restore();
        ctx.fillText(slot.emoji, 0, 0);
      } else {
        // 未解锁：虚线圆 + 星星标价
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 30px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`⭐${slot.cost}`, 0, 0);
        ctx.font = '500 12px sans-serif';
        ctx.fillText(slot.label, 0, 66);
      }
      ctx.restore();
    }

    // 进度
    const total = room.slots.length;
    const done = room.slots.filter(s => Save.get().decoration.items[`${room.id}:${s.key}`]).length;
    drawRoundedRect(ctx, w / 2 - 120, 110, 240, 16, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    drawRoundedRect(ctx, w / 2 - 120, 110, 240 * done / total, 16, 8);
    ctx.fillStyle = '#ffd84d'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${done} / ${total}`, w / 2, 122);

    // 公主
    drawPrincess(ctx, 120, h - 130, 0.7, 'cheer', this.t);
    drawSpeech(ctx, 280, h - 170, '把家装得漂漂亮亮的！');

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}
