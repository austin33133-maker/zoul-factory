const orderApi = require('../../../api/order');
const { confirm, toast } = require('../../../utils/toast');
const { formatTime } = require('../../../utils/format');

Page({
  data: { order: null, createdAtText: '', paidAtText: '' },

  onLoad(q) { this.id = q.id; },
  onShow() { this.load(); },

  async load() {
    try {
      const order = await orderApi.detail(this.id);
      this.setData({
        order,
        createdAtText: order.createdAt ? formatTime(order.createdAt) : '',
        paidAtText: order.paidAt ? formatTime(order.paidAt) : ''
      });
    } catch (e) { toast('订单不存在'); }
  },

  async cancelOrder() {
    if (!await confirm('确定取消该订单？')) return;
    await orderApi.cancel(this.id);
    toast('已取消', 'success');
    this.load();
  },
  payOrder() { wx.navigateTo({ url: '/pages/pay/index?id=' + this.id }); },
  async confirmReceive() {
    if (!await confirm('确认已收到货？')) return;
    await orderApi.confirm(this.id);
    toast('交易完成', 'success');
    this.load();
  },
  copyOid() {
    wx.setClipboardData({ data: this.id });
  }
});
