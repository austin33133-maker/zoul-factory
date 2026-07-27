/* ===== UI 层：屏幕切换、HUD、卡牌、商店 =====
 * HUD 用 DOM 而不是画在 canvas 上：文字更清晰、适配安全区更省事、
 * 也不占用每帧的渲染预算。
 */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var els = {};
  ['hud', 'menu', 'shop', 'levelup', 'paused', 'dead', 'result', 'settings', 'adOverlay']
    .forEach(function (k) { els[k] = $(k); });

  function show(name) { if (els[name]) els[name].classList.remove('hidden'); }
  function hide(name) { if (els[name]) els[name].classList.add('hidden'); }
  function hideAll() { Object.keys(els).forEach(hide); }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  /* ---------------- HUD ---------------- */
  var hudCache = { hp: -1, maxHp: -1, xp: -1, lvl: -1, time: -1, kills: -1, wsig: '' };

  function updateHUD(g) {
    var p = g.player;

    var hpPct = Math.max(0, p.hp / p.maxHp);
    if (hudCache.hp !== p.hp || hudCache.maxHp !== p.maxHp) {
      $('hpFill').style.width = (hpPct * 100).toFixed(1) + '%';
      $('hpText').textContent = Math.max(0, Math.ceil(p.hp)) + '/' + Math.round(p.maxHp);
      hudCache.hp = p.hp; hudCache.maxHp = p.maxHp;
    }

    var xpPct = p.xp / p.xpNeed;
    if (Math.abs(hudCache.xp - xpPct) > 0.004) {
      $('xpFill').style.width = (Math.min(1, xpPct) * 100).toFixed(1) + '%';
      hudCache.xp = xpPct;
    }

    if (hudCache.lvl !== p.level) {
      $('lvlText').textContent = 'Lv.' + p.level;
      hudCache.lvl = p.level;
    }

    var tLeft = Math.ceil(g.runDuration - g.time);
    if (hudCache.time !== tLeft) {
      $('timeText').textContent = g.bossActive ? 'BOSS' : fmtTime(tLeft);
      hudCache.time = tLeft;
    }

    if (hudCache.kills !== g.kills) {
      $('killText').textContent = '☠ ' + g.kills;
      hudCache.kills = g.kills;
    }

    var sig = Object.keys(p.weapons).map(function (k) { return k + p.weapons[k]; }).join('|');
    if (hudCache.wsig !== sig) {
      var bar = $('weaponBar');
      bar.innerHTML = '';
      Object.keys(p.weapons).forEach(function (wid) {
        var w = Upgrades.WEAPON_DATA[wid];
        var d = document.createElement('div');
        d.className = 'wchip';
        d.innerHTML = '<span>' + w.icon + '</span><span class="wlv">Lv' + p.weapons[wid] + '</span>';
        bar.appendChild(d);
      });
      hudCache.wsig = sig;
    }
  }

  function resetHUDCache() {
    hudCache = { hp: -1, maxHp: -1, xp: -1, lvl: -1, time: -1, kills: -1, wsig: '' };
  }

  /* ---------------- 局内飘字 ----------------
   * 两条硬限制，否则密集掉落时提示会堆满半个屏幕把战斗挡掉：
   *   1) 同屏最多 2 条
   *   2) 同一条文案 0.8s 内不重复
   */
  var lastToast = {};
  function toast(text) {
    var now = performance.now();
    if (lastToast[text] && now - lastToast[text] < 800) return;
    lastToast[text] = now;

    var layer = $('toastLayer');
    while (layer.childElementCount >= 2) layer.firstElementChild.remove();

    var d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    layer.appendChild(d);
    setTimeout(function () { d.remove(); }, 1500);
  }

  /* ---------------- 升级三选一 ---------------- */
  function renderCards(cards, onPick) {
    var box = $('cards');
    box.innerHTML = '';
    cards.forEach(function (card) {
      var info = Upgrades.describe(card);
      var btn = document.createElement('button');
      btn.className = 'card ' + (info.cls || '') + (info.isNew && !info.cls ? ' new' : '');
      btn.innerHTML =
        '<div class="card-icon">' + info.icon + '</div>' +
        '<div class="card-body">' +
          '<div class="card-name">' + info.name +
            (info.isNew ? '<span class="card-tag">NEW</span>' : '<span class="card-lv">Lv ' + info.lv + '</span>') +
          '</div>' +
          '<div class="card-desc">' + info.desc + '</div>' +
        '</div>';
      btn.addEventListener('click', function () { SFX.ui(); onPick(card); });
      box.appendChild(btn);
    });
  }

  /* ---------------- 永久强化商店 ---------------- */
  function renderShop(onBuy) {
    $('shopGold').textContent = Save.data.gold;
    var list = $('shopList');
    list.innerHTML = '';

    Upgrades.META_UPGRADES.forEach(function (u) {
      var lv = Save.metaLevel(u.id);
      var maxed = lv >= u.max;
      var cost = Upgrades.metaCost(u, lv);
      var afford = Save.data.gold >= cost;

      var pips = '';
      for (var i = 0; i < u.max; i++) pips += '<div class="pip' + (i < lv ? ' on' : '') + '"></div>';

      var row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML =
        '<div class="shop-icon">' + u.icon + '</div>' +
        '<div class="shop-body">' +
          '<div class="shop-name">' + u.name + '</div>' +
          '<div class="shop-desc">' + u.desc + '</div>' +
          '<div class="pips">' + pips + '</div>' +
        '</div>';

      var btn = document.createElement('button');
      btn.className = 'buy-btn' + (maxed ? ' max' : '');
      btn.textContent = maxed ? '已满级' : ('◆ ' + cost);
      btn.disabled = maxed || !afford;
      btn.addEventListener('click', function () {
        SFX.ui();
        onBuy(u, cost);
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  /* ---------------- 主菜单数字 ---------------- */
  function refreshMenu() {
    $('bestTime').textContent = fmtTime(Save.data.bestTime);
    $('bestKill').textContent = Save.data.bestKill;
    $('goldText').textContent = Save.data.gold;
  }

  /* ---------------- 设置开关 ---------------- */
  function refreshSettings() {
    document.querySelectorAll('.toggle').forEach(function (t) {
      t.classList.toggle('on', !!Save.setting(t.dataset.set));
    });
  }

  /* ---------------- 暂停面板 ---------------- */
  function renderPauseStats(g) {
    var p = g.player;
    var lines = [
      ['存活时间', fmtTime(g.time)],
      ['击杀', g.kills],
      ['等级', p.level],
      ['伤害倍率', Math.round(p.damageMul * 100) + '%'],
      ['射速倍率', Math.round(p.fireRateMul * 100) + '%'],
      ['暴击率', Math.round(p.crit * 100) + '%'],
      ['本局金币', Math.floor(p.gold)]
    ];
    $('pauseStats').innerHTML = lines.map(function (l) {
      return '<div>' + l[0] + '<b>' + l[1] + '</b></div>';
    }).join('');
  }

  global.UI = {
    $: $, show: show, hide: hide, hideAll: hideAll,
    fmtTime: fmtTime,
    updateHUD: updateHUD, resetHUDCache: resetHUDCache,
    toast: toast,
    renderCards: renderCards,
    renderShop: renderShop,
    refreshMenu: refreshMenu,
    refreshSettings: refreshSettings,
    renderPauseStats: renderPauseStats
  };
})(window);
