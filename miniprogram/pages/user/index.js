const userStore = require('../../store/user');
const { confirm } = require('../../utils/toast');

const ORDER_TABS = [
  { key: 'pending_pay', label: '待付款', icon: '💴' },
  { key: 'paid', label: '待发货', icon: '📦' },
  { key: 'shipped', label: '待收货', icon: '🚚' },
  { key: 'completed', label: '已完成', icon: '✅' }
];

const TOOL_LIST = [
  { key: 'address', label: '收货地址', icon: '📍', url: '/pages/address/list/index' },
  { key: 'coupon', label: '优惠券', icon: '🎟️', url: '/pages/coupon/index' },
  { key: 'favorite', label: '我的收藏', icon: '❤️', url: '/pages/favorite/index' },
  { key: 'service', label: '客服中心', icon: '💬' }
];

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    orderTabs: ORDER_TABS,
    tools: TOOL_LIST
  },

  onLoad() {
    this.unsub = userStore.subscribe(s => this.setData({ userInfo: s.userInfo, isLoggedIn: !!s.token }));
    const s = userStore.getState();
    this.setData({ userInfo: s.userInfo, isLoggedIn: !!s.token });
  },
  onUnload() { this.unsub && this.unsub(); },
  onShow() {
    const s = userStore.getState();
    this.setData({ userInfo: s.userInfo, isLoggedIn: !!s.token });
  },

  goLogin() { wx.navigateTo({ url: '/pages/login/index' }); },

  goAllOrders() { wx.navigateTo({ url: '/pages/order/list/index' }); },
  goOrderTab(e) { wx.navigateTo({ url: '/pages/order/list/index?status=' + e.currentTarget.dataset.key }); },

  goTool(e) {
    const key = e.currentTarget.dataset.key;
    const item = TOOL_LIST.find(t => t.key === key);
    if (key === 'service') return wx.showModal({ title: '客服', content: '客服热线 400-000-0000\n服务时间 9:00-22:00', showCancel: false });
    if (item && item.url) wx.navigateTo({ url: item.url });
  },

  async logout() {
    if (!await confirm('确定退出登录？')) return;
    userStore.logout();
  }
});
