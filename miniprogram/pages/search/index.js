const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../config/index');

const HOT = ['T恤', '耳机', '面霜', '咖啡', '瑜伽垫', '手机', '床品'];

Page({
  data: { keyword: '', history: [], hot: HOT },

  onShow() {
    this.setData({ history: storage.get(STORAGE_KEYS.SEARCH_HISTORY, []) });
  },

  onInput(e) { this.setData({ keyword: e.detail.value }); },

  onConfirm() { this.search(this.data.keyword); },

  tapHistory(e) { this.search(e.currentTarget.dataset.kw); },

  search(kw) {
    const k = String(kw || '').trim();
    if (!k) return;
    const cur = storage.get(STORAGE_KEYS.SEARCH_HISTORY, []);
    const next = [k, ...cur.filter(x => x !== k)].slice(0, 10);
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, next);
    wx.navigateTo({ url: '/pages/goods/list/index?keyword=' + encodeURIComponent(k) });
  },

  clearHistory() {
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, []);
    this.setData({ history: [] });
  }
});
