const { request } = require('./request');

module.exports = {
  banners: () => request({ url: '/banners' }),
  categories: () => request({ url: '/categories' }),
  recommend: () => request({ url: '/goods/recommend' }),
  list: params => request({ url: '/goods', data: params }),
  detail: id => request({ url: '/goods/' + id }),
  search: keyword => request({ url: '/goods/search', data: { keyword } })
};
