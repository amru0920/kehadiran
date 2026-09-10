/* ===== Service Worker — Sistem Kehadiran SMK Batu Maung =====
   Tujuan: aplikasi boleh dipasang sebagai ikon di skrin utama telefon.
   Strategi:
     - fail app sendiri  : network-first (sentiasa dapat versi terbaru; guna cache bila tiada talian)
     - pustaka CDN & font: cache-first (versi tetap, jimat data)
     - API Supabase      : TIDAK PERNAH di-cache (data mesti terkini)
   Naikkan VER setiap kali fail app dikemas kini. */
const VER   = 'kehadiran-v2';
const SHELL = VER + '-shell';
const LIB   = VER + '-lib';

const ASSETS = [
  './', './index.html', './admin.html', './manifest.json',
  './config.js', './db.js', './state.js', './auth.js', './ambil.js', './data.js',
  './laporan.js', './pelajar.js', './disiplin.js', './latihan.js', './koku.js', './cetak.js', './nav.js',
  './admin-config.js', './admin-auth.js', './admin-guru.js', './admin-pelajar.js',
  './admin-laporan.js', './admin-kumpulan.js', './admin-hukuman.js', './admin-latihan.js',
  './admin-disiplin.js', './admin-koku.js', './admin-nav.js', './pwa.js',
  './logo.jpg', './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => !k.startsWith(VER)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const LIB_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Data Supabase — biar terus ke rangkaian, jangan sekali-kali cache
  if (url.hostname.endsWith('.supabase.co')) return;

  // Pustaka luar (versi tetap) — cache-first
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(LIB).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // Fail app sendiri — network-first, jatuh balik ke cache bila tiada talian
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then(hit =>
          hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
    );
  }
});
