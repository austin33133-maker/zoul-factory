// 每日任务池。event 类型对应 GameEngine 派发的事件。
export const TASK_POOL = [
  { id: 't-win-1',     event: 'levelWin',  target: 1,   label: '通关 1 关',           reward: { coins: 100 } },
  { id: 't-win-3',     event: 'levelWin',  target: 3,   label: '通关 3 关',           reward: { coins: 250, lives: 1 } },
  { id: 't-combo-5',   event: 'combo',     target: 5,   label: '触发 5 次 Combo',     reward: { coins: 120 } },
  { id: 't-combo-15',  event: 'combo',     target: 15,  label: '触发 15 次 Combo',    reward: { coins: 300, booster: 'hammer', boosterN: 1 } },
  { id: 't-special-3', event: 'specialMade', target: 3, label: '制造 3 个特殊棋子',    reward: { coins: 150 } },
  { id: 't-crate-10',  event: 'crateBroken', target: 10, label: '砸开 10 个木箱',     reward: { coins: 200, booster: 'bomb', boosterN: 1 } },
  { id: 't-score',     event: 'score',     target: 15000, label: '单局得 15000 分',   reward: { coins: 220 } },
  { id: 't-stars',     event: 'starsEarned', target: 6, label: '本日累计获得 6 颗星', reward: { coins: 280, booster: 'swap', boosterN: 1 } },
  { id: 't-collect',   event: 'piecesCollected', target: 80, label: '消除 80 个水果', reward: { coins: 180 } }
];

// 战令奖励 10 级
export const BATTLE_TIERS = [
  { tier: 1,  reward: { coins: 100 } },
  { tier: 2,  reward: { booster: 'hammer', boosterN: 1 } },
  { tier: 3,  reward: { coins: 200 } },
  { tier: 4,  reward: { lives: 2 } },
  { tier: 5,  reward: { coins: 400 } },
  { tier: 6,  reward: { booster: 'bomb', boosterN: 2 } },
  { tier: 7,  reward: { coins: 500 } },
  { tier: 8,  reward: { booster: 'swap', boosterN: 2 } },
  { tier: 9,  reward: { coins: 800 } },
  { tier: 10, reward: { coins: 1500, lives: 5, booster: 'hammer', boosterN: 3 } }
];

// 每日轮盘 8 段
export const WHEEL_SEGMENTS = [
  { label: '50 🪙',   reward: { coins: 50 },                color: '#ffd84d' },
  { label: '+1 ❤️',   reward: { lives: 1 },                 color: '#ff5e3a' },
  { label: '锤×1',    reward: { booster: 'hammer', boosterN: 1 }, color: '#7be36b' },
  { label: '200 🪙',  reward: { coins: 200 },               color: '#5bc6ff' },
  { label: '炸×1',    reward: { booster: 'bomb', boosterN: 1 },   color: '#b06bff' },
  { label: '100 🪙',  reward: { coins: 100 },               color: '#ff8b3d' },
  { label: '换×1',    reward: { booster: 'swap', boosterN: 1 },   color: '#ffce5b' },
  { label: '500 🪙',  reward: { coins: 500 },               color: '#ff5470' }
];
