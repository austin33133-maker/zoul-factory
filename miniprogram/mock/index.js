const banners = require('./banners');
const goods = require('./goods');
const orders = require('./orders');
const userMock = require('./user');
const storage = require('../utils/storage');
const { STORAGE_KEYS } = require('../config/index');

function ok(data) { return Promise.resolve({ code: 0, data, message: 'ok' }); }
function fail(message) { return Promise.resolve({ code: -1, data: null, message }); }

function delay(p, ms = 200) {
  return new Promise(resolve => setTimeout(() => p.then(resolve), ms));
}

function matchPath(url, pattern) {
  const u = url.split('?')[0];
  if (pattern.indexOf(':') < 0) return u === pattern ? {} : null;
  const us = u.split('/');
  const ps = pattern.split('/');
  if (us.length !== ps.length) return null;
  const params = {};
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(':')) params[ps[i].slice(1)] = us[i];
    else if (ps[i] !== us[i]) return null;
  }
  return params;
}

function handle({ url, method, data }) {
  // banners
  if (matchPath(url, '/banners')) return ok(banners);

  // categories
  if (matchPath(url, '/categories')) {
    return ok(goods.CATEGORIES.map(c => ({ ...c, children: goods.SUB_CATEGORIES[c.id] || [] })));
  }

  // goods recommend
  if (matchPath(url, '/goods/recommend')) return ok(goods.recommend());

  // goods search
  if (matchPath(url, '/goods/search')) return ok(goods.list({ keyword: data && data.keyword }).list);

  // goods list
  if (matchPath(url, '/goods')) return ok(goods.list(data || {}));

  // goods detail
  let m = matchPath(url, '/goods/:id');
  if (m) {
    const g = goods.detail(m.id);
    return g ? ok(g) : fail('商品不存在');
  }

  // user login
  if (matchPath(url, '/user/login')) {
    const token = 'mock-token-' + Date.now();
    return ok({ token, userInfo: { ...userMock.defaultUser, ...(data && data.userInfo ? data.userInfo : {}) } });
  }

  // user profile
  if (matchPath(url, '/user/profile')) return ok(userMock.defaultUser);

  // user coupons
  if (matchPath(url, '/user/coupons')) return ok(userMock.coupons);

  // user favorites
  if (matchPath(url, '/user/favorites')) {
    const ids = storage.get(STORAGE_KEYS.FAVORITES, []);
    return ok(ids.map(id => goods.detail(id)).filter(Boolean));
  }
  if (matchPath(url, '/user/favorites/toggle')) {
    const ids = storage.get(STORAGE_KEYS.FAVORITES, []);
    const goodsId = data && data.goodsId;
    const idx = ids.indexOf(goodsId);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(goodsId);
    storage.set(STORAGE_KEYS.FAVORITES, ids);
    return ok({ favorited: idx < 0 });
  }

  // addresses
  if (matchPath(url, '/addresses') && method === 'GET') {
    return ok(storage.get(STORAGE_KEYS.ADDRESS_LIST, []));
  }
  if (matchPath(url, '/addresses') && method === 'POST') {
    const list = storage.get(STORAGE_KEYS.ADDRESS_LIST, []);
    const newOne = { ...data, id: 'a' + Date.now() };
    if (newOne.isDefault) list.forEach(a => (a.isDefault = false));
    list.push(newOne);
    storage.set(STORAGE_KEYS.ADDRESS_LIST, list);
    return ok(newOne);
  }
  m = matchPath(url, '/addresses/:id');
  if (m && method === 'POST') {
    const list = storage.get(STORAGE_KEYS.ADDRESS_LIST, []);
    const idx = list.findIndex(a => a.id === m.id);
    if (idx < 0) return fail('地址不存在');
    if (data.isDefault) list.forEach(a => (a.isDefault = false));
    list[idx] = { ...list[idx], ...data, id: m.id };
    storage.set(STORAGE_KEYS.ADDRESS_LIST, list);
    return ok(list[idx]);
  }
  if (m && method === 'DELETE') {
    const list = storage.get(STORAGE_KEYS.ADDRESS_LIST, []).filter(a => a.id !== m.id);
    storage.set(STORAGE_KEYS.ADDRESS_LIST, list);
    return ok(true);
  }
  m = matchPath(url, '/addresses/:id/default');
  if (m) {
    const list = storage.get(STORAGE_KEYS.ADDRESS_LIST, []).map(a => ({ ...a, isDefault: a.id === m.id }));
    storage.set(STORAGE_KEYS.ADDRESS_LIST, list);
    return ok(true);
  }

  // orders
  if (matchPath(url, '/orders') && method === 'GET') {
    orders.ensure();
    let list = orders.load();
    const status = data && data.status;
    if (status && status !== 'all') list = list.filter(o => o.status === status);
    return ok(list.sort((a, b) => b.createdAt - a.createdAt));
  }
  if (matchPath(url, '/orders') && method === 'POST') {
    orders.ensure();
    const list = orders.load();
    const id = 'o' + Date.now();
    const newOrder = {
      id,
      status: 'pending_pay',
      statusText: '待付款',
      createdAt: Date.now(),
      paidAt: null,
      items: data.items,
      address: data.address,
      payAmount: data.payAmount,
      freight: data.freight || 0,
      remark: data.remark || '',
      couponId: data.couponId || null,
      discount: data.discount || 0
    };
    list.unshift(newOrder);
    orders.save(list);
    return ok(newOrder);
  }
  m = matchPath(url, '/orders/:id');
  if (m && method === 'GET') {
    orders.ensure();
    const o = orders.load().find(it => it.id === m.id);
    return o ? ok(o) : fail('订单不存在');
  }
  m = matchPath(url, '/orders/:id/pay');
  if (m) {
    const list = orders.load();
    const idx = list.findIndex(it => it.id === m.id);
    if (idx < 0) return fail('订单不存在');
    list[idx] = { ...list[idx], status: 'paid', statusText: '待发货', paidAt: Date.now() };
    orders.save(list);
    return ok(list[idx]);
  }
  m = matchPath(url, '/orders/:id/cancel');
  if (m) {
    const list = orders.load();
    const idx = list.findIndex(it => it.id === m.id);
    if (idx < 0) return fail('订单不存在');
    list[idx] = { ...list[idx], status: 'cancelled', statusText: '已取消' };
    orders.save(list);
    return ok(list[idx]);
  }
  m = matchPath(url, '/orders/:id/confirm');
  if (m) {
    const list = orders.load();
    const idx = list.findIndex(it => it.id === m.id);
    if (idx < 0) return fail('订单不存在');
    list[idx] = { ...list[idx], status: 'completed', statusText: '已完成' };
    orders.save(list);
    return ok(list[idx]);
  }

  return fail('mock: 未匹配的接口 ' + url);
}

module.exports = function (req) {
  return delay(handle(req), 150);
};
