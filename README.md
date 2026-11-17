# EduVerse Invoice app: phone setup

The app is a small website that installs on your phone like a normal app. After the first open it works **with no internet**. All invoices are saved on the phone, and copied to your Google Drive whenever internet is available.

## What it does

1. You type **Name, Email, Transaction no.** and tick **which PDF** was sold. The price fills in by itself.
2. Tap **Generate invoice**. You get your invoice design as a PDF with a new **unique promo code** (like `EDU-8YAQH9`) and the next invoice number (`EV-2026-0001`, `0002`, …).
3. Tap **Share PDF** to send it straight to the customer on WhatsApp or Gmail.
4. Every invoice is added to the **Records** list. Tap **Download Excel** for an .xlsx of all invoices.
5. With Drive backup switched on, every invoice is also added as a row to a Google Sheet called **EduVerse Invoices** and its PDF saved in a Drive folder called **EduVerse Invoice PDFs**. If you are offline, it waits and backs up automatically when internet comes back (top-right badge shows "Backed up ✓" or "2 to back up").

Prices from your poster are already set: offer prices ₹59 and ₹299 until 30 Nov, regular prices ₹199 and ₹499 after. You can change names, prices and the offer date in **Settings**.

---

## Step 1: Install the app on your phone (one time)

1. Open the app link in **Chrome** on your Android phone (link is in the chat).
2. Tap the **⋮** menu (top right) and tap **Add to Home screen** (or **Install app**), then **Install**.
3. Open it once from the home screen while you have internet. That's it: from now on it opens and works in flight mode too.

On iPhone: open the link in **Safari**, tap the **Share** button, then **Add to Home Screen**.

## Step 2: Switch on Google Drive backup (one time, about 5 minutes)

Do this on a computer if you can (it is easier), or in Chrome on the phone with "Desktop site" ticked.

1. Go to **https://script.google.com** and sign in with the Google account whose Drive should hold the backup.
2. Click **New project**.
3. Delete everything in the editor, then paste the whole content of the file **google-drive-backup.gs** (attached in the chat). Click the **Save** icon (💾).
4. Click the blue **Deploy** button, then **New deployment**.
5. Click the gear ⚙ next to "Select type" and pick **Web app**.
6. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
7. Google asks for permission: click **Authorize access**, choose your account. If you see "Google hasn't verified this app", click **Advanced**, then **Go to Untitled project (unsafe)**, then **Allow**. (It is your own script, so this is safe.)
8. Copy the **Web app URL** (it starts with `https://script.google.com/macros/s/` and ends with `/exec`).
9. In the invoice app, open **Settings**, paste the URL in **Backup URL**, tap **Test connection** (should say "Connected ✓"), then **Save**.

Your Drive now has the **EduVerse Invoices** sheet. You can open it in Google Sheets or download it as Excel anytime (File, Download, Microsoft Excel).

Keep the Web app URL private: anyone who has it could add rows to your sheet.

## Good to know

- **Don't clear Chrome's data / site storage** for the app, because that is where invoices live on the phone. Drive backup protects you from this, and **Settings → Save backup file** gives you an extra copy.
- **New phone?** Install the app again, then **Settings → Restore from file** with your backup file, and paste the Backup URL again.
- Same transaction number twice? The app warns you before making a second invoice.
- More than one PDF in one sale? Tick both. Up to 4 items fit on one invoice.
- The transaction number is printed in small text under "Paid" on the invoice.
