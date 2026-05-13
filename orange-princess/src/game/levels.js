// 关卡设计。橙子公主世界观：每关救出一只被囚禁的小公主，目标围绕"橙子"展开。
// objective.type:
//   'collectColor' - 收集 N 个指定颜色
//   'score'        - 达到目标分数
//   'crates'       - 清掉 N 个木箱（占位：以 cracked 出现在棋盘）

export const LEVELS = [
  {
    id: 1,
    name: '橙园初醒',
    story: '橙子公主在橙园里醒来，先帮她摘 20 颗橙子。',
    moves: 22,
    objective: { type: 'collectColor', color: 'orange', amount: 20 },
    starThresholds: [2000, 4500, 7500],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 2,
    name: '果园丰收',
    story: '今天的果园特别热闹，多收一些橙子和苹果。',
    moves: 24,
    objective: { type: 'collectColor', color: 'orange', amount: 30 },
    starThresholds: [3000, 6000, 9000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 3,
    name: '风暴预兆',
    story: '阴云笼罩果园，必须快速积累能量保护公主。',
    moves: 20,
    objective: { type: 'score', amount: 8000 },
    starThresholds: [8000, 12000, 16000],
    palette: ['orange', 'red', 'yellow', 'blue', 'purple']
  },
  {
    id: 4,
    name: '蓝梅秘境',
    story: '蓝梅森林深处的小公主需要 25 颗蓝梅来开启传送门。',
    moves: 22,
    objective: { type: 'collectColor', color: 'blue', amount: 25 },
    starThresholds: [3500, 6500, 10000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 5,
    name: '葡萄塔',
    story: '紫塔顶端的葡萄公主等着我们。',
    moves: 23,
    objective: { type: 'collectColor', color: 'purple', amount: 28 },
    starThresholds: [4000, 7000, 10000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 6,
    name: '草莓战车',
    story: '草莓骑士冲过来了！收集草莓守住阵地。',
    moves: 25,
    objective: { type: 'collectColor', color: 'red', amount: 32 },
    starThresholds: [4500, 7500, 11000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 7,
    name: '夜半积分',
    story: '比赛环节，看你能拿到多少分。',
    moves: 18,
    objective: { type: 'score', amount: 12000 },
    starThresholds: [12000, 18000, 25000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 8,
    name: '柠檬果汁',
    story: '为公主榨一杯柠檬汁，需要 30 颗柠檬。',
    moves: 22,
    objective: { type: 'collectColor', color: 'yellow', amount: 30 },
    starThresholds: [4500, 8000, 12000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 9,
    name: '青苹果之径',
    story: '通往城堡的路用青苹果铺成。',
    moves: 24,
    objective: { type: 'collectColor', color: 'green', amount: 28 },
    starThresholds: [5000, 8500, 12000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 10,
    name: '橙王冠',
    story: '抵达橙王冠之巅，收集 40 颗橙子加冕。',
    moves: 26,
    objective: { type: 'collectColor', color: 'orange', amount: 40 },
    starThresholds: [6000, 10000, 15000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 11,
    name: '木箱关：果园仓库',
    story: '邪恶贵族把果实锁在木箱里！砸开 8 个木箱。',
    moves: 22,
    objective: { type: 'crates', amount: 8 },
    starThresholds: [3000, 6000, 9000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { crates: [[3,2,1],[3,3,1],[3,5,1],[3,6,1],[5,2,1],[5,3,1],[5,5,1],[5,6,1]] }
  },
  {
    id: 12,
    name: '木箱关：双层壁垒',
    story: '坚固木箱挡道（需要打 2 下）。',
    moves: 24,
    objective: { type: 'crates', amount: 10 },
    starThresholds: [4000, 7000, 10000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { crates: [[2,3,2],[2,4,2],[2,5,2],[4,3,1],[4,4,1],[4,5,1],[6,3,2],[6,4,2],[6,5,2],[7,4,1]] }
  },
  {
    id: 13,
    name: '风暴中的橙子塔',
    story: '快速积分守住塔楼，并清除木箱。',
    moves: 22,
    objective: { type: 'crates', amount: 12 },
    starThresholds: [5000, 8500, 13000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { crates: [[1,0,1],[1,1,1],[1,2,1],[1,6,1],[1,7,1],[1,8,1],[7,0,1],[7,1,1],[7,2,1],[7,6,1],[7,7,1],[7,8,1]] }
  },
  {
    id: 14,
    name: '彩色钥匙',
    story: '同时收集多色钥匙才能开门。',
    moves: 28,
    objective: { type: 'multiColor', items: [
      { color: 'red', amount: 15 },
      { color: 'blue', amount: 15 },
      { color: 'yellow', amount: 15 }
    ]},
    starThresholds: [5500, 9000, 13000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple']
  },
  {
    id: 15,
    name: '王座大厅',
    story: '终极一战！破障+收集双目标。',
    moves: 30,
    objective: { type: 'crates', amount: 14 },
    starThresholds: [7000, 12000, 18000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { crates: [[2,2,1],[2,3,1],[2,5,1],[2,6,1],[3,4,2],[4,2,2],[4,6,2],[5,4,2],[6,2,1],[6,3,1],[6,5,1],[6,6,1],[7,3,1],[7,5,1]] }
  },
  {
    id: 16,
    name: '果冻奶昔',
    story: '果冻铺满地板！消除棋子来融化所有果冻。',
    moves: 24,
    objective: { type: 'jelly', amount: 25 },
    starThresholds: [4500, 8000, 12000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    tiles: { jelly: [
      [2,2,1],[2,3,1],[2,4,1],[2,5,1],[2,6,1],
      [3,2,1],[3,3,1],[3,4,1],[3,5,1],[3,6,1],
      [5,2,1],[5,3,1],[5,4,1],[5,5,1],[5,6,1],
      [6,2,1],[6,3,1],[6,4,1],[6,5,1],[6,6,1],
      [4,0,1],[4,1,1],[4,7,1],[4,8,1],[7,4,1]
    ]}
  },
  {
    id: 17,
    name: '双层果冻',
    story: '更顽固的双层果冻，要打两次才消失。',
    moves: 26,
    objective: { type: 'jelly', amount: 18 },
    starThresholds: [5000, 8500, 13000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    tiles: { jelly: [
      [3,3,2],[3,4,2],[3,5,2],
      [4,3,2],[4,4,2],[4,5,2],
      [5,3,2],[5,4,2],[5,5,2],
      [2,4,1],[6,4,1],[4,2,1],[4,6,1]
    ]}
  },
  {
    id: 18,
    name: '冰封山谷',
    story: '邪恶法师把水果都冻住了！消除冰块边的水果让它们解冻。',
    moves: 28,
    objective: { type: 'multiColor', items: [
      { color: 'blue', amount: 18 },
      { color: 'purple', amount: 18 }
    ]},
    starThresholds: [5500, 9500, 14000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { ice: [
      [3,2],[3,3],[3,5],[3,6],
      [4,2],[4,3],[4,5],[4,6],
      [5,2],[5,3],[5,5],[5,6]
    ]}
  },
  {
    id: 19,
    name: '礼物盒派对',
    story: '邻居们送来好多礼物！砸开礼物盒掉落随机道具。',
    moves: 22,
    objective: { type: 'collectColor', color: 'orange', amount: 22 },
    starThresholds: [4500, 7500, 11000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { gifts: [[1,2],[1,6],[3,4],[5,2],[5,6],[7,4]] }
  },
  {
    id: 20,
    name: '救出小公主',
    story: '楼顶的小公主被困住了！把她从顶端护送到底端。需要救 3 位。',
    moves: 26,
    objective: { type: 'savePrincess', amount: 3 },
    starThresholds: [4000, 8000, 12000],
    palette: ['orange', 'red', 'yellow', 'green', 'blue', 'purple'],
    obstacles: { princesses: [[0,4]] }
  }
];

export function getLevel(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

export function totalLevels() { return LEVELS.length; }
