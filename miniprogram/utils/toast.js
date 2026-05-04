function toast(title, icon = 'none', duration = 1800) {
  wx.showToast({ title: String(title || ''), icon, duration, mask: true });
}

function loading(title = '加载中') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

function confirm(content, title = '提示') {
  return new Promise(resolve => {
    wx.showModal({
      title,
      content,
      success: r => resolve(!!r.confirm)
    });
  });
}

module.exports = { toast, loading, hideLoading, confirm };
