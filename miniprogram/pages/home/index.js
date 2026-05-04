const goodsApi = require('../../api/goods');
const cartStore = require('../../store/cart');

Page({
  data: {
    banners: [],
    categories: [],
    recommend: [],
    cartCount: 0,
    loading: true
  },

  onLoad() {
    this.unsub = cartStore.subscribe(() => this.setData({ cartCount: cartStore.totalCount() }));
    this.setData({ cartCount: cartStore.totalCount() });
    this.loadAll();
  },

  onUnload() { this.unsub && this.unsub(); },

  onShow() { this.setData({ cartCount: cartStore.totalCount() }); },

  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh());
  },

  async loadAll() {
    this.setData({ loading: true });
    try {
      const [banners, categories, recommend] = await Promise.all([
        goodsApi.banners(),
        goodsApi.categories(),
        goodsApi.recommend()
      ]);
      this.setData({ banners, categories: categories.slice(0, 8), recommend, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goSearch() { wx.navigateTo({ url: '/pages/search/index' }); },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/goods/list/index?categoryId=' + id });
  },

  onBannerTap(e) {
    const goodsId = e.currentTarget.dataset.gid;
    if (goodsId) wx.navigateTo({ url: '/pages/goods/detail/index?id=' + goodsId });
  }
});
