// DOM 模态层。所有模态都从 overlay 挂载，方便点击交互。

export function modal({ title, html, buttons }) {
  return new Promise(resolve => {
    const overlay = document.getElementById('dom-overlay');
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `
      <h2>${title || ''}</h2>
      <div class="body">${html || ''}</div>
      <div class="row" style="margin-top:18px"></div>
    `;
    bd.appendChild(m);
    const row = m.querySelector('.row');
    (buttons || [{ label: 'OK', value: 'ok' }]).forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.style || '');
      btn.textContent = b.label;
      btn.onclick = () => { bd.remove(); resolve(b.value); };
      row.appendChild(btn);
    });
    overlay.appendChild(bd);
  });
}

export function clearModals() {
  document.querySelectorAll('.modal-backdrop').forEach(n => n.remove());
}
