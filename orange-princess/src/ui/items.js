// 木箱 / 礼物盒 / 特殊棋子的精细 Canvas 绘制。
import { drawRoundedRect, fillCircle } from '../utils.js';

// 📦 木箱：木板纹理 + 铁角 + HP 裂痕
export function drawCrate(ctx, x, y, sz, hp, maxHp, t) {
  ctx.save();
  ctx.translate(x, y);
  const half = sz / 2;
  // 阴影
  ctx.save();
  ctx.translate(0, sz * 0.42);
  ctx.scale(1, 0.3);
  fillCircle(ctx, 0, 0, sz * 0.45, 'rgba(0,0,0,0.4)');
  ctx.restore();
  // 主体（带 3D 倒角）
  const g = ctx.createLinearGradient(-half, -half, half, half);
  g.addColorStop(0, '#c98a4a'); g.addColorStop(0.5, '#9a6328'); g.addColorStop(1, '#5d3a14');
  ctx.fillStyle = g;
  drawRoundedRect(ctx, -half, -half, sz, sz, 6);
  ctx.fill();
  // 木板缝（横 2 条）
  ctx.strokeStyle = 'rgba(40,20,5,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-half + 4, -sz * 0.18); ctx.lineTo(half - 4, -sz * 0.18);
  ctx.moveTo(-half + 4,  sz * 0.18); ctx.lineTo(half - 4,  sz * 0.18);
  ctx.stroke();
  // 木纹
  ctx.strokeStyle = 'rgba(60,30,10,0.25)'; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-half + 6, i * sz * 0.12 + 3);
    ctx.bezierCurveTo(0, i * sz * 0.12 - 2, 0, i * sz * 0.12 + 6, half - 6, i * sz * 0.12 + 2);
    ctx.stroke();
  }
  // 铁角（4 个）
  ctx.fillStyle = '#3a3a3a'; ctx.strokeStyle = '#1a1a1a';
  const cornerSz = sz * 0.22;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx * half, sy * half);
    ctx.lineTo(sx * half - sx * cornerSz, sy * half);
    ctx.lineTo(sx * half, sy * half - sy * cornerSz);
    ctx.closePath();
    ctx.fill();
    // 铆钉
    fillCircle(ctx, sx * (half - 6), sy * (half - 6), 2, '#888');
  });
  // 裂痕（受伤后显示）
  if (hp < maxHp) {
    ctx.strokeStyle = 'rgba(20,10,0,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-half * 0.4, -half * 0.4);
    ctx.lineTo(half * 0.2, 0);
    ctx.lineTo(-half * 0.1, half * 0.3);
    ctx.lineTo(half * 0.4, half * 0.4);
    ctx.stroke();
    if (hp < maxHp - 1) {
      ctx.beginPath();
      ctx.moveTo(half * 0.4, -half * 0.4);
      ctx.lineTo(-half * 0.1, half * 0.1);
      ctx.stroke();
    }
  }
  // 高光
  ctx.fillStyle = 'rgba(255,235,180,0.18)';
  ctx.fillRect(-half + 4, -half + 4, sz - 8, sz * 0.15);
  // HP 标记
  if (maxHp > 1) {
    ctx.fillStyle = '#ff5e3a'; ctx.font = '700 13px sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(`${hp}`, half - 4, -half + 2);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// 🎁 礼物盒：盒身 + 横竖丝带 + 蝴蝶结 + 闪烁
export function drawGiftBox(ctx, x, y, sz, t) {
  ctx.save();
  ctx.translate(x, y);
  // 摆动
  ctx.rotate(Math.sin(t / 280) * 0.06);
  const half = sz / 2;
  // 阴影
  ctx.save();
  ctx.translate(0, half + 4);
  ctx.scale(1, 0.3);
  fillCircle(ctx, 0, 0, sz * 0.45, 'rgba(0,0,0,0.4)');
  ctx.restore();
  // 盒身（红渐变）
  const g = ctx.createLinearGradient(0, -half, 0, half);
  g.addColorStop(0, '#ff8b3d'); g.addColorStop(1, '#c83a3a');
  ctx.fillStyle = g;
  drawRoundedRect(ctx, -half, -half * 0.6, sz, sz * 0.8, 6);
  ctx.fill();
  ctx.strokeStyle = '#5a1a1a'; ctx.lineWidth = 2; ctx.stroke();
  // 盒盖（更深红）
  const lid = ctx.createLinearGradient(0, -half, 0, -half * 0.3);
  lid.addColorStop(0, '#ffa85b'); lid.addColorStop(1, '#c83a3a');
  ctx.fillStyle = lid;
  drawRoundedRect(ctx, -half - 2, -half, sz + 4, sz * 0.3, 4);
  ctx.fill();
  ctx.strokeStyle = '#5a1a1a'; ctx.stroke();
  // 黄丝带横竖
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(-sz * 0.08, -half, sz * 0.16, sz * 0.95);
  ctx.fillRect(-half, -sz * 0.08, sz, sz * 0.16);
  // 蝴蝶结
  ctx.fillStyle = '#ffe666';
  ctx.beginPath();
  ctx.ellipse(-sz * 0.18, -half + 2, sz * 0.14, sz * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sz * 0.18, -half + 2, sz * 0.14, sz * 0.1, 0.3, 0, Math.PI * 2);
  ctx.fill();
  fillCircle(ctx, 0, -half + 2, sz * 0.09, '#ffd84d');
  ctx.strokeStyle = '#c69400'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -half + 2, sz * 0.09, 0, Math.PI * 2); ctx.stroke();
  // 闪烁星星
  const sparkle = (Math.sin(t / 200) + 1) / 2;
  if (sparkle > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${(sparkle - 0.5) * 2})`;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦', sz * 0.3, sz * 0.15);
    ctx.fillText('✦', -sz * 0.3, -sz * 0.05);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// 💣 炸弹覆盖：球体 + 短引线 + 火花
export function drawBombOverlay(ctx, r, t) {
  // 球体
  ctx.fillStyle = '#1a1a1a';
  fillCircle(ctx, 0, r * 0.05, r * 0.55);
  // 球面高光
  fillCircle(ctx, -r * 0.18, -r * 0.12, r * 0.15, 'rgba(255,255,255,0.35)');
  // 引线
  ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.85, r * 0.35, -r * 0.95);
  ctx.stroke();
  // 火花
  const flick = (Math.sin(t / 80) + 1) / 2;
  ctx.fillStyle = flick > 0.5 ? '#ffd84d' : '#ff5e3a';
  fillCircle(ctx, r * 0.4, -r * 1.0, r * 0.1 + flick * r * 0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  fillCircle(ctx, r * 0.4, -r * 1.0, r * 0.05);
}

// 🚀 火箭覆盖：水平/竖直双箭头
export function drawRocketOverlay(ctx, r, vertical) {
  ctx.save();
  if (vertical) ctx.rotate(Math.PI / 2);
  // 主体
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#4a1500'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.lineTo(-r * 0.45, -r * 0.25);
  ctx.lineTo(r * 0.45, -r * 0.25);
  ctx.lineTo(r * 0.85, 0);
  ctx.lineTo(r * 0.45, r * 0.25);
  ctx.lineTo(-r * 0.45, r * 0.25);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 中线
  ctx.strokeStyle = '#ff5e3a'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0); ctx.stroke();
  ctx.restore();
}

// 🌟 彩球覆盖：星型放射 + 七彩渐变 + 旋转光环
export function drawLightballOverlay(ctx, r, t) {
  const pulse = (Math.sin(t / 200) + 1) / 2;
  // 外光晕
  const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.2);
  halo.addColorStop(0, 'rgba(255,255,255,0.85)');
  halo.addColorStop(0.6, 'rgba(255,216,77,0.5)');
  halo.addColorStop(1, 'rgba(255,139,61,0)');
  ctx.fillStyle = halo;
  fillCircle(ctx, 0, 0, r * 1.15);
  // 七彩芯
  const core = ctx.createConicGradient(t / 800, 0, 0);
  core.addColorStop(0,    '#ff5e3a');
  core.addColorStop(0.16, '#ff8b3d');
  core.addColorStop(0.33, '#ffd84d');
  core.addColorStop(0.5,  '#7be36b');
  core.addColorStop(0.66, '#5bc6ff');
  core.addColorStop(0.83, '#b06bff');
  core.addColorStop(1,    '#ff5e3a');
  ctx.fillStyle = core;
  fillCircle(ctx, 0, 0, r * 0.8);
  // 内部白心
  ctx.fillStyle = `rgba(255,255,255,${0.5 + pulse * 0.3})`;
  fillCircle(ctx, 0, 0, r * 0.45);
  // 星型射线
  ctx.save();
  ctx.rotate(t / 600);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rOut = r * (i % 2 === 0 ? 0.95 : 0.55);
    ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 🧊 冰冻覆盖（替换原 game.js 里的内联绘制）
export function drawIceOverlay(ctx, r) {
  const ice = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  ice.addColorStop(0, 'rgba(230,245,255,0.6)');
  ice.addColorStop(0.6, 'rgba(130,210,255,0.6)');
  ice.addColorStop(1, 'rgba(60,140,220,0.78)');
  ctx.fillStyle = ice;
  drawRoundedRect(ctx, -r * 1.05, -r * 1.05, r * 2.1, r * 2.1, 10);
  ctx.fill();
  // 冰裂纹
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.5); ctx.lineTo(-r * 0.3, -r * 0.1); ctx.lineTo(r * 0.2, -r * 0.55);
  ctx.moveTo(-r * 0.3, -r * 0.1); ctx.lineTo(r * 0.1, r * 0.4);
  ctx.moveTo(r * 0.1, r * 0.4); ctx.lineTo(-r * 0.5, r * 0.7);
  ctx.stroke();
  // 边角晶体
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx * r * 0.9, sy * r * 0.9);
    ctx.lineTo(sx * r * 0.65, sy * r * 0.9);
    ctx.lineTo(sx * r * 0.9, sy * r * 0.65);
    ctx.closePath();
    ctx.fill();
  });
}

// 🌿 藤蔓 tile：缠绕在格子边缘 + 飘动叶片
export function drawVineTile(ctx, x, y, sz, t) {
  ctx.save();
  ctx.translate(x, y);
  // 半透绿色底
  ctx.fillStyle = 'rgba(40,100,30,0.25)';
  ctx.fillRect(2, 2, sz - 4, sz - 4);
  // 四角藤条
  ctx.strokeStyle = '#3f8a23'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const offs = 4;
  // 上边缘
  ctx.beginPath();
  ctx.moveTo(offs, offs);
  ctx.bezierCurveTo(sz * 0.3, offs + 6, sz * 0.7, offs - 4, sz - offs, offs + 4);
  ctx.stroke();
  // 下边缘
  ctx.beginPath();
  ctx.moveTo(offs, sz - offs);
  ctx.bezierCurveTo(sz * 0.3, sz - offs - 6, sz * 0.7, sz - offs + 4, sz - offs, sz - offs - 4);
  ctx.stroke();
  // 左边缘
  ctx.beginPath();
  ctx.moveTo(offs, offs);
  ctx.bezierCurveTo(offs + 6, sz * 0.3, offs - 4, sz * 0.7, offs + 4, sz - offs);
  ctx.stroke();
  // 右边缘
  ctx.beginPath();
  ctx.moveTo(sz - offs, offs);
  ctx.bezierCurveTo(sz - offs - 6, sz * 0.3, sz - offs + 4, sz * 0.7, sz - offs - 4, sz - offs);
  ctx.stroke();
  // 飘动叶片
  const wob = Math.sin(t / 400 + x * 0.01) * 4;
  ctx.fillStyle = '#7be36b';
  ctx.beginPath();
  ctx.ellipse(8, sz / 2 + wob, 6, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sz - 8, sz / 2 - wob, 6, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 中心刺
  ctx.fillStyle = '#3f8a23';
  ctx.beginPath();
  ctx.moveTo(sz / 2, 6);
  ctx.lineTo(sz / 2 - 3, 14);
  ctx.lineTo(sz / 2 + 3, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 🌀 传送门：旋转漩涡（入口蓝紫、出口橙黄）
export function drawPortalTile(ctx, x, y, sz, kind, t) {
  ctx.save();
  ctx.translate(x + sz / 2, y + sz / 2);
  ctx.rotate(t / 400 * (kind === 'in' ? 1 : -1));
  const colorIn  = ['#3a1d6e', '#7a3df4', '#5bc6ff'];
  const colorOut = ['#5d3a14', '#ff8b3d', '#ffd84d'];
  const cols = kind === 'in' ? colorIn : colorOut;
  // 螺旋臂
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = sz * 0.1, r2 = sz * 0.45;
    ctx.strokeStyle = cols[i % 3];
    ctx.lineWidth = 3 - (i % 3);
    ctx.beginPath();
    ctx.arc(0, 0, r1 + (r2 - r1) * (i / 12), a, a + 0.6);
    ctx.stroke();
  }
  // 中心核
  const g = ctx.createRadialGradient(0, 0, sz * 0.05, 0, 0, sz * 0.25);
  g.addColorStop(0, '#fff');
  g.addColorStop(1, cols[1]);
  ctx.fillStyle = g;
  fillCircle(ctx, 0, 0, sz * 0.18);
  ctx.restore();
  // 入口 / 出口标签
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(kind === 'in' ? 'IN' : 'OUT', x + sz - 4, y + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// 🟡 果冻 tile 精绘（取代游戏内 inline 渲染）
export function drawJellyTile(ctx, x, y, sz, hp, maxHp, t) {
  const pct = hp / maxHp;
  // 弹性摆动
  const wob = 1 + Math.sin(t / 320 + x * 0.01) * 0.02;
  ctx.save();
  ctx.translate(x + sz / 2, y + sz / 2);
  ctx.scale(wob, 1 / wob);
  // 主体
  const grad = ctx.createRadialGradient(-sz * 0.15, -sz * 0.2, sz * 0.05, 0, 0, sz * 0.55);
  grad.addColorStop(0, `rgba(255,255,180,${0.85 * pct + 0.1})`);
  grad.addColorStop(0.6, `rgba(255,200,80,${0.75 * pct + 0.15})`);
  grad.addColorStop(1, `rgba(220,120,40,${0.65 * pct + 0.15})`);
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, -sz / 2 + 2, -sz / 2 + 2, sz - 4, sz - 4, 8);
  ctx.fill();
  // 高光弧
  ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * pct})`;
  ctx.beginPath();
  ctx.ellipse(-sz * 0.18, -sz * 0.22, sz * 0.18, sz * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // 小气泡
  ctx.fillStyle = `rgba(255,255,255,${0.35 * pct})`;
  fillCircle(ctx, sz * 0.18, sz * 0.18, sz * 0.04);
  fillCircle(ctx, -sz * 0.12, sz * 0.22, sz * 0.025);
  // 多层标记
  if (maxHp > 1) {
    ctx.fillStyle = '#7c3a14'; ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`×${hp}`, -sz / 2 + 4, -sz / 2 + 4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}
