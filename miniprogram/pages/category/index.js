const goodsApi = require('../../api/goods');

Page({
  data: {
    categories: [],
    activeId: '',
    loading: true
  },

  onLoad() {
    this.loadCategories();
  },

  async loadCategories() {
    try {
      const list = await goodsApi.categories();
      this.setData({ categories: list, activeId: list[0] && list[0].id, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  selectCat(e) {
    this.setData({ activeId: e.currentTarget.dataset.id });
  },

  goSub(e) {
    const { cid, sid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/goods/list/index?categoryId=${cid}&subCategoryId=${sid}` });
  },

  goAll(e) {
    wx.navigateTo({ url: '/pages/goods/list/index?categoryId=' + e.currentTarget.dataset.cid });
  }
});
