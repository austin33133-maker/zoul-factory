const userApi = require('../../api/user');
const userStore = require('../../store/user');
const { toast, loading, hideLoading } = require('../../utils/toast');

Page({
  data: { redirect: '', loading: false },

  onLoad(q) {
    this.setData({ redirect: q.redirect ? decodeURIComponent(q.redirect) : '' });
  },

  async wxLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    loading('登录中');
    try {
      const code = await new Promise((resolve, reject) =>
        wx.login({ success: r => resolve(r.code), fail: reject })
      );
      const { token, userInfo } = await userApi.login({ code, userInfo: { nickname: '微信用户' } });
      userStore.login({ token, userInfo });
      hideLoading();
      toast('登录成功', 'success');
      setTimeout(() => this.afterLogin(), 600);
    } catch (e) {
      hideLoading();
      toast('登录失败');
      this.setData({ loading: false });
    }
  },

  async getUserProfile() {
    try {
      const r = await new Promise((resolve, reject) =>
        wx.getUserProfile({ desc: '用于完善会员资料', success: resolve, fail: reject })
      );
      const cur = userStore.getState().userInfo || {};
      userStore.setUserInfo({ ...cur, nickname: r.userInfo.nickName, avatar: r.userInfo.avatarUrl });
      toast('已更新资料', 'success');
    } catch (e) {}
  },

  afterLogin() {
    if (this.data.redirect) {
      wx.redirectTo({ url: this.data.redirect, fail: () => wx.switchTab({ url: '/pages/home/index' }) });
    } else {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
    }
  }
});
