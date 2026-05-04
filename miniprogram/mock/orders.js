const storage = require('../utils/storage');
const { STORAGE_KEYS } = require('../config/index');
const goodsMock = require('./goods');

const PRESET = [
  {
    id: 'o20240501001',
    status: 'shipped',
    statusText: '待收货',
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    paidAt: Date.now() - 1000 * 60 * 60 * 24,
    items: [
      { goodsId: 'g101', skuId: 'g101-00', title: goodsMock.GOODS[0].title, cover: goodsMock.GOODS[0].cover, specText: '黑色 / 标准款', price: goodsMock.GOODS[0].price, count: 1 }
    ],
    address: { name: '张三', phone: '13800138000', detail: '北京市海淀区中关村大街 1 号' },
    expressNo: 'SF1234567890',
    expressCompany: '顺丰速运',
    payAmount: goodsMock.GOODS[0].price,
    freight: 0
  },
  {
    id: 'o20240425002',
    status: 'completed',
    statusText: '已完成',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    paidAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    items: [
      { goodsId: 'g205', skuId: 'g205-10', title: goodsMock.GOODS[10].title, cover: goodsMock.GOODS[10].cover, specText: '白色 / 加大款', price: goodsMock.GOODS[10].price, count: 2 }
    ],
    address: { name: '张三', phone: '13800138000', detail: '北京市海淀区中关村大街 1 号' },
    expressNo: 'YT9876543210',
    expressCompany: '圆通速递',
    payAmount: goodsMock.GOODS[10].price * 2,
    freight: 0
  }
];

function load() {
  return storage.get(STORAGE_KEYS.ORDERS, PRESET);
}

function save(list) {
  storage.set(STORAGE_KEYS.ORDERS, list);
}

function ensure() {
  const cur = storage.get(STORAGE_KEYS.ORDERS, null);
  if (!cur) save(PRESET);
}

module.exports = { load, save, ensure, PRESET };
