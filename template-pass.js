/* EduVerse "Learning Pass" invoice: modern dark, glass cards, ticket-style promo with QR (A4 portrait). */
'use strict';
(function () {
  const W = 1240, H = 1754, K = 1.7;
  const GOLD = '#ffc53d', GOLD2 = '#ff9f1c', MINT = '#4ade80', WHITE = '#ffffff', SOFT = 'rgba(255,255,255,0.62)', FAINT = 'rgba(255,255,255,0.38)';
  const LAT = 'Pop, Guj, sans-serif', GUJ = 'Guj, Pop, sans-serif';
  const WA = '919426327769';
  const money = n => (Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dmy = iso => { const [y, m, d] = iso.split('-'); return `${+d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${y}`; };

  function fit(x, t, maxW, wt, size, fam) { let s = size; do { x.font = `${wt} ${s}px ${fam}`; if (x.measureText(t).width <= maxW) break; s--; } while (s > 9); return s; }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function T(x, s, X, Y, font, color, align, sp) {
    x.font = font; x.fillStyle = color; x.textAlign = align || 'left';
    try { x.letterSpacing = (sp || 0) + 'px'; } catch (e) {}
    x.fillText(s, X, Y);
    try { x.letterSpacing = '0px'; } catch (e) {}
  }
  function glow(x, cx, cy, r, color) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
  function glass(x, X, Y, w, h, r) {
    x.fillStyle = 'rgba(255,255,255,0.07)'; rr(x, X, Y, w, h, r); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 1.5; rr(x, X + .75, Y + .75, w - 1.5, h - 1.5, r); x.stroke();
  }
  function qr(x, text, X, Y, size, color) {
    if (typeof qrcode !== 'function') return;
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), m = size / n; x.fillStyle = color;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect(X + c * m, Y + r * m, Math.ceil(m), Math.ceil(m));
  }

  window.drawInvoicePass = function (r, logo) {
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
    const x = c.getContext('2d'); x.scale(K, K); x.textBaseline = 'alphabetic';
    const M = 80;

    /* Background: deep gradient + soft colour glows + subtle grid */
    const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#061634'); bg.addColorStop(0.55, '#0b1f4d'); bg.addColorStop(1, '#1a1150');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    glow(x, 1100, 120, 520, 'rgba(255,197,61,0.20)');
    glow(x, 60, 760, 560, 'rgba(56,120,255,0.22)');
    glow(x, 1180, 1500, 600, 'rgba(147,51,234,0.22)');
    x.strokeStyle = 'rgba(255,255,255,0.035)'; x.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 62) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
    for (let gy = 0; gy <= H; gy += 62) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }

    /* Top bar */
    const lh = 92, lw = logo.width * lh / logo.height; x.drawImage(logo, M - 14, 58, lw, lh);
    const pill = 'INVOICE  ·  ' + r.invoice;
    x.font = `600 17px ${LAT}`; const pw = x.measureText(pill).width + 34 + pill.length * 1.5;
    glass(x, W - M - pw, 82, pw, 46, 23);
    T(x, pill, W - M - pw / 2, 112, `600 17px ${LAT}`, WHITE, 'center', 1.5);

    /* Hero amount */
    let y = 270;
    x.fillStyle = 'rgba(74,222,128,0.14)'; rr(x, M, y - 30, 268, 42, 21); x.fill();
    x.fillStyle = MINT; x.beginPath(); x.arc(M + 24, y - 9, 6, 0, 7); x.fill();
    T(x, 'PAYMENT CONFIRMED', M + 42, y - 2, `700 16px ${LAT}`, MINT, 'left', 2.5);
    y += 140;
    const whole = '₹' + Math.floor(r.total).toLocaleString('en-IN');
    const frac = '.' + money(r.total).split('.')[1];
    x.font = `700 150px ${LAT}`; const ww = x.measureText(whole).width;
    const hg = x.createLinearGradient(M, y - 120, M + ww, y); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#ffe6a6');
    T(x, whole, M - 6, y, `700 150px ${LAT}`, hg);
    T(x, frac, M + ww + 4, y, `700 60px ${LAT}`, GOLD);
    T(x, 'Total paid  ·  ' + dmy(r.date), M, y + 50, `500 22px ${LAT}`, SOFT);

    // Right side of hero: thank-you note in Gujarati
    T(x, 'Welcome to the', W - M, y - 92, `500 20px ${LAT}`, SOFT, 'right');
    T(x, 'EduVerse family', W - M, y - 54, `700 34px ${LAT}`, WHITE, 'right');
    T(x, 'આપનો ખુબ ખુબ આભાર', W - M, y - 14, `600 20px ${GUJ}`, GOLD, 'right');

    /* Details glass card */
    y += 100;
    const cardH = 190; glass(x, M, y, W - 2 * M, cardH, 26);
    const cells = [
      ['BILLED TO', r.name, r.email],
      ['TRANSACTION NO.', r.txn, 'Paid in full'],
      ['INVOICE DATE', dmy(r.date), r.invoice]
    ];
    const cw = (W - 2 * M) / 3;
    cells.forEach(([k, v, sub], i) => {
      const cx = M + 40 + i * cw;
      if (i) { x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(M + i * cw, y + 36, 1.5, cardH - 72); }
      T(x, k, cx, y + 62, `600 14px ${LAT}`, FAINT, 'left', 2.5);
      fit(x, v, cw - 70, 700, 26, LAT); x.fillStyle = WHITE; x.textAlign = 'left'; x.fillText(v, cx, y + 106);
      fit(x, sub, cw - 70, 500, 17, LAT); x.fillStyle = i === 1 ? MINT : SOFT; x.fillText(sub, cx, y + 140);
    });
    y += cardH + 70;

    /* Items */
    T(x, 'WHAT YOU UNLOCKED', M, y, `700 15px ${LAT}`, FAINT, 'left', 3);
    T(x, r.items.length + (r.items.length > 1 ? ' items' : ' item'), W - M, y, `600 15px ${LAT}`, FAINT, 'right', 1);
    y += 24;
    const IH = 112;
    r.items.forEach((it, i) => {
      const top = y + i * (IH + 14);
      glass(x, M, top, W - 2 * M, IH, 22);
      // PDF chip
      const cg = x.createLinearGradient(M + 26, top + 22, M + 94, top + 90); cg.addColorStop(0, '#ff5f6d'); cg.addColorStop(1, '#c81d4e');
      x.fillStyle = cg; rr(x, M + 26, top + 22, 68, 68, 18); x.fill();
      T(x, 'PDF', M + 60, top + 63, `700 18px ${LAT}`, WHITE, 'center', 1);
      fit(x, 'બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર', 640, 700, 26, GUJ); x.fillStyle = WHITE; x.textAlign = 'left'; x.fillText('બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર', M + 122, top + 50);
      fit(x, it.name + '   ·   TET-1 & TET-2', 640, 500, 18, LAT); x.fillStyle = SOFT; x.fillText(it.name + '   ·   TET-1 & TET-2', M + 122, top + 84);
      T(x, '₹' + money(it.price), W - M - 34, top + 68, `700 28px ${LAT}`, WHITE, 'right');
    });
    y += r.items.length * (IH + 14) + 18;
    // Totals line
    const tl = `Subtotal ₹${money(r.subtotal)}    ·    Discount −₹${money(r.discount)}    ·    `;
    x.font = `500 18px ${LAT}`; const tlw = x.measureText(tl).width;
    x.font = `700 20px ${LAT}`; const tpw = x.measureText('Paid ₹' + money(r.total)).width;
    T(x, tl, W - M - tpw - tlw, y + 24, `500 18px ${LAT}`, SOFT);
    T(x, 'Paid ₹' + money(r.total), W - M, y + 24, `700 20px ${LAT}`, GOLD, 'right');
    y += 76;

    /* Promo ticket */
    const th = 300, tx0 = M, tw = W - 2 * M, stubW = 300, cut = tx0 + tw - stubW;
    {
      const o = document.createElement('canvas'); o.width = tw * K; o.height = th * K;
      const t = o.getContext('2d'); t.scale(K, K);
      const tg = t.createLinearGradient(0, 0, tw, th); tg.addColorStop(0, '#ffd166'); tg.addColorStop(0.6, GOLD); tg.addColorStop(1, GOLD2);
      rr(t, 0, 0, tw, th, 30); t.fillStyle = tg; t.fill();
      t.fillStyle = 'rgba(255,255,255,0.18)'; t.beginPath(); t.moveTo(380, 0); t.lineTo(520, 0); t.lineTo(380, th); t.lineTo(240, th); t.fill();
      t.globalCompositeOperation = 'destination-out';
      t.beginPath(); t.arc(cut - tx0, 0, 22, 0, 7); t.arc(cut - tx0, th, 22, 0, 7); t.fill();
      x.save(); x.shadowColor = 'rgba(255,170,30,0.35)'; x.shadowBlur = 50; x.drawImage(o, tx0, y, tw, th); x.restore();
    }
    // perforation
    x.setLineDash([10, 9]); x.strokeStyle = 'rgba(6,22,52,0.45)'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(cut, y + 34); x.lineTo(cut, y + th - 34); x.stroke(); x.setLineDash([]);
    const NV = '#061634';
    T(x, '★  SPECIAL BENEFIT · ખાસ Promo Code', tx0 + 50, y + 66, `700 17px ${LAT}`, NV, 'left', 2);
    fit(x, r.promo, cut - tx0 - 100, 700, 92, LAT);
    try { x.letterSpacing = '8px'; } catch (e) {}
    x.fillStyle = NV; x.textAlign = 'left'; x.fillText(r.promo, tx0 + 46, y + 170);
    try { x.letterSpacing = '0px'; } catch (e) {}
    fit(x, 'આ Promo Code થી EduVerse ની આગામી કોઈપણ કોર્સ / PDF ખરીદી પર ખાસ ડિસ્કાઉન્ટ મેળવો.', cut - tx0 - 100, 600, 19, GUJ);
    x.fillStyle = 'rgba(6,22,52,0.78)'; x.fillText('આ Promo Code થી EduVerse ની આગામી કોઈપણ કોર્સ / PDF ખરીદી પર ખાસ ડિસ્કાઉન્ટ મેળવો.', tx0 + 50, y + 222);
    T(x, 'Valid for one future purchase  ·  Show this code on WhatsApp', tx0 + 50, y + 256, `500 15px ${LAT}`, 'rgba(6,22,52,0.6)');
    // QR on stub
    const qs = 170, qx = cut + (stubW - qs) / 2, qy = y + 40;
    x.fillStyle = '#fff'; rr(x, qx - 14, qy - 14, qs + 28, qs + 28, 18); x.fill();
    qr(x, `https://wa.me/${WA}?text=` + encodeURIComponent(`Hi EduVerse! My promo code is ${r.promo} (Invoice ${r.invoice})`), qx, qy, qs, NV);
    T(x, 'SCAN TO REDEEM', cut + stubW / 2, y + th - 42, `700 15px ${LAT}`, NV, 'center', 2);
    y += th + 74;

    /* Footer */
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(M, H - 150, W - 2 * M, 1.5);
    T(x, 'Edu', M, H - 92, `700 30px ${LAT}`, WHITE);
    x.font = `700 30px ${LAT}`; const ew = x.measureText('Edu').width;
    T(x, 'Verse', M + ew, H - 92, `700 30px ${LAT}`, GOLD);
    T(x, 'Learn  •  Grow  •  Achieve  •  Lead', M, H - 58, `500 17px ${LAT}`, SOFT, 'left', 1);
    T(x, 'WhatsApp  94263 27769', W - M, H - 92, `700 22px ${LAT}`, WHITE, 'right');
    T(x, 'Computer-generated invoice · no signature required', W - M, H - 58, `500 15px ${LAT}`, FAINT, 'right');
    x.textAlign = 'left';
    return c;
  };
})();
