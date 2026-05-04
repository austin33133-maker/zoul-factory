function get(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === undefined || v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {}
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {}
}

module.exports = { get, set, remove };
