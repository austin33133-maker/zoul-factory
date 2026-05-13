import { CONFIG, COLOR_IDS } from '../config.js';
import { choice } from '../utils.js';

export const SPECIAL = {
  NONE: null,
  BOMB: 'bomb',
  ROCKET_H: 'rocketH',
  ROCKET_V: 'rocketV',
  LIGHTBALL: 'lightball'
};

export const KIND = {
  PIECE: 'piece',
  CRATE: 'crate',          // 木箱：相邻消除受伤
  GIFT: 'gift',            // 礼物盒：相邻消除打开，掉随机道具
  PRINCESS: 'princess'     // 小公主：跟随重力下落，到底层即"救出"
};

export const TILE = {
  JELLY: 'jelly',          // 果冻地块（铺在格子底下）
  VINE: 'vine',            // 藤蔓：覆盖在格子上，相邻消除可断，每步会蔓延
  PORTAL_IN: 'portalIn',   // 传送门入口
  PORTAL_OUT: 'portalOut'  // 传送门出口
};

let idSeq = 1;
function newPiece(color, special = null) {
  return { id: idSeq++, color, special, kind: KIND.PIECE };
}
export function newCrate(hp = 1) {
  return { id: idSeq++, color: null, special: null, kind: KIND.CRATE, hp, maxHp: hp };
}
export function newGift() {
  return { id: idSeq++, color: null, special: null, kind: KIND.GIFT };
}
export function newPrincess() {
  return { id: idSeq++, color: null, special: null, kind: KIND.PRINCESS };
}

function pieceColor(p) {
  if (!p) return null;
  if (p.kind && p.kind !== KIND.PIECE) return null;
  if (p.frozen) return null;
  return p.color;
}

export function createBoard(cols = CONFIG.COLS, rows = CONFIG.ROWS, palette = COLOR_IDS) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  // 生成无即时三连的初始棋盘
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let pool = palette.slice();
      // 排除与左侧两个相同色
      if (c >= 2 && grid[r][c-1].color === grid[r][c-2].color) pool = pool.filter(x => x !== grid[r][c-1].color);
      // 排除与上方两个相同色
      if (r >= 2 && grid[r-1][c].color === grid[r-2][c].color) pool = pool.filter(x => x !== grid[r-1][c].color);
      grid[r][c] = newPiece(choice(pool));
    }
  }
  // 保证至少有一个可行交换
  if (!findValidMoves(grid).length) return createBoard(cols, rows, palette);
  return grid;
}

export function inBounds(grid, r, c) {
  return r >= 0 && c >= 0 && r < grid.length && c < grid[0].length;
}

export function neighbors(r, c) {
  return [
    [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
  ];
}

// 找出当前棋盘上所有 3+ 连匹配，返回 { lines: [...], pieces: Set('r,c'), specialCreations: [...] }
export function findMatches(grid) {
  const rows = grid.length, cols = grid[0].length;
  const lines = [];

  // 横向
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const prevCol = pieceColor(grid[r][c - 1]);
      const curCol = c < cols ? pieceColor(grid[r][c]) : null;
      if (c === cols || curCol !== prevCol || !prevCol) {
        const len = c - runStart;
        if (len >= 3 && prevCol) {
          const cells = [];
          for (let i = runStart; i < c; i++) cells.push([r, i]);
          lines.push({ dir: 'h', color: prevCol, cells });
        }
        runStart = c;
      }
    }
  }
  // 纵向
  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const prevCol = pieceColor(grid[r - 1][c]);
      const curCol = r < rows ? pieceColor(grid[r][c]) : null;
      if (r === rows || curCol !== prevCol || !prevCol) {
        const len = r - runStart;
        if (len >= 3 && prevCol) {
          const cells = [];
          for (let i = runStart; i < r; i++) cells.push([i, c]);
          lines.push({ dir: 'v', color: prevCol, cells });
        }
        runStart = r;
      }
    }
  }

  // 合并重叠的线（L/T 形状）
  const groups = mergeGroups(lines);

  // 决定每个 group 的特殊棋子创建（如果有），返回所有要消除的格子
  const toClear = new Set();
  const specialCreations = [];
  for (const g of groups) {
    g.cells.forEach(([r, c]) => toClear.add(r + ',' + c));
    const creation = decideSpecial(g);
    if (creation) specialCreations.push(creation);
  }
  return { groups, toClear, specialCreations };
}

function mergeGroups(lines) {
  const cellMap = new Map(); // 'r,c' -> groupIndex
  const groups = [];
  for (const line of lines) {
    let mergedInto = -1;
    for (const [r, c] of line.cells) {
      const key = r + ',' + c;
      if (cellMap.has(key)) { mergedInto = cellMap.get(key); break; }
    }
    if (mergedInto < 0) {
      mergedInto = groups.length;
      groups.push({ color: line.color, cells: [], lines: [] });
    }
    groups[mergedInto].lines.push(line);
    for (const [r, c] of line.cells) {
      const key = r + ',' + c;
      if (!cellMap.has(key)) {
        cellMap.set(key, mergedInto);
        groups[mergedInto].cells.push([r, c]);
      }
    }
  }
  return groups;
}

function decideSpecial(group) {
  const hLines = group.lines.filter(l => l.dir === 'h');
  const vLines = group.lines.filter(l => l.dir === 'v');
  const maxLen = Math.max(...group.lines.map(l => l.cells.length));

  // 5 连：lightball
  if (maxLen >= 5) {
    const line = group.lines.find(l => l.cells.length === maxLen);
    const mid = line.cells[Math.floor(line.cells.length / 2)];
    return { pos: mid, color: group.color, special: SPECIAL.LIGHTBALL };
  }
  // L/T 形状：bomb（同时有横线和纵线）
  if (hLines.length && vLines.length) {
    // 共享格子（交叉点）
    const setH = new Set(hLines.flatMap(l => l.cells.map(([r, c]) => r + ',' + c)));
    const cross = vLines.flatMap(l => l.cells).find(([r, c]) => setH.has(r + ',' + c));
    if (cross) return { pos: cross, color: group.color, special: SPECIAL.BOMB };
  }
  // 4 连：rocket
  if (maxLen >= 4) {
    const line = group.lines.find(l => l.cells.length >= 4);
    const mid = line.cells[Math.floor(line.cells.length / 2)];
    return {
      pos: mid,
      color: group.color,
      special: line.dir === 'h' ? SPECIAL.ROCKET_V : SPECIAL.ROCKET_H // 4连横向 → 创建纵向火箭以清列；规则可调
    };
  }
  return null;
}

// 应用消除：返回 { clearedCells, specialsToTrigger }（相邻效果交给 processAdjacency）
export function applyClear(grid, toClear, specialCreations = [], triggeredBy = null) {
  const clearedCells = [];
  const specialsToTrigger = [];
  const becomeSpecialKeys = new Set(specialCreations.map(s => s.pos[0] + ',' + s.pos[1]));

  for (const key of toClear) {
    const [r, c] = key.split(',').map(Number);
    if (becomeSpecialKeys.has(key)) continue;
    const p = grid[r][c];
    if (!p) continue;
    if (p.kind && p.kind !== KIND.PIECE) continue; // 障碍物不被普通匹配直接清除
    if (p.frozen) continue;
    clearedCells.push({ r, c, piece: p });
    if (p.special && !(triggeredBy && triggeredBy.r === r && triggeredBy.c === c)) {
      specialsToTrigger.push({ r, c, special: p.special, color: p.color });
    }
    grid[r][c] = null;
  }
  for (const sc of specialCreations) {
    const [r, c] = sc.pos;
    grid[r][c] = { id: idSeq++, color: sc.color, special: sc.special, kind: KIND.PIECE };
  }

  return { clearedCells, specialsToTrigger };
}

function inBoundsRC(grid, r, c) {
  return r >= 0 && r < grid.length && c >= 0 && c < grid[0].length;
}

// 计算激活某个特殊棋子要清除的所有格子（不真正消除）
export function specialTargets(grid, r, c, special, color) {
  const rows = grid.length, cols = grid[0].length;
  const set = new Set();
  if (special === SPECIAL.BOMB) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) set.add(nr + ',' + nc);
    }
  } else if (special === SPECIAL.ROCKET_H) {
    for (let cc = 0; cc < cols; cc++) set.add(r + ',' + cc);
  } else if (special === SPECIAL.ROCKET_V) {
    for (let rr = 0; rr < rows; rr++) set.add(rr + ',' + c);
  } else if (special === SPECIAL.LIGHTBALL) {
    // 默认清除最多色（实际使用时通常由 swap 决定颜色）
    const target = color || mostCommonColor(grid);
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
      const p = grid[rr][cc];
      if (p && p.color === target) set.add(rr + ',' + cc);
    }
  }
  return set;
}

function mostCommonColor(grid) {
  const cnt = {};
  for (const row of grid) for (const p of row) if (p) cnt[p.color] = (cnt[p.color] || 0) + 1;
  let best = null, bestN = -1;
  for (const k in cnt) if (cnt[k] > bestN) { best = k; bestN = cnt[k]; }
  return best;
}

// 组合特效：两个特殊棋子相邻交换时
export function comboTargets(grid, aPos, bPos) {
  const [ar, ac] = aPos, [br, bc] = bPos;
  const a = grid[ar][ac], b = grid[br][bc];
  if (!a.special || !b.special) return null;
  const rows = grid.length, cols = grid[0].length;
  const set = new Set();
  const sa = a.special, sb = b.special;

  const addRow = r => { for (let c = 0; c < cols; c++) set.add(r + ',' + c); };
  const addCol = c => { for (let r = 0; r < rows; r++) set.add(r + ',' + c); };
  const addArea = (cr, cc, rad) => {
    for (let r = cr - rad; r <= cr + rad; r++) for (let c = cc - rad; c <= cc + rad; c++)
      if (r >= 0 && r < rows && c >= 0 && c < cols) set.add(r + ',' + c);
  };
  const addAll = () => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) set.add(r + ',' + c); };

  const isRocket = s => s === SPECIAL.ROCKET_H || s === SPECIAL.ROCKET_V;

  if (sa === SPECIAL.LIGHTBALL && sb === SPECIAL.LIGHTBALL) {
    addAll();
  } else if (sa === SPECIAL.LIGHTBALL || sb === SPECIAL.LIGHTBALL) {
    const other = sa === SPECIAL.LIGHTBALL ? b : a;
    const otherPos = sa === SPECIAL.LIGHTBALL ? bPos : aPos;
    if (isRocket(other.special) || other.special === SPECIAL.BOMB) {
      // 把所有同色棋子转换为相同特殊棋子并触发：简化做法 = 清空所有该色
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const p = grid[r][c];
        if (p && p.color === other.color) {
          set.add(r + ',' + c);
          // 在那个位置上模拟特殊效果
          if (other.special === SPECIAL.BOMB) addArea(r, c, 1);
          else if (other.special === SPECIAL.ROCKET_H) addRow(r);
          else if (other.special === SPECIAL.ROCKET_V) addCol(c);
        }
      }
    } else {
      // 默认: 清空所有该色
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const p = grid[r][c];
        if (p && p.color === other.color) set.add(r + ',' + c);
      }
    }
  } else if (sa === SPECIAL.BOMB && sb === SPECIAL.BOMB) {
    addArea(br, bc, 2);
    addArea(ar, ac, 2);
  } else if ((sa === SPECIAL.BOMB && isRocket(sb)) || (sb === SPECIAL.BOMB && isRocket(sa))) {
    // 3 列 + 3 行
    for (let d = -1; d <= 1; d++) { addRow(br + d); addCol(bc + d); }
  } else if (isRocket(sa) && isRocket(sb)) {
    addRow(br); addCol(bc);
  }
  set.add(ar + ',' + ac); set.add(br + ',' + bc);
  return set;
}

// 重力：返回 fall plan { from:[r,c], to:[r,c] }
// tiles 可选；若包含 PORTAL_IN，落入入口的棋子会被传送到 PORTAL_OUT，再继续下落
export function applyGravity(grid, tiles = null) {
  const rows = grid.length, cols = grid[0].length;
  const falls = [];

  // 收集传送门 entry -> exit 映射
  const portalMap = new Map();
  if (tiles) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const t = tiles[r][c];
      if (t && t.type === TILE.PORTAL_IN) portalMap.set(r + ',' + c, t.to);
    }
  }

  if (portalMap.size === 0) {
    // 快路径: 标准列重力
    for (let c = 0; c < cols; c++) {
      let writeRow = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r][c]) {
          if (r !== writeRow) {
            grid[writeRow][c] = grid[r][c];
            grid[r][c] = null;
            falls.push({ from: [r, c], to: [writeRow, c] });
          }
          writeRow--;
        }
      }
    }
    return falls;
  }

  // 慢路径: 单步迭代直到稳定
  let safety = 400;
  while (safety-- > 0) {
    let moved = false;
    // 自底向上扫描，每个棋子尝试 (1) 落入下方空格 (2) 进入传送门
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        const p = grid[r][c];
        if (!p) continue;
        // 入口在当前位置: 传送
        const key = r + ',' + c;
        if (portalMap.has(key)) {
          const [tr, tc] = portalMap.get(key);
          if (!grid[tr][tc]) {
            grid[tr][tc] = p; grid[r][c] = null;
            falls.push({ from: [r, c], to: [tr, tc], portal: true });
            moved = true;
            continue;
          }
        }
        // 普通下落
        if (r + 1 < rows && !grid[r + 1][c]) {
          grid[r + 1][c] = p; grid[r][c] = null;
          falls.push({ from: [r, c], to: [r + 1, c] });
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return falls;
}

// 在顶部填充新随机棋子，返回 [{at:[r,c], piece}]
export function refill(grid, palette = COLOR_IDS) {
  const rows = grid.length, cols = grid[0].length;
  const generated = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (!grid[r][c]) {
        const p = newPiece(choice(palette));
        grid[r][c] = p;
        generated.push({ at: [r, c], piece: p });
      }
    }
  }
  return generated;
}

// 找出至少一个可行交换
export function findValidMoves(grid) {
  const rows = grid.length, cols = grid[0].length;
  const moves = [];
  const isMovable = p => p && p.kind === KIND.PIECE;
  const trySwap = (r1, c1, r2, c2) => {
    if (!isMovable(grid[r1][c1]) || !isMovable(grid[r2][c2])) return false;
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    const has = findMatches(grid).groups.length > 0
      || (grid[r1][c1] && grid[r1][c1].special) || (grid[r2][c2] && grid[r2][c2].special);
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    return has;
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c + 1 < cols && trySwap(r, c, r, c + 1)) moves.push([[r, c], [r, c + 1]]);
    if (r + 1 < rows && trySwap(r, c, r + 1, c)) moves.push([[r, c], [r + 1, c]]);
  }
  return moves;
}

export function isMovable(p) {
  if (!p) return false;
  if (p.kind && p.kind !== KIND.PIECE) return false;
  if (p.frozen) return false;
  return true;
}

// 把 obstacles 配置注入到棋盘上
export function injectObstacles(grid, obstacles) {
  if (!obstacles) return;
  if (obstacles.crates) for (const [r, c, hp] of obstacles.crates) {
    if (inBoundsRC(grid, r, c)) grid[r][c] = newCrate(hp || 1);
  }
  if (obstacles.gifts) for (const [r, c] of obstacles.gifts) {
    if (inBoundsRC(grid, r, c)) grid[r][c] = newGift();
  }
  if (obstacles.princesses) for (const [r, c] of obstacles.princesses) {
    if (inBoundsRC(grid, r, c)) grid[r][c] = newPrincess();
  }
  if (obstacles.ice) for (const [r, c] of obstacles.ice) {
    if (inBoundsRC(grid, r, c) && grid[r][c]) grid[r][c].frozen = true;
  }
}

// 创建并注入果冻 tiles（与 grid 并存）
export function createTiles(rows = CONFIG.ROWS, cols = CONFIG.COLS) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}
export function injectTiles(tiles, cfg) {
  if (!cfg) return;
  if (cfg.jelly) for (const [r, c, hp] of cfg.jelly) {
    if (inBoundsRC(tiles, r, c)) tiles[r][c] = { type: TILE.JELLY, hp: hp || 1, maxHp: hp || 1 };
  }
  if (cfg.vine) for (const [r, c] of cfg.vine) {
    if (inBoundsRC(tiles, r, c)) tiles[r][c] = { type: TILE.VINE };
  }
  // 传送门: { portals: [{ from:[r,c], to:[r,c] }] }
  if (cfg.portals) for (const p of cfg.portals) {
    const [fr, fc] = p.from, [tr, tc] = p.to;
    if (inBoundsRC(tiles, fr, fc)) tiles[fr][fc] = { type: TILE.PORTAL_IN, to: [tr, tc] };
    if (inBoundsRC(tiles, tr, tc)) tiles[tr][tc] = { type: TILE.PORTAL_OUT, from: [fr, fc] };
  }
}

// 在 clearedCells 周边 / 自身上施加额外效果：木箱伤害 / 礼物盒打开 / 冰冻解除 / 果冻减血
export function processAdjacency(grid, tiles, clearedCells) {
  const crateDmg = new Map();
  const giftHits = new Map();
  const unfrozen = [];
  const tileBreaks = [];
  const tileDamages = [];

  const vineBreaksKeys = new Set();

  for (const cell of clearedCells) {
    const { r, c } = cell;
    // 自身格子上的 tile
    if (tiles && tiles[r] && tiles[r][c]) {
      const tl = tiles[r][c];
      if (tl.type === TILE.JELLY) {
        tl.hp -= 1;
        if (tl.hp <= 0) { tileBreaks.push({ r, c, tile: tl }); tiles[r][c] = null; }
        else tileDamages.push({ r, c, tile: tl });
      } else if (tl.type === TILE.VINE) {
        vineBreaksKeys.add(r + ',' + c);
      }
    }
    // 相邻格子上的障碍
    for (const [nr, nc] of neighbors(r, c)) {
      if (!inBoundsRC(grid, nr, nc)) continue;
      // 相邻藤蔓断裂
      if (tiles && tiles[nr] && tiles[nr][nc] && tiles[nr][nc].type === TILE.VINE) {
        vineBreaksKeys.add(nr + ',' + nc);
      }
      const np = grid[nr][nc];
      if (!np) continue;
      const key = nr + ',' + nc;
      if (np.kind === KIND.CRATE && !crateDmg.has(key)) crateDmg.set(key, np);
      else if (np.kind === KIND.GIFT && !giftHits.has(key)) giftHits.set(key, np);
      else if (np.frozen && !unfrozen.find(u => u.piece === np)) unfrozen.push({ r: nr, c: nc, piece: np });
    }
  }

  const vineBreaks = [];
  for (const key of vineBreaksKeys) {
    const [r, c] = key.split(',').map(Number);
    if (tiles[r][c]) {
      vineBreaks.push({ r, c, tile: tiles[r][c] });
      tiles[r][c] = null;
    }
  }

  const crateBreaks = [], crateDamages = [];
  for (const [key, cr] of crateDmg) {
    cr.hp -= 1;
    const [r, c] = key.split(',').map(Number);
    if (cr.hp <= 0) { grid[r][c] = null; crateBreaks.push({ r, c, piece: cr }); }
    else crateDamages.push({ r, c, piece: cr });
  }
  const giftBreaks = [];
  for (const [key, g] of giftHits) {
    const [r, c] = key.split(',').map(Number);
    grid[r][c] = null;
    giftBreaks.push({ r, c, piece: g });
  }
  for (const u of unfrozen) u.piece.frozen = false;

  return { crateBreaks, crateDamages, giftBreaks, unfrozen, tileBreaks, tileDamages, vineBreaks };
}

// 公主到达底层时"救出"：返回被救出的位置和对应 piece
export function rescueArrived(grid) {
  const rows = grid.length, cols = grid[0].length;
  const rescued = [];
  for (let c = 0; c < cols; c++) {
    const bottom = grid[rows - 1][c];
    if (bottom && bottom.kind === KIND.PRINCESS) {
      rescued.push({ r: rows - 1, c, piece: bottom });
      grid[rows - 1][c] = null;
    }
  }
  return rescued;
}

export function cloneGrid(grid) {
  return grid.map(row => row.map(p => p ? { ...p } : null));
}
