/* ===== 存档：localStorage 元进度 ===== */
(function (global) {
  'use strict';

  var KEY = 'zoul_survivors_save_v1';

  var DEFAULTS = {
    gold: 0,
    bestTime: 0,
    bestKill: 0,
    runs: 0,
    wins: 0,
    meta: {},           // 永久强化等级 { id: level }
    lastDaily: '',      // 每日首局翻倍的领取日期
    noAds: false,       // 内购去广告
    settings: { sfx: true, dmgNum: true, haptic: true, shake: true }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var data = clone(DEFAULTS);

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      data = Object.assign(clone(DEFAULTS), parsed);
      data.settings = Object.assign(clone(DEFAULTS.settings), parsed.settings || {});
      data.meta = parsed.meta || {};
    } catch (e) {
      // 存档损坏时退回默认值，不阻塞游戏
      data = clone(DEFAULTS);
    }
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 隐私模式下写入会失败，忽略 */ }
  }

  load();

  global.Save = {
    get data() { return data; },
    save: save,

    addGold: function (n) { data.gold += n; save(); },
    spendGold: function (n) {
      if (data.gold < n) return false;
      data.gold -= n; save(); return true;
    },

    metaLevel: function (id) { return data.meta[id] || 0; },
    setMetaLevel: function (id, lv) { data.meta[id] = lv; save(); },

    recordRun: function (time, kills, won) {
      data.runs++;
      if (won) data.wins++;
      if (time > data.bestTime) data.bestTime = time;
      if (kills > data.bestKill) data.bestKill = kills;
      save();
    },

    setting: function (k) { return data.settings[k]; },
    toggleSetting: function (k) {
      data.settings[k] = !data.settings[k];
      save();
      return data.settings[k];
    },

    reset: function () { data = clone(DEFAULTS); save(); }
  };
})(window);
