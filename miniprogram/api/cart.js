const cartStore = require('../store/cart');

module.exports = {
  list: () => Promise.resolve(cartStore.getState().items),
  add: item => { cartStore.add(item); return Promise.resolve(true); },
  update: (goodsId, skuId, patch) => { cartStore.update(goodsId, skuId, patch); return Promise.resolve(true); },
  remove: (goodsId, skuId) => { cartStore.remove(goodsId, skuId); return Promise.resolve(true); },
  clear: () => { cartStore.clear(); return Promise.resolve(true); }
};
