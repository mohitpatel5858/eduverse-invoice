/* EduVerse "Professional" invoice layout, drawn fully in code (A4 portrait). */
'use strict';
(function () {
  const W = 1240, H = 1754, K = 1.7;
  const NAVY = '#082446', NAVY2 = '#163d6e', GOLD = '#f6b81e', GOLD_SOFT = '#fff4d6', INK = '#14213d', GREY = '#6b7689', LINE = '#e2e7ef', GREEN = '#15803d';
  const LAT = 'Pop, Guj, sans-serif', GUJ = 'Guj, Pop, sans-serif';
  const money = n => (Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dmy = iso => { const [y, m, d] = iso.split('-'); return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${y}`; };

  function words(n) {
    n = Math.round(n);
    if (n === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = x => x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? '-' + a[x % 10] : '');
    const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
    const parts = [];
    const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
    if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
    return parts.join(' ');
  }
  function fit(x, text, maxW, weight, size, fam) {
    let s = size; do { x.font = `${weight} ${s}px ${fam}`; if (x.measureText(text).width <= maxW) break; s--; } while (s > 9); return s;
  }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function txt(x, s, X, Y, font, color, align) { x.font = font; x.fillStyle = color; x.textAlign = align || 'left'; x.fillText(s, X, Y); }
  function spaced(x, s, sp) { try { x.letterSpacing = sp + 'px'; } catch (e) {} return () => { try { x.letterSpacing = '0px'; } catch (e) {} }; }

  window.drawInvoicePro = function (r, logo) {
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
    const x = c.getContext('2d'); x.scale(K, K); x.textBaseline = 'alphabetic';
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    const M = 80; // page margin

    /* Header band */
    const g = '#082446';
    x.fillStyle = g; x.fillRect(0, 0, W, 210);
    const lh = 128, lw = logo.width * lh / logo.height; x.drawImage(logo, M - 20, 40, lw, lh);
    let undo = spaced(x, 'INVOICE', 6); txt(x, 'INVOICE', W - M, 118, `700 64px ${LAT}`, '#fff', 'right'); undo();
    undo = spaced(x, '', 2.5); txt(x, 'DIGITAL PRODUCT PURCHASE', W - M, 156, `600 17px ${LAT}`, GOLD, 'right'); undo();
    x.fillStyle = GOLD; x.fillRect(0, 210, W, 8);

    /* Billed to + invoice details */
    let y = 290;
    undo = spaced(x, '', 2); txt(x, 'BILLED TO', M, y, `600 15px ${LAT}`, GREY); undo();
    fit(x, r.name, 560, 700, 32, LAT); x.fillStyle = INK; x.textAlign = 'left'; x.fillText(r.name, M, y + 46);
    fit(x, r.email, 560, 500, 20, LAT); x.fillStyle = NAVY2; x.fillText(r.email, M, y + 82);

    const kx = 740, vx = W - M;
    const rows = [['Invoice No.', r.invoice], ['Invoice Date', dmy(r.date)], ['Transaction No.', r.txn]];
    rows.forEach(([k, v], i) => {
      const yy = y + i * 40;
      txt(x, k, kx, yy, `500 18px ${LAT}`, GREY);
      fit(x, v, 250, 600, 19, LAT); x.fillStyle = INK; x.textAlign = 'right'; x.fillText(v, vx, yy);
    });
    // Paid badge
    const by = y + 3 * 40 - 4; txt(x, 'Payment Status', kx, by + 4, `500 18px ${LAT}`, GREY);
    x.fillStyle = '#e7f6ec'; rr(x, vx - 118, by - 22, 118, 36, 18); x.fill();
    undo = spaced(x, '', 1.5); txt(x, '✓ PAID', vx - 59, by + 3, `700 17px ${LAT}`, GREEN, 'center'); undo();

    /* Items table */
    y = 480;
    const cols = { no: M + 24, desc: M + 90, fmt: 860, amt: W - M - 24 };
    x.fillStyle = NAVY; rr(x, M, y, W - 2 * M, 56, 10); x.fill();
    undo = spaced(x, '', 1.5);
    txt(x, '#', cols.no, y + 36, `600 16px ${LAT}`, '#fff', 'center');
    txt(x, 'DESCRIPTION', cols.desc, y + 36, `600 16px ${LAT}`, '#fff');
    txt(x, 'FORMAT', cols.fmt, y + 36, `600 16px ${LAT}`, '#fff', 'center');
    txt(x, 'AMOUNT (₹)', cols.amt, y + 36, `600 16px ${LAT}`, '#fff', 'right');
    undo();
    y += 56;
    const RH = 112;
    r.items.forEach((it, i) => {
      const top = y + i * RH;
      if (i % 2 === 1) { x.fillStyle = '#f7f9fc'; x.fillRect(M, top, W - 2 * M, RH); }
      txt(x, String(i + 1).padStart(2, '0'), cols.no, top + 62, `600 20px ${LAT}`, GREY, 'center');
      fit(x, 'બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર', 620, 700, 24, GUJ); x.fillStyle = NAVY; x.textAlign = 'left';
      x.fillText('બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર', cols.desc, top + 40);
      fit(x, it.name, 620, 600, 18, LAT); x.fillStyle = INK; x.fillText(it.name, cols.desc, top + 70);
      txt(x, 'Child Development & Pedagogy  ·  TET-1 & TET-2 Master Notes', cols.desc, top + 96, `500 14px ${LAT}`, GREY);
      x.fillStyle = '#fdecec'; rr(x, cols.fmt - 34, top + 38, 68, 30, 6); x.fill();
      txt(x, 'PDF', cols.fmt, top + 59, `700 15px ${LAT}`, '#c62828', 'center');
      txt(x, money(it.price), cols.amt, top + 62, `600 22px ${LAT}`, INK, 'right');
      x.fillStyle = LINE; x.fillRect(M, top + RH - 1, W - 2 * M, 1);
    });
    y += r.items.length * RH + 34;

    /* Amount in words (left) + totals (right) */
    const tx = 760;
    undo = spaced(x, '', 2); txt(x, 'AMOUNT IN WORDS', M, y + 18, `600 14px ${LAT}`, GREY); undo();
    const w = 'Rupees ' + words(r.total) + ' Only';
    fit(x, w, 600, 600, 19, LAT); x.fillStyle = INK; x.textAlign = 'left'; x.fillText(w, M, y + 50);
    txt(x, 'Payment received in full. Thank you!', M, y + 82, `500 16px ${LAT}`, GREEN);

    txt(x, 'Sub Total', tx, y + 18, `500 18px ${LAT}`, GREY); txt(x, '₹ ' + money(r.subtotal), W - M - 24, y + 18, `600 18px ${LAT}`, INK, 'right');
    txt(x, 'Discount', tx, y + 56, `500 18px ${LAT}`, GREY); txt(x, '− ₹ ' + money(r.discount), W - M - 24, y + 56, `600 18px ${LAT}`, INK, 'right');
    x.fillStyle = GOLD; rr(x, tx - 24, y + 78, W - M - tx + 24, 64, 10); x.fill();
    txt(x, 'Total Paid', tx, y + 119, `700 21px ${LAT}`, NAVY);
    txt(x, '₹ ' + money(r.total), W - M - 24, y + 121, `700 28px ${LAT}`, NAVY, 'right');
    y += 190;

    /* Promo code card */
    const ph = 230, pg = x.createLinearGradient(M, y, W - M, y + ph); pg.addColorStop(0, '#08244a'); pg.addColorStop(1, '#163d6e');
    x.fillStyle = pg; rr(x, M, y, W - 2 * M, ph, 18); x.fill();
    x.fillStyle = GOLD; rr(x, M, y, 10, ph, 5); x.fill();
    undo = spaced(x, '', 3); txt(x, '★  SPECIAL BENEFIT', M + 50, y + 58, `700 17px ${LAT}`, GOLD); undo();
    txt(x, 'આ ખરીદી બદલ આપને મળ્યો છે', M + 50, y + 106, `700 26px ${GUJ}`, '#fff');
    txt(x, 'ખાસ Promo Code', M + 50, y + 146, `700 30px ${GUJ}`, GOLD);
    fit(x, 'આગામી કોઈપણ કોર્સ / PDF ખરીદી પર ખાસ ડિસ્કાઉન્ટ મેળવો.', 480, 600, 17, GUJ); x.fillStyle = '#c9d5e6'; x.textAlign = 'left';
    x.fillText('આગામી કોઈપણ કોર્સ / PDF ખરીદી પર ખાસ ડિસ્કાઉન્ટ મેળવો.', M + 50, y + 190);
    // code box
    const bx = 640, bw = W - M - 40 - bx, byy = y + 50, bh = 130;
    x.fillStyle = '#fff'; rr(x, bx, byy, bw, bh, 14); x.fill();
    x.setLineDash([10, 7]); x.strokeStyle = GOLD; x.lineWidth = 3; rr(x, bx + 10, byy + 10, bw - 20, bh - 20, 10); x.stroke(); x.setLineDash([]);
    undo = spaced(x, '', 2); txt(x, 'YOUR PROMO CODE', bx + bw / 2, byy + 44, `600 14px ${LAT}`, GREY, 'center'); undo();
    undo = spaced(x, '', 5); fit(x, r.promo, bw - 60, 700, 44, LAT); x.fillStyle = NAVY; x.textAlign = 'center'; x.fillText(r.promo, bx + bw / 2, byy + 98); undo();
    y += ph + 70;

    /* Thank you */
    txt(x, 'Thank you for learning with EduVerse!', W / 2, y, `700 26px ${LAT}`, NAVY, 'center');
    const ty = 'EduVerse પર વિશ્વાસ મુકવા બદલ આપનો ખુબ ખુબ આભાર. આગામી નવા કોર્સ, PDF અને અપડેટ્સની માહિતી સમયસર આપવામાં આવશે.';
    fit(x, ty, W - 2 * M, 600, 17, GUJ); x.fillStyle = GREY; x.textAlign = 'center'; x.fillText(ty, W / 2, y + 40);

    /* Footer */
    txt(x, 'This is a computer-generated invoice and does not require a signature.', W / 2, H - 140, `500 14px ${LAT}`, '#98a2b3', 'center');
    x.fillStyle = GOLD; x.fillRect(0, H - 104, W, 6);
    x.fillStyle = NAVY; x.fillRect(0, H - 98, W, 98);
    txt(x, 'Edu', M, H - 40, `700 28px ${LAT}`, '#fff');
    const ew = (x.font = `700 28px ${LAT}`, x.measureText('Edu').width);
    txt(x, 'Verse', M + ew, H - 40, `700 28px ${LAT}`, GOLD);
    const vw = x.measureText('Verse').width;
    txt(x, '  Learn • Grow • Achieve • Lead', M + ew + vw, H - 41, `500 17px ${LAT}`, '#c9d5e6');
    txt(x, 'WhatsApp: 94263 27769', W - M, H - 41, `600 18px ${LAT}`, '#fff', 'right');
    x.textAlign = 'left';
    return c;
  };
})();
