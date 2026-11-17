/**
 * EduVerse Invoice – Google Drive backup + private customer PDF reader.
 * Paste this whole file into your Google Apps Script project (script.google.com),
 * then Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy.
 * (First time: Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.)
 *
 * It keeps, in YOUR Google Drive:
 *   - Google Sheet "EduVerse Invoices": tab "Invoices" (one row per invoice),
 *     tab "Reader Access" (one row per customer who can read PDFs),
 *     tab "Reader Library" (the PDFs customers can read)
 *   - folder "EduVerse Invoice PDFs" with every invoice PDF
 *   - folder "EduVerse Reader Library (private)" with the page pictures of your PDFs.
 *     These files are never shared. Customers only see pages through the reader, one at a time.
 */
const SHEET_NAME = 'EduVerse Invoices';
const FOLDER_NAME = 'EduVerse Invoice PDFs';
const LIB_FOLDER_NAME = 'EduVerse Reader Library (private)';
const READER_VERSION = 2;
const HEADERS = ['Invoice No', 'Date', 'Customer Name', 'Email ID', 'Transaction No', 'PDF(s) Sold',
  'Sub Total (₹)', 'Discount (₹)', 'Total Paid (₹)', 'Promo Code', 'Created At', 'PDF Link'];
const ACC_TAB = 'Reader Access';
// Columns of the "Reader Access" tab (1-based)
const A = { CODE: 1, NAME: 2, EMAIL: 3, INVOICE: 4, TITLES: 5, BOOKS: 6, MAXDEV: 7, DEVICES: 8, ACTIVE: 9, CREATED: 10, LAST: 11, OPENS: 12 };
const ACC_HEADERS = ['Access Code', 'Customer Name', 'Email ID', 'Invoice No(s)', 'PDFs they can read', 'Book IDs (do not edit)',
  'Max Devices', 'Device IDs (clear to reset)', 'Active (YES/NO)', 'Created', 'Last Opened', 'Times Opened'];
const LIB_TAB = 'Reader Library';
const LIB_HEADERS = ['Book ID (do not edit)', 'Title', 'Pages', 'Added', 'Page file IDs (do not edit)'];
const DEFAULT_MAX_DEVICES = 2;
const PAGE_LIMIT_6H = 2000; // pages one customer can open in 6 hours (stops bulk copying)

/* ---------------- storage helpers ---------------- */
function props_() { return PropertiesService.getScriptProperties(); }
function getSheet_() {
  const props = props_();
  let id = props.getProperty('SHEET_ID'), ss;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    const sh = ss.getSheets()[0];
    sh.setName('Invoices');
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0c2a50').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    props.setProperty('SHEET_ID', ss.getId());
  }
  return ss;
}
function tab_(name, headers) {
  const ss = getSheet_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0c2a50').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function folder_(prop, name) {
  const props = props_();
  const id = props.getProperty(prop);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(name);
  props.setProperty(prop, f.getId());
  return f;
}
function getFolder_() { return folder_('FOLDER_ID', FOLDER_NAME); }
function libFolder_() { return folder_('LIB_FOLDER_ID', LIB_FOLDER_NAME); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function findRow_(sh, col, value) {
  const last = sh.getLastRow();
  if (last < 2 || !value) return 0;
  const f = sh.getRange(2, col, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------- your phone app (admin) ---------------- */
// The first app that connects after this update links itself with a secret key.
// After that, only an app with the same key can save invoices, give access or add PDFs.
function checkKey_(body) {
  const stored = props_().getProperty('ADMIN_KEY');
  if (!stored) {
    if (body.key && String(body.key).length >= 20) props_().setProperty('ADMIN_KEY', String(body.key));
    return; // not linked yet: allowed (older app versions)
  }
  if (body.key !== stored) throw new Error('This phone is not linked. In the app: Settings > Customer reader > Link this phone, and enter the reader key from your other phone.');
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    checkKey_(body);
    const a = body.action;
    if (a === 'ping') return out_({ ok: true, sheetUrl: getSheet_().getUrl(), readerVersion: READER_VERSION, linked: !!props_().getProperty('ADMIN_KEY') });
    if (a === 'save') return out_(withLock_(() => saveInvoice_(body)));
    if (a === 'grant') return out_(withLock_(() => grant_(body)));
    if (a === 'library') return out_({ ok: true, books: library_() });
    if (a === 'bookStart') return out_(bookStart_(body));
    if (a === 'bookPage') return out_(bookPage_(body));
    if (a === 'bookFinish') return out_(withLock_(() => bookFinish_(body)));
    if (a === 'bookDelete') return out_(withLock_(() => bookDelete_(body)));
    return out_({ ok: false, error: 'Unknown action. Please paste the latest script and deploy a New version.' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function saveInvoice_(body) {
  const ss = getSheet_();
  const r = body.record, sh = ss.getSheetByName('Invoices') || ss.getSheets()[0];
  if (findRow_(sh, 1, r.invoice)) return { ok: true, duplicate: true }; // already saved
  let link = '';
  if (body.pdf) {
    const blob = Utilities.newBlob(Utilities.base64Decode(body.pdf), 'application/pdf', body.pdfName || (r.invoice + '.pdf'));
    link = getFolder_().createFile(blob).getUrl();
  }
  const d = r.date.split('-').reverse().join('-');
  sh.appendRow([r.invoice, d, r.name, r.email, "'" + r.txn, r.items, r.subtotal, r.discount, r.total, r.promo,
    new Date(r.created), link]);
  return { ok: true, sheetUrl: ss.getUrl() };
}

// Create or update one customer's reader access. books = full list of Book IDs they may read.
function grant_(body) {
  const code = String(body.code || '').trim();
  if (!/^[A-Z0-9-]{8,20}$/.test(code)) throw new Error('Bad access code');
  const sh = tab_(ACC_TAB, ACC_HEADERS);
  const lib = library_(), byId = {};
  lib.forEach(b => byId[b.id] = b.title);
  const books = (body.books || []).filter(id => byId[id]);
  const titles = books.map(id => byId[id]).join(' | ');
  let row = findRow_(sh, A.CODE, code);
  if (!row) {
    sh.appendRow([code, body.name || '', String(body.email || '').trim().toLowerCase(), body.invoice || '', titles, books.join(','),
      DEFAULT_MAX_DEVICES, '', 'YES', new Date(), '', 0]);
  } else {
    sh.getRange(row, A.TITLES, 1, 2).setValues([[titles, books.join(',')]]);
    if (body.name) sh.getRange(row, A.NAME).setValue(body.name);
    if (body.email) sh.getRange(row, A.EMAIL).setValue(String(body.email).trim().toLowerCase());
    if (body.invoice) sh.getRange(row, A.INVOICE).setValue(body.invoice);
  }
  CacheService.getScriptCache().remove('acc_' + code);
  return { ok: true, titles };
}

function library_() {
  const sh = tab_(LIB_TAB, LIB_HEADERS), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 3).getValues().filter(r => r[0]).map(r => ({ id: String(r[0]), title: String(r[1]), pages: +r[2] }));
}
function bookStart_(body) {
  const title = String(body.title || '').trim();
  if (!title) throw new Error('Please give the PDF a name');
  const f = libFolder_().createFolder(title + ' · ' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MM-yyyy HH:mm'));
  return { ok: true, bookId: f.getId() };
}
function bookPage_(body) {
  const f = DriveApp.getFolderById(body.bookId);
  const name = 'p' + String(body.n).padStart(4, '0') + '.jpg';
  const old = f.getFilesByName(name); // retry after a network error: replace the half-done page
  while (old.hasNext()) old.next().setTrashed(true);
  const file = f.createFile(Utilities.newBlob(Utilities.base64Decode(body.data), 'image/jpeg', name));
  return { ok: true, id: file.getId() };
}
function bookFinish_(body) {
  const ids = body.ids || [];
  if (!ids.length || ids.some(x => !x)) throw new Error('Some pages are missing');
  const sh = tab_(LIB_TAB, LIB_HEADERS);
  if (!findRow_(sh, 1, body.bookId)) sh.appendRow([body.bookId, String(body.title).trim(), ids.length, new Date(), JSON.stringify(ids)]);
  return { ok: true, books: library_() };
}

// Remove a PDF from the reader: hide it from every customer and move its page pictures to the Drive bin.
function bookDelete_(body) {
  const sh = tab_(LIB_TAB, LIB_HEADERS), row = findRow_(sh, 1, body.bookId);
  if (row) sh.deleteRow(row);
  try { DriveApp.getFolderById(body.bookId).setTrashed(true); } catch (e) {}
  CacheService.getScriptCache().remove('bk_' + body.bookId);
  return { ok: true, books: library_() };
}

/* ---------------- customer reader ---------------- */
function doGet(e) {
  const code = e && e.parameter && e.parameter.r;
  if (code) {
    const t = HtmlService.createTemplate(READER_HTML);
    t.code = String(code).replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 20);
    return t.evaluate().setTitle('EduVerse Reader')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  return out_({ ok: true });
}

function access_(code) {
  const sh = tab_(ACC_TAB, ACC_HEADERS);
  const row = findRow_(sh, A.CODE, code);
  if (!row) return null;
  const v = sh.getRange(row, 1, 1, ACC_HEADERS.length).getValues()[0];
  return { sh, row, v };
}
function bookPages_(bookId) {
  const c = CacheService.getScriptCache(), k = 'bk_' + bookId, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  const sh = tab_(LIB_TAB, LIB_HEADERS), row = findRow_(sh, 1, bookId);
  if (!row) return null;
  const v = sh.getRange(row, 1, 1, 5).getValues()[0];
  const b = { id: String(v[0]), title: String(v[1]), ids: JSON.parse(v[4] || '[]') };
  try { c.put(k, JSON.stringify(b), 21600); } catch (err) {}
  return b;
}

// Called by the reader page: check code + email + device, return the customer's PDFs and a session token.
function readerOpen(code, email, device) {
  code = String(code || '').toUpperCase();
  email = String(email || '').trim().toLowerCase();
  device = String(device || '').slice(0, 64);
  if (!code || !email || !device) return { ok: false, error: 'Please enter your email ID.' };
  return withLock_(() => {
    const a = access_(code);
    if (!a) return { ok: false, error: 'This reader link is not active yet. Please try again a little later or contact EduVerse.' };
    const v = a.v;
    if (String(v[A.ACTIVE - 1]).trim().toUpperCase() === 'NO') return { ok: false, error: 'This access has been turned off. Please contact EduVerse.' };
    if (String(v[A.EMAIL - 1]).trim().toLowerCase() !== email) return { ok: false, error: 'This email ID does not match the one on your invoice.' };
    const devs = String(v[A.DEVICES - 1] || '').split(',').map(s => s.trim()).filter(Boolean);
    const max = +v[A.MAXDEV - 1] || DEFAULT_MAX_DEVICES;
    if (devs.indexOf(device) < 0) {
      if (devs.length >= max) return { ok: false, error: 'Your PDFs are already open on ' + max + ' devices. To use a new phone, please contact EduVerse.' };
      devs.push(device);
      a.sh.getRange(a.row, A.DEVICES).setValue(devs.join(','));
    }
    a.sh.getRange(a.row, A.LAST, 1, 2).setValues([[new Date(), (+v[A.OPENS - 1] || 0) + 1]]);
    const bookIds = String(v[A.BOOKS - 1] || '').split(',').filter(Boolean);
    const books = bookIds.map(bookPages_).filter(Boolean).map(b => ({ id: b.id, title: b.title, pages: b.ids.length }));
    const token = Utilities.getUuid();
    CacheService.getScriptCache().put('tok_' + token, JSON.stringify({ code, books: books.map(b => b.id) }), 21600);
    return { ok: true, token, name: String(v[A.NAME - 1]), email, code, books };
  });
}

// Called by the reader page for one page picture.
function readerPage(token, bookId, n) {
  const c = CacheService.getScriptCache();
  const s = c.get('tok_' + token);
  if (!s) return { ok: false, expired: true };
  const sess = JSON.parse(s);
  if (sess.books.indexOf(bookId) < 0) return { ok: false, error: 'No access to this PDF.' };
  const ck = 'cnt_' + sess.code, cnt = (+c.get(ck) || 0) + 1;
  if (cnt > PAGE_LIMIT_6H) return { ok: false, error: 'Too many pages opened. Please take a break and try again later.' };
  c.put(ck, String(cnt), 21600);
  const b = bookPages_(bookId), id = b && b.ids[n - 1];
  if (!id) return { ok: false, error: 'Page not found.' };
  return { ok: true, n, img: 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()) };
}

const READER_HTML = `<!doctype html>
<html><head><base target="_top"><meta charset="utf-8">
<style>
:root{--navy:#0c2a50;--gold:#fcc73a;--bg:#eef1f6;--line:#dde3ec;--muted:#5d6b82}
*{box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
html,body{margin:0;background:var(--bg);color:#14213d;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Gujarati",sans-serif}
header{background:var(--navy);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:3}
header b{font-size:17px}header b span{color:var(--gold)}
header button{margin-left:auto;background:#ffffff22;color:#fff;border:0;border-radius:8px;padding:8px 12px;font:inherit;font-size:14px}
main{max-width:860px;margin:0 auto;padding:14px 12px 40px}
.card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px #0c2a5014}
h2{font-size:16px;margin:0 0 10px;color:var(--navy)}
input{width:100%;font:inherit;font-size:16px;padding:11px 12px;border:1.5px solid var(--line);border-radius:10px;-webkit-user-select:text;user-select:text}
.btn{width:100%;margin-top:10px;background:var(--navy);color:#fff;border:0;border-radius:12px;padding:13px;font:inherit;font-weight:600;font-size:16px}
.btn:disabled{opacity:.5}
.err{color:#c0392b;font-size:14px;margin-top:8px;min-height:1em}
.small{font-size:13px;color:var(--muted);line-height:1.5}
.book{display:flex;align-items:center;gap:12px;border:1.5px solid var(--line);border-radius:12px;padding:14px;margin-bottom:8px;cursor:pointer;background:#fff}
.book .t{flex:1;font-weight:600}.book .p{font-size:13px;color:var(--muted)}
.page{background:#fff;margin:0 auto 12px;box-shadow:0 1px 4px #0003;position:relative;max-width:100%}
.page canvas{width:100%;height:auto;display:block}
.page .ph{display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;aspect-ratio:1/1.414}
.pno{text-align:center;font-size:12px;color:var(--muted);margin:-6px 0 12px}
#shield{position:fixed;inset:0;background:var(--navy);color:#fff;display:none;align-items:center;justify-content:center;text-align:center;padding:24px;z-index:9;font-size:16px}
body.hide #shield{display:flex} body.hide main{visibility:hidden}
@media print{body{display:none!important}}
</style></head>
<body oncontextmenu="return false">
<header><b>Edu<span>Verse</span> Reader</b><button id="back" hidden>‹ My PDFs</button></header>
<main id="m">
  <div class="card" id="login">
    <h2>Open your PDFs</h2>
    <p class="small">Enter the email ID that is printed on your EduVerse invoice.</p>
    <input id="em" type="email" inputmode="email" autocomplete="email" placeholder="name@gmail.com">
    <button class="btn" id="go">Open</button>
    <div class="err" id="er"></div>
  </div>
</main>
<div id="shield">Your PDFs are hidden while this window is in the background.<br>Tap here to continue reading.</div>
<script>
var CODE = '<?!= code ?>';
var S = { token: '', email: '', name: '', books: [] };
function $(id){ return document.getElementById(id); }
function store(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
function deviceId(){
  var d = store('ev_dev');
  if (d) return d;
  var r = new Uint8Array(10); crypto.getRandomValues(r);
  d = 'd' + Array.prototype.map.call(r, function(x){ return (x + 256).toString(16).slice(1); }).join('');
  store('ev_dev', d);
  if (store('ev_dev') === d) return d;
  // The browser blocks storage here: use a stable fingerprint of this phone instead.
  var raw = [navigator.userAgent, screen.width + 'x' + screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.language].join('|');
  var h = 0; for (var i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return 'f' + (h >>> 0).toString(36);
}
function call(fn, args, ok){
  var r = google.script.run.withSuccessHandler(ok).withFailureHandler(function(e){ ok({ ok: false, error: 'Network problem. Please check your internet and try again.' }); });
  r[fn].apply(r, args);
}
function login(email){
  $('go').disabled = true; $('er').textContent = '';
  call('readerOpen', [CODE, email, deviceId()], function(j){
    $('go').disabled = false;
    if (!j.ok) { $('er').textContent = j.error; return; }
    S.token = j.token; S.email = j.email; S.name = j.name; S.books = j.books;
    store('ev_em_' + CODE, j.email);
    showBooks();
  });
}
$('go').onclick = function(){ var e = $('em').value.trim(); if (e) login(e); };
$('em').onkeydown = function(e){ if (e.key === 'Enter') $('go').click(); };
var saved = store('ev_em_' + CODE); if (saved) { $('em').value = saved; login(saved); }

function showBooks(){
  $('back').hidden = true; stopObs();
  var h = '<div class="card"><h2>Hello ' + esc(S.name) + '</h2><p class="small">Tap a PDF to read it. These PDFs are for your personal use only and carry your name.</p></div>';
  if (!S.books.length) h += '<div class="card small">No PDFs have been added for you yet. Please contact EduVerse.</div>';
  S.books.forEach(function(b, i){ h += '<div class="book" data-i="' + i + '"><div class="t">' + esc(b.title) + '</div><div class="p">' + b.pages + ' pages ›</div></div>'; });
  $('m').innerHTML = h;
  Array.prototype.forEach.call(document.querySelectorAll('.book'), function(el){ el.onclick = function(){ openBook(S.books[+el.dataset.i]); }; });
  window.scrollTo(0, 0);
}
$('back').onclick = showBooks;
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

var obs, queue = [], busy = 0, book;
function stopObs(){ if (obs) obs.disconnect(); obs = null; queue = []; }
function openBook(b){
  book = b; stopObs(); $('back').hidden = false;
  var h = '<div class="card"><h2>' + esc(b.title) + '</h2><p class="small">' + b.pages + ' pages · Licensed to ' + esc(S.name) + ' (' + esc(S.email) + ')</p></div>';
  for (var n = 1; n <= b.pages; n++) h += '<div class="page" id="pg' + n + '" data-n="' + n + '"><div class="ph">Loading page ' + n + '…</div></div><div class="pno">' + n + ' / ' + b.pages + '</div>';
  $('m').innerHTML = h; window.scrollTo(0, 0);
  obs = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { var n = +e.target.dataset.n; obs.unobserve(e.target); want(n); if (n + 1 <= b.pages) want(n + 1); } });
  }, { rootMargin: '600px 0px' });
  Array.prototype.forEach.call(document.querySelectorAll('.page'), function(p){ obs.observe(p); });
}
function want(n){ var el = $('pg' + n); if (!el || el.dataset.q) return; el.dataset.q = 1; queue.push(n); pump(); }
function pump(){
  while (busy < 3 && queue.length) {
    var n = queue.shift(); busy++;
    (function(n, b){
      call('readerPage', [S.token, b.id, n], function(j){
        busy--; pump();
        if (book !== b) return;
        var el = $('pg' + n); if (!el) return;
        if (j.expired) { el.dataset.q = ''; return login(S.email); }
        if (!j.ok) { el.innerHTML = '<div class="ph">' + esc(j.error) + '</div>'; return; }
        draw(el, j.img);
      });
    })(n, book);
  }
}
function draw(el, src){
  var img = new Image();
  img.onload = function(){
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0);
    var mark = S.name + ' · ' + S.email + ' · ' + CODE;
    var fs = Math.round(c.width / 34);
    x.save(); x.globalAlpha = 0.13; x.fillStyle = '#0c2a50'; x.font = '600 ' + fs + 'px sans-serif';
    x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 6);
    var w = x.measureText(mark).width + fs * 3;
    for (var yy = -c.height; yy < c.height; yy += fs * 6) for (var xx = -c.width * 1.2 + ((yy / (fs * 6)) % 2) * w / 2; xx < c.width * 1.2; xx += w) x.fillText(mark, xx, yy);
    x.restore();
    x.globalAlpha = 0.85; x.fillStyle = '#0c2a50'; x.font = '600 ' + Math.round(c.width / 60) + 'px sans-serif'; x.textAlign = 'center';
    x.fillText('Licensed to ' + S.name + ' (' + S.email + ') · EduVerse · Sharing is not allowed', c.width / 2, c.height - c.width / 70);
    el.innerHTML = ''; el.appendChild(c); img.src = '';
  };
  img.src = src;
}
// Deterrents: no right click, no drag, no print / save shortcuts, hide pages when the window loses focus.
document.addEventListener('dragstart', function(e){ e.preventDefault(); });
document.addEventListener('keydown', function(e){
  var k = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'p' || k === 'c' || k === 'u')) { e.preventDefault(); }
  if (k === 'printscreen') { document.body.classList.add('hide'); try { navigator.clipboard.writeText(''); } catch (err) {} }
});
function hide(){ if (book) document.body.classList.add('hide'); }
window.addEventListener('blur', hide);
document.addEventListener('visibilitychange', function(){ if (document.hidden) hide(); });
$('shield').onclick = function(){ document.body.classList.remove('hide'); };
window.addEventListener('beforeprint', function(){ document.body.classList.add('hide'); });
</script></body></html>`;
