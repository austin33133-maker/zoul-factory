const { request } = require('./request');

module.exports = {
  create: data => request({ url: '/orders', method: 'POST', data }),
  list: status => request({ url: '/orders', data: { status } }),
  detail: id => request({ url: '/orders/' + id }),
  pay: id => request({ url: '/orders/' + id + '/pay', method: 'POST' }),
  cancel: id => request({ url: '/orders/' + id + '/cancel', method: 'POST' }),
  confirm: id => request({ url: '/orders/' + id + '/confirm', method: 'POST' })
};
