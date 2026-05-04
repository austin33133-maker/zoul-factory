const orderApi = require('../../../api/order');
const addressApi = require('../../../api/address');
const userApi = require('../../../api/user');
const cartStore = require('../../../store/cart');
const { toast, loading, hideLoading } = require('../../../utils/toast');

Page({
  data: {
    items: [],
    address: null,
    coupons: [],
    selectedCouponId: '',
    discount: 0,
    freight: 0,
    goodsTotal: 0,
    payAmount: 0,
    remark: ''
  },

  onLoad(query) {
    try {
      this.items = JSON.parse(decodeURIComponent(query.items || '[]'));
    } catch (e) {
      this.items = [];
    }
    this.setData({ items: this.items });
    this.recalc();
  },

  onShow() {
    this.loadAddress();
    this.loadCoupons();
  },

  async loadAddress() {
    try {
      const list = await addressApi.list();
      const def = list.find(a => a.isDefault) || list[0] || null;
      this.setData({ address: def });
    } catch (e) {}
  },

  async loadCoupons() {
    try {
      const coupons = await userApi.coupons();
      this.setData({ coupons: coupons.filter(c => !c.used) });
    } catch (e) {}
  },

  recalc() {
    const goodsTotal = this.data.items.reduce((s, it) => s + it.price * it.count, 0);
    const freight = goodsTotal >= 9900 ? 0 : 600;
    const coupon = this.data.coupons.find(c => c.id === this.data.selectedCouponId);
    let discount = 0;
    if (coupon && goodsTotal >= coupon.threshold) discount = coupon.amount;
    const payAmount = Math.max(0, goodsTotal + freight - discount);
    this.setData({ goodsTotal, freight, discount, payAmount });
  },

  selectAddress() {
    wx.navigateTo({ url: '/pages/address/list/index?picker=1' });
  },

  pickCoupon() {
    const list = this.data.coupons;
    if (!list.length) { toast('暂无可用优惠券'); return; }
    wx.showActionSheet({
      itemList: ['不使用优惠券', ...list.map(c => `${c.name}（满 ${c.threshold/100} 减 ${c.amount/100}）`)],
      success: r => {
        const idx = r.tapIndex - 1;
        const id = idx < 0 ? '' : list[idx].id;
        this.setData({ selectedCouponId: id });
        this.recalc();
      }
    });
  },

  onRemark(e) { this.setData({ remark: e.detail.value }); },

  async submit() {
    if (!this.data.address) { toast('请选择收货地址'); return; }
    if (!this.data.items.length) { toast('订单中没有商品'); return; }
    loading('提交中');
    try {
      const order = await orderApi.create({
        items: this.data.items,
        address: this.data.address,
        payAmount: this.data.payAmount,
        freight: this.data.freight,
        discount: this.data.discount,
        couponId: this.data.selectedCouponId,
        remark: this.data.remark
      });
      // 从购物车移除已下单商品
      cartStore.removeMany(this.data.items.map(it => ({ goodsId: it.goodsId, skuId: it.skuId })));
      hideLoading();
      wx.redirectTo({ url: '/pages/pay/index?id=' + order.id });
    } catch (e) {
      hideLoading();
      toast('提交失败：' + e.message);
    }
  },

  onAddressPicked(addr) {
    this.setData({ address: addr });
  }
});
