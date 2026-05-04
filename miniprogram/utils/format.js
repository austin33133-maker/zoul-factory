function fenToYuan(fen) {
  if (fen == null || isNaN(fen)) return '0.00';
  return (Number(fen) / 100).toFixed(2);
}

function yuanToFen(yuan) {
  return Math.round(Number(yuan) * 100);
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 11) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

module.exports = { fenToYuan, yuanToFen, formatTime, maskPhone };
