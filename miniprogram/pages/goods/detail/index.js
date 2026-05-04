const goodsApi = require('../../../api/goods');
const userApi = require('../../../api/user');
const cartStore = require('../../../store/cart');
const { toast } = require('../../../utils/toast');
const { fenToYuan } = require('../../../utils/format');

Page({
  data: {
    goods: null,
    loading: true,
    skuShow: false,
    skuMode: 'cart',
    favorited: false,
    cartCount: 0
  },

  onLoad(query) {
    this.id = query.id;
    this.unsub = cartStore.subscribe(() => this.setData({ cartCount: cartStore.totalCount() }));
    this.setData({ cartCount: cartStore.totalCount() });
    this.loadDetail();
    this.loadFavorited();
  },
  onUnload() { this.unsub && this.unsub(); },

  async loadDetail() {
    try {
      const goods = await goodsApi.detail(this.id);
      this.setData({ goods, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      toast('加载失败');
    }
  },

  async loadFavorited() {
    try {
      const list = await userApi.favorites();
      const favorited = list.some(g => g.id === this.id);
      this.setData({ favorited });
    } catch (e) {}
  },

  openSku(e) {
    const action = e.currentTarget.dataset.action || 'cart';
    this.setData({ skuShow: true, skuMode: action === 'both' ? 'both' : action });
  },
  closeSku() { this.setData({ skuShow: false }); },

  onSkuConfirm(e) {
    const { action, sku, count } = e.detail;
    const goods = this.data.goods;
    const item = {
      goodsId: goods.id,
      skuId: sku.id,
      title: goods.title,
      cover: goods.cover,
      price: sku.price,
      specText: sku.specText,
      count
    };
    if (action === 'cart') {
      cartStore.add(item);
      toast('已加入购物车', 'success');
      this.setData({ skuShow: false });
    } else if (action === 'buy') {
      this.setData({ skuShow: false });
      const checkoutItems = encodeURIComponent(JSON.stringify([{ ...item, checked: true }]));
      wx.navigateTo({ url: '/pages/order/confirm/index?items=' + checkoutItems });
    }
  },

  async toggleFav() {
    try {
      const r = await userApi.toggleFavorite(this.id);
      this.setData({ favorited: r.favorited });
      toast(r.favorited ? '已收藏' : '已取消收藏', 'success');
    } catch (e) { toast('操作失败'); }
  },

  goCart() { wx.switchTab({ url: '/pages/cart/index' }); },
  goHome() { wx.switchTab({ url: '/pages/home/index' }); },

  previewImg(e) {
    wx.previewImage({ urls: this.data.goods.images, current: e.currentTarget.dataset.url });
  }
});
