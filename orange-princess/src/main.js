import { CONFIG } from './config.js';
import { Audio } from './audio.js';
import { MapScene } from './scenes/map.js';
import { GameScene } from './scenes/game.js';
import { ShopScene } from './scenes/shop.js';
import { DecorationScene } from './scenes/decoration.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.CANVAS_W;
canvas.height = CONFIG.CANVAS_H;

document.getElementById('boot-tip').style.display = 'none';

class SceneManager {
  constructor() {
    this.scenes = {
      map: new MapScene(this),
      game: new GameScene(this),
      shop: new ShopScene(this),
      decoration: new DecorationScene(this)
    };
    this.current = null;
    this.switchTo('map');
  }
  switchTo(name, params) {
    document.querySelectorAll('.modal-backdrop, .toast').forEach(n => n.remove());
    const prev = this.current;
    if (prev && prev.exit) prev.exit();
    if (name === 'game') {
      // 重新实例化 game 以保证 enter 异步流不冲突
      this.scenes.game = new GameScene(this);
    }
    this.current = this.scenes[name];
    if (this.current.enter) this.current.enter(params || {});
  }
}

const sm = new SceneManager();

// ---- 输入：把 client 坐标转换为 canvas 坐标 ----
function pos(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  return { x, y };
}
function touchPos(t) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (t.clientX - r.left) * (canvas.width / r.width),
    y: (t.clientY - r.top) * (canvas.height / r.height)
  };
}

let dragging = false;
canvas.addEventListener('pointerdown', e => {
  Audio.unlock();
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e); dragging = true;
  if (sm.current.onPointerDown) sm.current.onPointerDown(p.x, p.y);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const p = pos(e);
  if (sm.current.onPointerMove) sm.current.onPointerMove(p.x, p.y);
});
canvas.addEventListener('pointerup', e => {
  dragging = false;
  const p = pos(e);
  if (sm.current.onPointerUp) sm.current.onPointerUp(p.x, p.y);
});
canvas.addEventListener('pointercancel', () => { dragging = false; if (sm.current.onPointerUp) sm.current.onPointerUp(0, 0); });

// ---- 主循环 ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;
  if (sm.current.update) sm.current.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (sm.current.draw) sm.current.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
