import { CONFIG } from '../config.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { drawPrincess, drawSpeech } from '../ui/princess.js';
import { drawRoundedRect, fillCircle, clamp, showToast } from '../utils.js';

const PACKS = [
  { key: 'pack-s',  label: '果汁包', coins: 200,  price: '¥6',   color: '#7be36b', icon: '🥤' },
  { key: 'pack-m',  label: '果园礼盒', coins: 600,  price: '¥18',  color: '#5bc6ff', icon: '🎁' },
  { key: 'pack-l',  label: '宝箱大礼', coins: 1500, price: '¥45',  color: '#b06bff', icon: '👑' },
  { key: 'pack-xl', label: '富贵公主包', coins: 3500, price: '¥98', color: '#ffd84d', icon: '💎' }
];
const ITEMS = [
  { key: 'hammer-3', label: '锤子 ×3', emoji: '🔨', cost: 300, type: 'booster', id: 'hammer', n: 3 },
  { key: 'bomb-3',   label: '炸弹 ×3', emoji: '💣', cost: 360, type: 'booster', id: 'bomb',   n: 3 },
  { key: 'swap-3',   label: '换位 ×3', emoji: '🔀', cost: 280, type: 'booster', id: 'swap',   n: 3 },
  { key: 'life-5',   label: '满血 +5', emoji: '❤️', cost: 500, type: 'life',    n: 5 }
];

export class ShopScene {
  constructor(sm) {
    this.sm = sm;
    this.t = 0;
  }
  enter() { this.t = 0; this.showed = '欢迎来到果园商店！'; }

  onPointerDown(x, y) {
    // 返回按钮
    if (x < 100 && y < 100) { Audio.click(); this.sm.switchTo('map'); return; }
    // 商品卡片
    const cards = this.layout();
    for (const c of cards) {
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.buy(c.data);
        return;
      }
    }
  }
  onPointerMove() {}
  onPointerUp() {}

  buy(data) {
    if (data.kind === 'pack') {
      // 演示：直接加金币（无真实支付）
      Save.addCoins(data.pack.coins);
      Audio.coin();
      showToast(`+${data.pack.coins} 🪙 (演示)`);
      return;
    }
    if (data.kind === 'item') {
      const it = data.item;
      if (!Save.spendCoins(it.cost)) { Audio.invalid(); showToast('金币不足'); return; }
      if (it.type === 'booster') Save.giveBooster(it.id, it.n);
      else if (it.type === 'life') Save.giveLife(it.n);
      Audio.coin();
      showToast(`已购买：${it.label}`);
    }
  }

  layout() {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    const items = [];
    // 金币礼包 2 列
    const padX = 30, gap = 16;
    const packW = (w - padX * 2 - gap) / 2;
    PACKS.forEach((p, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      items.push({
        x: padX + col * (packW + gap),
        y: 220 + row * 180,
        w: packW, h: 160,
        data: { kind: 'pack', pack: p }
      });
    });
    // 道具 4 列
    const itemY = 220 + Math.ceil(PACKS.length / 2) * 180 + 40;
    const itemW = (w - padX * 2 - gap * 3) / 4;
    ITEMS.forEach((it, i) => {
      items.push({
        x: padX + i * (itemW + gap),
        y: itemY,
        w: itemW, h: 140,
        data: { kind: 'item', item: it }
      });
    });
    return items;
  }

  update(dt) { this.t += dt; }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#7a3df4'); bg.addColorStop(0.5, '#ff8b3d'); bg.addColorStop(1, '#ffd84d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 返回按钮
    drawRoundedRect(ctx, 16, 24, 64, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 32px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←', 48, 56);

    // 标题
    ctx.fillStyle = '#fff'; ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏪 果园商店', w / 2, 60);

    // 金币条
    drawRoundedRect(ctx, w - 220, 24, 200, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    ctx.font = '34px sans-serif'; ctx.fillText('🪙', w - 200, 56);
    ctx.fillStyle = '#fff'; ctx.font = '700 26px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(`${Save.get().coins}`, w - 150, 60);

    // 段落标题
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = '700 22px sans-serif';
    ctx.fillText('💰 充值金币', 30, 200);

    // 渲染卡片
    const cards = this.layout();
    for (const c of cards) {
      drawRoundedRect(ctx, c.x, c.y, c.w, c.h, 18);
      if (c.data.kind === 'pack') {
        const p = c.data.pack;
        const grad = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
        grad.addColorStop(0, '#fff'); grad.addColorStop(1, p.color);
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '50px sans-serif'; ctx.fillStyle = '#fff';
        ctx.fillText(p.icon, c.x + c.w / 2, c.y + 50);
        ctx.fillStyle = '#4a1500'; ctx.font = '700 18px sans-serif';
        ctx.fillText(p.label, c.x + c.w / 2, c.y + 90);
        ctx.font = '700 22px sans-serif'; ctx.fillStyle = '#ff5e3a';
        ctx.fillText(`+ ${p.coins} 🪙`, c.x + c.w / 2, c.y + 115);
        // 价格胶囊
        drawRoundedRect(ctx, c.x + c.w / 2 - 36, c.y + c.h - 32, 72, 24, 12);
        ctx.fillStyle = '#4a1500'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 14px sans-serif';
        ctx.fillText(p.price, c.x + c.w / 2, c.y + c.h - 20);
      } else {
        const it = c.data.item;
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '46px sans-serif';
        ctx.fillText(it.emoji, c.x + c.w / 2, c.y + 46);
        ctx.fillStyle = '#4a1500'; ctx.font = '700 14px sans-serif';
        ctx.fillText(it.label, c.x + c.w / 2, c.y + 80);
        // 价格
        drawRoundedRect(ctx, c.x + 12, c.y + c.h - 32, c.w - 24, 24, 12);
        ctx.fillStyle = '#ff8b3d'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif';
        ctx.fillText(`🪙 ${it.cost}`, c.x + c.w / 2, c.y + c.h - 20);
      }
    }

    // 道具段落标题（覆盖前段）
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = '700 22px sans-serif';
    const itemY = 220 + Math.ceil(PACKS.length / 2) * 180 + 16;
    ctx.fillText('🛍️ 道具/生命', 30, itemY);

    // 公主
    drawPrincess(ctx, w - 90, h - 110, 0.6, 'happy', this.t);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}
