/* Offline cache for EduVerse Invoice. Bump VERSION when files change. */
const VERSION = 'ev-invoice-v4';
const FILES = ['./', 'index.html', 'app.js', 'jspdf.umd.min.js', 'xlsx.mini.min.js', 'template.jpg', 'pdf-icon.png', 'logo.png', 'template-pro.js', 'template-pass.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/poppins-500.woff2', 'fonts/poppins-600.woff2', 'fonts/poppins-700.woff2', 'fonts/guj-600.woff2', 'fonts/guj-700.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // backup calls go straight to Google
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res;
  })).catch(() => caches.match('index.html')));
});
