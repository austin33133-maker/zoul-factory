// 成绩分享卡：用离屏 Canvas 生成 600×800 PNG，提供下载/分享
import { drawPrincess } from './princess.js';
import { drawRoundedRect, fillCircle } from '../utils.js';
import { getLevel, chapterOf } from '../game/levels.js';

export function generateShareCard(levelId, score, stars) {
  const level = getLevel(levelId);
  const ch = chapterOf(levelId);
  const W = 600, H = 800;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffb066'); bg.addColorStop(0.5, ch.theme); bg.addColorStop(1, '#5a2810');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // 装饰云
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 5; i++) {
    const x = (i * 137) % W, y = 60 + (i * 80) % 200;
    fillCircle(ctx, x, y, 40 + (i % 3) * 10);
    fillCircle(ctx, x + 30, y + 4, 30);
  }

  // 顶部章节横幅
  drawRoundedRect(ctx, W / 2 - 200, 36, 400, 70, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 22px sans-serif';
  ctx.fillText(`${ch.emoji} 第 ${ch.id} 章 · ${ch.name}`, W / 2, 72);

  // 公主
  drawPrincess(ctx, W / 2, 240, 1.2, 'cheer', 0);

  // 关卡名
  ctx.fillStyle = '#fff'; ctx.font = '900 38px sans-serif';
  ctx.fillText(`关卡 ${level.id} · ${level.name}`, W / 2, 410);

  // 通关标记
  drawRoundedRect(ctx, W / 2 - 130, 440, 260, 50, 25);
  ctx.fillStyle = '#ffd84d'; ctx.fill();
  ctx.fillStyle = '#4a1500'; ctx.font = '900 28px sans-serif';
  ctx.fillText('🎉 通关 🎉', W / 2, 466);

  // 星星
  const sy = 540;
  for (let i = 0; i < 3; i++) {
    const sx = W / 2 - 90 + i * 90;
    drawShareStar(ctx, sx, sy, 36, i < stars);
  }

  // 分数
  drawRoundedRect(ctx, W / 2 - 160, 620, 320, 72, 36);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '500 18px sans-serif';
  ctx.fillText('得分', W / 2, 640);
  ctx.fillStyle = '#ffd84d'; ctx.font = '900 36px sans-serif';
  ctx.fillText(String(score), W / 2, 672);

  // 水印
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('🍊 橙子公主 Orange Princess', W / 2, 760);

  return c.toDataURL('image/png');
}

function drawShareStar(ctx, x, y, r, filled) {
  ctx.fillStyle = filled ? '#ffd84d' : 'rgba(255,255,255,0.3)';
  ctx.strokeStyle = '#5a2810'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.5;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// 让用户保存或分享这张图
export async function shareOrDownload(dataUrl, levelId) {
  const filename = `orange-princess-L${levelId}.png`;
  // 优先 Web Share API（手机原生分享）
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '橙子公主', text: '我通关啦 🍊' });
      return 'shared';
    }
  } catch (e) { /* 回退到下载 */ }
  // 回退：触发下载
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'downloaded';
}
