// 6 种水果的程序化 Canvas 绘制（多层渐变 + 高光 + 纹理 + 叶/茎）。
// 用法: drawFruit(ctx, 'orange', x, y, r, t)
// 所有图形原创，零外部资源依赖。

import { fillCircle } from '../utils.js';

function shadow(ctx, r) {
  ctx.save();
  ctx.translate(0, r * 0.85);
  ctx.scale(1, 0.3);
  fillCircle(ctx, 0, 0, r * 0.9, 'rgba(0,0,0,0.4)');
  ctx.restore();
}

function specular(ctx, r, color = 'rgba(255,255,255,0.55)', sx = -0.35, sy = -0.4, sw = 0.32, sh = 0.18, rot = -0.6) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(r * sx, r * sy, r * sw, r * sh, rot, 0, Math.PI * 2);
  ctx.fill();
}

// 🍊 橙子：圆 + 毛孔 + 顶部茎+叶
export function drawOrange(ctx, r, t) {
  shadow(ctx, r);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#ffe2a5'); g.addColorStop(0.5, '#ff9a3d'); g.addColorStop(1, '#c14a14');
  ctx.fillStyle = g;
  fillCircle(ctx, 0, 0, r);
  // 毛孔
  ctx.fillStyle = 'rgba(170,70,20,0.35)';
  for (let i = 0; i < 12; i++) {
    const a = i * 0.6 + Math.sin(i * 1.7);
    const rr = r * (0.4 + (i % 3) * 0.15);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  // 顶部凹陷
  ctx.fillStyle = 'rgba(120,50,10,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.85, r * 0.13, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  // 叶子
  ctx.save();
  ctx.translate(r * 0.1, -r * 0.95);
  ctx.rotate(-0.3 + Math.sin(t / 600) * 0.05);
  const lg = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.1);
  lg.addColorStop(0, '#a8e15a'); lg.addColorStop(1, '#3f8a23');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, r * 0.18, r * 0.32, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a5814'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(0, -r * 0.3); ctx.stroke();
  ctx.restore();
  // 高光
  specular(ctx, r);
  // 描边
  ctx.strokeStyle = 'rgba(80,30,5,0.35)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

// 🍓 草莓：心形 + 种子 + 绿叶
export function drawStrawberry(ctx, r, t) {
  shadow(ctx, r);
  // 主体（爱心形）
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffb0c8'); g.addColorStop(0.5, '#ff4a6e'); g.addColorStop(1, '#b01a3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.bezierCurveTo(r * 1.0, -r * 0.85, r * 1.05, r * 0.25, 0, r);
  ctx.bezierCurveTo(-r * 1.05, r * 0.25, -r * 1.0, -r * 0.85, 0, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  // 种子
  ctx.fillStyle = '#fff4a6';
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9, rr = r * (0.3 + (i % 3) * 0.2);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.95 - r * 0.1;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.05, r * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 高光
  specular(ctx, r, 'rgba(255,255,255,0.45)', -0.4, -0.3, 0.25, 0.12);
  // 绿叶冠
  ctx.fillStyle = '#3f8a23';
  ctx.beginPath();
  const leafR = r * 0.5;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5;
    ctx.lineTo(Math.cos(a) * leafR, Math.sin(a) * leafR - r * 0.55);
  }
  ctx.lineTo(0, -r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7be36b';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.4;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3 - r * 0.55, r * 0.13, r * 0.22, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // 描边
  ctx.strokeStyle = 'rgba(80,10,30,0.35)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.bezierCurveTo(r * 1.0, -r * 0.85, r * 1.05, r * 0.25, 0, r);
  ctx.bezierCurveTo(-r * 1.05, r * 0.25, -r * 1.0, -r * 0.85, 0, -r * 0.55);
  ctx.stroke();
}

// 🍋 柠檬：椭圆 + 尖端 + 纹理
export function drawLemon(ctx, r, t) {
  shadow(ctx, r);
  ctx.save();
  ctx.rotate(-0.25);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fff7a6'); g.addColorStop(0.6, '#ffd84d'); g.addColorStop(1, '#c69400');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.05, r * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  // 两端尖凸
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, 0);
  ctx.quadraticCurveTo(-r * 1.2, -r * 0.1, -r * 1.0, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.15, 0, -r * 1.0, r * 0.1);
  ctx.quadraticCurveTo(-r * 1.2, r * 0.1, -r * 1.0, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 1.0, 0);
  ctx.quadraticCurveTo(r * 1.2, -r * 0.1, r * 1.0, -r * 0.1);
  ctx.quadraticCurveTo(r * 1.15, 0, r * 1.0, r * 0.1);
  ctx.quadraticCurveTo(r * 1.2, r * 0.1, r * 1.0, 0);
  ctx.fill();
  // 纹理（细横线）
  ctx.strokeStyle = 'rgba(200,140,0,0.3)'; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    const y = i * r * 0.15;
    ctx.moveTo(-r * 0.85, y); ctx.quadraticCurveTo(0, y * 1.1, r * 0.85, y);
    ctx.stroke();
  }
  // 高光
  specular(ctx, r, 'rgba(255,255,255,0.5)', -0.35, -0.35, 0.3, 0.14);
  // 描边
  ctx.strokeStyle = 'rgba(140,90,0,0.4)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.05, r * 0.78, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 🍏 青苹果：圆 + 顶部凹陷 + 茎+叶
export function drawGreenApple(ctx, r, t) {
  shadow(ctx, r);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#e6ffb0'); g.addColorStop(0.5, '#7be36b'); g.addColorStop(1, '#3a7c2a');
  ctx.fillStyle = g;
  ctx.beginPath();
  // 苹果轮廓：上凹下圆
  ctx.moveTo(0, -r * 0.7);
  ctx.bezierCurveTo(-r * 0.4, -r * 0.95, -r * 1.05, -r * 0.5, -r * 1.0, 0);
  ctx.bezierCurveTo(-r * 1.0, r * 0.8, -r * 0.4, r, 0, r);
  ctx.bezierCurveTo(r * 0.4, r, r * 1.0, r * 0.8, r * 1.0, 0);
  ctx.bezierCurveTo(r * 1.05, -r * 0.5, r * 0.4, -r * 0.95, 0, -r * 0.7);
  ctx.closePath();
  ctx.fill();
  // 顶部小凹陷
  ctx.fillStyle = 'rgba(40,80,20,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.7, r * 0.18, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  // 茎
  ctx.strokeStyle = '#5a2810'; ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.04, -r * 0.7);
  ctx.quadraticCurveTo(r * 0.15, -r * 1.0, r * 0.25, -r * 1.05);
  ctx.stroke();
  // 叶
  ctx.save();
  ctx.translate(r * 0.05, -r * 0.85);
  ctx.rotate(0.6 + Math.sin(t / 600) * 0.08);
  const lg = ctx.createLinearGradient(0, -r * 0.2, 0, r * 0.2);
  lg.addColorStop(0, '#a8e15a'); lg.addColorStop(1, '#3f8a23');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.22, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 粉红腮
  ctx.fillStyle = 'rgba(255,140,160,0.35)';
  ctx.beginPath();
  ctx.ellipse(r * 0.4, r * 0.1, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // 高光
  specular(ctx, r, 'rgba(255,255,255,0.55)', -0.4, -0.4, 0.28, 0.16);
  // 描边
  ctx.strokeStyle = 'rgba(40,70,20,0.4)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.7);
  ctx.bezierCurveTo(-r * 0.4, -r * 0.95, -r * 1.05, -r * 0.5, -r * 1.0, 0);
  ctx.bezierCurveTo(-r * 1.0, r * 0.8, -r * 0.4, r, 0, r);
  ctx.bezierCurveTo(r * 0.4, r, r * 1.0, r * 0.8, r * 1.0, 0);
  ctx.bezierCurveTo(r * 1.05, -r * 0.5, r * 0.4, -r * 0.95, 0, -r * 0.7);
  ctx.stroke();
}

// 🫐 蓝梅：单颗圆球 + 底部小花
export function drawBlueberry(ctx, r, t) {
  shadow(ctx, r);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#9bd1ff'); g.addColorStop(0.5, '#3a6fc8'); g.addColorStop(1, '#1a2c6a');
  ctx.fillStyle = g;
  fillCircle(ctx, 0, 0, r);
  // 白霜
  ctx.fillStyle = 'rgba(200,220,255,0.18)';
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * r * 0.85;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  // 底部小花（五角）
  ctx.fillStyle = '#1a2c6a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r * 0.22 : r * 0.1;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + r * 0.55);
  }
  ctx.closePath();
  ctx.fill();
  // 高光
  specular(ctx, r, 'rgba(255,255,255,0.7)', -0.4, -0.4, 0.3, 0.14);
  fillCircle(ctx, -r * 0.15, -r * 0.5, r * 0.08, 'rgba(255,255,255,0.5)');
  // 描边
  ctx.strokeStyle = 'rgba(10,15,40,0.45)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

// 🍇 葡萄：3 颗葡萄叠成串 + 茎+叶
export function drawGrape(ctx, r, t) {
  shadow(ctx, r);
  // 叶子（在背后）
  ctx.save();
  ctx.translate(r * 0.2, -r * 0.85);
  ctx.rotate(-0.5 + Math.sin(t / 600) * 0.05);
  const lg = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.2);
  lg.addColorStop(0, '#a8e15a'); lg.addColorStop(1, '#3f8a23');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-r * 0.4, -r * 0.4, -r * 0.7, -r * 0.2, -r * 0.5, r * 0.1);
  ctx.bezierCurveTo(-r * 0.4, r * 0.3, 0, r * 0.3, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a5814'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.05); ctx.lineTo(-r * 0.4, -r * 0.05); ctx.stroke();
  ctx.restore();
  // 茎
  ctx.strokeStyle = '#5a2810'; ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, -r * 0.7);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.95, -r * 0.3, -r * 0.95);
  ctx.stroke();
  // 葡萄串：上 2 颗、下 2 颗、最底 1 颗
  const grapeR = r * 0.36;
  const positions = [
    [-r * 0.45, -r * 0.3], [r * 0.0, -r * 0.4], [r * 0.45, -r * 0.3],
    [-r * 0.25, r * 0.05], [r * 0.25, r * 0.05],
    [0, r * 0.45]
  ];
  for (const [x, y] of positions) {
    const g = ctx.createRadialGradient(x - grapeR * 0.3, y - grapeR * 0.4, grapeR * 0.1, x, y, grapeR);
    g.addColorStop(0, '#dabaff'); g.addColorStop(0.6, '#9357d8'); g.addColorStop(1, '#3d1466');
    ctx.fillStyle = g;
    fillCircle(ctx, x, y, grapeR);
    ctx.strokeStyle = 'rgba(40,10,80,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, grapeR, 0, Math.PI * 2); ctx.stroke();
    // 各葡萄高光
    fillCircle(ctx, x - grapeR * 0.3, y - grapeR * 0.4, grapeR * 0.15, 'rgba(255,255,255,0.6)');
  }
}

const DRAWERS = {
  orange: drawOrange,
  red: drawStrawberry,
  yellow: drawLemon,
  green: drawGreenApple,
  blue: drawBlueberry,
  purple: drawGrape
};

// 入口：以 (x,y) 为中心，r 为半径绘制对应水果
export function drawFruit(ctx, colorId, x, y, r, t = 0) {
  const fn = DRAWERS[colorId];
  if (!fn) return false;
  ctx.save();
  ctx.translate(x, y);
  fn(ctx, r, t);
  ctx.restore();
  return true;
}
