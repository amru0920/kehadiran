/* ===== PASANG SEBAGAI APP (PWA) =====
   Daftar service worker + butang "Pasang" pada bar atas dan skrin log masuk.
   Android/Chrome : guna prompt pemasangan rasmi.
   iPhone/Safari  : papar arahan Kongsi → Tambah ke Skrin Utama. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) return;                       // sudah dipasang — tak perlu butang

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let prompt = null, handler = null;

  /* butang kecil pada bar atas (selepas log masuk) */
  function headBtn() {
    const head = document.querySelector('.head-inner');
    if (!head || document.getElementById('btn-pasang')) return null;
    const b = document.createElement('button');
    b.id = 'btn-pasang';
    b.type = 'button';
    b.textContent = '⬇ Pasang';
    b.className = head.querySelector('.hbtn') ? 'hbtn' : 'logout';
    b.style.cssText = 'color:#2f5fe0;border-color:#2f5fe0;font-weight:700';
    const sp = head.querySelector('.sp');
    sp ? sp.after(b) : head.appendChild(b);
    return b;
  }
  /* butang lebar pada kad log masuk (sebelum log masuk) */
  function loginBtn() {
    const card = document.querySelector('#login-screen .auth-card');
    if (!card || document.getElementById('btn-pasang-lg')) return null;
    const b = document.createElement('button');
    b.id = 'btn-pasang-lg';
    b.type = 'button';
    b.textContent = '⬇ Pasang di skrin utama';
    b.style.cssText = 'width:100%;margin-top:12px;border:1px solid #d4ddf5;background:#eef3ff;color:#2f5fe0;font:inherit;font-weight:700;font-size:14px;padding:12px;border-radius:12px;cursor:pointer';
    card.appendChild(b);
    return b;
  }
  function mount() {
    [headBtn(), loginBtn()].forEach(b => { if (b) b.onclick = () => handler(b); });
  }

  function iosHint() {
    const w = document.createElement('div');
    w.style.cssText = 'position:fixed;inset:0;background:rgba(10,18,35,.55);z-index:80;display:grid;place-items:end center;padding:0 0 18px';
    w.innerHTML = `<div style="background:#fff;border-radius:18px;padding:20px;max-width:420px;width:calc(100% - 24px);box-shadow:0 12px 40px rgba(0,0,0,.3)">
      <div style="font-size:16px;font-weight:800;margin-bottom:6px;color:#1a2230">Pasang di skrin utama iPhone</div>
      <div style="font-size:13.5px;color:#6b7585;line-height:1.7">
        1. Tekan ikon <b>Kongsi</b> ⬆️ di bawah pelayar Safari<br>
        2. Skrol dan pilih <b>Add to Home Screen</b> / <b>Tambah ke Skrin Utama</b><br>
        3. Tekan <b>Add</b> — ikon sistem akan muncul di skrin utama
      </div>
      <button id="pw-ok" style="margin-top:16px;width:100%;border:0;border-radius:11px;padding:12px;background:#2f5fe0;color:#fff;font:inherit;font-weight:700;cursor:pointer">Faham</button>
    </div>`;
    w.onclick = e => { if (e.target === w || e.target.id === 'pw-ok') w.remove(); };
    document.body.appendChild(w);
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    prompt = e;
    handler = async b => {
      if (!prompt) return;
      b.disabled = true;
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      prompt = null;
      if (outcome === 'accepted') document.querySelectorAll('#btn-pasang,#btn-pasang-lg').forEach(x => x.remove());
      else b.disabled = false;
    };
    mount();
  });

  window.addEventListener('appinstalled', () =>
    document.querySelectorAll('#btn-pasang,#btn-pasang-lg').forEach(x => x.remove()));

  if (isIOS) {
    handler = iosHint;
    window.addEventListener('load', mount);
  }
})();
