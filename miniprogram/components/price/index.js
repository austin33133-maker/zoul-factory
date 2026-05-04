const { fenToYuan } = require('../../utils/format');

Component({
  properties: {
    value: { type: null, value: 0 },
    size: { type: String, value: 'md' },
    showSymbol: { type: Boolean, value: true }
  },
  data: { intPart: '0', decPart: '00' },
  observers: {
    'value': function (v) {
      const yuan = fenToYuan(v);
      const [i, d] = yuan.split('.');
      this.setData({ intPart: i, decPart: d });
    }
  }
});
