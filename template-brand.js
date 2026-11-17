/* EduVerse "Brand Edge" invoice: asymmetric navy sidebar + gold accents, brand colours only (A4 portrait). */
'use strict';
(function () {
  const W = 1240, H = 1754, K = 1.7;
  const NAVY = '#082446', NAVY2 = '#12376b', GOLD = '#fcc419', GOLD2 = '#f5a800', WHITE = '#ffffff', PAPER = '#fbfcfe';
  const INK = '#0b1f3f', SOFT = '#5c6b84', FAINT = '#9aa6b8', SIDE_SOFT = 'rgba(255,255,255,0.62)';
  const LAT = 'Pop, Guj, sans-serif', GUJ = 'Guj, Pop, sans-serif';
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

  window.drawInvoiceBrand = function (r, logo) {
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
    const x = c.getContext('2d'); x.scale(K, K); x.textBaseline = 'alphabetic';
    x.fillStyle = PAPER; x.fillRect(0, 0, W, H);

    /* ---- Right side decoration: gold + navy diagonal slashes, top-right corner ---- */
    x.fillStyle = NAVY; x.beginPath(); x.moveTo(W - 300, 0); x.lineTo(W, 0); x.lineTo(W, 260); x.closePath(); x.fill();
    x.fillStyle = GOLD; x.beginPath(); x.moveTo(W - 380, 0); x.lineTo(W - 330, 0); x.lineTo(W, 300); x.lineTo(W, 345); x.closePath(); x.fill();
    // dotted grid accent
    x.fillStyle = 'rgba(8,36,70,0.10)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(470 + i * 22, 1660 - j * 22, 3, 0, 7); x.fill(); }

    /* ---- Left navy sidebar ---- */
    const SW = 380;
    const sg = x.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, NAVY); sg.addColorStop(1, NAVY2);
    x.fillStyle = sg; x.fillRect(0, 0, SW, H);
    // giant vertical watermark word
    x.save(); x.translate(300, H - 90); x.rotate(-Math.PI / 2);
    T(x, 'INVOICE', 0, 0, `700 230px ${LAT}`, 'rgba(255,255,255,0.045)', 'left', 12); x.restore();
    // gold edge line
    x.fillStyle = GOLD; x.fillRect(SW - 8, 0, 8, H);
    // logo
    const lw = 300, lh = logo.height * lw / logo.width; x.drawImage(logo, 36, 70, lw, lh);

    // meta blocks
    let sy = 300;
    const meta = [['INVOICE NO.', r.invoice], ['ISSUED ON', dmy(r.date)], ['TRANSACTION NO.', r.txn]];
    meta.forEach(([k, v]) => {
      T(x, k, 50, sy, `600 14px ${LAT}`, GOLD, 'left', 3);
      fit(x, v, SW - 100, 600, 24, LAT); x.fillStyle = WHITE; x.textAlign = 'left'; x.fillText(v, 50, sy + 38);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(50, sy + 64, SW - 110, 1.5);
      sy += 112;
    });
    T(x, 'PAYMENT STATUS', 50, sy, `600 14px ${LAT}`, GOLD, 'left', 3);
    x.fillStyle = GOLD; rr(x, 50, sy + 16, 150, 46, 23); x.fill();
    T(x, 'PAID  ✓', 125, sy + 47, `700 19px ${LAT}`, NAVY, 'center', 2);

    // sidebar bottom: contact
    T(x, 'NEED HELP?', 50, H - 230, `600 14px ${LAT}`, GOLD, 'left', 3);
    T(x, 'WhatsApp', 50, H - 196, `500 17px ${LAT}`, SIDE_SOFT);
    T(x, '94263 27769', 50, H - 162, `700 26px ${LAT}`, WHITE, 'left', 1);
    T(x, 'Learn • Grow • Achieve • Lead', 50, H - 100, `500 15px ${LAT}`, SIDE_SOFT, 'left', 0.5);

    /* ---- Right content ---- */
    const L = SW + 70, R = W - 80, CW = R - L;
    let y = 150;
    T(x, 'DIGITAL PRODUCT PURCHASE', L, y, `600 15px ${LAT}`, SOFT, 'left', 3);
    y += 92;
    T(x, 'Thank you,', L, y, `500 34px ${LAT}`, SOFT);
    y += 64;
    fit(x, r.name, CW - 90, 700, 54, LAT); x.fillStyle = INK; x.textAlign = 'left'; x.fillText(r.name, L, y);
    y += 44;
    fit(x, r.email, CW, 500, 21, LAT); x.fillStyle = SOFT; x.fillText(r.email, L, y);

    // Amount with marker highlight
    y += 160;
    T(x, 'AMOUNT PAID', L, y - 112, `600 15px ${LAT}`, SOFT, 'left', 3);
    const amt = '₹' + money(r.total);
    x.font = `700 104px ${LAT}`; const aw = x.measureText(amt).width;
    x.save(); x.fillStyle = GOLD; x.translate(L - 14, y - 30); x.rotate(-0.012); rr(x, 0, 0, aw + 40, 46, 6); x.fill(); x.restore();
    T(x, amt, L, y, `700 104px ${LAT}`, NAVY);
    T(x, 'Rupees ' + words(r.total) + ' only', L, y + 46, `500 19px ${LAT}`, SOFT);

    // Items
    y += 130;
    T(x, 'YOUR ORDER', L, y, `600 15px ${LAT}`, SOFT, 'left', 3);
    x.fillStyle = NAVY; x.fillRect(L, y + 18, CW, 3);
    y += 21;
    const IH = 118;
    r.items.forEach((it, i) => {
      const top = y + i * IH;
      T(x, String(i + 1).padStart(2, '0'), L, top + 76, `700 46px ${LAT}`, GOLD);
      const t1 = 'બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર';
      fit(x, t1, CW - 300, 700, 25, GUJ); x.fillStyle = INK; x.textAlign = 'left'; x.fillText(t1, L + 90, top + 50);
      fit(x, it.name, CW - 300, 600, 18, LAT); x.fillStyle = NAVY2; x.fillText(it.name, L + 90, top + 80);
      T(x, 'PDF  ·  TET-1 & TET-2 Master Notes', L + 90, top + 104, `500 14px ${LAT}`, FAINT, 'left', 0.5);
      T(x, '₹' + money(it.price), R, top + 70, `700 26px ${LAT}`, INK, 'right');
      x.fillStyle = 'rgba(8,36,70,0.10)'; x.fillRect(L, top + IH - 1, CW, 1.5);
    });
    y += r.items.length * IH + 44;
    T(x, 'Sub Total', R - 230, y, `500 18px ${LAT}`, SOFT); T(x, '₹' + money(r.subtotal), R, y, `600 18px ${LAT}`, INK, 'right');
    T(x, 'Discount', R - 230, y + 34, `500 18px ${LAT}`, SOFT); T(x, '−₹' + money(r.discount), R, y + 34, `600 18px ${LAT}`, INK, 'right');
    x.fillStyle = NAVY; x.fillRect(R - 230, y + 54, 230, 2);
    T(x, 'Total', R - 230, y + 90, `700 21px ${LAT}`, NAVY); T(x, '₹' + money(r.total), R, y + 90, `700 24px ${LAT}`, NAVY, 'right');
    y += 160;

    /* ---- Promo ticket: gold, breaking out over the sidebar ---- */
    const TX = SW - 90, TW = W - 60 - TX, TH = 270, stub = 250, cut = TW - stub;
    const o = document.createElement('canvas'); o.width = TW * K; o.height = TH * K;
    const t = o.getContext('2d'); t.scale(K, K);
    const tg = t.createLinearGradient(0, 0, TW, TH); tg.addColorStop(0, '#ffd43b'); tg.addColorStop(1, GOLD2);
    rr(t, 0, 0, TW, TH, 26); t.fillStyle = tg; t.fill();
    t.fillStyle = 'rgba(255,255,255,0.16)'; t.beginPath(); t.moveTo(cut - 260, 0); t.lineTo(cut - 170, 0); t.lineTo(cut - 290, TH); t.lineTo(cut - 380, TH); t.fill();
    t.globalCompositeOperation = 'destination-out'; t.beginPath(); t.arc(cut, 0, 20, 0, 7); t.arc(cut, TH, 20, 0, 7); t.fill();
    x.save(); x.shadowColor = 'rgba(8,36,70,0.28)'; x.shadowBlur = 40; x.shadowOffsetY = 14; x.drawImage(o, TX, y, TW, TH); x.restore();
    x.setLineDash([9, 8]); x.strokeStyle = 'rgba(8,36,70,0.4)'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(TX + cut, y + 30); x.lineTo(TX + cut, y + TH - 30); x.stroke(); x.setLineDash([]);
    T(x, '★  SPECIAL BENEFIT', TX + 46, y + 58, `700 16px ${LAT}`, NAVY, 'left', 3);
    T(x, 'આ ખરીદી બદલ આપને મળ્યો છે ખાસ Promo Code', TX + 46, y + 96, `700 21px ${GUJ}`, NAVY);
    fit(x, r.promo, cut - 130, 700, 80, LAT);
    try { x.letterSpacing = '7px'; } catch (e) {}
    x.fillStyle = NAVY; x.textAlign = 'left'; x.fillText(r.promo, TX + 42, y + 186);
    try { x.letterSpacing = '0px'; } catch (e) {}
    const gl = 'EduVerse ની આગામી કોઈપણ કોર્સ / PDF ખરીદી પર ખાસ ડિસ્કાઉન્ટ મેળવો.';
    fit(x, gl, cut - 90, 600, 17, GUJ); x.fillStyle = 'rgba(8,36,70,0.78)'; x.fillText(gl, TX + 46, y + 230);
    // stub
    const sx = TX + cut + stub / 2;
    x.fillStyle = NAVY; x.beginPath(); x.arc(sx, y + 112, 62, 0, 7); x.fill();
    T(x, '%', sx, y + 138, `700 72px ${LAT}`, GOLD, 'center');
    T(x, 'ON YOUR', sx, y + TH - 64, `700 14px ${LAT}`, NAVY, 'center', 2.5);
    T(x, 'NEXT PURCHASE', sx, y + TH - 40, `700 14px ${LAT}`, NAVY, 'center', 2.5);
    y += TH + 80;

    /* ---- Closing note ---- */
    T(x, 'EduVerse પર વિશ્વાસ મુકવા બદલ', L, y, `700 24px ${GUJ}`, INK);
    T(x, 'આપનો ખુબ ખુબ આભાર.', L, y + 38, `700 24px ${GUJ}`, INK);
    fit(x, 'આગામી નવા કોર્સ, PDF અને અપડેટ્સની માહિતી આપને સમયસર આપવામાં આવશે.', CW, 600, 17, GUJ); x.fillStyle = SOFT; x.textAlign = 'left';
    x.fillText('આગામી નવા કોર્સ, PDF અને અપડેટ્સની માહિતી આપને સમયસર આપવામાં આવશે.', L, y + 76);
    T(x, 'Computer-generated invoice · no signature required', R, H - 60, `500 14px ${LAT}`, FAINT, 'right');
    x.textAlign = 'left';
    return c;
  };

  function words(n) {
    n = Math.round(n); if (n === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = v => v < 20 ? a[v] : t[Math.floor(v / 10)] + (v % 10 ? '-' + a[v % 10] : '');
    const three = v => (v >= 100 ? a[Math.floor(v / 100)] + ' Hundred' + (v % 100 ? ' ' : '') : '') + (v % 100 ? two(v % 100) : '');
    const p = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
    if (cr) p.push(three(cr) + ' Crore'); if (lk) p.push(two(lk) + ' Lakh'); if (th) p.push(two(th) + ' Thousand'); if (n) p.push(three(n));
    return p.join(' ');
  }
})();
