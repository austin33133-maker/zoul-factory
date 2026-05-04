const userApi = require('../../api/user');
const { formatTime } = require('../../utils/format');

Page({
  data: { list: [] },
  onShow() { this.load(); },
  async load() {
    try {
      const list = await userApi.coupons();
      this.setData({
        list: list.map(c => ({
          ...c,
          thresholdYuan: c.threshold / 100,
          amountYuan: c.amount / 100,
          expireText: c.expireAt ? formatTime(c.expireAt) : '长期有效'
        }))
      });
    } catch (e) {}
  }
});
