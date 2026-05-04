Component({
  properties: {
    value: { type: Number, value: 1 },
    min: { type: Number, value: 1 },
    max: { type: Number, value: 99 }
  },
  methods: {
    dec() {
      const v = Math.max(this.data.min, this.data.value - 1);
      if (v === this.data.value) return;
      this.triggerEvent('change', { value: v });
    },
    inc() {
      const v = Math.min(this.data.max, this.data.value + 1);
      if (v === this.data.value) return;
      this.triggerEvent('change', { value: v });
    }
  }
});
