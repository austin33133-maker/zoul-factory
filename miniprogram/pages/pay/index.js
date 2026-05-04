const orderApi = require('../../api/order');
const { toast, loading, hideLoading, confirm } = require('../../utils/toast');

Page({
  data: { order: null, loading: true, paying: false },

  onLoad(q) {
    this.id = q.id;
    this.load();
  },

  async load() {
    try {
      const order = await orderApi.detail(this.id);
      this.setData({ order, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      toast('订单不存在');
    }
  },

  async pay() {
    if (this.data.paying) return;
    this.setData({ paying: true });
    loading('支付中');
    setTimeout(async () => {
      hideLoading();
      const ok = await confirm('模拟支付：选择「确定」表示支付成功，「取消」表示失败', '收银台');
      if (!ok) {
        this.setData({ paying: false });
        toast('支付失败');
        return;
      }
      try {
        await orderApi.pay(this.id);
        toast('支付成功', 'success');
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/order/detail/index?id=' + this.id });
        }, 800);
      } catch (e) {
        toast('支付失败');
        this.setData({ paying: false });
      }
    }, 800);
  },

  onCancel() {
    wx.redirectTo({ url: '/pages/order/list/index?status=pending_pay' });
  }
});
