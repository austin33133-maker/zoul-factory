module.exports = {
  defaultUser: {
    id: 'u1',
    nickname: '小程序用户',
    avatar: 'https://picsum.photos/seed/avatar/200',
    level: 'VIP1',
    points: 1280,
    balance: 5800
  },
  coupons: [
    { id: 'cp1', name: '满 100 减 10', threshold: 10000, amount: 1000, expireAt: Date.now() + 1000 * 60 * 60 * 24 * 15, used: false },
    { id: 'cp2', name: '满 200 减 30', threshold: 20000, amount: 3000, expireAt: Date.now() + 1000 * 60 * 60 * 24 * 30, used: false },
    { id: 'cp3', name: '新人立减 5 元', threshold: 0, amount: 500, expireAt: Date.now() + 1000 * 60 * 60 * 24 * 5, used: false }
  ]
};
