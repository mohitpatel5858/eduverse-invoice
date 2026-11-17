/* EduVerse Invoice – offline invoice generator (runs fully on the phone) */
'use strict';

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Could not save on this phone: ' + e.message); return false; } }
};
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Master All in One PDF', price: 59, offer: true },
  { id: 'p2', name: 'All in One PDF + Chapter-wise નોંધો (Extra)', price: 299, offer: true },
  { id: 'p3', name: 'Master All in One નોંધો', price: 199, offer: false },
  { id: 'p4', name: 'All in One + Chapter-wise નોંધો (Extra)', price: 499, offer: false }
];
const S = {
  products: store.get('ev_products', DEFAULT_PRODUCTS),
  offerUntil: store.get('ev_offer_until', '2026-11-30'),
  prefix: store.get('ev_prefix', 'EV-' + new Date().getFullYear() + '-'),
  next: store.get('ev_next', 1),
  url: store.get('ev_url', ''),
  design: store.get('ev_design', 'pass'),
  records: store.get('ev_records', [])
};
const saveRecords = () => store.set('ev_records', S.records);

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const money = n => (Math.round(n * 100) / 100).toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dmy = iso => iso.split('-').reverse().join('-');
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }

function promoCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const used = new Set(S.records.map(r => r.promo));
  for (;;) {
    const b = new Uint8Array(6); crypto.getRandomValues(b);
    let c = 'EDU-'; for (const x of b) c += A[x % A.length];
    if (!used.has(c)) return c;
  }
}

/* ---------- nav ---------- */
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === b.dataset.v));
  if (b.dataset.v === 'v-rec') renderRecords();
  if (b.dataset.v === 'v-set') renderSettings();
  window.scrollTo(0, 0);
});

/* ---------- new invoice form ---------- */
const sel = new Set();
function renderProducts() {
  const offerNow = ($('f-date').value || todayISO()) <= S.offerUntil;
  const grp = (offer) => S.products.filter(p => !!p.offer === offer).map(p => `
    <label class="prod ${sel.has(p.id) ? 'on' : ''}" data-id="${p.id}">
      <input type="checkbox" ${sel.has(p.id) ? 'checked' : ''}>
      <span class="nm">${esc(p.name)}</span><span class="pr">₹${esc(p.price)}</span>
    </label>`).join('');
  $('prods').innerHTML =
    `<div class="grp">Offer price <span class="badge ${offerNow ? 'now' : ''}">till ${dmy(S.offerUntil)}${offerNow ? ' · active today' : ''}</span></div>${grp(true)}` +
    `<div class="grp">Regular price <span class="badge ${!offerNow ? 'now' : ''}">after ${dmy(S.offerUntil)}${!offerNow ? ' · active today' : ''}</span></div>${grp(false)}`;
  $('prods').querySelectorAll('.prod').forEach(el => el.querySelector('input').onchange = e => {
    e.target.checked ? sel.add(el.dataset.id) : sel.delete(el.dataset.id);
    el.classList.toggle('on', e.target.checked); updateTotal();
  });
  updateTotal();
}
function currentItems() { return S.products.filter(p => sel.has(p.id)).map(p => ({ name: p.name, price: +p.price })); }
function updateTotal() {
  const sub = currentItems().reduce((a, b) => a + b.price, 0);
  const disc = Math.max(0, +$('f-disc').value || 0);
  $('f-total').textContent = '₹ ' + money(Math.max(0, sub - disc));
}
$('f-disc').oninput = updateTotal;
$('f-date').onchange = renderProducts;

$('b-gen').onclick = async () => {
  const name = $('f-name').value.trim(), email = $('f-email').value.trim(), txn = $('f-txn').value.trim();
  const items = currentItems(); const err = $('f-err'); err.textContent = '';
  if (!name) return err.textContent = 'Please enter the customer name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err.textContent = 'Please enter a valid email ID.';
  if (!txn) return err.textContent = 'Please enter the transaction number.';
  if (!items.length) return err.textContent = 'Please select at least one PDF.';
  if (items.length > 4) return err.textContent = 'Maximum 4 PDFs on one invoice.';
  if (S.records.some(r => r.txn.toLowerCase() === txn.toLowerCase()) &&
      !confirm('This transaction number was already used for another invoice. Make a new invoice anyway?')) return;
  const sub = items.reduce((a, b) => a + b.price, 0);
  const disc = Math.min(sub, Math.max(0, +$('f-disc').value || 0));
  const rec = {
    invoice: S.prefix + String(S.next).padStart(4, '0'),
    date: $('f-date').value || todayISO(),
    name, email, txn, items, subtotal: sub, discount: disc, total: sub - disc,
    promo: promoCode(), created: new Date().toISOString(), synced: false
  };
  $('b-gen').disabled = true;
  try {
    S.records.push(rec); S.next++;
    if (!saveRecords()) { S.records.pop(); S.next--; return; }
    store.set('ev_next', S.next);
    const canvas = await drawInvoice(rec);
    $('pv-img').src = canvas.toDataURL('image/jpeg', 0.8);
    $('pv-title').textContent = 'Invoice ' + rec.invoice + ' ready · Promo ' + rec.promo;
    $('preview').hidden = false; $('preview').dataset.inv = rec.invoice;
    $('preview').scrollIntoView({ behavior: 'smooth' });
    syncAll();
  } catch (e) { err.textContent = 'Something went wrong: ' + e.message; }
  finally { $('b-gen').disabled = false; }
};
$('pv-new').onclick = () => {
  ['f-name', 'f-email', 'f-txn'].forEach(i => $(i).value = ''); $('f-disc').value = 0;
  sel.clear(); $('f-date').value = todayISO(); renderProducts();
  $('preview').hidden = true; window.scrollTo(0, 0); $('f-name').focus();
};
const recBy = inv => S.records.find(r => r.invoice === inv);
$('pv-dl').onclick = () => downloadPdf(recBy($('preview').dataset.inv));
$('pv-share').onclick = () => sharePdf(recBy($('preview').dataset.inv));

/* ---------- invoice drawing (template image + text) ---------- */
const K = 2; // render at 2x for sharp text
const FONT_LAT = 'Pop, Guj, sans-serif', FONT_GUJ = 'Guj, Pop, sans-serif';
const NAVY = '#0c2a50', INK = '#14213d';
let assets;
function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Missing file ' + src)); i.src = src; }); }
async function getAssets() {
  if (assets) return assets;
  const fonts = ['500 10px Pop', '600 10px Pop', '700 10px Pop', '600 10px Guj', '700 10px Guj'];
  await Promise.all(fonts.map(f => document.fonts.load(f, 'Aઅ₹').catch(() => {})));
  assets = { bg: await loadImg('template.jpg'), icon: await loadImg('pdf-icon.png'), logo: await loadImg('logo.png') };
  return assets;
}
function fit(ctx, text, maxW, weight, size, family) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= maxW) break; s -= 1; } while (s > 9);
  return s;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

async function drawInvoice(r) {
  const a = await getAssets();
  if (S.design === 'pass') return window.drawInvoicePass(r, a.logo);
  if (S.design === 'pro') return window.drawInvoicePro(r, a.logo);
  return drawClassic(r, a);
}
async function drawClassic(r, { bg, icon }) {
  const c = document.createElement('canvas'); c.width = bg.width * K; c.height = bg.height * K;
  const x = c.getContext('2d'); x.scale(K, K);
  x.drawImage(bg, 0, 0); x.textBaseline = 'alphabetic'; x.fillStyle = INK;

  // Bill to
  fit(x, r.name, 255, 600, 20, FONT_LAT); x.fillText(r.name, 336, 248);
  fit(x, r.email, 330, 600, 18, FONT_LAT); x.fillText(r.email, 258, 282);
  // Invoice no + date
  fit(x, r.invoice, 255, 600, 21, FONT_LAT); x.fillText(r.invoice, 278, 349);
  x.font = `600 20px ${FONT_LAT}`; x.fillText(dmy(r.date), 796, 346);

  // Items table (y 450..595)
  const n = r.items.length, y0 = 450, H = 145, rh = H / n, f = n === 1 ? 1 : Math.min(0.95, rh / 72);
  r.items.forEach((it, i) => {
    const cy = y0 + rh * i + rh / 2;
    if (i) { x.fillStyle = '#c3cad3'; x.fillRect(35, y0 + rh * i - 0.5, 984, 1.2); }
    x.fillStyle = INK; x.textAlign = 'center';
    x.font = `600 ${Math.round(24 * Math.max(f, .75))}px ${FONT_LAT}`; x.fillText(String(i + 1), 91, cy + 8);
    const isz = Math.min(102, rh - 12); x.drawImage(icon, 740 - isz * 0.49, cy - isz / 2, isz * 0.98, isz);
    x.textAlign = 'right'; x.font = `700 ${Math.round(28 * Math.max(f, .7))}px ${FONT_LAT}`; x.fillText(money(it.price), 992, cy + 10 * Math.max(f, .7));
    x.textAlign = 'center';
    const title = 'બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર';
    if (n === 1) {
      x.fillStyle = NAVY; fit(x, title, 480, 700, 30, FONT_GUJ); x.fillText(title, 405, 488);
      x.fillStyle = INK; x.font = `600 20px ${FONT_LAT}`; x.fillText('(Child Development & Pedagogy)', 405, 521);
      pill(x, it.name, 405, 555, 18, 470);
    } else {
      const t = `${title}  (TET-1 & TET-2)`;
      x.fillStyle = NAVY; fit(x, t, 480, 700, Math.round(22 * f), FONT_GUJ); x.fillText(t, 405, cy - 4 * f);
      pill(x, it.name, 405, cy + 18 * f, Math.round(16 * f), 470);
    }
  });
  x.textAlign = 'right'; x.fillStyle = INK;
  x.font = `600 22px ${FONT_LAT}`; x.fillText('₹ ' + money(r.subtotal), 997, 629); x.fillText('₹ ' + money(r.discount), 997, 675);
  x.fillStyle = NAVY; x.font = `700 28px ${FONT_LAT}`; x.fillText('₹ ' + money(r.total), 997, 726);

  // Promo code inside dashed box (centre ~628, 975)
  x.textAlign = 'center'; x.fillStyle = NAVY;
  try { x.letterSpacing = '4px'; } catch (e) {}
  fit(x, r.promo, 500, 700, 46, FONT_LAT); x.fillText(r.promo, 628, 992);
  try { x.letterSpacing = '0px'; } catch (e) {}
  // Transaction reference (small, under payment status)
  x.font = `500 14px ${FONT_LAT}`; x.fillStyle = '#4a5568'; x.textAlign = 'center';
  const tx = 'Txn: ' + r.txn; fit(x, tx, 330, 500, 14, FONT_LAT); x.fillText(tx, 840, 300);
  x.textAlign = 'left';
  return c;
}
function pill(x, text, cx, cy, size, maxW) {
  const s = fit(x, text, maxW - 30, 600, size, FONT_LAT);
  const w = x.measureText(text).width + 34, h = s * 1.75;
  x.fillStyle = '#fbebd0'; rrect(x, cx - w / 2, cy - h / 2, w, h, h / 2); x.fill();
  x.fillStyle = INK; x.fillText(text, cx, cy + s * 0.36);
}

async function makePdf(r) {
  const c = await drawInvoice(r);
  const { jsPDF } = window.jspdf;
  const w = S.design !== 'classic' ? 210 : 148, h = w * c.height / c.width; // pro = A4, classic keeps template ratio
  const pdf = new jsPDF({ unit: 'mm', format: [w, h], compress: true });
  pdf.addImage(c.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, w, h, undefined, 'FAST');
  pdf.setProperties({ title: 'Invoice ' + r.invoice, author: 'EduVerse' });
  return pdf;
}
const pdfName = r => `Invoice_${r.invoice}_${r.name.replace(/[^\w઀-૿]+/g, '_')}.pdf`;
async function downloadPdf(r) { if (!r) return; (await makePdf(r)).save(pdfName(r)); }
async function sharePdf(r) {
  if (!r) return;
  const blob = (await makePdf(r)).output('blob');
  const file = new File([blob], pdfName(r), { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'EduVerse Invoice ' + r.invoice, text: `Thank you for your purchase! Your promo code: ${r.promo}` }); }
    catch (e) { if (e.name !== 'AbortError') toast('Share failed: ' + e.message); }
  } else { downloadPdf(r); toast('Sharing not supported here, PDF downloaded instead.'); }
}

/* ---------- Excel ---------- */
function rowsForExcel() {
  return S.records.map(r => ({
    'Invoice No': r.invoice, 'Date': dmy(r.date), 'Customer Name': r.name, 'Email ID': r.email,
    'Transaction No': r.txn, 'PDF(s) Sold': r.items.map(i => i.name).join(' | '),
    'Sub Total (₹)': r.subtotal, 'Discount (₹)': r.discount, 'Total Paid (₹)': r.total,
    'Promo Code': r.promo, 'Created At': new Date(r.created).toLocaleString('en-IN'),
    'Backed up to Drive': r.synced ? 'Yes' : 'No'
  }));
}
$('b-xlsx').onclick = () => {
  if (!S.records.length) return toast('No invoices yet.');
  const ws = XLSX.utils.json_to_sheet(rowsForExcel());
  ws['!cols'] = [14, 12, 22, 28, 22, 40, 12, 12, 13, 14, 20, 12].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
  XLSX.writeFile(wb, `EduVerse_Invoices_${todayISO()}.xlsx`);
};

/* ---------- records list ---------- */
function renderRecords() {
  const q = $('r-q').value.trim().toLowerCase();
  const list = S.records.slice().reverse().filter(r => !q || [r.invoice, r.name, r.email, r.txn, r.promo].join(' ').toLowerCase().includes(q));
  $('s-count').textContent = S.records.length;
  $('s-sum').textContent = '₹' + S.records.reduce((a, r) => a + r.total, 0).toLocaleString('en-IN');
  $('s-pend').textContent = S.records.filter(r => !r.synced).length;
  $('r-list').innerHTML = list.length ? list.map(r => `
    <div class="rec">
      <span class="dot ${r.synced ? 'ok' : ''}" title="${r.synced ? 'Backed up' : 'Waiting for internet'}"></span>
      <div class="i"><div class="t">${esc(r.name)} · ₹${money(r.total)}</div>
      <div class="s">${esc(r.invoice)} · ${dmy(r.date)} · ${esc(r.promo)}</div></div>
      <button class="ghost" data-a="share" data-i="${esc(r.invoice)}">Share</button>
      <button class="ghost" data-a="dl" data-i="${esc(r.invoice)}">PDF</button>
    </div>`).join('') : '<p class="small">No invoices yet.</p>';
  $('r-list').querySelectorAll('button').forEach(b => b.onclick = () => (b.dataset.a === 'dl' ? downloadPdf : sharePdf)(recBy(b.dataset.i)));
}
$('r-q').oninput = renderRecords;

/* ---------- Google Drive backup (via Apps Script) ---------- */
let syncing = false;
async function post(payload) {
  const res = await fetch(S.url, { method: 'POST', body: JSON.stringify(payload) }); // text/plain => no CORS preflight
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Backup failed');
  return j;
}
async function syncAll(manual) {
  updateNet();
  if (!S.url) { if (manual) toast('Add your Backup URL in Settings first.'); return; }
  if (!navigator.onLine) { if (manual) toast('No internet. Will back up automatically later.'); return; }
  if (syncing) return; syncing = true;
  let done = 0, failed = '';
  try {
    for (const r of S.records.filter(r => !r.synced)) {
      try {
        const pdf = (await makePdf(r)).output('datauristring').split(',')[1];
        await post({ action: 'save', record: { ...r, items: r.items.map(i => i.name).join(' | ') }, pdfName: pdfName(r), pdf });
        r.synced = true; saveRecords(); done++;
      } catch (e) { failed = e.message; break; }
    }
  } finally { syncing = false; updateNet(); if ($('v-rec').classList.contains('on')) renderRecords(); }
  if (manual || done) toast(failed ? 'Backup stopped: ' + failed : done ? `Backed up ${done} invoice(s) to Drive ✓` : 'Everything is already backed up ✓');
}
$('b-sync').onclick = () => syncAll(true);
function updateNet() {
  const pend = S.records.filter(r => !r.synced).length;
  $('net').textContent = !navigator.onLine ? 'Offline' : !S.url ? 'Backup off' : syncing ? 'Backing up…' : pend ? pend + ' to back up' : 'Backed up ✓';
}
addEventListener('online', () => syncAll());
addEventListener('offline', updateNet);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAll(); });
setInterval(() => syncAll(), 5 * 60 * 1000);

/* ---------- settings ---------- */
function renderSettings() {
  $('g-url').value = S.url; $('d-sel').value = S.design;
  $('p-edit').innerHTML = S.products.map(p => `
    <div class="grp">${p.offer ? 'Offer price' : 'Regular price'}</div>
    <div class="pe"><input data-k="name" data-id="${p.id}" value="${esc(p.name)}"><input data-k="price" data-id="${p.id}" type="number" inputmode="decimal" value="${esc(p.price)}"></div>`).join('');
  $('p-offer').value = S.offerUntil; $('n-pre').value = S.prefix; $('n-next').value = S.next;
}
$('g-save').onclick = () => {
  const u = $('g-url').value.trim();
  if (u && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(u)) { $('g-msg').textContent = 'That does not look like a Web app URL. It should start with https://script.google.com/macros/s/ and end with /exec'; return; }
  S.url = u; store.set('ev_url', u); $('g-msg').textContent = u ? 'Saved. Backing up now…' : 'Backup turned off.'; syncAll(true);
};
$('g-test').onclick = async () => {
  const u = $('g-url').value.trim(); if (!u) return;
  $('g-msg').textContent = 'Testing…';
  try { const old = S.url; S.url = u; const j = await post({ action: 'ping' }); S.url = old; $('g-msg').innerHTML = 'Connected ✓ Saving to: <a href="' + esc(j.sheetUrl) + '" target="_blank">your Google Sheet</a>'; }
  catch (e) { $('g-msg').textContent = 'Could not connect: ' + e.message + '. Check the URL and that access is set to "Anyone".'; }
};
$('d-sel').onchange = () => { S.design = $('d-sel').value; store.set('ev_design', S.design); toast('Invoice design saved ✓'); };
$('p-save').onclick = () => {
  document.querySelectorAll('#p-edit input').forEach(i => { const p = S.products.find(p => p.id === i.dataset.id); p[i.dataset.k] = i.dataset.k === 'price' ? (+i.value || 0) : i.value.trim(); });
  S.offerUntil = $('p-offer').value || S.offerUntil;
  store.set('ev_products', S.products); store.set('ev_offer_until', S.offerUntil); renderProducts(); toast('Prices saved ✓');
};
$('n-save').onclick = () => {
  const pre = $('n-pre').value.trim(), nx = parseInt($('n-next').value, 10);
  if (!pre || !(nx > 0)) return toast('Enter a prefix and a number.');
  const clash = S.records.some(r => r.invoice === pre + String(nx).padStart(4, '0'));
  if (clash) return toast('That invoice number is already used.');
  S.prefix = pre; S.next = nx; store.set('ev_prefix', pre); store.set('ev_next', nx); toast('Saved ✓');
};
$('bk-exp').onclick = () => {
  const blob = new Blob([JSON.stringify({ v: 1, products: S.products, offerUntil: S.offerUntil, prefix: S.prefix, next: S.next, records: S.records }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `EduVerse_backup_${todayISO()}.json`; a.click();
};
$('bk-imp').onclick = () => $('bk-file').click();
$('bk-file').onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    const have = new Set(S.records.map(r => r.invoice)); let added = 0;
    for (const r of d.records || []) if (!have.has(r.invoice)) { S.records.push(r); added++; }
    S.records.sort((a, b) => a.created.localeCompare(b.created));
    if (d.products) S.products = d.products; if (d.offerUntil) S.offerUntil = d.offerUntil; if (d.prefix) S.prefix = d.prefix;
    S.next = Math.max(S.next, d.next || 1);
    saveRecords(); store.set('ev_products', S.products); store.set('ev_offer_until', S.offerUntil); store.set('ev_prefix', S.prefix); store.set('ev_next', S.next);
    renderSettings(); renderProducts(); toast(`Restored ${added} invoice(s) ✓`);
  } catch (err) { toast('Could not read that file.'); }
  e.target.value = '';
};

/* ---------- start ---------- */
$('f-date').value = todayISO();
renderProducts(); updateNet(); getAssets().catch(() => {});
setTimeout(() => syncAll(), 1500);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
