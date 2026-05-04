Component({
  properties: {
    show: { type: Boolean, value: false },
    goods: { type: Object, value: null },
    mode: { type: String, value: 'cart' }
  },
  data: {
    selectedSpecs: {},
    matchedSku: null,
    count: 1
  },
  observers: {
    'show, goods': function (show, goods) {
      if (show && goods && goods.specs) {
        const initial = {};
        goods.specs.forEach(s => { initial[s.name] = s.values[0]; });
        this.setData({ selectedSpecs: initial, count: 1 });
        this.recompute(initial);
      }
    }
  },
  methods: {
    selectSpec(e) {
      const { name, value } = e.currentTarget.dataset;
      const next = { ...this.data.selectedSpecs, [name]: value };
      this.setData({ selectedSpecs: next });
      this.recompute(next);
    },
    recompute(specs) {
      const skus = (this.data.goods && this.data.goods.skus) || [];
      const matched = skus.find(sku =>
        Object.keys(sku.specs).every(k => sku.specs[k] === specs[k])
      ) || null;
      this.setData({ matchedSku: matched });
    },
    onCountChange(e) {
      this.setData({ count: e.detail.value });
    },
    close() {
      this.triggerEvent('close');
    },
    confirm(e) {
      const action = e.currentTarget.dataset.action || this.data.mode;
      if (!this.data.matchedSku) {
        wx.showToast({ title: '请选择规格', icon: 'none' });
        return;
      }
      this.triggerEvent('confirm', {
        action,
        sku: this.data.matchedSku,
        count: this.data.count
      });
    },
    noop() {}
  }
});
