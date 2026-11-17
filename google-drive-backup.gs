/**
 * EduVerse Invoice – Google Drive backup receiver.
 * Paste this whole file into a new Google Apps Script project (script.google.com),
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * It creates, in YOUR Google Drive:
 *   - a Google Sheet "EduVerse Invoices" (one row per invoice; File > Download > .xlsx anytime)
 *   - a folder "EduVerse Invoice PDFs" with every invoice PDF
 */
const SHEET_NAME = 'EduVerse Invoices';
const FOLDER_NAME = 'EduVerse Invoice PDFs';
const HEADERS = ['Invoice No', 'Date', 'Customer Name', 'Email ID', 'Transaction No', 'PDF(s) Sold',
  'Sub Total (₹)', 'Discount (₹)', 'Total Paid (₹)', 'Promo Code', 'Created At', 'PDF Link'];

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
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
function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() { return out_({ ok: true, sheetUrl: getSheet_().getUrl() }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = getSheet_();
    if (body.action === 'ping') return out_({ ok: true, sheetUrl: ss.getUrl() });
    if (body.action !== 'save') return out_({ ok: false, error: 'Unknown action' });
    const r = body.record, sh = ss.getSheetByName('Invoices') || ss.getSheets()[0];
    // Skip duplicates (same invoice number already saved)
    const last = sh.getLastRow();
    if (last > 1) {
      const found = sh.getRange(2, 1, last - 1, 1).createTextFinder(r.invoice).matchEntireCell(true).findNext();
      if (found) return out_({ ok: true, duplicate: true });
    }
    let link = '';
    if (body.pdf) {
      const blob = Utilities.newBlob(Utilities.base64Decode(body.pdf), 'application/pdf', body.pdfName || (r.invoice + '.pdf'));
      link = getFolder_().createFile(blob).getUrl();
    }
    const d = r.date.split('-').reverse().join('-');
    sh.appendRow([r.invoice, d, r.name, r.email, "'" + r.txn, r.items, r.subtotal, r.discount, r.total, r.promo,
      new Date(r.created), link]);
    return out_({ ok: true, sheetUrl: ss.getUrl() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
