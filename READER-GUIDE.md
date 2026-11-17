# EduVerse customer reader: setup guide

Your customers can read the PDFs they bought in a protected online reader. You choose which PDFs when you make the invoice, and you can add more PDFs for the same person later.

## How it works

- **Your PDFs stay private in your Google Drive.** You add a PDF once in the app. The app turns each page into a picture and stores the pictures in a private Drive folder called **EduVerse Reader Library (private)**. Nothing is put on GitHub or shared publicly.
- **Each customer gets one personal link.** It opens only with the email ID on their invoice, and works on at most **2 devices** (phones/computers).
- **In the reader** there is no download, print, save or copy. Every page shows the customer's **name, email and code** as a watermark, so if someone shares a screenshot you know who did it. Pages hide when the reader window goes to the background.

**Be aware:** no website can fully block screenshots or someone taking a photo of the screen. The watermark is what protects you: a leaked page shows the buyer's name and email.

---

## Step 1: Update your Google script (one time, about 3 minutes)

Do this on a computer if you can.

1. Open **https://script.google.com** and open your existing invoice backup project.
2. Click inside the code, select everything (Ctrl+A) and delete it.
3. Paste the whole new **google-drive-backup.gs** (attached in the chat). Click **Save** (💾).
4. Click **Deploy**, then **Manage deployments**.
5. Click the **pencil ✏️** (Edit) on your existing deployment.
6. Under **Version**, choose **New version**. Click **Deploy**.
   - If Google asks for permission again, click **Authorize access**, choose your account, **Advanced**, **Go to … (unsafe)**, **Allow**. It is your own script.
7. Done. Your **Backup URL stays the same**, so nothing changes in the app settings.

Important: use **Manage deployments → Edit → New version**, not "New deployment". A new deployment gives a new URL and the app would stop backing up.

## Step 2: Update the app on your phone

Open the invoice app with internet on. Close it fully and open it again. In **Settings** you should now see a card called **Customer reader (protected PDFs)**.

The first time the updated app connects, it links itself to your script with a secret **reader key**. After that, only your phone can save invoices or give access. (Using a second phone? See "Good to know" below.)

## Step 3: Add your PDFs (once per PDF)

1. In the app, open **Settings → Customer reader**.
2. Tap **Add a PDF** and choose the PDF from your phone.
3. Type the **name customers will see**, for example *Master All in One PDF*.
4. Tap **Add to reader**. Keep the screen open while it uploads (about 1 to 3 seconds per page on good internet).
5. When it says **added ✓**, it appears in the list.

## Step 4: Give access when you make an invoice

1. Fill in the invoice as usual and tick **which PDF was sold**.
2. Below that, under **PDFs they can read online**, tick the PDFs this customer should read.
3. Tap **Generate invoice**, then **Share PDF**. The invoice PDF now has a yellow **OPEN YOUR PDFs** button at the bottom, and the WhatsApp / email message also contains the link.

The link starts working as soon as the invoice is backed up to Drive (top-right badge shows **Backed up ✓**).

## Step 5: Add more PDFs for the same person later

1. Open **Records**, find the customer and tap **Reader**.
2. Tick the extra PDFs (or untick one to remove it) and tap **Save access**.
3. Tap **Send link** if you want to message them again. **The link stays the same**, the new PDFs just appear.

A new invoice for a customer who already has a link also reuses the same link.

## What the customer sees

1. They tap the link. A Google page opens with a small grey note at the top ("This application was created by a Google Apps Script user"). That note is normal.
2. They type the email ID from their invoice and tap **Open**.
3. They see their PDFs, tap one, and scroll through the pages. Each page has their name and email on it.

## Managing access in Google Sheets

Open your **EduVerse Invoices** Google Sheet. There are two new tabs:

- **Reader Access**: one row per customer.
  - To **block** someone: change **Active** to `NO`.
  - Customer got a **new phone**: clear their **Device IDs** cell. They can then open it on 2 new devices.
  - Want to allow **more devices** for someone: change **Max Devices** (for example to 3).
  - Don't edit **Book IDs**: use the app's **Reader** button to change PDFs.
- **Reader Library**: one row per PDF you added. Don't edit it here: to remove a PDF, use **Delete** next to it in the app (Settings → Customer reader). It disappears for every customer, and its page pictures go to your Drive bin.

## Good to know

- **Second phone:** on the first phone open **Settings → Customer reader → Reader key**, copy the key, and on the second phone paste it in the same box and tap **Link this phone**. Keep this key private.
- **Settings → Save backup file** now also saves your reader links and key. Keep that file private.
- Updating a PDF: add the new version with the same name, then use **Reader** in Records to tick the new one and untick the old one for each customer, or delete the old row in **Reader Library**.
- A customer who opens too many pages very fast (over 2000 in 6 hours) is paused for a while. That stops someone copying everything with a script.
