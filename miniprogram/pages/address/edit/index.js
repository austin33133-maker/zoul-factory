const addressApi = require('../../../api/address');
const { toast } = require('../../../utils/toast');

Page({
  data: {
    form: { id: '', name: '', phone: '', detail: '', isDefault: false }
  },

  async onLoad(q) {
    if (q.id) {
      const list = await addressApi.list();
      const a = list.find(x => x.id === q.id);
      if (a) this.setData({ form: a });
      wx.setNavigationBarTitle({ title: '编辑地址' });
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' });
    }
  },

  setField(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  toggleDefault() {
    this.setData({ 'form.isDefault': !this.data.form.isDefault });
  },

  async save() {
    const f = this.data.form;
    if (!f.name) return toast('请填写姓名');
    if (!/^1\d{10}$/.test(f.phone)) return toast('请填写有效手机号');
    if (!f.detail) return toast('请填写详细地址');
    await addressApi.save(f);
    toast('已保存', 'success');
    setTimeout(() => wx.navigateBack(), 600);
  }
});
