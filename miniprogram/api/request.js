const config = require('../config/index');
const userStore = require('../store/user');
const mockHandler = require('../mock/index');

function request({ url, method = 'GET', data, header }) {
  const token = userStore.getState().token;
  const finalHeader = {
    'content-type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(header || {})
  };

  if (config.USE_MOCK) {
    return mockHandler({ url, method, data, header: finalHeader }).then(payload => {
      if (payload && payload.code === 0) return payload.data;
      const err = new Error((payload && payload.message) || 'mock error');
      err.payload = payload;
      throw err;
    });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: config.BASE_URL + url,
      method,
      data,
      header: finalHeader,
      timeout: config.REQUEST_TIMEOUT,
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (res.data && res.data.code === 0) resolve(res.data.data);
          else reject(new Error((res.data && res.data.message) || '请求失败'));
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: err => reject(err)
    });
  });
}

module.exports = { request };
