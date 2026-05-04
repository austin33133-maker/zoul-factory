const { request } = require('./request');

module.exports = {
  list: () => request({ url: '/addresses' }),
  save: data =>
    request({ url: data.id ? '/addresses/' + data.id : '/addresses', method: 'POST', data }),
  remove: id => request({ url: '/addresses/' + id, method: 'DELETE' }),
  setDefault: id => request({ url: '/addresses/' + id + '/default', method: 'POST' })
};
