const { request } = require('./request');

module.exports = {
  login: data => request({ url: '/user/login', method: 'POST', data }),
  profile: () => request({ url: '/user/profile' }),
  coupons: () => request({ url: '/user/coupons' }),
  favorites: () => request({ url: '/user/favorites' }),
  toggleFavorite: goodsId =>
    request({ url: '/user/favorites/toggle', method: 'POST', data: { goodsId } })
};
