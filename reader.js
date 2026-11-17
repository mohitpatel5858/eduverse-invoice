/* EduVerse Invoice – customer PDF reader (admin side, runs in the invoice app).
   Your PDFs live only in your private Google Drive. Customers read them through
   the reader page of your Google Apps Script with their personal link. */
'use strict';
(function () {
  // S.access: { CODE: { email, name, invoice, books: [bookId], dirty } } – one personal link per customer email
  S.access = store.get('ev_access', {});
  S.library = store.get('ev_library', []); // [{ id, title, pages }]
  const saveAccess = () => store.set('ev_access', S.access);
  const pick = new Set();

  function newCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      const b = new Uint8Array(10); crypto.getRandomValues(b);
      let c = 'R'; for (const x of b) c += A[x % A.length];
      if (!S.access[c]) return c;
    }
  }
  const codeFor = email => Object.keys(S.access).find(c => S.access[c].email === email.toLowerCase());
  const link = code => S.url ? S.url + '?r=' + code : '';
  const titleOf = id => (S.library.find(b => b.id === id) || {}).title || 'Removed PDF';

  /* ---------- New invoice: "PDFs they can read" ---------- */
  function renderPicker() {
    const box = $('rd-pick'); if (!box) return;
    if (!S.library.length) {
      box.innerHTML = '<div class="grp">PDFs they can read online</div><p class="small">Add your PDFs in <b>Settings → Customer reader</b> to give customers a protected reader link.</p>';
      return;
    }
    const email = $('f-email').value.trim().toLowerCase(), code = email && codeFor(email);
    const has = new Set(code ? S.access[code].books : []);
    box.innerHTML = '<div class="grp">PDFs they can read online <span class="badge">no download</span></div>' +
      S.library.map(b => {
        const already = has.has(b.id), on = already || pick.has(b.id);
        return `<label class="prod ${on ? 'on' : ''}" data-id="${esc(b.id)}">
          <input type="checkbox" ${on ? 'checked' : ''} ${already ? 'disabled' : ''}>
          <span class="nm">${esc(b.title)}<br><span class="small">${b.pages} pages${already ? ' · already has access' : ''}</span></span></label>`;
      }).join('');
    box.querySelectorAll('.prod').forEach(el => el.querySelector('input').onchange = e => {
      e.target.checked ? pick.add(el.dataset.id) : pick.delete(el.dataset.id);
      el.classList.toggle('on', e.target.checked);
    });
  }
  $('f-email').addEventListener('change', renderPicker);

  // Called when an invoice is generated. Returns the customer's reader code, or '' if no PDFs were ticked.
  function attach(rec) {
    const email = rec.email.toLowerCase();
    let code = codeFor(email);
    if (!pick.size && !code) return '';
    if (!pick.size) return code; // existing reader customer: keep the same link on the new invoice
    if (!code) { code = newCode(); S.access[code] = { email, name: rec.name, invoice: rec.invoice, books: [] }; }
    const a = S.access[code];
    a.books = [...new Set([...a.books, ...pick])];
    a.name = rec.name; a.invoice = a.invoice && !a.invoice.split(', ').includes(rec.invoice) ? a.invoice + ', ' + rec.invoice : (a.invoice || rec.invoice);
    a.dirty = true; saveAccess();
    return code;
  }
  function resetForm() { pick.clear(); renderPicker(); }

  function shareText(r) {
    const a = r.readCode && S.access[r.readCode];
    if (!a || !a.books.length || !S.url) return '';
    return `\n\nRead your PDFs here (open with your email ID ${a.email}):\n${link(r.readCode)}\nPlease don't share this link. It works on 2 devices only.`;
  }

  /* ---------- Send access changes to Google Drive ---------- */
  async function syncAccess() {
    for (const code of Object.keys(S.access).filter(c => S.access[c].dirty)) {
      const a = S.access[code];
      await post({ action: 'grant', code, email: a.email, name: a.name, invoice: a.invoice, books: a.books });
      a.dirty = false; saveAccess();
    }
  }
  const pendingAccess = () => Object.values(S.access).filter(a => a.dirty).length;

  /* ---------- Records: manage one customer's reader access ---------- */
  function openManage(rec) {
    const email = rec.email.toLowerCase();
    let code = codeFor(email);
    const cur = new Set(code ? S.access[code].books : []);
    const m = $('rd-modal');
    m.innerHTML = `<div class="sheet">
      <h2>Reader for ${esc(rec.name)}</h2>
      <p class="small">${esc(email)}</p>
      ${S.library.length ? S.library.map(b => `<label class="prod ${cur.has(b.id) ? 'on' : ''}" data-id="${esc(b.id)}"><input type="checkbox" ${cur.has(b.id) ? 'checked' : ''}><span class="nm">${esc(b.title)}<br><span class="small">${b.pages} pages</span></span></label>`).join('')
        : '<p class="small">No PDFs in your reader yet. Add them in Settings → Customer reader.</p>'}
      ${[...cur].filter(id => !S.library.some(b => b.id === id)).map(id => `<p class="small">• ${esc(titleOf(id))}</p>`).join('')}
      <div id="rd-link" class="small" style="word-break:break-all;margin-top:8px">${code ? 'Link: ' + esc(link(code)) : ''}</div>
      <div class="btns">
        <button class="primary full" id="rd-save">Save access</button>
        <button class="gold" id="rd-share" ${code ? '' : 'disabled'}>Send link</button>
        <button class="ghost" id="rd-close">Close</button>
      </div></div>`;
    m.hidden = false;
    m.querySelectorAll('.prod').forEach(el => el.querySelector('input').onchange = e => el.classList.toggle('on', e.target.checked));
    $('rd-close').onclick = () => { m.hidden = true; };
    m.onclick = e => { if (e.target === m) m.hidden = true; };
    $('rd-save').onclick = () => {
      const books = [...m.querySelectorAll('.prod')].filter(el => el.querySelector('input').checked).map(el => el.dataset.id);
      const keepUnknown = [...cur].filter(id => !S.library.some(b => b.id === id));
      if (!code) {
        if (!books.length) return toast('Tick at least one PDF.');
        code = newCode(); S.access[code] = { email, name: rec.name, invoice: rec.invoice, books: [] };
        S.records.filter(r => r.email.toLowerCase() === email && !r.readCode).forEach(r => r.readCode = code); saveRecords();
      }
      S.access[code].books = [...books, ...keepUnknown]; S.access[code].dirty = true; saveAccess();
      $('rd-link').textContent = 'Link: ' + link(code); $('rd-share').disabled = false;
      toast(navigator.onLine && S.url ? 'Saved ✓ Updating Drive…' : 'Saved ✓ Will update Drive when online');
      syncAll();
    };
    $('rd-share').onclick = async () => {
      if (!code) return;
      const a = S.access[code];
      const text = `Hello ${a.name}, your EduVerse PDFs:\n${a.books.map(id => '• ' + titleOf(id)).join('\n')}\n\nRead them here (open with your email ID ${a.email}):\n${link(code)}\nPlease don't share this link. It works on 2 devices only.`;
      if (navigator.share) { try { await navigator.share({ text }); } catch (e) {} }
      else { try { await navigator.clipboard.writeText(text); toast('Message copied ✓'); } catch (e) { prompt('Copy this message:', text); } }
    };
  }

  /* ---------- Settings: library + upload ---------- */
  async function refresh(quiet) {
    if (!S.url || !navigator.onLine) { renderSettingsCard(quiet ? '' : 'Connect Google Drive backup above first (needs internet).'); return; }
    try {
      const p = await post({ action: 'ping' });
      if (!p.readerVersion) { renderSettingsCard('Your Google script is the old version. Paste the new script and deploy a New version (see guide).'); return; }
      const j = await post({ action: 'library' });
      S.library = j.books; store.set('ev_library', S.library);
      renderSettingsCard(''); renderPicker();
    } catch (e) { renderSettingsCard('Could not load: ' + e.message); }
  }
  function renderSettingsCard(msg) {
    const box = $('rd-lib'); if (!box) return;
    box.innerHTML = S.library.length
      ? S.library.map(b => `<div class="rec"><div class="i"><div class="t">${esc(b.title)}</div><div class="s">${b.pages} pages</div></div></div>`).join('')
      : '<p class="small">No PDFs added yet.</p>';
    if (msg != null) $('rd-msg').textContent = msg;
    $('rd-key').value = S.rkey;
  }

  let pdfjsReady;
  function loadPdfjs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'pdfjs/pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = () => { pdfjsReady = null; no(new Error('Could not load the PDF tool. Check internet.')); };
      document.head.appendChild(s);
    });
    return pdfjsReady;
  }
  async function retry(fn) {
    for (let i = 0; ; i++) {
      try { return await fn(); } catch (e) { if (i >= 3) throw e; await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
    }
  }
  let uploading = false;
  async function upload() {
    const file = $('rd-file').files[0], title = $('rd-title').value.trim(), msg = $('rd-msg');
    if (!file) return toast('Choose a PDF first.');
    if (!title) return toast('Type a name for this PDF (customers will see it).');
    if (!S.url || !navigator.onLine) return toast('Needs internet and the Google Drive backup URL.');
    if (uploading) return; uploading = true; $('rd-up').disabled = true;
    try {
      msg.textContent = 'Opening PDF…';
      const lib = await loadPdfjs();
      const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const N = doc.numPages;
      const start = await post({ action: 'bookStart', title, pages: N });
      const ids = new Array(N);
      let next = 1, done = 0;
      const canvas = document.createElement('canvas');
      async function renderPage(n) { // one page at a time on the canvas, uploads run in parallel
        const page = await doc.getPage(n);
        const v1 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: Math.min(2.5, 1240 / v1.width) });
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        page.cleanup();
        return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
      }
      let rendering = Promise.resolve();
      async function worker() {
        while (next <= N) {
          const n = next++;
          const data = await (rendering = rendering.then(() => renderPage(n)));
          const r = await retry(() => post({ action: 'bookPage', bookId: start.bookId, n, data }));
          ids[n - 1] = r.id; done++;
          msg.textContent = `Uploading page ${done} of ${N}… keep this screen open`;
        }
      }
      await Promise.all([worker(), worker(), worker()]);
      const fin = await retry(() => post({ action: 'bookFinish', bookId: start.bookId, title, ids }));
      S.library = fin.books; store.set('ev_library', S.library);
      $('rd-file').value = ''; $('rd-title').value = '';
      renderSettingsCard(`“${title}” added ✓ (${N} pages). You can now tick it on new invoices.`); renderPicker();
    } catch (e) {
      msg.textContent = 'Upload stopped: ' + e.message + '. Please try again.';
    } finally { uploading = false; $('rd-up').disabled = false; }
  }
  $('rd-up').onclick = upload;
  $('rd-refresh').onclick = () => { $('rd-msg').textContent = 'Loading…'; refresh(); };
  $('rd-file').onchange = () => { const f = $('rd-file').files[0]; if (f && !$('rd-title').value) $('rd-title').value = f.name.replace(/\.pdf$/i, ''); };
  $('rd-link-phone').onclick = () => {
    const k = $('rd-key').value.trim();
    if (k.length < 20) return toast('Paste the full reader key from your other phone.');
    S.rkey = k; store.set('ev_rkey', k); toast('Phone linked ✓'); refresh();
  };

  window.Reader = { attach, resetForm, shareText, syncAccess, pendingAccess, openManage, refresh, renderSettingsCard, renderPicker };
  renderPicker();
  setTimeout(() => refresh(true), 2500);
})();
