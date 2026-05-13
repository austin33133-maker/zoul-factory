// 资源管线：尝试加载 sprite sheet；失败则回退到 emoji/Canvas 绘制。
// 用法：
//   await Assets.load();   // 在启动时调用一次
//   const img = Assets.get('piece.orange');  // 找不到返回 null
//   Assets.drawSprite(ctx, 'piece.orange', x, y, size); // 自动回退
//
// 如何接入真实美术：
//   1) 把 sprite sheet PNG 放到 ./assets/sprites.png
//   2) 把 frame 索引 JSON 放到 ./assets/sprites.json，格式：
//      { "frames": { "piece.orange": { "x": 0, "y": 0, "w": 96, "h": 96 }, ... } }
//   3) 若文件存在 loader 自动加载；否则游戏照常运行（emoji 占位）。

const FALLBACKS = {
  'piece.orange': '🍊', 'piece.red': '🍓', 'piece.yellow': '🍋',
  'piece.green': '🍏', 'piece.blue': '🫐', 'piece.purple': '🍇',
  'piece.bomb': '💣', 'piece.rocketH': '⬅️', 'piece.rocketV': '⬆️', 'piece.lightball': '✨',
  'piece.crate': '📦', 'piece.gift': '🎁', 'piece.princess': '👸',
  'tile.jelly': '🟡',
  'ui.heart': '❤️', 'ui.coin': '🪙', 'ui.star': '⭐',
  'icon.hammer': '🔨', 'icon.swap': '🔀', 'icon.shop': '🏪', 'icon.castle': '🏰'
};

let sheet = null;           // HTMLImageElement
let frames = {};            // name -> {x,y,w,h}
let loadedPromise = null;

async function fetchJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export const Assets = {
  async load() {
    if (loadedPromise) return loadedPromise;
    loadedPromise = (async () => {
      const json = await fetchJson('./assets/sprites.json');
      if (!json || !json.frames) return false;
      const img = await loadImage('./assets/sprites.png');
      if (!img) return false;
      sheet = img;
      frames = json.frames;
      return true;
    })();
    return loadedPromise;
  },

  has(name) { return !!(sheet && frames[name]); },
  loaded() { return !!sheet; },
  fallback(name) { return FALLBACKS[name] || '?'; },

  // 把 sprite 画在 (x,y) 中心位置，缩放到 size×size 像素
  drawSprite(ctx, name, x, y, size) {
    if (sheet && frames[name]) {
      const f = frames[name];
      ctx.drawImage(sheet, f.x, f.y, f.w, f.h, x - size / 2, y - size / 2, size, size);
      return true;
    }
    // 回退：emoji
    const fb = FALLBACKS[name];
    if (!fb) return false;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fb, x, y);
    return true;
  }
};
