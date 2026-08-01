/* ===== 主循环 =====
 * 设计基准（沿用 FPS 策划案的手感规格，平移到俯视 2D）：
 *   · 输入到画面 ≤ 3 帧，摇杆不做平滑
 *   · 每次命中都有多通道反馈：闪白 + 顿挫音 + 粒子 + 伤害数字 + 击退
 *   · 难度靠"敌人组合与出场节奏"，血量成长有硬上限
 */
(function (global) {
  'use strict';

  var WORLD = 2200;
  var RUN_TIME = 300;              // 单局 5 分钟，之后 BOSS
  var ELITE_AT = 150;              // 2:30 精英
  var ENEMY_CAP = 170;

  var BASE = {
    hp: 100, speed: 196, damage: 11,
    fireInterval: 0.40, bulletSpeed: 640, range: 430, pickup: 95
  };

  var canvas, ctx, dpr = 1, cssW = 0, cssH = 0, zoom = 1;

  var G = {
    state: 'menu',      // menu | playing | levelup | paused | dead | result
    time: 0,
    runDuration: RUN_TIME,
    kills: 0,
    bossActive: false,
    bossSpawned: false,
    eliteSpawned: false,
    spawnTimer: 0,
    shake: 0,
    hitStop: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    player: null,
    cam: { x: WORLD / 2, y: WORLD / 2 },
    pendingCards: null,
    pendingLevels: 0,
    reviveTimer: 0,
    revived: false,
    won: false,
    dailyBonus: false
  };

  var grid = new Ent.SpatialGrid(64);
  var qbuf = [];
  var P = Ent.Pools;

  /* ================= 画布 ================= */
  function resize() {
    cssW = global.innerWidth;
    cssH = global.innerHeight;
    dpr = Math.min(global.devicePixelRatio || 1, 2);   // 超过 2 只烧 GPU，肉眼无感
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 目标可视宽度 ~480 世界单位：手机上视野一致，桌面不至于开天眼
    zoom = Math.max(0.75, Math.min(1.8, cssW / 480));
  }

  /* ================= 玩家 ================= */
  function makePlayer() {
    var p = {
      x: WORLD / 2, y: WORLD / 2, vx: 0, vy: 0, r: 14,
      hp: BASE.hp, maxHp: BASE.hp,
      level: 1, xp: 0, xpNeed: 0,
      damageMul: 1, fireRateMul: 1, projectiles: 1, pierce: 0, ricochet: 0,
      crit: 0.05, critMul: 2.0,
      speedMul: 1, bulletSpeedMul: 1, rangeMul: 1, pickupMul: 1, xpMul: 1, goldMul: 1,
      regen: 0, dodge: 0,
      shield: 0, shieldMax: 0, shieldCd: 12, shieldTimer: 0,
      lifesteal: 0, berserk: false, overdrive: false,
      weapons: {}, weaponCd: {}, upgrades: {},
      fireCd: 0, aimX: 1, aimY: 0, gold: 0,
      invuln: 0, orbitAngle: 0, hurtFlash: 0
    };

    // 永久强化生效
    var lv;
    if ((lv = Save.metaLevel('m_dmg')))   p.damageMul += 0.05 * lv;
    if ((lv = Save.metaLevel('m_hp')))    { p.maxHp += 12 * lv; p.hp = p.maxHp; }
    if ((lv = Save.metaLevel('m_speed'))) p.speedMul += 0.025 * lv;
    if ((lv = Save.metaLevel('m_rate')))  p.fireRateMul += 0.03 * lv;
    if ((lv = Save.metaLevel('m_pickup')))p.pickupMul += 0.12 * lv;
    if ((lv = Save.metaLevel('m_crit')))  p.crit += 0.02 * lv;
    if ((lv = Save.metaLevel('m_gold')))  p.goldMul += 0.08 * lv;

    p.xpNeed = xpForLevel(1);
    return p;
  }

  // 前 5 级刻意做得很快（第一次升级 ≈ 6 秒）：
  // 新玩家必须在还没形成"这游戏是干嘛的"判断之前，就先摸到一次三选一。
  function xpForLevel(lv) {
    return Math.floor(4 + lv * 2.2 + lv * lv * 0.045);
  }

  /* ================= 开局 / 结束 ================= */
  function startRun() {
    Ent.clearAll();
    Monetize.resetRun();

    G.time = 0; G.kills = 0;
    G.bossActive = false; G.bossSpawned = false; G.eliteSpawned = false;
    G.spawnTimer = 0; G.shake = 0; G.hitStop = 0;
    G.combo = 0; G.comboTimer = 0; G.bestCombo = 0;
    G.pendingLevels = 0; G.pendingCards = null;
    G.revived = false; G.won = false;

    G.player = makePlayer();
    G.cam.x = G.player.x; G.cam.y = G.player.y;

    UI.resetHUDCache();
    UI.hideAll();
    UI.show('hud');
    Input.enabled = true;
    G.state = 'playing';

    // 「预装模块」：开局直接给升级，第一张卡在 3 秒内就出现
    var pre = Save.metaLevel('m_start');
    if (pre > 0) { G.pendingLevels += pre; openLevelUp(); }
  }

  function endRun(won) {
    Input.enabled = false;
    Input.release();
    G.won = won;
    G.state = 'result';

    var base = Math.floor(G.kills * 0.6 + G.time * 0.9 + G.player.gold + (won ? 400 : 0));
    var gold = Math.floor(base * G.player.goldMul);

    // 每日首局金币翻倍：给"今天先来一局"一个具体理由
    G.dailyBonus = claimDaily();
    if (G.dailyBonus) gold *= 2;

    G.resultGold = gold;
    G.doubled = false;
    Save.addGold(gold);
    Save.recordRun(G.time, G.kills, won);

    UI.$('resultTitle').textContent = won ? '通 关 !' : '本 局 结 算';
    UI.$('rTime').textContent = UI.fmtTime(G.time);
    UI.$('rKill').textContent = G.kills;
    UI.$('rLevel').textContent = G.player.level;
    UI.$('rGold').textContent = gold;
    UI.$('btnDouble').disabled = !Monetize.canShow('double');

    UI.hideAll();
    UI.show('result');
    if (won) SFX.win();
  }

  function claimDaily() {
    var today = new Date().toDateString();
    if (Save.data.lastDaily === today) return false;
    Save.data.lastDaily = today;
    Save.save();
    return true;
  }

  /* ================= 生成器 ================= */
  function difficulty() { return Math.min(1, G.time / RUN_TIME); }

  function spawnScales() {
    var d = difficulty();
    return {
      // 血量成长封顶 4.2 倍：再高每一枪的反馈就被稀释了
      hp: 1 + d * 3.2,
      dmg: 1 + d * 1.0
    };
  }

  function pickEnemyType() {
    var t = G.time;
    var pool = [];
    if (t >= 0)   pool.push(['grunt', 40]);
    if (t >= 25)  pool.push(['runner', 28]);
    if (t >= 35)  pool.push(['shooter', 20]);
    if (t >= 65)  pool.push(['brute', 14]);
    if (t >= 95)  pool.push(['bomber', 16]);
    if (t >= 140) pool.push(['splitter', 14]);

    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += pool[i][1];
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) {
      r -= pool[i][1];
      if (r <= 0) return pool[i][0];
    }
    return 'grunt';
  }

  /** 在屏幕外一圈生成，玩家永远看不到"凭空出现" */
  function spawnPos() {
    var viewR = Math.max(cssW, cssH) / zoom * 0.62 + 60;
    var a = Math.random() * Math.PI * 2;
    var x = G.player.x + Math.cos(a) * viewR;
    var y = G.player.y + Math.sin(a) * viewR;
    return {
      x: Math.max(30, Math.min(WORLD - 30, x)),
      y: Math.max(30, Math.min(WORLD - 30, y))
    };
  }

  function spawnEnemy(type, x, y) {
    if (P.enemies.items.length >= ENEMY_CAP) return null;
    var s = spawnScales();
    var pos = (x == null) ? spawnPos() : { x: x, y: y };
    return P.enemies.spawn(type, pos.x, pos.y, s.hp, s.dmg);
  }

  function updateDirector(dt) {
    if (G.bossActive) return;

    if (!G.eliteSpawned && G.time >= ELITE_AT) {
      G.eliteSpawned = true;
      var pos = spawnPos();
      var s = spawnScales();
      P.enemies.spawn('elite', pos.x, pos.y, s.hp * 0.55, s.dmg);
      UI.toast('⚠ 精英出现');
      SFX.boss();
      G.shake = Math.max(G.shake, 10);
    }

    if (!G.bossSpawned && G.time >= RUN_TIME) {
      G.bossSpawned = true; G.bossActive = true;
      var bp = spawnPos();
      P.enemies.spawn('boss', bp.x, bp.y, 1, 1.6);
      UI.toast('☢ 湮灭者降临');
      SFX.boss();
      G.shake = Math.max(G.shake, 16);
      return;
    }

    // 压迫感曲线：开局 ~1.5 只/秒，中段 ~8 只/秒，末段直接顶到实体上限。
    // 这个品类的爽点就是"屏幕被填满然后被你一次清空"，前 30 秒不给密度就留不住人。
    var d = difficulty();
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      G.spawnTimer = 0.70 - d * 0.62;                  // 0.70s → 0.08s
      var n = 1 + Math.floor(d * 11) + (Math.random() < d ? 1 : 0);
      for (var i = 0; i < n; i++) spawnEnemy(pickEnemyType());
    }
  }

  /* ================= 伤害 / 反馈 ================= */
  function popNumber(x, y, val, crit) {
    if (!Save.setting('dmgNum')) return;
    if (P.damageNumbers.items.length > 40) return;     // 密集战斗时不刷屏
    P.damageNumbers.spawn(x, y, Math.round(val), crit);
  }

  function burst(x, y, n, color, speed, size, life) {
    if (P.particles.items.length > 320) n = Math.min(n, 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = speed * (0.35 + Math.random() * 0.9);
      P.particles.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s,
        life * (0.6 + Math.random() * 0.6), color, size, 'dot');
    }
  }

  function shake(v) {
    if (!Save.setting('shake')) return;
    G.shake = Math.max(G.shake, v);
  }

  function vibrate(ms) {
    if (Save.setting('haptic') && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  function damageEnemy(e, dmg, crit, fromX, fromY, knock) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.flash = 0.075;                                   // 五通道之一：闪白 0.05s 量级

    if (knock) {
      var dx = e.x - fromX, dy = e.y - fromY;
      var l = Math.hypot(dx, dy) || 1;
      var res = 1 - (e.def.knockResist || 0);
      e.kx += (dx / l) * knock * res;
      e.ky += (dy / l) * knock * res;
    }

    popNumber(e.x, e.y - e.r, dmg, crit);
    if (crit) SFX.crit(); else SFX.hit();
    burst(e.x, e.y, crit ? 5 : 2, crit ? '#fff3a0' : e.def.color, 130, crit ? 3 : 2, 0.24);

    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    G.kills++;

    // 连杀：给密集清场一个可见的正反馈，也是金币来源
    G.combo++;
    G.comboTimer = 2.4;
    if (G.combo > G.bestCombo) G.bestCombo = G.combo;

    var p = G.player;
    p.gold += (e.def.gold || 0);
    if (p.lifesteal) p.hp = Math.min(p.maxHp, p.hp + p.lifesteal);

    SFX.kill();
    burst(e.x, e.y, e.def.boss ? 40 : 7, e.def.color, e.def.boss ? 300 : 190, e.def.boss ? 5 : 3, 0.45);

    // 经验（大怪多颗，让"清大怪"这件事在拾取阶段也爽）
    var xpCount = Math.min(6, 1 + Math.floor(e.def.xp / 3));
    var per = Math.max(1, Math.round(e.def.xp / xpCount));
    for (var i = 0; i < xpCount; i++) P.pickups.spawn(e.x, e.y, 'xp', per);

    // 随机掉落：低频高价值，制造"这局运气好"的记忆点
    var roll = Math.random();
    if (roll < 0.030) P.pickups.spawn(e.x, e.y, 'heal', 25);
    else if (roll < 0.048) P.pickups.spawn(e.x, e.y, 'magnet', 0);
    else if (roll < 0.060) P.pickups.spawn(e.x, e.y, 'nuke', 0);
    else if (roll < 0.30) P.pickups.spawn(e.x, e.y, 'gold', 1 + Math.floor(Math.random() * 3));

    if (e.def.explodes) explode(e.x, e.y, e.def.blastR, e.dmg * 0.7, true);

    if (e.def.splits) {
      var s = spawnScales();
      for (var k = 0; k < e.def.splits; k++) {
        var a = (k / e.def.splits) * Math.PI * 2;
        var c = P.enemies.spawn('spawn', e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, s.hp, s.dmg);
        if (c) { c.kx = Math.cos(a) * 160; c.ky = Math.sin(a) * 160; }
      }
    }

    if (e.def.boss) {
      shake(18); vibrate(60); G.hitStop = 0.10;        // 只有精英/BOSS 给顿帧，杂兵不给
      P.fx.spawn('ring', e.x, e.y, e.r * 5, 0.6, '#ff3860');
      if (e.type === 'boss') { G.bossActive = false; setTimeout(function () { endRun(true); }, 700); }
      else UI.toast('精英已清除');
    }
  }

  function explode(x, y, radius, dmg, hurtEnemies) {
    P.fx.spawn('ring', x, y, radius, 0.34, '#ffb648');
    burst(x, y, 14, '#ffb648', 260, 4, 0.4);
    SFX.explode();
    shake(7);

    if (hurtEnemies) {
      var list = P.enemies.items;
      for (var i = list.length - 1; i >= 0; i--) {
        var e = list[i];
        if (!e.alive) continue;
        if (Math.hypot(e.x - x, e.y - y) < radius + e.r) {
          damageEnemy(e, dmg, false, x, y, 140);
        }
      }
    }
  }

  function hurtPlayer(dmg) {
    var p = G.player;
    if (p.invuln > 0) return;

    if (p.dodge > 0 && Math.random() < p.dodge) {
      popNumber(p.x, p.y - 20, 0, false);
      P.fx.spawn('ring', p.x, p.y, 26, 0.2, '#8affd0');
      return;
    }
    if (p.shield > 0) {
      p.shield--;
      p.shieldTimer = p.shieldCd;
      p.invuln = 0.5;
      P.fx.spawn('ring', p.x, p.y, 34, 0.3, '#4db8ff');
      SFX.crit();
      return;
    }

    p.hp -= dmg;
    p.invuln = 0.45;
    p.hurtFlash = 0.28;
    SFX.hurt();
    shake(9);
    vibrate(35);
    burst(p.x, p.y, 8, '#ff5c6c', 180, 3, 0.35);

    if (p.hp <= 0) { p.hp = 0; onDeath(); }
  }

  function onDeath() {
    Input.enabled = false;
    Input.release();
    G.state = 'dead';
    G.reviveTimer = 5;
    SFX.die();
    shake(20);
    vibrate([40, 60, 90]);
    UI.$('btnRevive').classList.toggle('hidden', !Monetize.canShow('revive'));
    UI.hideAll();
    UI.show('dead');
  }

  function revive() {
    var p = G.player;
    p.hp = p.maxHp;
    p.invuln = 2.5;
    G.revived = true;
    // 清掉身边一圈，避免复活即秒
    explode(p.x, p.y, 260, 9999, true);
    UI.hideAll(); UI.show('hud');
    Input.enabled = true;
    G.state = 'playing';
    UI.toast('复活！');
  }

  /* ================= 升级 ================= */
  function gainXp(n) {
    var p = G.player;
    p.xp += n * p.xpMul;
    var leveled = false;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = xpForLevel(p.level);
      G.pendingLevels++;
      leveled = true;
    }
    if (leveled && G.state === 'playing') openLevelUp();
  }

  function openLevelUp() {
    if (G.pendingLevels <= 0) return;
    G.pendingCards = Upgrades.roll(G.player);
    if (!G.pendingCards.length) { G.pendingLevels = 0; return; }

    G.state = 'levelup';
    Input.enabled = false;
    Input.release();
    SFX.levelup();
    vibrate(20);

    UI.$('lvNum').textContent = 'Lv.' + G.player.level;
    UI.$('rerollLeft').textContent = '(' + Monetize.left('reroll') + ')';
    UI.$('btnReroll').disabled = !Monetize.canShow('reroll');
    UI.renderCards(G.pendingCards, pickCard);
    UI.hideAll();
    UI.show('hud');
    UI.show('levelup');
  }

  function pickCard(card) {
    Upgrades.apply(G.player, card);
    G.pendingLevels--;
    UI.hide('levelup');

    if (G.pendingLevels > 0) {
      openLevelUp();
    } else {
      G.state = 'playing';
      Input.enabled = true;
      UI.hideAll(); UI.show('hud');
    }
  }

  /* ================= 武器 ================= */
  function nearestEnemy(x, y, maxDist, exclude) {
    var best = null, bd = maxDist * maxDist;
    var list = P.enemies.items;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.alive || (exclude && exclude.indexOf(e) >= 0)) continue;
      var dx = e.x - x, dy = e.y - y;
      var d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function fireMain(dt) {
    var p = G.player;
    p.fireCd -= dt;
    if (p.fireCd > 0) return;

    var range = BASE.range * p.rangeMul;
    var target = nearestEnemy(p.x, p.y, range);
    if (!target) return;

    var ang = Math.atan2(target.y - p.y, target.x - p.x);
    p.aimX = Math.cos(ang); p.aimY = Math.sin(ang);

    var interval = BASE.fireInterval / p.fireRateMul;
    p.fireCd = Math.max(0.045, interval);

    var dmgMul = p.damageMul;
    if (p.berserk) dmgMul += (1 - p.hp / p.maxHp) * 1.0;   // 血越少打越疼
    if (p.overdrive) { p.hp = Math.max(1, p.hp - 0.4); }

    var speed = BASE.bulletSpeed * p.bulletSpeedMul;
    var spread = p.projectiles > 1 ? 0.055 * (p.projectiles - 1) : 0;

    for (var i = 0; i < p.projectiles; i++) {
      var off = p.projectiles === 1 ? 0 : (i / (p.projectiles - 1) - 0.5) * 2 * spread;
      var a = ang + off;
      var crit = Math.random() < p.crit;
      var dmg = BASE.damage * dmgMul * (crit ? p.critMul : 1);
      P.bullets.spawn(
        p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16,
        Math.cos(a) * speed, Math.sin(a) * speed,
        dmg,
        { pierce: p.pierce, ricochet: p.ricochet, crit: crit,
          life: range / speed + 0.15, color: crit ? '#fff3a0' : '#ffe066', knock: 70 }
      );
    }
    SFX.shoot();
    burst(p.x + p.aimX * 18, p.y + p.aimY * 18, 2, '#ffe066', 90, 2, 0.1);
  }

  function updateWeapons(dt) {
    var p = G.player;
    var W = Upgrades.WEAPON_DATA;

    // --- 环绕无人机：持续接触伤害，没有冷却按钮，是"站着也在输出" ---
    if (p.weapons.orbit) {
      var od = W.orbit.lv[p.weapons.orbit - 1];
      p.orbitAngle += od.speed * dt;
      var list = P.enemies.items;
      for (var k = 0; k < od.count; k++) {
        var a = p.orbitAngle + (k / od.count) * Math.PI * 2;
        var ox = p.x + Math.cos(a) * od.radius;
        var oy = p.y + Math.sin(a) * od.radius;
        for (var i = list.length - 1; i >= 0; i--) {
          var e = list[i];
          if (!e.alive) continue;
          if (e.orbitCd > 0) continue;
          if (Math.hypot(e.x - ox, e.y - oy) < e.r + 9) {
            e.orbitCd = 0.42;
            damageEnemy(e, od.dmg * p.damageMul, false, ox, oy, 110);
          }
        }
      }
    }

    // --- 霰弹爆发 ---
    if (p.weapons.shotgun) {
      var sd = W.shotgun.lv[p.weapons.shotgun - 1];
      p.weaponCd.shotgun = (p.weaponCd.shotgun || 0) - dt;
      if (p.weaponCd.shotgun <= 0) {
        var tg = nearestEnemy(p.x, p.y, 340);
        if (tg) {
          p.weaponCd.shotgun = sd.cd;
          var base = Math.atan2(tg.y - p.y, tg.x - p.x);
          for (var s = 0; s < sd.pellets; s++) {
            var aa = base + (Math.random() - 0.5) * sd.spread * 2;
            P.bullets.spawn(p.x, p.y, Math.cos(aa) * 520, Math.sin(aa) * 520,
              sd.dmg * p.damageMul, { life: 0.42, color: '#ff9f43', knock: 200, r: 4 });
          }
          SFX.shoot(); shake(3);
        }
      }
    }

    // --- 电弧链 ---
    if (p.weapons.arc) {
      var ad = W.arc.lv[p.weapons.arc - 1];
      p.weaponCd.arc = (p.weaponCd.arc || 0) - dt;
      if (p.weaponCd.arc <= 0) {
        var first = nearestEnemy(p.x, p.y, ad.range);
        if (first) {
          p.weaponCd.arc = ad.cd;
          var chainPts = [p.x, p.y];
          var hitList = [];
          var cur = first;
          for (var c = 0; c < ad.chain && cur; c++) {
            chainPts.push(cur.x, cur.y);
            hitList.push(cur);
            damageEnemy(cur, ad.dmg * p.damageMul, false, cur.x, cur.y, 30);
            cur = nearestEnemy(cur.x, cur.y, 160, hitList);
          }
          P.fx.spawn('arc', 0, 0, 0, 0.18, '#7fd8ff', chainPts);
          SFX.crit();
        }
      }
    }

    // --- 布雷 ---
    if (p.weapons.mine) {
      var md = W.mine.lv[p.weapons.mine - 1];
      p.weaponCd.mine = (p.weaponCd.mine || 0) - dt;
      if (p.weaponCd.mine <= 0) {
        p.weaponCd.mine = md.cd;
        P.mines.spawn(p.x, p.y, md.dmg * p.damageMul, md.radius, md.life);
      }
    }

    // --- 轨道激光：打向敌人最密集的地方 ---
    if (p.weapons.laser) {
      var ld = W.laser.lv[p.weapons.laser - 1];
      p.weaponCd.laser = (p.weaponCd.laser || 0) - dt;
      if (p.weaponCd.laser <= 0) {
        var targets = densestSpots(ld.count, 420);
        if (targets.length) {
          p.weaponCd.laser = ld.cd;
          targets.forEach(function (t) {
            P.fx.spawn('laser', t.x, t.y, ld.radius, 0.3, '#8affd0');
            explode(t.x, t.y, ld.radius, ld.dmg * p.damageMul, true);
          });
        }
      }
    }

    // --- 榴弹 ---
    if (p.weapons.grenade) {
      var gd = W.grenade.lv[p.weapons.grenade - 1];
      p.weaponCd.grenade = (p.weaponCd.grenade || 0) - dt;
      if (p.weaponCd.grenade <= 0) {
        var spots = densestSpots(gd.count, 460);
        if (spots.length) {
          p.weaponCd.grenade = gd.cd;
          spots.forEach(function (t) {
            P.grenades.spawn(p.x, p.y, t.x, t.y, gd.dmg * p.damageMul, gd.radius);
          });
        }
      }
    }
  }

  /** 找出 n 个"周围敌人最多"的位置，让 AoE 武器不打空 */
  function densestSpots(n, range) {
    var list = P.enemies.items;
    var p = G.player;
    var cands = [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.alive) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > range) continue;
      cands.push(e);
    }
    if (!cands.length) return [];

    // 采样最多 24 个候选做邻居计数，避免 O(n²)
    var step = Math.max(1, Math.floor(cands.length / 24));
    var scored = [];
    for (var j = 0; j < cands.length; j += step) {
      var a = cands[j], count = 0;
      for (var k = 0; k < cands.length; k += step) {
        if (Math.hypot(cands[k].x - a.x, cands[k].y - a.y) < 80) count++;
      }
      scored.push({ x: a.x, y: a.y, c: count + (a.def.boss ? 8 : 0) });
    }
    scored.sort(function (m, n2) { return n2.c - m.c; });
    return scored.slice(0, n);
  }

  /* ================= 更新 ================= */
  function update(dt) {
    var p = G.player;

    Input.update();

    // 移动（无加速度插值：手机上直给最跟手）
    var sp = BASE.speed * p.speedMul;
    p.x += Input.dx * Input.mag * sp * dt;
    p.y += Input.dy * Input.mag * sp * dt;
    p.x = Math.max(p.r, Math.min(WORLD - p.r, p.x));
    p.y = Math.max(p.r, Math.min(WORLD - p.r, p.y));

    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    if (p.shieldMax > 0 && p.shield < p.shieldMax) {
      p.shieldTimer -= dt;
      if (p.shieldTimer <= 0) { p.shield = p.shieldMax; p.shieldTimer = p.shieldCd; }
    }

    G.time += dt;
    if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 0; }

    updateDirector(dt);
    fireMain(dt);
    updateWeapons(dt);

    // 重建空间网格
    grid.clear();
    var enemies = P.enemies.items;
    var i, e;
    for (i = 0; i < enemies.length; i++) if (enemies[i].alive) grid.insert(enemies[i]);

    /* ---- 敌人 ---- */
    for (i = enemies.length - 1; i >= 0; i--) {
      e = enemies[i];
      if (!e.alive) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.orbitCd > 0) e.orbitCd -= dt;
      if (e.hitCd > 0) e.hitCd -= dt;

      var dx = p.x - e.x, dy = p.y - e.y;
      var dist = Math.hypot(dx, dy) || 1;
      var nx = dx / dist, ny = dy / dist;

      // 行为
      if (e.def.ranged && e.def.keepDist > 0) {
        // 射手：拉开距离绕圈射击
        var want = e.def.keepDist;
        var move = dist > want + 30 ? 1 : (dist < want - 30 ? -1 : 0);
        e.wobble += dt * 1.4;
        var strafe = Math.sin(e.wobble) * 0.55;
        e.x += (nx * move - ny * strafe) * e.speed * dt;
        e.y += (ny * move + nx * strafe) * e.speed * dt;

        e.fireCd -= dt;
        if (e.fireCd <= 0 && dist < 460) {
          e.fireCd = e.def.fireCd;
          P.enemyBullets.spawn(e.x, e.y, nx * e.def.bulletSpeed, ny * e.def.bulletSpeed, e.dmg, 6);
        }
      } else {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;

        // BOSS / 精英：贴近的同时打扇形弹幕
        if (e.def.ranged) {
          e.fireCd -= dt;
          if (e.fireCd <= 0) {
            e.fireCd = e.def.fireCd;
            var n = e.def.burst || 6;
            var base = Math.atan2(dy, dx);
            for (var b = 0; b < n; b++) {
              var a2 = base + (b / n) * Math.PI * 2;
              P.enemyBullets.spawn(e.x, e.y, Math.cos(a2) * e.def.bulletSpeed,
                Math.sin(a2) * e.def.bulletSpeed, e.dmg * 0.6, 7);
            }
            shake(4);
          }
        }
      }

      // 击退衰减
      if (e.kx || e.ky) {
        e.x += e.kx * dt; e.y += e.ky * dt;
        e.kx *= Math.pow(0.0015, dt); e.ky *= Math.pow(0.0015, dt);
        if (Math.abs(e.kx) < 2) e.kx = 0;
        if (Math.abs(e.ky) < 2) e.ky = 0;
      }

      // 分离：不让敌人叠成一坨（叠在一起会让"打不动"和"看不清"同时发生）
      grid.query(e.x, e.y, e.r * 2.2, qbuf);
      for (var q = 0; q < qbuf.length; q++) {
        var o = qbuf[q];
        if (o === e || !o.alive) continue;
        var sx = e.x - o.x, sy = e.y - o.y;
        var sd = Math.hypot(sx, sy);
        var min = e.r + o.r;
        if (sd > 0.01 && sd < min) {
          var push = (min - sd) * 0.5;
          e.x += (sx / sd) * push; e.y += (sy / sd) * push;
        }
      }

      e.x = Math.max(8, Math.min(WORLD - 8, e.x));
      e.y = Math.max(8, Math.min(WORLD - 8, e.y));

      // 接触伤害
      if (dist < e.r + p.r && e.hitCd <= 0) {
        e.hitCd = 0.6;
        hurtPlayer(e.dmg);
        if (e.def.explodes) killEnemy(e);
      }
    }
    P.enemies.sweep();

    /* ---- 玩家子弹 ---- */
    var bullets = P.bullets.items;
    for (i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.life -= dt;
      if (b.life <= 0) { b.alive = false; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt;

      if (b.x < 0 || b.y < 0 || b.x > WORLD || b.y > WORLD) { b.alive = false; continue; }

      grid.query(b.x, b.y, b.r + 46, qbuf);
      for (var qi = 0; qi < qbuf.length; qi++) {
        var t = qbuf[qi];
        if (!t.alive || b.hits.indexOf(t) >= 0) continue;
        if (Math.hypot(t.x - b.x, t.y - b.y) > t.r + b.r) continue;

        b.hits.push(t);
        damageEnemy(t, b.dmg, b.crit, b.x, b.y, b.knock);

        if (b.ricochet > 0) {
          var nxt = nearestEnemy(b.x, b.y, 240, b.hits);
          if (nxt) {
            b.ricochet--;
            var ra = Math.atan2(nxt.y - b.y, nxt.x - b.x);
            var sp2 = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(ra) * sp2; b.vy = Math.sin(ra) * sp2;
            b.life = Math.max(b.life, 0.4);
            break;
          }
        }
        if (b.pierce > 0) { b.pierce--; }
        else { b.alive = false; }
        break;
      }
    }
    P.bullets.sweep();

    /* ---- 敌人子弹 ---- */
    var eb = P.enemyBullets.items;
    for (i = eb.length - 1; i >= 0; i--) {
      var bb = eb[i];
      bb.life -= dt;
      bb.x += bb.vx * dt; bb.y += bb.vy * dt;
      if (bb.life <= 0 || bb.x < -50 || bb.y < -50 || bb.x > WORLD + 50 || bb.y > WORLD + 50) {
        bb.alive = false; continue;
      }
      if (Math.hypot(bb.x - p.x, bb.y - p.y) < bb.r + p.r) {
        bb.alive = false;
        hurtPlayer(bb.dmg);
      }
    }
    P.enemyBullets.sweep();

    /* ---- 地雷 ---- */
    var mines = P.mines.items;
    for (i = mines.length - 1; i >= 0; i--) {
      var m = mines[i];
      m.life -= dt;
      if (m.arm > 0) { m.arm -= dt; continue; }
      if (m.life <= 0) { m.alive = false; continue; }
      var hit = nearestEnemy(m.x, m.y, 22);
      if (hit) { m.alive = false; explode(m.x, m.y, m.radius, m.dmg, true); }
    }
    P.mines.sweep();

    /* ---- 榴弹 ---- */
    var gr = P.grenades.items;
    for (i = gr.length - 1; i >= 0; i--) {
      var g = gr[i];
      g.t += dt;
      var k2 = Math.min(1, g.t / g.dur);
      g.x = g.sx + (g.tx - g.sx) * k2;
      g.y = g.sy + (g.ty - g.sy) * k2;
      if (k2 >= 1) { g.alive = false; explode(g.x, g.y, g.radius, g.dmg, true); }
    }
    P.grenades.sweep();

    /* ---- 拾取物 ---- */
    var pickR = BASE.pickup * p.pickupMul;
    var pk = P.pickups.items;

    // 硬上限：清场速度超过拾取速度时，地上的经验会无限堆积（实测能到 1000+），
    // 又卡帧又看不清。超出部分直接判定为已拾取 —— 玩家一分都不少拿。
    var over = pk.length - 300;
    for (i = 0; i < over; i++) {
      var old = pk[i];
      if (old.alive) { old.alive = false; collect(old); }
    }
    for (i = pk.length - 1; i >= 0; i--) {
      var it = pk[i];
      it.life -= dt;
      if (it.life <= 0) { it.alive = false; continue; }

      var pdx = p.x - it.x, pdy = p.y - it.y;
      var pd = Math.hypot(pdx, pdy) || 1;

      if (it.pulled || pd < pickR) {
        // 进圈：高速吸附，"哗"地一片飞过来是这个品类最重要的爽点之一。
        // 下限必须夹住：磁力道具会把远处的东西也标记为 pulled，
        // 此时 (pickR - pd) 是大负数，不夹的话它们会反向加速飞走，坐标几帧就爆到 1e34。
        it.pulled = true;
        var pull = Math.max(260, 320 + (pickR - pd) * 3);
        it.x += (pdx / pd) * pull * dt;
        it.y += (pdy / pd) * pull * dt;
      } else {
        // 圈外：缓慢自动靠拢。
        // 主武器射程 430、拾取圈只有 ~95 —— 不做这个的话玩家一整局都在捡垃圾，
        // 掉的经验有一半永远吃不到。慢速归位保证"打死的每一个都算数"。
        it.x += it.vx * dt; it.y += it.vy * dt;
        it.vx *= Math.pow(0.02, dt); it.vy *= Math.pow(0.02, dt);
        var drift = it.kind === 'xp' ? 46 : 26;
        it.x += (pdx / pd) * drift * dt;
        it.y += (pdy / pd) * drift * dt;
      }

      if (pd < p.r + it.r + 4) {
        it.alive = false;
        collect(it);
      }
    }
    P.pickups.sweep();

    /* ---- 粒子 / 数字 / 特效 ---- */
    var pt = P.particles.items;
    for (i = pt.length - 1; i >= 0; i--) {
      var pa = pt[i];
      pa.life -= dt;
      if (pa.life <= 0) { pa.alive = false; continue; }
      pa.x += pa.vx * dt; pa.y += pa.vy * dt;
      pa.vx *= Math.pow(0.06, dt); pa.vy *= Math.pow(0.06, dt);
    }
    P.particles.sweep();

    var dn = P.damageNumbers.items;
    for (i = dn.length - 1; i >= 0; i--) {
      var d = dn[i];
      d.life -= dt;
      if (d.life <= 0) { d.alive = false; continue; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vy += 90 * dt;
    }
    P.damageNumbers.sweep();

    var fx = P.fx.items;
    for (i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) fx[i].alive = false;
    }
    P.fx.sweep();

    /* ---- 相机 ---- */
    var lerp = 1 - Math.pow(0.0008, dt);
    G.cam.x += (p.x - G.cam.x) * lerp;
    G.cam.y += (p.y - G.cam.y) * lerp;
    var halfW = cssW / zoom / 2, halfH = cssH / zoom / 2;
    G.cam.x = halfW * 2 >= WORLD ? WORLD / 2 : Math.max(halfW, Math.min(WORLD - halfW, G.cam.x));
    G.cam.y = halfH * 2 >= WORLD ? WORLD / 2 : Math.max(halfH, Math.min(WORLD - halfH, G.cam.y));

    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 42);

    UI.updateHUD(G);
  }

  function collect(it) {
    var p = G.player;
    if (it.kind === 'xp') { gainXp(it.value); SFX.pickup(); return; }
    if (it.kind === 'gold') { p.gold += it.value * 2; SFX.pickup(); return; }
    if (it.kind === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + it.value);
      UI.toast('+' + it.value + ' 生命');
      P.fx.spawn('ring', p.x, p.y, 40, 0.35, '#4ee1a0');
      SFX.levelup();
      return;
    }
    if (it.kind === 'magnet') {
      P.pickups.items.forEach(function (o) { if (o.alive) o.pulled = true; });
      UI.toast('磁力吸取');
      SFX.levelup();
      return;
    }
    if (it.kind === 'nuke') {
      UI.toast('☢ 清 场');
      shake(16); vibrate(80);
      var list = P.enemies.items.slice();
      list.forEach(function (e) {
        if (e.alive && !e.def.boss) damageEnemy(e, 99999, false, p.x, p.y, 0);
        else if (e.alive) damageEnemy(e, 400, true, p.x, p.y, 0);
      });
      P.enemyBullets.clear();
      P.fx.spawn('ring', p.x, p.y, 900, 0.5, '#ffd93d');
      SFX.explode();
    }
  }

  /* ================= 渲染 ================= */
  function render() {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, cssW, cssH);

    var sx = 0, sy = 0;
    if (G.shake > 0) {
      sx = (Math.random() - 0.5) * G.shake;
      sy = (Math.random() - 0.5) * G.shake;
    }

    ctx.save();
    ctx.translate(cssW / 2 + sx, cssH / 2 + sy);
    ctx.scale(zoom, zoom);
    ctx.translate(-G.cam.x, -G.cam.y);

    var halfW = cssW / zoom / 2, halfH = cssH / zoom / 2;
    var vx0 = G.cam.x - halfW, vx1 = G.cam.x + halfW;
    var vy0 = G.cam.y - halfH, vy1 = G.cam.y + halfH;

    drawGrid(vx0, vy0, vx1, vy1);

    // 边界
    ctx.strokeStyle = '#2a3746';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, WORLD, WORLD);

    drawMines();
    drawFxUnder();
    drawPickups();
    drawEnemyBullets();
    drawEnemies();
    drawPlayer();
    drawBullets();
    drawGrenades();
    drawParticles();
    drawFxOver();
    drawDamageNumbers();

    ctx.restore();

    drawJoystick();
    drawVignette();
    drawCombo();
  }

  function drawGrid(x0, y0, x1, y1) {
    var step = 80;
    ctx.strokeStyle = '#141c26';
    ctx.lineWidth = 1;
    ctx.beginPath();
    var gx = Math.floor(x0 / step) * step;
    for (; gx < x1; gx += step) { ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); }
    var gy = Math.floor(y0 / step) * step;
    for (; gy < y1; gy += step) { ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); }
    ctx.stroke();
  }

  function shapePath(e) {
    var r = e.r;
    ctx.beginPath();
    if (e.def.shape === 'square') {
      ctx.rect(e.x - r, e.y - r, r * 2, r * 2);
    } else if (e.def.shape === 'tri') {
      var a = Math.atan2(G.player.y - e.y, G.player.x - e.x);
      for (var i = 0; i < 3; i++) {
        var t = a + i * 2.094;
        var px = e.x + Math.cos(t) * r * 1.25, py = e.y + Math.sin(t) * r * 1.25;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (e.def.shape === 'hex') {
      for (var j = 0; j < 6; j++) {
        var t2 = j * 1.047 + e.wobble * 0.2;
        var qx = e.x + Math.cos(t2) * r, qy = e.y + Math.sin(t2) * r;
        if (j === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
      }
      ctx.closePath();
    } else {
      ctx.arc(e.x, e.y, r, 0, 6.2832);
    }
  }

  function drawEnemies() {
    var list = P.enemies.items;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.alive) continue;

      shapePath(e);
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.def.color;
      ctx.fill();
      ctx.strokeStyle = e.flash > 0 ? '#ffffff' : e.def.dark;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 自爆虫的引信闪烁：给玩家 0.8s 的可读预警
      if (e.def.explodes) {
        var blink = 0.5 + 0.5 * Math.sin(G.time * 14 + e.wobble);
        ctx.globalAlpha = blink * 0.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.def.blastR, 0, 6.2832);
        ctx.strokeStyle = '#ffd93d'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 血条只给大怪，杂兵不画（否则屏幕全是条）
      if (e.def.boss || e.maxHp > 80) {
        var w = e.r * 2.2, h = 4;
        var pct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w, h);
        ctx.fillStyle = '#ff5c6c';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w * pct, h);
      }
    }
  }

  function drawPlayer() {
    var p = G.player;
    if (!p) return;

    // 护盾
    if (p.shield > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 8, 0, 6.2832);
      ctx.strokeStyle = 'rgba(77,184,255,.75)'; ctx.lineWidth = 2; ctx.stroke();
    }
    // 无敌闪烁
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.4;

    // 拾取范围（很淡，作为构筑成长的可视反馈）
    ctx.beginPath();
    ctx.arc(p.x, p.y, BASE.pickup * p.pickupMul, 0, 6.2832);
    ctx.strokeStyle = 'rgba(78,225,160,.07)'; ctx.lineWidth = 1; ctx.stroke();

    // 环绕无人机
    if (p.weapons.orbit) {
      var od = Upgrades.WEAPON_DATA.orbit.lv[p.weapons.orbit - 1];
      for (var k = 0; k < od.count; k++) {
        var a = p.orbitAngle + (k / od.count) * Math.PI * 2;
        var ox = p.x + Math.cos(a) * od.radius, oy = p.y + Math.sin(a) * od.radius;
        ctx.beginPath(); ctx.arc(ox, oy, 6, 0, 6.2832);
        ctx.fillStyle = '#8affd0'; ctx.fill();
      }
    }

    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
    ctx.fillStyle = p.hurtFlash > 0 ? '#ff8a95' : '#4ee1a0';
    ctx.fill();
    ctx.strokeStyle = '#0d3b2a'; ctx.lineWidth = 3; ctx.stroke();

    // 枪口方向
    ctx.beginPath();
    ctx.moveTo(p.x + p.aimX * 8, p.y + p.aimY * 8);
    ctx.lineTo(p.x + p.aimX * 22, p.y + p.aimY * 22);
    ctx.strokeStyle = '#e7eef7'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.globalAlpha = 1;
  }

  function drawBullets() {
    var list = P.bullets.items;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b.alive) continue;
      var sp = Math.hypot(b.vx, b.vy) || 1;
      var tx = b.x - b.vx / sp * 12, ty = b.y - b.vy / sp * 12;
      ctx.beginPath();
      ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.r * 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  function drawEnemyBullets() {
    var list = P.enemyBullets.items;
    ctx.fillStyle = '#ff6b8a';
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b.alive) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
    }
  }

  var PICK_COLOR = { xp: '#4ee1a0', gold: '#ffd93d', heal: '#ff5c6c', magnet: '#4db8ff', nuke: '#ffd93d' };
  function drawPickups() {
    var list = P.pickups.items;
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it.alive) continue;
      var c = PICK_COLOR[it.kind];
      if (it.kind === 'xp') {
        ctx.fillStyle = c;
        ctx.fillRect(it.x - 3, it.y - 3, 6, 6);
      } else {
        var pulse = 1 + Math.sin(G.time * 8) * 0.15;
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r * pulse, 0, 6.2832);
        ctx.fillStyle = c; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }

  function drawMines() {
    var list = P.mines.items;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (!m.alive) continue;
      var blink = 0.4 + 0.6 * Math.abs(Math.sin(G.time * 6));
      ctx.globalAlpha = blink;
      ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, 6.2832);
      ctx.fillStyle = '#ff9f43'; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawGrenades() {
    var list = P.grenades.items;
    ctx.fillStyle = '#ffb648';
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (!g.alive) continue;
      var arc = Math.sin((g.t / g.dur) * Math.PI) * 26;   // 抛物线视觉
      ctx.beginPath(); ctx.arc(g.x, g.y - arc, 6, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(g.x, g.y, 4, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawParticles() {
    var list = P.particles.items;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFxUnder() {
    var list = P.fx.items;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f.alive || f.kind !== 'laser') continue;
      var k = f.life / f.maxLife;
      ctx.globalAlpha = k * 0.8;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832);
      ctx.fillStyle = f.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawFxOver() {
    var list = P.fx.items;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f.alive) continue;
      var k = f.life / f.maxLife;

      if (f.kind === 'ring') {
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (1 - k * 0.55), 0, 6.2832);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3 + k * 4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'arc') {
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.moveTo(f.pts[0], f.pts[1]);
        for (var j = 2; j < f.pts.length; j += 2) {
          var mx = (f.pts[j - 2] + f.pts[j]) / 2 + (Math.random() - 0.5) * 22;
          var my = (f.pts[j - 1] + f.pts[j + 1]) / 2 + (Math.random() - 0.5) * 22;
          ctx.lineTo(mx, my);
          ctx.lineTo(f.pts[j], f.pts[j + 1]);
        }
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawDamageNumbers() {
    var list = P.damageNumbers.items;
    ctx.textAlign = 'center';
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (!d.alive) continue;
      var k = d.life / d.maxLife;
      ctx.globalAlpha = Math.min(1, k * 1.8);
      ctx.font = (d.crit ? 'bold 20px ' : 'bold 14px ') + 'ui-monospace,monospace';
      ctx.fillStyle = d.crit ? '#fff3a0' : '#ffffff';
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawJoystick() {
    if (!Input.active || !Input.enabled) return;
    ctx.beginPath();
    ctx.arc(Input.stickX, Input.stickY, 58, 0, 6.2832);
    ctx.strokeStyle = 'rgba(231,238,247,.16)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.arc(Input.knobX, Input.knobY, 24, 0, 6.2832);
    ctx.fillStyle = 'rgba(78,225,160,.28)'; ctx.fill();
    ctx.strokeStyle = 'rgba(78,225,160,.7)'; ctx.stroke();
  }

  function drawVignette() {
    var p = G.player;
    if (!p) return;
    var lowHp = 1 - Math.min(1, p.hp / p.maxHp / 0.35);
    if (lowHp <= 0) return;
    var g = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.3,
      cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
    g.addColorStop(0, 'rgba(255,0,40,0)');
    g.addColorStop(1, 'rgba(255,0,40,' + (0.42 * lowHp).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function drawCombo() {
    if (G.combo < 5) return;
    var k = Math.min(1, G.comboTimer / 2.4);
    // 字号封顶 44px：连杀上千时字体不能跟着涨，否则直接糊满屏幕挡住战斗
    var size = Math.min(44, 24 + G.combo * 0.5);
    var y = cssH * 0.30;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.globalAlpha = 0.3 + k * 0.6;
    ctx.font = 'bold ' + size.toFixed(0) + 'px ui-monospace,monospace';
    ctx.fillStyle = G.combo >= 30 ? '#ff5c6c' : (G.combo >= 15 ? '#ffd93d' : '#4ee1a0');
    ctx.fillText('×' + G.combo, cssW - 14, y);
    ctx.font = 'bold 11px ui-monospace,monospace';
    ctx.fillStyle = 'rgba(231,238,247,.55)';
    ctx.fillText('COMBO', cssW - 14, y + 14);
    ctx.restore();
  }

  /* ================= 主循环 ================= */
  var last = 0, acc = 0;
  var STEP = 1 / 60;

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    var raw = (ts - last) / 1000;
    last = ts;
    if (raw > 0.25) raw = 0.25;                  // 切后台回来不要一次性推进几十秒

    SFX.tickFrame();

    if (G.state === 'playing') {
      var scale = 1;
      if (G.hitStop > 0) { G.hitStop -= raw; scale = 0.18; }
      acc += raw * scale;
      var steps = 0;
      while (acc >= STEP && steps < 5) { update(STEP); acc -= STEP; steps++; }
      if (steps === 5) acc = 0;
    } else if (G.state === 'dead') {
      G.reviveTimer -= raw;
      var pct = Math.max(0, G.reviveTimer / 5);
      UI.$('reviveBar').style.width = (pct * 100) + '%';
      if (G.reviveTimer <= 0) endRun(false);
    }

    if (G.player && G.state !== 'menu' && G.state !== 'result') render();
    else if (G.state === 'menu' || G.state === 'result') renderIdle(raw);
  }

  // 菜单背景：慢慢飘的网格，比纯黑更"活"，但几乎不耗性能
  var idleT = 0;
  function renderIdle(dt) {
    idleT += dt * 12;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.save();
    ctx.translate(-(idleT % 80), -(idleT % 80));
    ctx.strokeStyle = '#121a24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= cssW + 80; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, cssH + 80); }
    for (var y = 0; y <= cssH + 80; y += 80) { ctx.moveTo(0, y); ctx.lineTo(cssW + 80, y); }
    ctx.stroke();
    ctx.restore();
  }

  /* ================= 事件绑定 ================= */
  function bindUI() {
    var $ = UI.$;

    $('btnStart').addEventListener('click', function () { SFX.unlock(); SFX.ui(); startRun(); });

    function onBuy(u, cost) {
      if (Save.spendGold(cost)) {
        Save.setMetaLevel(u.id, Save.metaLevel(u.id) + 1);
        SFX.levelup();
        vibrate(15);
        UI.renderShop(onBuy);   // 买完立刻刷新，进度条当场往前走一格
        UI.refreshMenu();
      }
    }

    $('btnShop').addEventListener('click', function () {
      SFX.ui();
      UI.renderShop(onBuy);
      UI.hideAll(); UI.show('shop');
    });

    $('btnShopBack').addEventListener('click', function () {
      SFX.ui(); UI.refreshMenu(); UI.hideAll(); UI.show('menu');
    });

    $('btnSettings').addEventListener('click', function () {
      SFX.ui(); UI.refreshSettings(); UI.hideAll(); UI.show('settings');
    });
    $('btnSetBack').addEventListener('click', function () {
      SFX.ui(); UI.hideAll(); UI.show('menu');
    });
    document.querySelectorAll('.toggle').forEach(function (t) {
      t.addEventListener('click', function () {
        Save.toggleSetting(t.dataset.set);
        UI.refreshSettings();
        SFX.ui();
      });
    });
    // 两段式确认，不用 confirm()：
    // 内嵌页面（Artifact / iframe / WebView）里原生弹窗会被静默拦掉，
    // 按钮点了没反应，玩家只会以为游戏坏了。
    var resetArm = 0;
    $('btnResetSave').addEventListener('click', function () {
      var btn = $('btnResetSave');
      if (Date.now() - resetArm < 4000) {
        resetArm = 0;
        Save.reset();
        UI.refreshMenu(); UI.refreshSettings();
        btn.textContent = '已清除';
        setTimeout(function () { btn.textContent = '清除全部存档'; }, 1600);
        return;
      }
      resetArm = Date.now();
      btn.textContent = '再点一次确认清除';
      SFX.ui();
      setTimeout(function () {
        if (resetArm) { resetArm = 0; btn.textContent = '清除全部存档'; }
      }, 4000);
    });

    $('btnPause').addEventListener('click', function () {
      if (G.state !== 'playing') return;
      G.state = 'paused';
      Input.enabled = false; Input.release();
      UI.renderPauseStats(G);
      UI.show('paused');
    });
    $('btnResume').addEventListener('click', function () {
      SFX.ui();
      UI.hide('paused');
      G.state = 'playing';
      Input.enabled = true;
    });
    $('btnQuit').addEventListener('click', function () {
      SFX.ui(); UI.hide('paused'); endRun(false);
    });

    // --- 激励视频位 1：复活 ---
    $('btnRevive').addEventListener('click', function () {
      Monetize.reward('revive', function () { revive(); }, function () { endRun(false); });
    });
    $('btnGiveUp').addEventListener('click', function () { SFX.ui(); endRun(false); });

    // --- 激励视频位 2：金币翻倍 ---
    $('btnDouble').addEventListener('click', function () {
      if (G.doubled) return;
      Monetize.reward('double', function () {
        G.doubled = true;
        Save.addGold(G.resultGold);
        UI.$('rGold').textContent = G.resultGold * 2;
        UI.$('btnDouble').disabled = true;
        SFX.levelup();
      });
    });

    // --- 激励视频位 3：刷新三选一 ---
    $('btnReroll').addEventListener('click', function () {
      Monetize.reward('reroll', function () {
        G.pendingCards = Upgrades.roll(G.player);
        UI.renderCards(G.pendingCards, pickCard);
        UI.$('rerollLeft').textContent = '(' + Monetize.left('reroll') + ')';
        UI.$('btnReroll').disabled = !Monetize.canShow('reroll');
      });
    });

    // 结算 → 立刻再来一局，中间不插任何加载/动画。
    // 这个按钮的响应速度直接决定留存，别在这里放广告。
    $('btnAgain').addEventListener('click', function () { SFX.ui(); startRun(); });
    $('btnHome').addEventListener('click', function () {
      SFX.ui(); UI.refreshMenu(); UI.hideAll(); UI.show('menu');
    });

    // 切后台自动暂停
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.state === 'playing') {
        G.state = 'paused';
        Input.enabled = false; Input.release();
        UI.renderPauseStats(G);
        UI.show('paused');
      }
    });
  }

  /* ================= 启动 ================= */
  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d', { alpha: false });
    resize();
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

    Input.bind(canvas);
    bindUI();
    UI.refreshMenu();
    UI.refreshSettings();
    UI.hideAll();
    UI.show('menu');

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.Game = G;
})(window);
