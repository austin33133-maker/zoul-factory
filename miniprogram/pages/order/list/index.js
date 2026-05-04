const orderApi = require('../../../api/order');
const { confirm, toast } = require('../../../utils/toast');

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' }
];

Page({
  data: { tabs: TABS, status: 'all', list: [] },

  onLoad(q) {
    if (q.status) this.setData({ status: q.status });
  },

  onShow() { this.load(); },

  async load() {
    try {
      const list = await orderApi.list(this.data.status);
      this.setData({ list });
    } catch (e) {}
  },

  changeTab(e) {
    this.setData({ status: e.currentTarget.dataset.key });
    this.load();
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/order/detail/index?id=' + e.currentTarget.dataset.id });
  },

  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    if (!await confirm('确定取消该订单？')) return;
    await orderApi.cancel(id);
    toast('已取消', 'success');
    this.load();
  },

  payOrder(e) {
    wx.navigateTo({ url: '/pages/pay/index?id=' + e.currentTarget.dataset.id });
  },

  async confirmReceive(e) {
    const id = e.currentTarget.dataset.id;
    if (!await confirm('确认已收到货？')) return;
    await orderApi.confirm(id);
    toast('交易完成', 'success');
    this.load();
  }
});
