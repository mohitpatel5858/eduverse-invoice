/* EduVerse "Learning Pass" invoice: modern receipt layout with colour themes (A4 portrait). */
'use strict';
(function () {
  const W = 1240, H = 1754, K = 1.7;
  const LAT = 'Pop, Guj, sans-serif', GUJ = 'Guj, Pop, sans-serif';

  const THEMES = {
    sunrise: {
      label: 'Sunrise (peach & coral)', light: true,
      bg: ['#fffaf3', '#fff3ea', '#ffeef3'], glows: [[1100, 160, 560, 'rgba(255,138,101,0.22)'], [60, 820, 600, 'rgba(255,200,120,0.25)'], [1180, 1500, 620, 'rgba(255,92,147,0.16)']],
      brand: ['#2a1240', '#3d1a5b'], ink: '#1f1633', soft: '#6b6280', faint: '#a29bb3', accent: '#ff5a5f', ok: '#12a150', okBg: 'rgba(18,161,80,0.10)',
      hero: ['#1f1633', '#ff5a5f'], frac: '#ff8a3d', chip: ['#ff8a3d', '#ff3d7f'],
      ticket: ['#ff8a3d', '#ff5a5f', '#ff3d7f'], tInk: '#ffffff', tSoft: 'rgba(255,255,255,0.85)', tLine: 'rgba(255,255,255,0.6)', glowT: 'rgba(255,90,95,0.35)'
    },
    mint: {
      label: 'Fresh Mint (teal & green)', light: true,
      bg: ['#f4fbf9', '#eef8f6', '#f1f7fb'], glows: [[1100, 160, 560, 'rgba(20,184,166,0.20)'], [60, 820, 600, 'rgba(132,204,22,0.16)'], [1180, 1500, 620, 'rgba(56,189,248,0.16)']],
      brand: ['#0b3b3c', '#0f5257'], ink: '#0f2a2b', soft: '#5b7372', faint: '#93a7a6', accent: '#0d9488', ok: '#0d9488', okBg: 'rgba(13,148,136,0.10)',
      hero: ['#0f2a2b', '#0d9488'], frac: '#14b8a6', chip: ['#2dd4bf', '#0d9488'],
      ticket: ['#14b8a6', '#10b981', '#65c466'], tInk: '#ffffff', tSoft: 'rgba(255,255,255,0.88)', tLine: 'rgba(255,255,255,0.6)', glowT: 'rgba(16,185,129,0.35)'
    },
    violet: {
      label: 'Violet Pop (purple & pink)', light: false,
      bg: ['#2e1065', '#5b21b6', '#be185d'], glows: [[1100, 160, 560, 'rgba(244,114,182,0.30)'], [60, 820, 600, 'rgba(129,140,248,0.30)'], [1180, 1500, 620, 'rgba(251,191,36,0.16)']],
      brand: null, ink: '#ffffff', soft: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.5)', accent: '#fde68a', ok: '#86efac', okBg: 'rgba(134,239,172,0.16)',
      hero: ['#ffffff', '#fbcfe8'], frac: '#fde68a', chip: ['#f472b6', '#a855f7'],
      ticket: ['#ffffff', '#fdf4ff', '#fce7f3'], tInk: '#4c1d95', tSoft: 'rgba(76,29,149,0.8)', tLine: 'rgba(76,29,149,0.35)', glowT: 'rgba(255,255,255,0.25)'
    }
  };
  window.PASS_THEMES = Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.label]));

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
  function glow(x, cx, cy, r, color) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
  function card(x, th, X, Y, w, h, r) {
    if (th.light) {
      x.save(); x.shadowColor = 'rgba(40,20,60,0.08)'; x.shadowBlur = 30; x.shadowOffsetY = 8;
      x.fillStyle = 'rgba(255,255,255,0.92)'; rr(x, X, Y, w, h, r); x.fill(); x.restore();
      x.strokeStyle = 'rgba(30,20,50,0.06)'; x.lineWidth = 1.5; rr(x, X + .75, Y + .75, w - 1.5, h - 1.5, r); x.stroke();
    } else {
      x.fillStyle = 'rgba(255,255,255,0.10)'; rr(x, X, Y, w, h, r); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 1.5; rr(x, X + .75, Y + .75, w - 1.5, h - 1.5, r); x.stroke();
    }
  }

  window.drawInvoicePass = function (r, logo, themeName) {
    const th = THEMES[themeName] || THEMES.sunrise;
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
    const x = c.getContext('2d'); x.scale(K, K); x.textBaseline = 'alphabetic';
    const M = 80;

    /* Background */
    const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, th.bg[0]); bg.addColorStop(0.55, th.bg[1]); bg.addColorStop(1, th.bg[2]);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    th.glows.forEach(g => glow(x, ...g));

    /* Brand bar: dark pill on light themes so the logo stays readable */
    if (th.brand) {
      const bgr = x.createLinearGradient(M, 40, W - M, 170); bgr.addColorStop(0, th.brand[0]); bgr.addColorStop(1, th.brand[1]);
      x.fillStyle = bgr; rr(x, M, 40, W - 2 * M, 130, 30); x.fill();
    }
    const lh = 88, lw = logo.width * lh / logo.height; x.drawImage(logo, M + (th.brand ? 18 : -14), 61, lw, lh);
    const pill = 'INVOICE  ·  ' + r.invoice;
    x.font = `600 17px ${LAT}`; const pw = x.measureText(pill).width + 40 + pill.length * 1.5;
    const px = W - M - pw - (th.brand ? 28 : 0);
    x.fillStyle = 'rgba(255,255,255,0.12)'; rr(x, px, 82, pw, 46, 23); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 1.5; rr(x, px, 82, pw, 46, 23); x.stroke();
    T(x, pill, px + pw / 2, 112, `600 17px ${LAT}`, '#ffffff', 'center', 1.5);

    /* Hero amount */
    let y = 285;
    x.fillStyle = th.okBg; rr(x, M, y - 30, 268, 42, 21); x.fill();
    x.fillStyle = th.ok; x.beginPath(); x.arc(M + 24, y - 9, 6, 0, 7); x.fill();
    T(x, 'PAYMENT CONFIRMED', M + 42, y - 2, `700 16px ${LAT}`, th.ok, 'left', 2.5);
    y += 140;
    const whole = '₹' + Math.floor(r.total).toLocaleString('en-IN');
    const frac = '.' + money(r.total).split('.')[1];
    x.font = `700 150px ${LAT}`; const ww = x.measureText(whole).width;
    const hg = x.createLinearGradient(M, y - 120, M + ww, y); hg.addColorStop(0, th.hero[0]); hg.addColorStop(1, th.hero[1]);
    T(x, whole, M - 6, y, `700 150px ${LAT}`, hg);
    T(x, frac, M + ww + 4, y, `700 60px ${LAT}`, th.frac);
    T(x, 'Total paid  ·  ' + dmy(r.date), M, y + 50, `500 22px ${LAT}`, th.soft);
    T(x, 'Welcome to the', W - M, y - 92, `500 20px ${LAT}`, th.soft, 'right');
    T(x, 'EduVerse family', W - M, y - 54, `700 34px ${LAT}`, th.ink, 'right');
    T(x, 'આપનો ખુબ ખુબ આભાર', W - M, y - 14, `700 21px ${GUJ}`, th.accent, 'right');

    /* Details card */
    y += 100;
    const cardH = 190; card(x, th, M, y, W - 2 * M, cardH, 26);
    const cells = [['BILLED TO', r.name, r.email], ['TRANSACTION NO.', r.txn, 'Paid in full'], ['INVOICE DATE', dmy(r.date), r.invoice]];
    const cw = (W - 2 * M) / 3;
    cells.forEach(([k, v, sub], i) => {
      const cx = M + 40 + i * cw;
      if (i) { x.fillStyle = th.light ? 'rgba(30,20,50,0.08)' : 'rgba(255,255,255,0.18)'; x.fillRect(M + i * cw, y + 36, 1.5, cardH - 72); }
      T(x, k, cx, y + 62, `600 14px ${LAT}`, th.faint, 'left', 2.5);
      fit(x, v, cw - 70, 700, 26, LAT); x.fillStyle = th.ink; x.textAlign = 'left'; x.fillText(v, cx, y + 106);
      fit(x, sub, cw - 70, 500, 17, LAT); x.fillStyle = i === 1 ? th.ok : th.soft; x.fillText(sub, cx, y + 140);
    });
    y += cardH + 70;

    /* Items */
    T(x, 'WHAT YOU UNLOCKED', M, y, `700 15px ${LAT}`, th.faint, 'left', 3);
    T(x, r.items.length + (r.items.length > 1 ? ' items' : ' item'), W - M, y, `600 15px ${LAT}`, th.faint, 'right', 1);
    y += 24;
    const IH = 112;
    r.items.forEach((it, i) => {
      const top = y + i * (IH + 14);
      card(x, th, M, top, W - 2 * M, IH, 22);
      const cg = x.createLinearGradient(M + 26, top + 22, M + 94, top + 90); cg.addColorStop(0, th.chip[0]); cg.addColorStop(1, th.chip[1]);
      x.fillStyle = cg; rr(x, M + 26, top + 22, 68, 68, 18); x.fill();
      T(x, 'PDF', M + 60, top + 63, `700 18px ${LAT}`, '#ffffff', 'center', 1);
      const t1 = 'બાળવિકાસ અને શૈક્ષણિક શાસ્ત્ર', t2 = it.name + '   ·   TET-1 & TET-2';
      fit(x, t1, 640, 700, 26, GUJ); x.fillStyle = th.ink; x.textAlign = 'left'; x.fillText(t1, M + 122, top + 50);
      fit(x, t2, 640, 500, 18, LAT); x.fillStyle = th.soft; x.fillText(t2, M + 122, top + 84);
      T(x, '₹' + money(it.price), W - M - 34, top + 68, `700 28px ${LAT}`, th.ink, 'right');
    });
    y += r.items.length * (IH + 14) + 18;
    const tl = `Subtotal ₹${money(r.subtotal)}    ·    Discount −₹${money(r.discount)}    ·    `;
    x.font = `500 18px ${LAT}`; const tlw = x.measureText(tl).width;
    x.font = `700 20px ${LAT}`; const tpw = x.measureText('Paid ₹' + money(r.total)).width;
    T(x, tl, W - M - tpw - tlw, y + 24, `500 18px ${LAT}`, th.soft);
    T(x, 'Paid ₹' + money(r.total), W - M, y + 24, `700 20px ${LAT}`, th.accent === '#fde68a' ? th.accent : th.ink, 'right');
    y += 76;

    /* Promo ticket */
    const tH = 290, tw = W - 2 * M, stubW = 280, cutX = tw - stubW;
    const o = document.createElement('canvas'); o.width = tw * K; o.height = tH * K;
    const t = o.getContext('2d'); t.scale(K, K);
    const tg = t.createLinearGradient(0, 0, tw, tH); tg.addColorStop(0, th.ticket[0]); tg.addColorStop(0.55, th.ticket[1]); tg.addColorStop(1, th.ticket[2]);
    rr(t, 0, 0, tw, tH, 30); t.fillStyle = tg; t.fill();
    t.fillStyle = 'rgba(255,255,255,0.14)'; t.beginPath(); t.moveTo(380, 0); t.lineTo(520, 0); t.lineTo(380, tH); t.lineTo(240, tH); t.fill();
    t.globalCompositeOperation = 'destination-out';
    t.beginPath(); t.arc(cutX, 0, 22, 0, 7); t.arc(cutX, tH, 22, 0, 7); t.fill();
    x.save(); x.shadowColor = th.glowT; x.shadowBlur = 50; x.shadowOffsetY = 12; x.drawImage(o, M, y, tw, tH); x.restore();
    x.setLineDash([10, 9]); x.strokeStyle = th.tLine; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(M + cutX, y + 34); x.lineTo(M + cutX, y + tH - 34); x.stroke(); x.setLineDash([]);
    T(x, '★  SPECIAL BENEFIT  ·  ખાસ Promo Code', M + 50, y + 64, `700 17px ${LAT}`, th.tInk, 'left', 2);
    fit(x, r.promo, cutX - 100, 700, 92, LAT);
    try { x.letterSpacing = '8px'; } catch (e) {}
    x.fillStyle = th.tInk; x.textAlign = 'left'; x.fillText(r.promo, M + 46, y + 168);
    try { x.letterSpacing = '0px'; } catch (e) {}
    const gl = 'આ Promo Code થી EduVerse ની આગામી કોઈપણ કોર્સ / PDF ખરીદી પર ખાસ ડિસ્કાઉન્ટ મેળવો.';
    fit(x, gl, cutX - 100, 600, 19, GUJ); x.fillStyle = th.tSoft; x.fillText(gl, M + 50, y + 218);
    T(x, 'Valid on your next purchase  ·  Share this code on WhatsApp', M + 50, y + 252, `500 15px ${LAT}`, th.tSoft);
    // stub: big % badge
    const sx = M + cutX + stubW / 2, sy = y + 118;
    x.fillStyle = th.light ? 'rgba(255,255,255,0.22)' : 'rgba(76,29,149,0.08)'; x.beginPath(); x.arc(sx, sy, 72, 0, 7); x.fill();
    x.strokeStyle = th.tLine; x.lineWidth = 2; x.beginPath(); x.arc(sx, sy, 72, 0, 7); x.stroke();
    T(x, '%', sx, sy + 30, `700 84px ${LAT}`, th.tInk, 'center');
    T(x, 'OFF ON YOUR', sx, y + tH - 66, `700 15px ${LAT}`, th.tInk, 'center', 2);
    T(x, 'NEXT PURCHASE', sx, y + tH - 42, `700 15px ${LAT}`, th.tInk, 'center', 2);

    /* Footer */
    x.fillStyle = th.light ? 'rgba(30,20,50,0.10)' : 'rgba(255,255,255,0.18)'; x.fillRect(M, H - 150, W - 2 * M, 1.5);
    T(x, 'Edu', M, H - 92, `700 30px ${LAT}`, th.ink);
    x.font = `700 30px ${LAT}`; const ew = x.measureText('Edu').width;
    T(x, 'Verse', M + ew, H - 92, `700 30px ${LAT}`, th.light ? th.accent : '#fde68a');
    T(x, 'Learn  •  Grow  •  Achieve  •  Lead', M, H - 58, `500 17px ${LAT}`, th.soft, 'left', 1);
    T(x, 'WhatsApp  94263 27769', W - M, H - 92, `700 22px ${LAT}`, th.ink, 'right');
    T(x, 'Computer-generated invoice · no signature required', W - M, H - 58, `500 15px ${LAT}`, th.faint, 'right');
    x.textAlign = 'left';
    return c;
  };
})();
