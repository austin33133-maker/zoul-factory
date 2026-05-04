const userStore = require('../store/user');

function isLoggedIn() {
  return !!userStore.getState().token;
}

function requireLogin(redirectBack = true) {
  if (isLoggedIn()) return true;
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  const back = cur ? `/${cur.route}?${objectToQuery(cur.options || {})}` : '';
  wx.navigateTo({
    url: '/pages/login/index?redirect=' + encodeURIComponent(redirectBack ? back : '')
  });
  return false;
}

function objectToQuery(obj) {
  return Object.keys(obj)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

module.exports = { isLoggedIn, requireLogin };
