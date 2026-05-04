Component({
  properties: {
    goods: { type: Object, value: {} },
    layout: { type: String, value: 'grid' }
  },
  methods: {
    onTap() {
      const id = this.data.goods && this.data.goods.id;
      if (!id) return;
      wx.navigateTo({ url: '/pages/goods/detail/index?id=' + id });
    }
  }
});
