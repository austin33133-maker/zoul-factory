// GameEngine: 状态机，驱动一关游戏。不直接绘制，由 GameScene 监听事件来做动画。
import {
  createBoard, findMatches, applyClear, applyGravity, refill,
  specialTargets, comboTargets, cloneGrid, findValidMoves, SPECIAL, inBounds
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
    this.movesLeft = level.moves;
    this.score = 0;
    this.collected = {}; // color -> count
    this.cratesLeft = level.objective.type === 'crates' ? level.objective.amount : 0;
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
    if (o.type === 'crates') return this.cratesLeft <= 0;
    return false;
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
    if (!a || !b) return false;

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

    // 级联
    while (true) {
      const falls = applyGravity(this.grid);
      const gen = refill(this.grid, this.level.palette);
      this.emit('cascade', { falls, gen });
      await sleep(220);
      const next = findMatches(this.grid);
      if (!next.groups.length) break;
      this.comboLevel++;
      this.emit('combo', this.comboLevel);
      await this.resolveMatches(next);
    }

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
      while (true) {
        const falls = applyGravity(this.grid);
        const gen = refill(this.grid, this.level.palette);
        this.emit('cascade', { falls, gen });
        await sleep(220);
        const next = findMatches(this.grid);
        if (!next.groups.length) break;
        await this.resolveMatches(next);
      }
      this.phase = Phase.IDLE;
      return true;
    } else return false;

    this.phase = Phase.RESOLVING;
    await this.triggerSet(set, { reason: 'booster' });
    while (true) {
      const falls = applyGravity(this.grid);
      const gen = refill(this.grid, this.level.palette);
      this.emit('cascade', { falls, gen });
      await sleep(220);
      const next = findMatches(this.grid);
      if (!next.groups.length) break;
      await this.resolveMatches(next);
    }
    this.phase = Phase.IDLE;
    return true;
  }

  // 普通匹配解析（含创建特殊棋子）
  async resolveMatches(matches) {
    const { toClear, specialCreations } = matches;
    const { clearedCells, specialsToTrigger } = applyClear(this.grid, toClear, specialCreations);
    this.score += clearedCells.length * (60 + this.comboLevel * 10);
    clearedCells.forEach(({ piece }) => {
      this.collected[piece.color] = (this.collected[piece.color] || 0) + 1;
    });
    this.emit('clear', { cells: clearedCells, specialCreations });
    this.emit('scoreChanged', this.score);
    this.emit('collectChanged', this.collected);
    await sleep(260);
    // 链式触发被波及的特殊棋子
    for (const sp of specialsToTrigger) {
      const set = specialTargets(this.grid, sp.r, sp.c, sp.special, sp.color);
      set.add(sp.r + ',' + sp.c);
      await this.triggerSet(set, { reason: 'chain' });
    }
  }

  // 触发任意一组目标格（来自 booster / lightball / combo / 链式）
  async triggerSet(set, meta = {}) {
    const cells = [];
    const chained = [];
    for (const key of set) {
      const [r, c] = key.split(',').map(Number);
      if (!inBounds(this.grid, r, c)) continue;
      const p = this.grid[r][c];
      if (!p) continue;
      cells.push({ r, c, piece: p });
      if (p.special) chained.push({ r, c, special: p.special, color: p.color });
      this.grid[r][c] = null;
    }
    this.score += cells.length * (80 + this.comboLevel * 10);
    cells.forEach(({ piece }) => { this.collected[piece.color] = (this.collected[piece.color] || 0) + 1; });
    this.emit('explode', { cells, reason: meta.reason });
    this.emit('scoreChanged', this.score);
    this.emit('collectChanged', this.collected);
    await sleep(260);
    // 递归触发被波及的特殊棋子（去重以防同一波内已被清除）
    for (const sp of chained) {
      const next = specialTargets(this.grid, sp.r, sp.c, sp.special, sp.color);
      if (next.size) await this.triggerSet(next, { reason: 'chain' });
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
