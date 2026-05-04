const addressApi = require('../../../api/address');
const { confirm, toast } = require('../../../utils/toast');

Page({
  data: { list: [], picker: false },

  onLoad(query) { this.setData({ picker: !!query.picker }); },
  onShow() { this.load(); },

  async load() {
    try {
      const list = await addressApi.list();
      this.setData({ list });
    } catch (e) {}
  },

  goEdit(e) {
    const id = e.currentTarget.dataset.id || '';
    wx.navigateTo({ url: '/pages/address/edit/index?id=' + id });
  },

  pick(e) {
    if (!this.data.picker) return;
    const item = this.data.list[e.currentTarget.dataset.idx];
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.onAddressPicked) prev.onAddressPicked(item);
    wx.navigateBack();
  },

  async setDefault(e) {
    const id = e.currentTarget.dataset.id;
    await addressApi.setDefault(id);
    this.load();
    toast('已设为默认', 'success');
  },

  async remove(e) {
    const id = e.currentTarget.dataset.id;
    if (!await confirm('确定删除该地址？')) return;
    await addressApi.remove(id);
    this.load();
  }
});
