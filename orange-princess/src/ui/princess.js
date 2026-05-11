// 橙子公主 - Canvas 精细绘制（多层渐变+表情）
import { drawRoundedRect, fillCircle } from '../utils.js';

const MOODS = {
  happy:   { mouth: 'smile',  eye: 'sparkle' },
  cheer:   { mouth: 'open',   eye: 'sparkle' },
  worried: { mouth: 'flat',   eye: 'normal'  },
  sad:     { mouth: 'frown',  eye: 'tear'    },
  wow:     { mouth: 'o',      eye: 'wow'     }
};

export function drawPrincess(ctx, x, y, scale = 1, mood = 'happy', t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const m = MOODS[mood] || MOODS.happy;
  // 整体轻微呼吸
  const breathe = Math.sin(t / 600) * 1.2;
  ctx.translate(0, breathe);

  // ---- 阴影 ----
  ctx.save();
  ctx.translate(0, 95);
  ctx.scale(1, 0.25);
  fillCircle(ctx, 0, 0, 70, 'rgba(0,0,0,0.35)');
  ctx.restore();

  // ---- 公主裙 / 身体 ----
  const dressGrad = ctx.createLinearGradient(0, 20, 0, 110);
  dressGrad.addColorStop(0, '#fff7e3');
  dressGrad.addColorStop(0.5, '#ffd58e');
  dressGrad.addColorStop(1, '#ff8b3d');
  ctx.fillStyle = dressGrad;
  ctx.beginPath();
  ctx.moveTo(-32, 28);
  ctx.bezierCurveTo(-80, 70, -85, 110, -60, 110);
  ctx.lineTo(60, 110);
  ctx.bezierCurveTo(85, 110, 80, 70, 32, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c14a14';
  ctx.lineWidth = 3;
  ctx.stroke();

  // ---- 脖子 ----
  ctx.fillStyle = '#ffe3b0';
  ctx.fillRect(-10, 18, 20, 18);

  // ---- 头（圆脸 + 高光） ----
  const headGrad = ctx.createRadialGradient(-12, -12, 8, 0, 0, 56);
  headGrad.addColorStop(0, '#fff5d8');
  headGrad.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = headGrad;
  fillCircle(ctx, 0, -10, 48, ctx.fillStyle);
  ctx.strokeStyle = '#c14a14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -10, 48, 0, Math.PI * 2);
  ctx.stroke();

  // ---- 头发（两侧蓬松） ----
  ctx.fillStyle = '#3a1d0e';
  ctx.beginPath();
  ctx.ellipse(-32, -28, 22, 30, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(32, -28, 22, 30, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // 刘海
  ctx.beginPath();
  ctx.moveTo(-30, -42);
  ctx.quadraticCurveTo(0, -64, 30, -42);
  ctx.quadraticCurveTo(20, -32, 0, -38);
  ctx.quadraticCurveTo(-20, -32, -30, -42);
  ctx.fill();

  // ---- 皇冠（橙子造型） ----
  ctx.save();
  ctx.translate(0, -50);
  // 王冠主体
  const crownGrad = ctx.createLinearGradient(0, -20, 0, 8);
  crownGrad.addColorStop(0, '#ffd84d');
  crownGrad.addColorStop(1, '#ff8b3d');
  ctx.fillStyle = crownGrad;
  ctx.strokeStyle = '#5a2810';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-24, 6);
  ctx.lineTo(-24, -8);
  ctx.lineTo(-12, 2);
  ctx.lineTo(0, -16);
  ctx.lineTo(12, 2);
  ctx.lineTo(24, -8);
  ctx.lineTo(24, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 橙子宝石
  fillCircle(ctx, 0, -6, 5, '#ff5e3a');
  fillCircle(ctx, -2, -8, 1.6, '#fff7');
  ctx.restore();

  // ---- 眼睛 ----
  if (m.eye === 'sparkle' || m.eye === 'normal' || m.eye === 'wow') {
    drawEye(ctx, -16, -10, m.eye, t);
    drawEye(ctx,  16, -10, m.eye, t);
  } else if (m.eye === 'tear') {
    drawEye(ctx, -16, -10, 'normal', t);
    drawEye(ctx,  16, -10, 'normal', t);
    // 泪滴
    ctx.fillStyle = '#5bc6ff';
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.quadraticCurveTo(-20, 6, -16, 6);
    ctx.quadraticCurveTo(-12, 6, -14, 0);
    ctx.fill();
  }

  // ---- 腮红 ----
  ctx.fillStyle = 'rgba(255, 105, 130, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-22, 4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(22, 4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- 嘴 ----
  ctx.strokeStyle = '#5a2810';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (m.mouth === 'smile') {
    ctx.arc(0, 10, 8, 0.15, Math.PI - 0.15);
  } else if (m.mouth === 'open') {
    ctx.fillStyle = '#c83a3a';
    ctx.beginPath();
    ctx.ellipse(0, 12, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 10, 8, 0.15, Math.PI - 0.15);
  } else if (m.mouth === 'flat') {
    ctx.moveTo(-7, 12); ctx.lineTo(7, 12);
  } else if (m.mouth === 'frown') {
    ctx.arc(0, 18, 8, Math.PI + 0.15, -0.15);
  } else if (m.mouth === 'o') {
    fillCircle(ctx, 0, 12, 5, '#c83a3a');
  }
  ctx.stroke();

  ctx.restore();
}

function drawEye(ctx, x, y, type, t) {
  // 眼白
  fillCircle(ctx, x, y, 8, '#fff');
  ctx.strokeStyle = '#5a2810';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
  // 瞳孔
  let pupilOff = Math.sin(t / 400) * 1.2;
  fillCircle(ctx, x + pupilOff, y + 1, type === 'wow' ? 5 : 4, '#1a0e2e');
  fillCircle(ctx, x + pupilOff - 1.4, y - 1, 1.6, '#fff');
  if (type === 'sparkle') {
    fillCircle(ctx, x + 2, y + 2, 1, 'rgba(255,255,255,0.8)');
  }
}

// 公主对话/心情提示气泡
export function drawSpeech(ctx, x, y, text, w = 260) {
  ctx.save();
  ctx.font = '600 22px -apple-system, "PingFang SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // 测量后调整宽度
  const m = ctx.measureText(text);
  w = Math.max(w, m.width + 40);
  const h = 60;
  drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 24);
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, '#fff8e7'); g.addColorStop(1, '#ffdfa6');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#ff8b3d'; ctx.lineWidth = 3; ctx.stroke();
  // 小尖角
  ctx.beginPath();
  ctx.moveTo(x - 12, y + h / 2);
  ctx.lineTo(x, y + h / 2 + 14);
  ctx.lineTo(x + 12, y + h / 2);
  ctx.closePath();
  ctx.fillStyle = '#ff8b3d';
  ctx.fill();
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.moveTo(x - 9, y + h / 2 - 1);
  ctx.lineTo(x, y + h / 2 + 10);
  ctx.lineTo(x + 9, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  // 文字
  ctx.fillStyle = '#4a1500';
  ctx.fillText(text, x, y);
  ctx.restore();
}
