// GameEngine: 状态机，驱动一关游戏。不直接绘制，由 GameScene 监听事件来做动画。
import {
  createBoard, findMatches, applyClear, applyGravity, refill,
  specialTargets, comboTargets, cloneGrid, findValidMoves, SPECIAL, inBounds,
  injectObstacles, injectTiles, createTiles, processAdjacency, rescueArrived,
  isMovable, KIND, TILE, newPrincess
} from './board.js';
import { CONFIG } from '../config.js';

export const Phase = {
  IDLE: 'idle',
  SWAPPING: 'swapping',
  RESOLVING: 'resolving',
  WIN: 'win',
  LOSE: 'lose'
};

export class GameEngine {
  constructor(level, listeners = {}) {
    this.level = level;
    this.listeners = listeners;
    this.grid = createBoard(CONFIG.COLS, CONFIG.ROWS, level.palette);
    injectObstacles(this.grid, level.obstacles);
    this.tiles = createTiles(CONFIG.ROWS, CONFIG.COLS);
    injectTiles(this.tiles, level.tiles);
    this.movesLeft = level.moves + (level.extraMoves || 0);
    this.score = 0;
    this.collected = {};
    this.cratesBroken = 0;
    this.jellyBroken = 0;
    this.princessesSaved = 0;
    this.giftsOpened = 0;
    const initialPrincesses = (level.obstacles?.princesses || []).length;
    this.princessesToSpawn = level.objective?.type === 'savePrincess'
      ? Math.max(0, level.objective.amount - initialPrincesses)
      : 0;
    this.phase = Phase.IDLE;
    this.comboLevel = 0;
  }

  emit(name, payload) {
    const fn = this.listeners[name];
    if (fn) fn(payload);
  }

  isObjectiveDone() {
    const o = this.level.objective;
    if (o.type === 'collectColor') return (this.collected[o.color] || 0) >= o.amount;
    if (o.type === 'score') return this.score >= o.amount;
    if (o.type === 'crates') return this.cratesBroken >= o.amount;
    if (o.type === 'jelly') return this.jellyBroken >= o.amount;
    if (o.type === 'savePrincess') return this.princessesSaved >= o.amount;
    if (o.type === 'multiColor') return o.items.every(it => (this.collected[it.color] || 0) >= it.amount);
    return false;
  }

  addMoves(n) {
    this.movesLeft += n;
    this.emit('movesChanged', this.movesLeft);
  }

  starsEarned() {
    const thr = this.level.starThresholds;
    if (this.score >= thr[2]) return 3;
    if (this.score >= thr[1]) return 2;
    if (this.score >= thr[0]) return 1;
    return 0;
  }

  // 玩家请求交换 (r1,c1) <-> (r2,c2)
  async trySwap(r1, c1, r2, c2) {
    if (this.phase !== Phase.IDLE) return false;
    if (this.movesLeft <= 0) return false;
    if (!inBounds(this.grid, r1, c1) || !inBounds(this.grid, r2, c2)) return false;
    const a = this.grid[r1][c1], b = this.grid[r2][c2];
    if (!isMovable(a) || !isMovable(b)) return false;

    // 相邻校验
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;

    this.phase = Phase.SWAPPING;
    this.emit('swap', { from: [r1, c1], to: [r2, c2] });

    // 实际交换。交换后：a 在 (r2,c2)；b 在 (r1,c1)
    [this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]];

    const isCombo = !!(a.special && b.special);
    const combo = isCombo ? comboTargets(this.grid, [r1, c1], [r2, c2]) : null;

    // lightball + 普通棋子
    let lightballSwap = null;
    if (!isCombo) {
      if (a.special === SPECIAL.LIGHTBALL && b.color) lightballSwap = { pos: [r2, c2], color: b.color };
      else if (b.special === SPECIAL.LIGHTBALL && a.color) lightballSwap = { pos: [r1, c1], color: a.color };
    }

    const matches = findMatches(this.grid);

    // 非彩球的单特殊棋子被交换 → 激活
    let singleSpecial = null;
    if (!combo && !lightballSwap) {
      if (a.special && a.special !== SPECIAL.LIGHTBALL) singleSpecial = { pos: [r2, c2], special: a.special, color: a.color };
      else if (b.special && b.special !== SPECIAL.LIGHTBALL) singleSpecial = { pos: [r1, c1], special: b.special, color: b.color };
    }

    const willResolve = combo || lightballSwap || singleSpecial || matches.groups.length > 0;
    if (!willResolve) {
      [this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]];
      this.emit('swap', { from: [r2, c2], to: [r1, c1], invalid: true });
      this.phase = Phase.IDLE;
      return false;
    }

    this.movesLeft--;
    this.emit('movesChanged', this.movesLeft);
    this.phase = Phase.RESOLVING;
    this.comboLevel = 0;

    if (combo) {
      await this.triggerSet(combo, { reason: 'combo' });
    } else if (lightballSwap) {
      const set = specialTargets(this.grid, lightballSwap.pos[0], lightballSwap.pos[1], SPECIAL.LIGHTBALL, lightballSwap.color);
      set.add(lightballSwap.pos[0] + ',' + lightballSwap.pos[1]);
      await this.triggerSet(set, { reason: 'lightball' });
    } else if (singleSpecial) {
      const [sr, sc] = singleSpecial.pos;
      const set = specialTargets(this.grid, sr, sc, singleSpecial.special, singleSpecial.color);
      set.add(sr + ',' + sc);
      await this.triggerSet(set, { reason: 'rocket' });
      if (matches.groups.length) await this.resolveMatches(matches);
    } else {
      await this.resolveMatches(matches);
    }

    await this._runCascade();

    // 终局判定
    if (this.isObjectiveDone()) {
      this.phase = Phase.WIN;
      this.emit('win', { score: this.score, stars: this.starsEarned() });
      return true;
    }
    if (this.movesLeft <= 0) {
      this.phase = Phase.LOSE;
      this.emit('lose', { score: this.score });
      return true;
    }
    // 死局检查
    if (!findValidMoves(this.grid).length) {
      this.emit('reshuffle');
      this.grid = createBoard(CONFIG.COLS, CONFIG.ROWS, this.level.palette);
      this.emit('boardReset', this.grid);
    }
    this.phase = Phase.IDLE;
    return true;
  }

  // 玩家激活道具（hammer 单击消除 / bomb 局部 / swap 任意两个）
  async useBooster(type, targets) {
    if (this.phase !== Phase.IDLE) return false;
    let set = new Set();
    if (type === 'hammer') {
      const [r, c] = targets[0];
      set.add(r + ',' + c);
    } else if (type === 'bomb') {
      const [r, c] = targets[0];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(this.grid, nr, nc)) set.add(nr + ',' + nc);
      }
    } else if (type === 'swap') {
      const [a, b] = targets;
      const tmp = this.grid[a[0]][a[1]];
      this.grid[a[0]][a[1]] = this.grid[b[0]][b[1]];
      this.grid[b[0]][b[1]] = tmp;
      this.emit('swap', { from: a, to: b });
      this.phase = Phase.RESOLVING;
      // 重新解算
      let matches = findMatches(this.grid);
      if (matches.groups.length) await this.resolveMatches(matches);
      await this._runCascade();
      this.phase = Phase.IDLE;
      return true;
    } else return false;

    this.phase = Phase.RESOLVING;
    await this.triggerSet(set, { reason: 'booster' });
    await this._runCascade();
    this.phase = Phase.IDLE;
    return true;
  }

  async _runCascade() {
    while (true) {
      const falls = applyGravity(this.grid);
      // 公主救出检查
      const rescued = rescueArrived(this.grid);
      if (rescued.length) {
        this.princessesSaved += rescued.length;
        this.score += rescued.length * 500;
        this.emit('princessRescued', { rescued });
        this.emit('scoreChanged', this.score);
      }
      const gen = refill(this.grid, this.level.palette);
      // 再生公主：把顶部新生成的某个棋子替换成公主
      if (this.princessesToSpawn > 0 && gen.length) {
        const topGens = gen.filter(g => g.at[0] === 0);
        if (topGens.length) {
          const tg = topGens[Math.floor(Math.random() * topGens.length)];
          const [r, c] = tg.at;
          const princess = newPrincess();
          this.grid[r][c] = princess;
          tg.piece = princess;
          this.princessesToSpawn--;
        }
      }
      this.emit('cascade', { falls, gen });
      await sleep(240);
      // 救出后让重力再处理一轮
      if (rescued.length) continue;
      const next = findMatches(this.grid);
      if (!next.groups.length) break;
      this.comboLevel++;
      this.emit('combo', this.comboLevel);
      await this.resolveMatches(next);
    }
  }

  // 把清除/爆炸的事件归集到一处（含相邻效果与礼物盒奖励）
  async _commitClear({ clearedCells, specialCreations = [], reason, origin, special }) {
    const adj = processAdjacency(this.grid, this.tiles, clearedCells);
    // 计分
    this.score += clearedCells.length * (80 + this.comboLevel * 10)
                + adj.crateBreaks.length * 120
                + adj.giftBreaks.length * 100
                + adj.tileBreaks.length * 80;
    // 收集计数
    clearedCells.forEach(({ piece }) => {
      if (piece.kind === KIND.PIECE) this.collected[piece.color] = (this.collected[piece.color] || 0) + 1;
    });
    this.cratesBroken += adj.crateBreaks.length;
    this.jellyBroken += adj.tileBreaks.length;
    this.giftsOpened += adj.giftBreaks.length;
    // 礼物盒奖励
    for (const _ of adj.giftBreaks) this.emit('giftReward', this._dropGift());
    this.emit(reason === 'match' ? 'clear' : 'explode', {
      cells: clearedCells, specialCreations, reason, origin, special,
      crateBreaks: adj.crateBreaks, crateDamages: adj.crateDamages,
      giftBreaks: adj.giftBreaks, unfrozen: adj.unfrozen,
      tileBreaks: adj.tileBreaks, tileDamages: adj.tileDamages
    });
    this.emit('scoreChanged', this.score);
    this.emit('collectChanged', this.collected);
    await sleep(240);
  }

  _dropGift() {
    const pool = ['hammer', 'bomb', 'swap'];
    const key = pool[Math.floor(Math.random() * pool.length)];
    return { type: key };
  }

  async resolveMatches(matches) {
    const { toClear, specialCreations } = matches;
    const { clearedCells, specialsToTrigger } = applyClear(this.grid, toClear, specialCreations);
    await this._commitClear({ clearedCells, specialCreations, reason: 'match' });
    for (const sp of specialsToTrigger) {
      const set = specialTargets(this.grid, sp.r, sp.c, sp.special, sp.color);
      set.add(sp.r + ',' + sp.c);
      await this.triggerSet(set, { reason: 'chain', origin: [sp.r, sp.c], special: sp.special });
    }
  }

  async triggerSet(set, meta = {}) {
    const cells = [];
    const chained = [];
    for (const key of set) {
      const [r, c] = key.split(',').map(Number);
      if (!inBounds(this.grid, r, c)) continue;
      const p = this.grid[r][c];
      if (!p) continue;
      // 特殊棋子被直接命中：直接消除（包括公主以外的障碍）
      if (p.kind === KIND.PRINCESS) continue; // 公主不被火箭/炸弹消除
      cells.push({ r, c, piece: p });
      if (p.special) chained.push({ r, c, special: p.special, color: p.color });
      this.grid[r][c] = null;
      // 直接命中的木箱也算 1 次
      if (p.kind === KIND.CRATE) this.cratesBroken++;
    }
    await this._commitClear({ clearedCells: cells, reason: meta.reason || 'explode', origin: meta.origin, special: meta.special });
    for (const sp of chained) {
      const next = specialTargets(this.grid, sp.r, sp.c, sp.special, sp.color);
      if (next.size) await this.triggerSet(next, { reason: 'chain', origin: [sp.r, sp.c], special: sp.special });
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
