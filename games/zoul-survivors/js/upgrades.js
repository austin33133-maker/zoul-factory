/* ===== 构筑系统：升级池 + 三选一抽卡 + 永久强化 =====
 *
 * 策划案里的规则在这里落地：
 *   「三选一里永远至少有一项与当前构筑强相关（保证成型），
 *     至少有一项无关（保证意外）。」
 * 纯随机会让玩家有一半的局什么都没成，那些局就是流失。
 */
(function (global) {
  'use strict';

  /* ---------------- 副武器数值表 ---------------- */
  var WEAPON_DATA = {
    orbit: {
      name: '环绕无人机', icon: '🛸', maxLv: 5,
      desc: function (lv) {
        var d = WEAPON_DATA.orbit.lv[lv - 1];
        return '身边环绕 ' + d.count + ' 架无人机，接触造成 ' + d.dmg + ' 伤害';
      },
      lv: [
        { count: 2, dmg: 12, radius: 62, speed: 2.2 },
        { count: 3, dmg: 16, radius: 66, speed: 2.4 },
        { count: 4, dmg: 22, radius: 70, speed: 2.6 },
        { count: 5, dmg: 30, radius: 74, speed: 2.9 },
        { count: 6, dmg: 42, radius: 80, speed: 3.2 }
      ]
    },
    shotgun: {
      name: '霰弹爆发', icon: '💥', maxLv: 5,
      desc: function (lv) {
        var d = WEAPON_DATA.shotgun.lv[lv - 1];
        return '每 ' + d.cd.toFixed(1) + 's 向最近方向喷射 ' + d.pellets + ' 发弹丸，带击退';
      },
      lv: [
        { cd: 2.2, pellets: 5, dmg: 9, spread: 0.5 },
        { cd: 2.0, pellets: 7, dmg: 11, spread: 0.55 },
        { cd: 1.8, pellets: 9, dmg: 14, spread: 0.6 },
        { cd: 1.5, pellets: 11, dmg: 17, spread: 0.65 },
        { cd: 1.2, pellets: 14, dmg: 22, spread: 0.72 }
      ]
    },
    arc: {
      name: '电弧链', icon: '⚡', maxLv: 5,
      desc: function (lv) {
        var d = WEAPON_DATA.arc.lv[lv - 1];
        return '每 ' + d.cd.toFixed(1) + 's 释放闪电，连锁 ' + d.chain + ' 个目标，各 ' + d.dmg + ' 伤害';
      },
      lv: [
        { cd: 2.4, chain: 3, dmg: 14, range: 190 },
        { cd: 2.1, chain: 4, dmg: 19, range: 210 },
        { cd: 1.8, chain: 6, dmg: 25, range: 230 },
        { cd: 1.5, chain: 8, dmg: 33, range: 260 },
        { cd: 1.2, chain: 11, dmg: 45, range: 300 }
      ]
    },
    mine: {
      name: '布雷', icon: '🧨', maxLv: 5,
      desc: function (lv) {
        var d = WEAPON_DATA.mine.lv[lv - 1];
        return '移动时留下地雷，触发爆炸 ' + d.dmg + ' 伤害（范围 ' + d.radius + '）';
      },
      lv: [
        { cd: 1.6, dmg: 26, radius: 62, life: 9 },
        { cd: 1.4, dmg: 34, radius: 70, life: 10 },
        { cd: 1.2, dmg: 45, radius: 78, life: 11 },
        { cd: 1.0, dmg: 60, radius: 88, life: 12 },
        { cd: 0.8, dmg: 80, radius: 100, life: 14 }
      ]
    },
    laser: {
      name: '轨道激光', icon: '🔆', maxLv: 5,
      desc: function (lv) {
        var d = WEAPON_DATA.laser.lv[lv - 1];
        return '每 ' + d.cd.toFixed(1) + 's 向敌人最密集处降下 ' + d.count + ' 道激光';
      },
      lv: [
        { cd: 3.0, count: 1, dmg: 45, radius: 52 },
        { cd: 2.7, count: 2, dmg: 55, radius: 56 },
        { cd: 2.4, count: 3, dmg: 70, radius: 62 },
        { cd: 2.0, count: 4, dmg: 90, radius: 68 },
        { cd: 1.6, count: 6, dmg: 120, radius: 76 }
      ]
    },
    grenade: {
      name: '榴弹', icon: '🎯', maxLv: 5,
      desc: function (lv) {
        var d = WEAPON_DATA.grenade.lv[lv - 1];
        return '每 ' + d.cd.toFixed(1) + 's 抛射 ' + d.count + ' 枚榴弹，爆炸 ' + d.dmg + ' 伤害';
      },
      lv: [
        { cd: 2.6, count: 1, dmg: 40, radius: 72 },
        { cd: 2.3, count: 1, dmg: 55, radius: 82 },
        { cd: 2.0, count: 2, dmg: 68, radius: 90 },
        { cd: 1.7, count: 2, dmg: 88, radius: 100 },
        { cd: 1.4, count: 3, dmg: 115, radius: 112 }
      ]
    }
  };

  /* ---------------- 属性升级池 ----------------
   * 每一项都要能被玩家一句话说清楚"我变强在哪"。
   * 说不清的（比如 +3% 某个隐藏系数）一律不做。
   */
  var STAT_UPGRADES = [
    { id: 'damage',   name: '弹头强化', icon: '🔺', max: 8, tag: 'dmg',
      desc: '主武器伤害 +18%', apply: function (p) { p.damageMul += 0.18; } },
    { id: 'firerate', name: '高速枪机', icon: '⏩', max: 8, tag: 'dmg',
      desc: '射速 +14%', apply: function (p) { p.fireRateMul += 0.14; } },
    { id: 'multi',    name: '多重射击', icon: '⋔', max: 4, tag: 'dmg',
      desc: '每次开火多射出 1 发', apply: function (p) { p.projectiles += 1; } },
    { id: 'pierce',   name: '穿甲弹', icon: '➳', max: 4, tag: 'dmg',
      desc: '子弹可多穿透 1 个敌人', apply: function (p) { p.pierce += 1; } },
    { id: 'crit',     name: '弱点扫描', icon: '◎', max: 6, tag: 'dmg',
      desc: '暴击率 +7%', apply: function (p) { p.crit += 0.07; } },
    { id: 'critdmg',  name: '致命一击', icon: '✸', max: 5, tag: 'dmg',
      desc: '暴击伤害 +35%', apply: function (p) { p.critMul += 0.35; } },
    { id: 'ricochet', name: '跳弹', icon: '↺', max: 3, tag: 'dmg',
      desc: '子弹命中后弹向下一个敌人', apply: function (p) { p.ricochet += 1; } },
    { id: 'bspeed',   name: '高初速', icon: '⇢', max: 4, tag: 'dmg',
      desc: '子弹速度 +20%，射程 +10%', apply: function (p) { p.bulletSpeedMul += 0.20; p.rangeMul += 0.10; } },

    { id: 'speed',    name: '轻量装甲', icon: '👟', max: 6, tag: 'surv',
      desc: '移动速度 +9%', apply: function (p) { p.speedMul += 0.09; } },
    { id: 'maxhp',    name: '强化体质', icon: '❤', max: 8, tag: 'surv',
      desc: '生命上限 +25，并立即回复等量', apply: function (p) { p.maxHp += 25; p.hp += 25; } },
    { id: 'regen',    name: '纳米修复', icon: '✚', max: 5, tag: 'surv',
      desc: '每秒回复 0.6 点生命', apply: function (p) { p.regen += 0.6; } },
    { id: 'shield',   name: '相位护盾', icon: '🛡', max: 4, tag: 'surv',
      desc: '获得可格挡 1 次伤害的护盾（冷却 -2s）',
      apply: function (p) { p.shieldMax += 1; p.shieldCd = Math.max(4, p.shieldCd - 2); p.shield = p.shieldMax; } },
    { id: 'dodge',    name: '闪避模块', icon: '💨', max: 4, tag: 'surv',
      desc: '闪避率 +8%', apply: function (p) { p.dodge += 0.08; } },

    { id: 'pickup',   name: '磁力线圈', icon: '🧲', max: 5, tag: 'util',
      desc: '拾取范围 +35%', apply: function (p) { p.pickupMul += 0.35; } },
    { id: 'xp',       name: '数据解析', icon: '📈', max: 5, tag: 'util',
      desc: '经验获取 +16%', apply: function (p) { p.xpMul += 0.16; } },
    { id: 'greed',    name: '拾荒者', icon: '💰', max: 4, tag: 'util',
      desc: '本局金币获取 +25%', apply: function (p) { p.goldMul += 0.25; } }
  ];

  /* ---------------- 异常（高风险高收益） ----------------
   * 策划案里的 Anomaly：必须带明确代价，且代价要一眼看懂。
   * 这些卡是构筑记忆点的来源 —— 玩家复述"我这局是 XX 流"时讲的就是它们。
   */
  var ANOMALIES = [
    { id: 'glass',   name: '玻璃火炮', icon: '☠', max: 1, tag: 'anomaly',
      desc: '伤害 +80%，生命上限 -40%',
      apply: function (p) { p.damageMul += 0.80; p.maxHp = Math.max(20, Math.floor(p.maxHp * 0.6)); p.hp = Math.min(p.hp, p.maxHp); } },
    { id: 'berserk', name: '狂暴协议', icon: '🩸', max: 1, tag: 'anomaly',
      desc: '生命越低伤害越高（最高 +100%），但不再自动回血',
      apply: function (p) { p.berserk = true; p.regen = 0; } },
    { id: 'overdrive', name: '超频', icon: '🔥', max: 1, tag: 'anomaly',
      desc: '射速 +60%，每次开火损失 0.4 生命',
      apply: function (p) { p.fireRateMul += 0.60; p.overdrive = true; } },
    { id: 'vamp',    name: '汲取', icon: '🧛', max: 1, tag: 'anomaly',
      desc: '击杀回复 1.5 生命，但生命上限 -20%',
      apply: function (p) { p.lifesteal += 1.5; p.maxHp = Math.floor(p.maxHp * 0.8); p.hp = Math.min(p.hp, p.maxHp); } }
  ];

  /* ---------------- 永久强化（局外元进度） ----------------
   * 目标：让每一局失败都留下可见的进度，"下一局会更强"。
   * 上限刻意做得不高 —— 元进度是安慰剂，不能变成"练级碾压"，
   * 否则技术和构筑就不重要了，游戏立刻变无聊。
   */
  var META_UPGRADES = [
    { id: 'm_dmg',    name: '弹药研发', icon: '🔺', max: 10, base: 120, desc: '初始伤害 +5% / 级' },
    { id: 'm_hp',     name: '装甲板',   icon: '❤', max: 10, base: 100, desc: '初始生命 +12 / 级' },
    { id: 'm_speed',  name: '伺服马达', icon: '👟', max: 8,  base: 150, desc: '移动速度 +2.5% / 级' },
    { id: 'm_rate',   name: '枪机打磨', icon: '⏩', max: 8,  base: 160, desc: '初始射速 +3% / 级' },
    { id: 'm_pickup', name: '磁场发生器', icon: '🧲', max: 6, base: 130, desc: '拾取范围 +12% / 级' },
    { id: 'm_crit',   name: '瞄准辅助', icon: '◎', max: 6,  base: 200, desc: '初始暴击率 +2% / 级' },
    { id: 'm_gold',   name: '回收协议', icon: '💰', max: 6,  base: 180, desc: '金币获取 +8% / 级' },
    { id: 'm_start',  name: '预装模块', icon: '📦', max: 3,  base: 400, desc: '开局直接获得 1 次升级' }
  ];

  function metaCost(u, lv) {
    return Math.floor(u.base * Math.pow(1.55, lv));
  }

  /* ---------------- 抽卡 ---------------- */

  function ownedWeaponCount(p) {
    return Object.keys(p.weapons).length;
  }

  /** 收集所有当前可选项，标注类型与当前等级 */
  function buildPool(p) {
    var pool = [];

    // 副武器：已有的可升级；未满 4 把时可解锁新武器
    Object.keys(WEAPON_DATA).forEach(function (wid) {
      var w = WEAPON_DATA[wid];
      var cur = p.weapons[wid] || 0;
      if (cur > 0 && cur < w.maxLv) {
        pool.push({ kind: 'weapon', id: wid, lv: cur + 1, isNew: false, weight: 26, tag: 'weapon' });
      } else if (cur === 0 && ownedWeaponCount(p) < 4) {
        pool.push({ kind: 'weapon', id: wid, lv: 1, isNew: true, weight: 16, tag: 'weapon' });
      }
    });

    // 属性
    STAT_UPGRADES.forEach(function (u) {
      var cur = p.upgrades[u.id] || 0;
      if (cur < u.max) {
        pool.push({ kind: 'stat', id: u.id, lv: cur + 1, isNew: cur === 0, weight: 20, tag: u.tag });
      }
    });

    // 异常：5 级以后才出现，且概率低 —— 它是惊喜，不是常态
    if (p.level >= 5) {
      ANOMALIES.forEach(function (u) {
        var cur = p.upgrades[u.id] || 0;
        if (cur < u.max) {
          pool.push({ kind: 'anomaly', id: u.id, lv: 1, isNew: true, weight: 7, tag: 'anomaly' });
        }
      });
    }

    return pool;
  }

  function pickWeighted(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= list[i].weight;
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  /**
   * 抽 3 张卡。
   * 契约（来自策划案）：
   *   1) 至少 1 张与玩家当前主线构筑强相关 —— 保证能成型
   *   2) 至少 1 张与当前构筑无关 —— 保证有意外
   *   3) 生命危险时（<35%）强插一张生存卡 —— 这不是作弊，是不让玩家被随机数杀死
   */
  function roll(p) {
    var pool = buildPool(p);
    if (pool.length === 0) return [];

    var picked = [];
    var used = {};

    function take(list) {
      var candidates = list.filter(function (c) { return !used[c.kind + c.id]; });
      if (candidates.length === 0) return null;
      var c = pickWeighted(candidates);
      used[c.kind + c.id] = true;
      picked.push(c);
      return c;
    }

    // 规则 3：濒死救济
    if (p.hp / p.maxHp < 0.35) {
      var survivors = pool.filter(function (c) { return c.tag === 'surv'; });
      if (survivors.length) take(survivors);
    }

    // 规则 1：强相关（玩家已投资过的方向）
    if (picked.length < 3) {
      var owned = pool.filter(function (c) {
        if (c.kind === 'weapon') return !c.isNew;
        return (p.upgrades[c.id] || 0) > 0;
      });
      if (owned.length) take(owned);
    }

    // 规则 2：一张全新的
    if (picked.length < 3) {
      var fresh = pool.filter(function (c) { return c.isNew; });
      if (fresh.length) take(fresh);
    }

    // 剩下的随便填
    while (picked.length < 3) {
      if (!take(pool)) break;
    }

    return picked;
  }

  /** 把抽到的卡渲染成 UI 需要的数据 */
  function describe(card) {
    if (card.kind === 'weapon') {
      var w = WEAPON_DATA[card.id];
      return {
        name: w.name, icon: w.icon, lv: card.lv,
        desc: w.desc(card.lv),
        cls: 'weapon', isNew: card.isNew
      };
    }
    var list = card.kind === 'anomaly' ? ANOMALIES : STAT_UPGRADES;
    var u = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === card.id) { u = list[i]; break; }
    return {
      name: u.name, icon: u.icon, lv: card.lv,
      desc: u.desc, max: u.max,
      cls: card.kind === 'anomaly' ? 'new' : '', isNew: card.isNew
    };
  }

  /** 应用一张卡到玩家身上 */
  function apply(p, card) {
    if (card.kind === 'weapon') {
      p.weapons[card.id] = card.lv;
      p.weaponCd[card.id] = 0;
      return;
    }
    var list = card.kind === 'anomaly' ? ANOMALIES : STAT_UPGRADES;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === card.id) {
        list[i].apply(p);
        p.upgrades[card.id] = (p.upgrades[card.id] || 0) + 1;
        return;
      }
    }
  }

  global.Upgrades = {
    WEAPON_DATA: WEAPON_DATA,
    STAT_UPGRADES: STAT_UPGRADES,
    ANOMALIES: ANOMALIES,
    META_UPGRADES: META_UPGRADES,
    metaCost: metaCost,
    roll: roll,
    describe: describe,
    apply: apply
  };
})(window);
