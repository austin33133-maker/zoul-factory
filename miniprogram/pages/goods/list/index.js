const goodsApi = require('../../../api/goods');

Page({
  data: {
    list: [],
    loading: false,
    finished: false,
    page: 1,
    pageSize: 20,
    total: 0,
    sort: 'default',
    params: {}
  },

  onLoad(query) {
    const params = { ...query };
    if (query.keyword) wx.setNavigationBarTitle({ title: query.keyword });
    this.setData({ params });
    this.loadList(true);
  },

  async loadList(reset = false) {
    if (this.data.loading || (this.data.finished && !reset)) return;
    this.setData({ loading: true });
    const page = reset ? 1 : this.data.page;
    try {
      const res = await goodsApi.list({
        ...this.data.params,
        sort: this.data.sort,
        page,
        pageSize: this.data.pageSize
      });
      const list = reset ? res.list : this.data.list.concat(res.list);
      this.setData({
        list,
        page: page + 1,
        total: res.total,
        finished: list.length >= res.total,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  changeSort(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.sort) return;
    this.setData({ sort, finished: false, page: 1 });
    this.loadList(true);
  },

  onReachBottom() { this.loadList(); }
});
