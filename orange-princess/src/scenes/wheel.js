import { CONFIG } from '../config.js';
import { Save } from '../storage.js';
import { Audio } from '../audio.js';
import { WHEEL_SEGMENTS } from '../game/tasks.js';
import { drawPrincess, drawSpeech } from '../ui/princess.js';
import { drawRoundedRect, fillCircle, easeOutCubic, showToast } from '../utils.js';
import { modal } from '../ui/modal.js';

export class WheelScene {
  constructor(sm) {
    this.sm = sm;
    this.t = 0;
    this.angle = 0;          // 当前角度
    this.spinning = false;
    this.spinSpeed = 0;
    this.spinTotal = 0;
    this.spinElapsed = 0;
    this.resultIdx = -1;
  }

  enter() { this.t = 0; this.spinning = false; this.angle = 0; }

  onPointerDown(x, y) {
    if (x < 100 && y < 100) { Audio.click(); this.sm.switchTo('map'); return; }
    // 中央按钮
    const w = CONFIG.CANVAS_W;
    const cx = w / 2, cy = 540;
    if (Math.hypot(x - cx, y - cy) < 60) this.tapSpin();
  }
  onPointerMove() {} onPointerUp() {}

  async tapSpin() {
    if (this.spinning) return;
    if (!Save.canSpinWheel()) { Audio.invalid(); showToast('每日仅一次，请明天再来'); return; }
    Audio.click();
    // 抽奖
    const n = WHEEL_SEGMENTS.length;
    const idx = Math.floor(Math.random() * n);
    this.resultIdx = idx;
    // 目标角度：让 idx 段顶到指针位置（指针在顶部）
    const segAngle = (Math.PI * 2) / n;
    const target = -Math.PI / 2 - idx * segAngle - segAngle / 2; // 顶部指向
    // 多转 5 圈再到目标
    const spins = 5 * Math.PI * 2;
    this.spinTotal = spins + (target - this.angle);
    while (this.spinTotal < 0) this.spinTotal += Math.PI * 2;
    this.spinElapsed = 0;
    this.spinDuration = 3500;
    this.spinning = true;
    this.spinStart = this.angle;
  }

  update(dt) {
    this.t += dt;
    if (this.spinning) {
      this.spinElapsed += dt;
      const k = Math.min(1, this.spinElapsed / this.spinDuration);
      this.angle = this.spinStart + this.spinTotal * easeOutCubic(k);
      // 滴答声
      if (Math.floor(this.spinElapsed / 80) !== Math.floor((this.spinElapsed - dt) / 80)) {
        Audio.click();
      }
      if (k >= 1) {
        this.spinning = false;
        this.handleResult();
      }
    }
  }

  async handleResult() {
    const seg = WHEEL_SEGMENTS[this.resultIdx];
    Save.markWheelSpun();
    // 发奖
    if (seg.reward.coins) Save.addCoins(seg.reward.coins);
    if (seg.reward.lives) Save.giveLife(seg.reward.lives);
    if (seg.reward.booster) Save.giveBooster(seg.reward.booster, seg.reward.boosterN || 1);
    Audio.win();
    await modal({
      title: '🎉 中奖啦！',
      html: `<p style="font-size:32px;margin:14px 0">${seg.label}</p><p style="color:#7c3a14;font-size:13px">明天还可以再来！</p>`,
      buttons: [{ label: '收下', value: 'ok' }]
    });
  }

  draw(ctx) {
    const w = CONFIG.CANVAS_W, h = CONFIG.CANVAS_H;
    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#7a3df4'); bg.addColorStop(0.5, '#c14a93'); bg.addColorStop(1, '#ff8b3d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // 返回按钮
    drawRoundedRect(ctx, 16, 24, 64, 64, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 32px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←', 48, 56);

    // 标题
    ctx.fillStyle = '#fff'; ctx.font = '900 44px sans-serif';
    ctx.fillText('🎡 每日轮盘', w / 2, 80);

    // 倒计时（不可旋转时显示）
    if (!Save.canSpinWheel()) {
      const ms = Save.nextWheelIn();
      const hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '500 18px sans-serif';
      ctx.fillText(`下次开放 ${hh}小时${mm}分`, w / 2, 130);
    } else {
      ctx.fillStyle = '#ffd84d'; ctx.font = '700 18px sans-serif';
      ctx.fillText('今日可旋转一次！', w / 2, 130);
    }

    // 轮盘
    const cx = w / 2, cy = 540, R = 260;
    ctx.save();
    ctx.translate(cx, cy);
    // 外环
    fillCircle(ctx, 0, 0, R + 14, '#4a1500');
    fillCircle(ctx, 0, 0, R + 6, '#fff');
    ctx.rotate(this.angle);
    const n = WHEEL_SEGMENTS.length;
    const segAngle = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const seg = WHEEL_SEGMENTS[i];
      const a0 = i * segAngle, a1 = (i + 1) * segAngle;
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      // 文字
      ctx.save();
      ctx.rotate(a0 + segAngle / 2);
      ctx.translate(R * 0.65, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#4a1500'; ctx.font = '700 18px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(seg.label, 0, 0);
      ctx.restore();
    }
    // 中心按钮
    ctx.rotate(-this.angle);
    fillCircle(ctx, 0, 0, 60, '#fff');
    const canSpin = Save.canSpinWheel() && !this.spinning;
    fillCircle(ctx, 0, 0, 52, canSpin ? '#ff5e3a' : '#aaa');
    ctx.fillStyle = '#fff'; ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.spinning ? '...' : (canSpin ? 'SPIN' : '冷却'), 0, 0);
    ctx.restore();

    // 指针
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - R - 4);
    ctx.lineTo(cx + 18, cy - R - 4);
    ctx.lineTo(cx, cy - R + 28);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a1500'; ctx.lineWidth = 3; ctx.stroke();

    // 公主
    drawPrincess(ctx, 100, h - 130, 0.7, 'cheer', this.t);
    drawSpeech(ctx, 280, h - 170, '试试手气！');

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}
