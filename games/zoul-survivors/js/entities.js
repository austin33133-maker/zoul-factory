/* ===== 实体、对象池、空间网格、敌人数值表 ===== */
(function (global) {
  'use strict';

  /* ---------------- 对象池 ----------------
   * 手机上 GC 卡顿是掉帧的头号来源。所有高频实体全部复用，
   * 战斗中不允许 new 对象。
   */
  function Pool(factory, reset) {
    this.items = [];      // 活跃对象（紧凑数组，用交换删除）
    this.free = [];       // 空闲对象
    this.factory = factory;
    this.resetFn = reset;
  }
  Pool.prototype.spawn = function () {
    var o = this.free.length ? this.free.pop() : this.factory();
    this.resetFn.apply(null, [o].concat(Array.prototype.slice.call(arguments)));
    o.alive = true;
    this.items.push(o);
    return o;
  };
  Pool.prototype.sweep = function () {
    var items = this.items;
    for (var i = items.length - 1; i >= 0; i--) {
      if (!items[i].alive) {
        this.free.push(items[i]);
        items[i] = items[items.length - 1];
        items.pop();
      }
    }
  };
  Pool.prototype.clear = function () {
    for (var i = 0; i < this.items.length; i++) this.free.push(this.items[i]);
    this.items.length = 0;
  };

  /* ---------------- 空间网格 ----------------
   * 子弹碰撞 + 敌人互相分离都靠它。
   * 没有它，160 个敌人两两分离就是 25600 次距离计算/帧，手机直接跪。
   */
  function SpatialGrid(cell) {
    this.cell = cell;
    this.map = new Map();
  }
  SpatialGrid.prototype.key = function (cx, cy) { return cx * 73856093 ^ cy * 19349663; };
  SpatialGrid.prototype.clear = function () { this.map.clear(); };
  SpatialGrid.prototype.insert = function (o) {
    var cx = Math.floor(o.x / this.cell), cy = Math.floor(o.y / this.cell);
    var k = this.key(cx, cy);
    var arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(o);
  };
  /** 收集 (x,y) 周围 radius 内可能相交的对象到 out 数组 */
  SpatialGrid.prototype.query = function (x, y, radius, out) {
    out.length = 0;
    var c = this.cell;
    var x0 = Math.floor((x - radius) / c), x1 = Math.floor((x + radius) / c);
    var y0 = Math.floor((y - radius) / c), y1 = Math.floor((y + radius) / c);
    for (var cx = x0; cx <= x1; cx++) {
      for (var cy = y0; cy <= y1; cy++) {
        var arr = this.map.get(this.key(cx, cy));
        if (!arr) continue;
        for (var i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  };

  /* ---------------- 敌人数值表 ----------------
   * 设计原则（沿用策划案）：每种敌人只教玩家一件事。
   * 提难度靠"组合与节奏"，血量随时间的成长上限受控。
   */
  var ENEMY_TYPES = {
    grunt: {
      name: '冲锋兵', teaches: '不能站桩',
      r: 12, hp: 18, speed: 72, dmg: 8, xp: 1, gold: 1,
      color: '#ff5c6c', dark: '#a82b3a', shape: 'tri', minTime: 0
    },
    runner: {
      name: '疾走虫', teaches: '要处理逼近的威胁',
      r: 9, hp: 11, speed: 132, dmg: 6, xp: 1, gold: 1,
      color: '#ff9f43', dark: '#a85f13', shape: 'tri', minTime: 25
    },
    shooter: {
      name: '射手', teaches: '要动起来躲弹',
      r: 13, hp: 26, speed: 46, dmg: 10, xp: 2, gold: 2,
      color: '#4db8ff', dark: '#1d6ea8', shape: 'square',
      minTime: 35, ranged: true, fireCd: 2.1, keepDist: 230, bulletSpeed: 210
    },
    brute: {
      name: '重甲', teaches: '要绕后 / 要输出',
      r: 21, hp: 105, speed: 40, dmg: 18, xp: 5, gold: 4,
      color: '#b06cff', dark: '#6a35a8', shape: 'hex',
      minTime: 65, knockResist: 0.75
    },
    bomber: {
      name: '自爆虫', teaches: '要管理空间',
      r: 14, hp: 22, speed: 105, dmg: 26, xp: 3, gold: 3,
      color: '#ffd93d', dark: '#a88b13', shape: 'circle',
      minTime: 95, explodes: true, blastR: 84
    },
    splitter: {
      name: '分裂体', teaches: '要控制清场顺序',
      r: 17, hp: 48, speed: 62, dmg: 12, xp: 3, gold: 3,
      color: '#7bed9f', dark: '#3a9e5c', shape: 'hex',
      minTime: 140, splits: 3
    },
    spawn: { // 分裂产物
      name: '碎片', teaches: '',
      r: 9, hp: 12, speed: 118, dmg: 6, xp: 1, gold: 0,
      color: '#7bed9f', dark: '#3a9e5c', shape: 'tri', minTime: 9999
    },
    elite: {
      name: '精英·指挥官', teaches: '要用构筑而不是走位',
      r: 30, hp: 900, speed: 52, dmg: 24, xp: 40, gold: 45,
      color: '#ff3860', dark: '#8e1027', shape: 'hex',
      minTime: 9999, boss: true, knockResist: 0.95,
      ranged: true, fireCd: 1.5, keepDist: 0, bulletSpeed: 240, burst: 8
    },
    boss: {
      name: 'BOSS·湮灭者', teaches: '',
      r: 42, hp: 3600, speed: 46, dmg: 32, xp: 200, gold: 300,
      color: '#ff3860', dark: '#8e1027', shape: 'hex',
      minTime: 9999, boss: true, knockResist: 1,
      ranged: true, fireCd: 1.1, keepDist: 0, bulletSpeed: 265, burst: 14
    }
  };

  /* ---------------- 池的构造与重置 ---------------- */

  var Pools = {
    bullets: new Pool(
      function () { return { hits: [] }; },
      function (b, x, y, vx, vy, dmg, opt) {
        b.x = x; b.y = y; b.vx = vx; b.vy = vy;
        b.r = opt.r || 5;
        b.dmg = dmg;
        b.pierce = opt.pierce || 0;
        b.ricochet = opt.ricochet || 0;
        b.crit = !!opt.crit;
        b.life = opt.life || 1.4;
        b.color = opt.color || '#ffe066';
        b.knock = opt.knock || 60;
        b.hits.length = 0;
        b.trail = 0;
      }
    ),

    enemyBullets: new Pool(
      function () { return {}; },
      function (b, x, y, vx, vy, dmg, r) {
        b.x = x; b.y = y; b.vx = vx; b.vy = vy;
        b.dmg = dmg; b.r = r || 6; b.life = 5;
      }
    ),

    enemies: new Pool(
      function () { return {}; },
      function (e, type, x, y, hpScale, dmgScale) {
        var t = ENEMY_TYPES[type];
        e.type = type; e.def = t;
        e.x = x; e.y = y;
        e.vx = 0; e.vy = 0;
        e.r = t.r;
        e.maxHp = Math.round(t.hp * hpScale);
        e.hp = e.maxHp;
        e.speed = t.speed * (0.9 + Math.random() * 0.2);
        e.dmg = t.dmg * dmgScale;
        e.flash = 0;
        e.kx = 0; e.ky = 0;          // 击退速度
        e.fireCd = t.fireCd ? t.fireCd * (0.6 + Math.random() * 0.8) : 0;
        e.hitCd = 0;                  // 接触伤害冷却
        e.orbitCd = 0;                // 无人机对该敌人的伤害冷却（池复用必须清零）
        e.phase = 0;
        e.wobble = Math.random() * 6.28;
        e.burstLeft = 0;
      }
    ),

    pickups: new Pool(
      function () { return {}; },
      function (p, x, y, kind, value) {
        p.x = x; p.y = y;
        p.vx = (Math.random() - 0.5) * 90;
        p.vy = (Math.random() - 0.5) * 90;
        p.kind = kind;     // 'xp' | 'gold' | 'heal' | 'magnet' | 'nuke'
        p.value = value;
        p.r = kind === 'xp' ? 5 : 8;
        p.life = 30;
        p.pulled = false;
      }
    ),

    particles: new Pool(
      function () { return {}; },
      function (p, x, y, vx, vy, life, color, size, kind) {
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.color = color; p.size = size;
        p.kind = kind || 'dot';
      }
    ),

    damageNumbers: new Pool(
      function () { return {}; },
      function (d, x, y, text, crit) {
        d.x = x; d.y = y;
        d.vy = -46 - Math.random() * 18;
        d.vx = (Math.random() - 0.5) * 34;
        d.life = 0.62; d.maxLife = 0.62;
        d.text = text; d.crit = crit;
      }
    ),

    mines: new Pool(
      function () { return {}; },
      function (m, x, y, dmg, radius, life) {
        m.x = x; m.y = y; m.dmg = dmg; m.radius = radius;
        m.life = life; m.arm = 0.35;
      }
    ),

    grenades: new Pool(
      function () { return {}; },
      function (g, x, y, tx, ty, dmg, radius) {
        g.x = x; g.y = y;
        g.sx = x; g.sy = y; g.tx = tx; g.ty = ty;
        g.t = 0;
        g.dur = Math.max(0.35, Math.hypot(tx - x, ty - y) / 520);
        g.dmg = dmg; g.radius = radius;
      }
    ),

    // 纯表现层：爆炸圈、激光柱、电弧线
    fx: new Pool(
      function () { return { pts: [] }; },
      function (f, kind, x, y, r, life, color, pts) {
        f.kind = kind; f.x = x; f.y = y; f.r = r;
        f.life = life; f.maxLife = life; f.color = color;
        f.pts.length = 0;
        if (pts) for (var i = 0; i < pts.length; i++) f.pts.push(pts[i]);
      }
    )
  };

  global.Ent = {
    Pool: Pool,
    SpatialGrid: SpatialGrid,
    ENEMY_TYPES: ENEMY_TYPES,
    Pools: Pools,
    clearAll: function () {
      Object.keys(Pools).forEach(function (k) { Pools[k].clear(); });
    }
  };
})(window);
