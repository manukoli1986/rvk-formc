# Form C Guest Pre-Registration — Deployment Guide
### Raj Vidya Kender · Shahurpur Chhatarpur, New Delhi 110074

Foreign guests fill their Form C details **before** reaching the desk. Data lands
in a Google Sheet; your staff read the Sheet and punch it into the e-FRRO portal.
No queue, no typing at the desk. A printable copy is emailed to the guest and to
`indiaogm@gmail.com`, and the data is backed up nightly.

```
Guest phone → [Smartcard gate: enter code]
            → verified against SmartCards sheet (Name ↔ SmartCard)
            → HTML form opens, Registered Name pre-filled & locked
            → guest fills details + uploads photo, passport pages, visa
            → progress bar while submitting
            → Google Apps Script → Google Sheet  → emailed printable copy
                                        ↓
              Staff punch into e-FRRO portal → paste Application ID + ACK back
                                        ↓
              Nightly backup (full copy + CSV) to FormC_Backups
```

Cost: ₹0. No server to maintain.

---

## PART A — Backend (Google Sheet + Apps Script)

1. Create a new Google Sheet. Copy its **ID** from the URL
   `docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`.
2. In the Sheet: **Extensions → Apps Script**. Delete any sample code.
3. Paste the full contents of **`Code.gs`**.
4. Set `SHEET_ID` at the top to your Sheet ID.
   (Optional) change `VERIFY_EMAIL` if the double-check copy should go elsewhere.
5. From the function dropdown, run **`setupSheet`** once. Authorize when asked
   (your account → Advanced → Go to project → Allow). This creates the
   submissions tab with all column headers.
   **The app also sends email and makes backups**, so the authorization will ask
   for permission to send email and manage Drive files — allow it.
6. Run **`setupLookup`** once. This creates a **`SmartCards`** tab with headers.
7. Open the **`SmartCards`** tab and fill your list:
   **Column A = Name, Column B = SmartCard**, data from row 2 down.
   Only these codes can open the form.
8. Run **`installBackupTrigger`** once to schedule nightly backups (see Part E).
9. **Deploy → New deployment** → gear → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy → copy the **Web app URL** ending in `/exec`.

> **While still testing**, use **Deploy → Test deployments** and its `/dev` URL —
> it always runs the latest saved code, so you never redeploy while tweaking.
> Do one final **New deployment** when you're ready for real guests.

---

## PART B — Guest Form (Cloudflare Pages)

1. Open **`guest-formc.html`**. Set `SCRIPT_URL` (near the bottom of the
   `<script>`) to the `/exec` (or `/dev`) URL from Part A.
2. Host it:
   - **Cloudflare Pages** (recommended): Dashboard → Workers & Pages →
     Create → Pages → upload the file renamed to `index.html`. You get a URL
     like `rvk-formc.pages.dev`, or attach a subdomain e.g. `checkin.rvk.org`.
3. Test on your phone: enter a smartcard from your list, fill a dummy entry,
   confirm a row appears in the Sheet and an email arrives.

---

## PART C — Send the link to guests

- **On booking:** include the form URL in the confirmation email / WhatsApp
  (fire it from your existing n8n flow for foreign bookings).
- **Walk-ins / midnight arrivals:** print a **QR code** of the form URL and
  place it at reception, the entrance, and on 1–2 lobby tablets.

---

## PART D — Daily desk operation

**What the guest provides:** all Form C fields, a passport-size photo, passport
front + last pages, and a visa/eVisa image.

**At check-in (seconds):** find the guest's row (search by name / passport /
smartcard), match the physical passport, hand over the key.

**Filing to e-FRRO (within 24 h, in a batch):**
1. Open the e-FRRO C-Form portal (`indianfrro.gov.in`) — works only from an
   **Indian internet connection**.
2. For each `PENDING` row, punch the fields (Sheet columns follow the portal's
   order). Open the photo/passport/visa links to verify and to upload the photo.
3. After the portal returns an **Application ID** + acknowledgement, paste them
   into the Sheet, put your name in `Punched By`, set `Status` to `DONE`.

Tip: add a filter view on `Status = PENDING` so staff only see unfiled guests.

**Field notes**
- Two arrival dates: *in India* = airport landing; *at Hotel* = arrival at RVK.
- Departure date + time are captured for the departure report.
- Photo compresses under 50 KB; passport/visa pages up to ~200 KB.
- Dates go into the portal as **DD/MM/YYYY** (the emailed copy already shows this).
- **Nepal & Bhutan** passport holders don't need Form C — GRC only.

---

## PART E — Data backup

The script backs up automatically once `installBackupTrigger` has been run:

- **Full copy** of the whole spreadsheet, nightly (~2 AM), named
  `FormC_Backup_YYYY-MM-DD_HHMM`, into a Drive folder **`FormC_Backups`**.
- **CSV snapshot** of the submissions tab the same night, in the same folder —
  small and openable anywhere.
- The newest ~60 backups are kept; older ones are auto-trashed.

**Run a backup on demand:** open Apps Script, select `backupData` (or
`exportCsvBackup`) from the dropdown, click Run.

**Restore:** open any `FormC_Backup_…` file from `FormC_Backups`, or import the
CSV into a fresh Sheet. Guest photos live separately in **`FormC_Photos`** and
are already retained there.

**Off-Google copy (optional):** periodically download a CSV
(`File → Download → CSV`) or the whole Sheet (`File → Download → Excel`) and keep
it on hotel storage, so a backup exists outside the Google account too.

---

## Security / privacy
- The Sheet and both Drive folders hold passport/visa data — restrict sharing to
  named staff only.
- Photos are set to "anyone with link"; tighten to restricted if your staff
  access allows.
- Purge rows, photos, and old backups on a retention schedule once compliance
  is met.

---

## What to re-run after code changes
- Edited `Code.gs` and using an `/exec` URL → **redeploy** (Deploy → Manage
  deployments → Edit → Version: New). Using `/dev` → just save.
- Added a smartcard → just add a row, no redeploy.
- Changed the column layout → re-run `setupSheet` **before** you have live data
  (it clears the tab), or add the new headers manually.
