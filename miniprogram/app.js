const cartStore = require('./store/cart');
const userStore = require('./store/user');

App({
  globalData: {
    systemInfo: null
  },

  onLaunch() {
    try {
      this.globalData.systemInfo = wx.getSystemInfoSync();
    } catch (e) {}

    cartStore.hydrate();
    userStore.hydrate();
  }
});
