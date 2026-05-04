const { createStore } = require('./index');
const storage = require('../utils/storage');
const { STORAGE_KEYS } = require('../config/index');

const store = createStore({ items: [] });

function hydrate() {
  const items = storage.get(STORAGE_KEYS.CART, []);
  store.setState({ items: Array.isArray(items) ? items : [] });
}

function persist() {
  storage.set(STORAGE_KEYS.CART, store.getState().items);
}

function add(item) {
  const items = store.getState().items.slice();
  const idx = items.findIndex(it => it.goodsId === item.goodsId && it.skuId === item.skuId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], count: items[idx].count + (item.count || 1) };
  } else {
    items.push({
      goodsId: item.goodsId,
      skuId: item.skuId,
      title: item.title,
      cover: item.cover,
      price: item.price,
      specText: item.specText || '',
      count: item.count || 1,
      checked: true
    });
  }
  store.setState({ items });
  persist();
}

function update(goodsId, skuId, patch) {
  const items = store.getState().items.map(it =>
    it.goodsId === goodsId && it.skuId === skuId ? { ...it, ...patch } : it
  );
  store.setState({ items });
  persist();
}

function remove(goodsId, skuId) {
  const items = store.getState().items.filter(
    it => !(it.goodsId === goodsId && it.skuId === skuId)
  );
  store.setState({ items });
  persist();
}

function removeMany(keys) {
  const set = new Set(keys.map(k => k.goodsId + '|' + k.skuId));
  const items = store.getState().items.filter(it => !set.has(it.goodsId + '|' + it.skuId));
  store.setState({ items });
  persist();
}

function clear() {
  store.setState({ items: [] });
  persist();
}

function setAllChecked(checked) {
  const items = store.getState().items.map(it => ({ ...it, checked }));
  store.setState({ items });
  persist();
}

function totalCount() {
  return store.getState().items.reduce((s, it) => s + it.count, 0);
}

function checkedItems() {
  return store.getState().items.filter(it => it.checked);
}

function checkedTotal() {
  return checkedItems().reduce((s, it) => s + it.price * it.count, 0);
}

module.exports = {
  ...store,
  hydrate,
  add,
  update,
  remove,
  removeMany,
  clear,
  setAllChecked,
  totalCount,
  checkedItems,
  checkedTotal
};
