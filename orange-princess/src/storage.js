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
  // 装修元玩法（橙园别墅）
  decoration: {
    room: 0,           // 当前正在装修的房间索引
    items: {},         // 已解锁的物品 { 'garden:fountain': true }
    starsSpent: 0
  },
  audio: true,
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

  reset() { state = { ...DEFAULT_STATE }; save(); }
};
