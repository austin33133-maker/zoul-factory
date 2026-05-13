import { CONFIG } from '../config.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { BATTLE_TIERS } from '../game/tasks.js';
import { drawPrincess } from '../ui/princess.js';
import { drawRoundedRect, fillCircle, showToast } from '../utils.js';

const TIER_XP = 100;
const TIER_W = 140;
const TIER_H = 240;
const ROW_PAD_TOP = 200;

export class BattlePassScene {
  constructor(sm) {
    this.sm = sm;
    this.t = 0;
    this.scroll = 0;
    this.targetScroll = 0;
    this.totalW = TIER_W * BATTLE_TIERS.length + 60;
  }

  enter() { this.t = 0; }

  onPointerDown(x, y) {
    this.dragStart = x;
    this.dragScrollAt = this.scroll;
    this.dragMoved = false;
    this.tapX = x; this.tapY = y;
  }
  onPointerMove(x) {
    if (this.dragStart == null) return;
    const dx = this.dragStart - x;
    if (Math.abs(dx) > 6) this.dragMoved = true;
    this.targetScroll = clamp(this.dragScrollAt + dx, 0, Math.max(0, this.totalW - CONFIG.CANVAS_W + 40));
  }
  onPointerUp() {
    const moved = this.dragMoved;
    this.dragStart = null;
    if (moved) return;
    // 返回
    if (this.tapX < 100 && this.tapY < 100) { Audio.click(); this.sm.switchTo('map'); return; }
    // 点击 tier 卡片
    const x = this.tapX + this.scroll - 30;
    const idx = Math.floor(x / TIER_W);
    if (idx < 0 || idx >= BATTLE_TIERS.length) return;
    if (this.tapY < ROW_PAD_TOP || this.tapY > ROW_PAD_TOP + TIER_H) return;
    this.tapTier(idx);
  }

  tapTier(idx) {
    const tier = BATTLE_TIERS[idx];
    const xp = Save.get().battle?.xp || 0;
    const claimed = Save.get().battle?.claimedTiers || [];
    if (claimed.includes(tier.tier)) { showToast('已领取'); Audio.invalid(); return; }
    if (xp < tier.tier * TIER_XP) { showToast(`需 ${tier.tier * TIER_XP} XP`); Audio.invalid(); return; }
    if (Save.claimBattleTier(tier.tier, tier.reward)) {
      Audio.coin();
      const labels = [];
      if (tier.reward.coins) labels.push(`🪙 ${tier.reward.coins}`);
      if (tier.reward.lives) labels.push(`❤️ ${tier.reward.lives}`);
      if (tier.reward.booster) labels.push(`${{hammer:'🔨',bomb:'💣',swap:'🔀'}[tier.reward.booster]}×${tier.reward.boosterN||1}`);
      showToast(`领取：${labels.join(' ')}`);
    }
  }

  update(dt) {
    this.t += dt;
    this.scroll += (this.targetScroll - this.scroll) * 0.2;
  }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3a1d6e'); bg.addColorStop(0.5, '#7a3df4'); bg.addColorStop(1, '#ff5e3a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 返回
    drawRoundedRect(ctx, 16, 24, 64, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 32px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←', 48, 56);

    // 标题 + XP 进度
    ctx.fillStyle = '#fff'; ctx.font = '900 40px sans-serif';
    ctx.fillText('🎖️ 战令 · 第 1 季', w / 2, 60);

    const xp = Save.get().battle?.xp || 0;
    const totalNeeded = BATTLE_TIERS.length * TIER_XP;
    ctx.font = '500 16px sans-serif';
    ctx.fillText(`总 XP ${xp} / ${totalNeeded}`, w / 2, 96);

    drawRoundedRect(ctx, 60, 120, w - 120, 24, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    drawRoundedRect(ctx, 60, 120, (w - 120) * Math.min(1, xp / totalNeeded), 24, 12);
    ctx.fillStyle = '#ffd84d'; ctx.fill();

    // 横向滚动 tier 卡片
    ctx.save();
    ctx.translate(-this.scroll, 0);
    BATTLE_TIERS.forEach((t, i) => {
      const x = 30 + i * TIER_W;
      this.drawTierCard(ctx, t, x, ROW_PAD_TOP, xp);
    });
    ctx.restore();

    // 滚动提示
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← 横向拖动查看 →', w / 2, ROW_PAD_TOP + TIER_H + 28);

    // 公主
    drawPrincess(ctx, w - 90, h - 130, 0.6, 'cheer', this.t);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  drawTierCard(ctx, tier, x, y, xp) {
    const claimed = Save.get().battle?.claimedTiers || [];
    const isClaimed = claimed.includes(tier.tier);
    const reached = xp >= tier.tier * TIER_XP;

    drawRoundedRect(ctx, x, y, TIER_W - 20, TIER_H, 18);
    const g = ctx.createLinearGradient(x, y, x, y + TIER_H);
    if (isClaimed) { g.addColorStop(0, '#7be36b'); g.addColorStop(1, '#5fb551'); }
    else if (reached) { g.addColorStop(0, '#ffd84d'); g.addColorStop(1, '#ff8b3d'); }
    else { g.addColorStop(0, '#666'); g.addColorStop(1, '#333'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

    // 级别
    ctx.fillStyle = '#fff'; ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tier.tier, x + (TIER_W - 20) / 2, y + 40);
    ctx.font = '500 12px sans-serif';
    ctx.fillText(`${tier.tier * TIER_XP} XP`, x + (TIER_W - 20) / 2, y + 64);

    // 奖励图标
    let icon = '🪙';
    if (tier.reward.booster) icon = { hammer: '🔨', bomb: '💣', swap: '🔀' }[tier.reward.booster];
    else if (tier.reward.lives) icon = '❤️';
    ctx.font = '54px sans-serif';
    ctx.fillText(icon, x + (TIER_W - 20) / 2, y + 130);

    // 奖励数量
    ctx.fillStyle = '#fff'; ctx.font = '700 16px sans-serif';
    let qty = tier.reward.coins ? tier.reward.coins : (tier.reward.boosterN || tier.reward.lives || '');
    ctx.fillText('×' + qty, x + (TIER_W - 20) / 2, y + 168);

    // 状态
    drawRoundedRect(ctx, x + 10, y + TIER_H - 38, TIER_W - 40, 28, 14);
    ctx.fillStyle = isClaimed ? '#4a1500' : (reached ? '#fff' : '#222'); ctx.fill();
    ctx.fillStyle = isClaimed ? '#fff' : (reached ? '#4a1500' : '#888');
    ctx.font = '700 14px sans-serif';
    ctx.fillText(isClaimed ? '已领取' : (reached ? '点击领取' : '未达成'), x + (TIER_W - 20) / 2, y + TIER_H - 24);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
