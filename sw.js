/* Offline cache for EduVerse Invoice. Bump VERSION when files change.
   Online: always loads the newest files (so updates show at once). Offline: uses the saved copy. */
const VERSION = 'ev-invoice-v9';
const FILES = ['./', 'index.html', 'app.js', 'reader.js', 'jspdf.umd.min.js', 'xlsx.mini.min.js', 'template.jpg', 'pdf-icon.png', 'logo.png', 'template-pro.js', 'template-pass.js', 'template-brand.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/poppins-500.woff2', 'fonts/poppins-600.woff2', 'fonts/poppins-700.woff2', 'fonts/guj-600.woff2', 'fonts/guj-700.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION)
  .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))) // skip the browser's HTTP cache
  .then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // backup calls go straight to Google
  const fromCache = () => caches.match(e.request, { ignoreSearch: true }).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined));
  if (!navigator.onLine) return e.respondWith(fromCache().then(r => r || fetch(e.request)));
  // Network first (3 s limit), then save the fresh copy; fall back to the saved copy.
  e.respondWith(new Promise(resolve => {
    let done = false;
    const t = setTimeout(() => fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }), 3000);
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      if (!done) { done = true; clearTimeout(t); resolve(res); }
    }).catch(() => fromCache().then(r => { if (!done) { done = true; clearTimeout(t); resolve(r || Response.error()); } }));
  }));
});
