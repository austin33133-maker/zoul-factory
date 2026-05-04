const cartStore = require('../../store/cart');
const { confirm, toast } = require('../../utils/toast');
const { requireLogin } = require('../../utils/auth');

Page({
  data: {
    items: [],
    allChecked: false,
    totalFen: 0,
    totalCount: 0
  },

  onLoad() {
    this.unsub = cartStore.subscribe(() => this.refresh());
    this.refresh();
  },
  onUnload() { this.unsub && this.unsub(); },
  onShow() { this.refresh(); },

  refresh() {
    const items = cartStore.getState().items;
    const allChecked = items.length > 0 && items.every(it => it.checked);
    const totalFen = cartStore.checkedTotal();
    const totalCount = cartStore.checkedItems().reduce((s, it) => s + it.count, 0);
    this.setData({ items, allChecked, totalFen, totalCount });
  },

  toggleItem(e) {
    const { gid, sid, checked } = e.currentTarget.dataset;
    cartStore.update(gid, sid, { checked: !checked });
  },

  toggleAll() {
    cartStore.setAllChecked(!this.data.allChecked);
  },

  onCountChange(e) {
    const { gid, sid } = e.currentTarget.dataset;
    cartStore.update(gid, sid, { count: e.detail.value });
  },

  async removeItem(e) {
    const { gid, sid } = e.currentTarget.dataset;
    const ok = await confirm('确定要删除该商品吗？');
    if (ok) cartStore.remove(gid, sid);
  },

  goCheckout() {
    const checked = cartStore.checkedItems();
    if (!checked.length) { toast('请选择要结算的商品'); return; }
    if (!requireLogin()) return;
    const items = encodeURIComponent(JSON.stringify(checked));
    wx.navigateTo({ url: '/pages/order/confirm/index?items=' + items });
  },

  goShopping() { wx.switchTab({ url: '/pages/home/index' }); }
});
