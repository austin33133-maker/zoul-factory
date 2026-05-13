import { CONFIG } from './config.js';

const KEY = CONFIG.STORAGE_KEY;

const DEFAULT_STATE = {
  level: 1,
  maxLevel: 1,
  lives: CONFIG.LIFE_MAX,
  livesUpdatedAt: Date.now(),
  coins: CONFIG.COIN_INIT,
  stars: {},           // { '1': 3, '2': 2 ... }
  bestScore: {},       // { '1': 12345 }
  boosters: { hammer: 3, bomb: 2, swap: 2 },
  // 装修元玩法
  decoration: {
    room: 0,
    items: {},
    starsSpent: 0
  },
  // 章节剧情看过的章节 id 集合
  seenChapters: {},
  // 每日轮盘
  wheel: { lastClaimed: 0 },
  // 每日任务
  daily: { date: 0, tasks: [], claimed: [] },
  // 战令 XP & 已领奖励
  battle: { xp: 0, claimedTiers: [] },
  // 新手引导是否看过
  tutorial: { swap: false },
  audio: true,
  bgm: true,
  firstRun: true
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, boosters: { ...DEFAULT_STATE.boosters, ...(parsed.boosters || {}) } };
  } catch (e) {
    return { ...DEFAULT_STATE };
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

export const Save = {
  get() { return state; },

  patch(p) {
    state = { ...state, ...p };
    save();
  },

  // ----- lives -----
  regenLives() {
    if (state.lives >= CONFIG.LIFE_MAX) {
      state.livesUpdatedAt = Date.now();
      save();
      return;
    }
    const elapsed = Date.now() - state.livesUpdatedAt;
    const gained = Math.floor(elapsed / CONFIG.LIFE_REGEN_MS);
    if (gained > 0) {
      state.lives = Math.min(CONFIG.LIFE_MAX, state.lives + gained);
      state.livesUpdatedAt += gained * CONFIG.LIFE_REGEN_MS;
      save();
    }
  },
  nextLifeIn() {
    if (state.lives >= CONFIG.LIFE_MAX) return 0;
    return Math.max(0, state.livesUpdatedAt + CONFIG.LIFE_REGEN_MS - Date.now());
  },
  consumeLife() {
    if (state.lives <= 0) return false;
    if (state.lives === CONFIG.LIFE_MAX) state.livesUpdatedAt = Date.now();
    state.lives -= 1;
    save();
    return true;
  },
  giveLife(n = 1) {
    state.lives = Math.min(CONFIG.LIFE_MAX, state.lives + n);
    save();
  },

  // ----- coins -----
  addCoins(n) { state.coins += n; save(); },
  spendCoins(n) {
    if (state.coins < n) return false;
    state.coins -= n; save(); return true;
  },

  // ----- progress -----
  completeLevel(level, score, stars) {
    state.bestScore[level] = Math.max(state.bestScore[level] || 0, score);
    state.stars[level] = Math.max(state.stars[level] || 0, stars);
    state.maxLevel = Math.max(state.maxLevel, level + 1);
    state.level = state.maxLevel;
    save();
  },

  setLevel(level) { state.level = level; save(); },

  // ----- boosters -----
  useBooster(key) {
    if (!state.boosters[key] || state.boosters[key] <= 0) return false;
    state.boosters[key] -= 1; save(); return true;
  },
  giveBooster(key, n = 1) {
    state.boosters[key] = (state.boosters[key] || 0) + n; save();
  },

  toggleAudio() { state.audio = !state.audio; save(); return state.audio; },
  toggleBgm() { state.bgm = !state.bgm; save(); return state.bgm; },

  // ----- decoration -----
  unlockDecoration(key, starCost) {
    if (this.starsAvailable() < starCost) return false;
    state.decoration.items[key] = true;
    state.decoration.starsSpent += starCost;
    save();
    return true;
  },
  starsAvailable() {
    let total = 0;
    for (const k in state.stars) total += state.stars[k];
    return total - (state.decoration?.starsSpent || 0);
  },

  // ----- 章节剧情 -----
  hasSeenChapter(id) { return !!state.seenChapters[id]; },
  markChapterSeen(id) { state.seenChapters[id] = true; save(); },

  // ----- 每日轮盘 -----
  canSpinWheel() {
    const last = state.wheel?.lastClaimed || 0;
    return Date.now() - last >= 20 * 60 * 60 * 1000; // 20h 冷却（演示）
  },
  nextWheelIn() {
    const last = state.wheel?.lastClaimed || 0;
    return Math.max(0, last + 20 * 60 * 60 * 1000 - Date.now());
  },
  markWheelSpun() { state.wheel = { lastClaimed: Date.now() }; save(); },

  // ----- 每日任务 -----
  refreshDailyTasks(taskPool) {
    const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    if (state.daily?.date === today) return;
    // 从池子里随机抽 3 条
    const pool = taskPool.slice();
    const picks = [];
    while (picks.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      picks.push({ ...pool.splice(i, 1)[0], progress: 0 });
    }
    state.daily = { date: today, tasks: picks, claimed: [] };
    save();
  },
  tickTask(eventType, amount = 1) {
    if (!state.daily?.tasks) return;
    let changed = false;
    for (const t of state.daily.tasks) {
      if (t.event === eventType) { t.progress = (t.progress || 0) + amount; changed = true; }
    }
    if (changed) save();
  },
  claimTask(idx) {
    const t = state.daily.tasks[idx];
    if (!t || (t.progress || 0) < t.target) return null;
    if (state.daily.claimed.includes(idx)) return null;
    state.daily.claimed.push(idx);
    if (t.reward.coins) state.coins += t.reward.coins;
    if (t.reward.lives) state.lives = Math.min(CONFIG.LIFE_MAX, state.lives + t.reward.lives);
    if (t.reward.booster) {
      state.boosters[t.reward.booster] = (state.boosters[t.reward.booster] || 0) + (t.reward.boosterN || 1);
    }
    // 战令 XP 跟随每日任务
    state.battle.xp = (state.battle.xp || 0) + 30;
    save();
    return t.reward;
  },

  // ----- 战令 XP -----
  addBattleXp(n) {
    state.battle.xp = (state.battle.xp || 0) + n;
    save();
  },
  claimBattleTier(tier, reward) {
    if (state.battle.claimedTiers.includes(tier)) return false;
    const needed = tier * 100;
    if ((state.battle.xp || 0) < needed) return false;
    state.battle.claimedTiers.push(tier);
    if (reward.coins) state.coins += reward.coins;
    if (reward.lives) state.lives = Math.min(CONFIG.LIFE_MAX, state.lives + reward.lives);
    if (reward.booster) state.boosters[reward.booster] = (state.boosters[reward.booster] || 0) + (reward.boosterN || 1);
    save();
    return true;
  },

  // ----- 导入/导出存档 -----
  exportSave() {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
    catch (e) { return null; }
  },
  importSave(text) {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
      if (!obj || typeof obj !== 'object') return false;
      state = { ...DEFAULT_STATE, ...obj, boosters: { ...DEFAULT_STATE.boosters, ...(obj.boosters || {}) } };
      save();
      return true;
    } catch (e) { return false; }
  },

  reset() { state = { ...DEFAULT_STATE }; save(); }
};
