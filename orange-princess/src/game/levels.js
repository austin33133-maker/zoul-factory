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
  }
];

export function getLevel(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

export function totalLevels() { return LEVELS.length; }
