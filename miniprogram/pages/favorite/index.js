const userApi = require('../../api/user');

Page({
  data: { list: [] },
  onShow() { this.load(); },
  async load() {
    try {
      const list = await userApi.favorites();
      this.setData({ list });
    } catch (e) {}
  }
});
