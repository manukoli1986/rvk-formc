# Guest Registration Form — Raj Vidya Kender

Government of India Form C, filled before arrival. Reception registers a **name and one email**. The form link may be shared, but it opens **only when that same email is entered**. Anyone else sees a closed page.

```
Staff page → name + the one email allowed to open the form
        → guest enters that email
        → details, transport, passport, visa, photo, country, departure
        → row in FormC_Submissions (Status = PENDING)
        → check-in: match the passport, collect photocopies, hand over the key
        → within 24 hours: punch e-FRRO, paste Application ID + ACK, Status = DONE
```

Nepal and Bhutan passports do not need a link (GRC only). Do not send one.

---

## What you set once

Open **`Code.gs`** and set the block at the top:

| Setting | Value |
|---|---|
| `SHEET_ID` | The id in the Google Sheet URL, between `/d/` and `/edit` |
| `STAFF_PIN` | A staff password of **at least 8 characters**. Use a phrase, not a 4-digit code. |
| `FORM_BASE_URL` | The guest page address, **no slash at the end**. Use `https://formc.parakhforpr.org`. |
| `VERIFY_EMAIL` | `indiaogm@gmail.com` (already set). Copies of invites, and the photo links, go here. |

`Code.gs` stays in **Apps Script only**. Do not upload it to GitHub. It contains the staff password.

---

## PART A — Google Sheet and Apps Script

1. Create a Google Sheet (or keep the one you already use).
2. **Extensions → Apps Script**. Delete any sample. Paste the whole of **`Code.gs`**. Save.
3. In the editor, select **`checkConfig`** and Run. Allow the permissions (Sheets, Drive, Gmail). Fix anything it reports, save, and run it again until it says the config looks ready.
4. Select **`setupWorkflow`** and Run **once**. This creates **Invites** and makes sure **FormC_Submissions** has every column. Existing submission rows are kept.
5. Select **`installBackupTrigger`** and Run **once**. Nightly backup at about 2 AM.
6. **Deploy → New deployment → gear → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, and copy the URL that ends in `/exec`.

“Anyone” means a guest does not need a Google account. It does not mean anyone can register. The form stays closed unless the email matches a name reception registered.

While testing, **Deploy → Test deployments** gives a `/dev` URL that always runs the latest save. For real guests, use `/exec`. After you edit `Code.gs` later: **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The `/exec` URL stays the same.

Share the **spreadsheet** and the Drive folder **`FormC_Photos`** (created on the first real submission) with every staff member who files Form C. Photos are private to that Google account. They are not “anyone with the link”.

---

## PART B — The website

Upload **only** these files to the GitHub Pages repo (`rvk-formc`), at the top of the repo:

- `index.html` — the guest page
- `staff.html` — reception
- `config.js` — paste the `/exec` URL into `RVK_SCRIPT_URL`
- `robots.txt`
- `CNAME` — already contains `formc.parakhforpr.org`

Do **not** upload `Code.gs`.

At the domain registrar, add one CNAME: name `formc`, value `manukoli1986.github.io`.

The guest page is `https://formc.parakhforpr.org/`.  
Bookmark the staff page on the reception computer: `https://formc.parakhforpr.org/staff.html`.

The guest address can be shared. It still asks for the registered email before any question appears. Do not print a lobby QR of a guest’s personal link.

---

## PART C — Send a link (about half a minute)

1. Open the staff page and enter the staff password. On a shared computer, tap **Lock** when you leave it.
2. Enter the **guest’s full name**.
3. Enter the **one email that is allowed to open the form** (the guest, or the person helping them).
4. Tap **Send registration link**.

They receive a bilingual email from the Gmail account that owns the script, shown as **Raj Vidya Kender**. Ask them to check spam the first time. The same message is copied to `indiaogm@gmail.com`.

If the email does not send, the page still shows the link. Copy it into WhatsApp **only to that person**. Each link works once.

**Walk-in or midnight arrival:** enter the name and email, then **Open on this tablet**. The guest must type that same email. The staff page locks when you hand the tablet over. Enter the password again afterwards.

**They lost the email, or the photos were unusable:** on the recent-link card, **Send the email again** (same link, new 14-day expiry) or **Send a new link**. Sending a new link turns the previous unused link off.

---

## PART D — What the guest sees

Every page starts with: do not pass this form on, or you will be blacklisted for future events. English or Español.

1. Registered email. A different email cannot continue.
2. Name, contact, emergency contact, and home address. The India address shown is Raj Vidya Kender.
3. Airport pickup and flight details. These are optional. Reception can fill them in on arrival.
4. Passport photo page, visa or e-Visa or OCI card, and a passport-size photo, as a photo or a PDF. These are optional. Passport dates and visa country, city, and type are optional. Smart card is optional and is stored beside the name. If the files are not uploaded, the guest brings a soft copy. Reception can upload them on arrival.
5. Country they are coming from.
6. Drop from RVK or not, and whether they go on to another country or another state in India, plus the date and time they leave RVK. These are optional.

If the passport and visa were not uploaded, the form asks the guest to bring a soft copy of both.

`indiaogm@gmail.com` receives the answers and the photo links. The guest’s copy does not include those links.

---

## PART E — Check-in and e-FRRO

**At the desk**

1. On the staff page, search the guest under **Guest at reception**.
2. Fill any field they left blank, then **Save**. **Print form** prints Form C.
3. Match the physical passport. Collect the **photocopy of the passport and the visa**. Two or three reception computers can stay signed in at once.
4. Hand over the key.

**Within 24 hours, in a batch**

1. Filter **Status = PENDING**.
2. The sheet has the guest’s answers in portal order, plus pickup, drop, and emergency contact. Punch the C-Form on `indianfrro.gov.in` (Indian internet connection).
3. Paste **Application ID** and **ACK No**, put your name in **Punched By**, set **Status** to **DONE**.

Column order still follows the portal. Two arrival dates remain for when you type: arrival in India (airport) and arrival at Raj Vidya Kender.

---

## PART F — Backup

After `installBackupTrigger`:

- A full copy of the spreadsheet (submissions **and** invites), nightly, in Drive folder **FormC_Backups**.
- A CSV of **FormC_Submissions** the same night.
- About the newest 60 files are kept.

Run **`backupData`** from Apps Script any time you want a copy now. Photos stay in **FormC_Photos**.

---

## Security

- Sharing the website address does not open the questions. The guest must enter the email reception registered.
- A personal link still asks for that same email. A different email is refused.
- Staff actions need the password. Five wrong tries lock the page for 10 minutes. Too many wrong guest emails lock the gate for 15 minutes.
- Each invitation works once and expires after 14 days (`LINK_VALID_DAYS` in `Code.gs`, maximum 60).
- A newer invitation for the **same name and email** switches the older unused one off. Two guests may share a helper email; after that email is entered, they choose which name.
- Do not publish `Code.gs`. Do not put the staff password in `config.js`.
- Restrict the Sheet, FormC_Photos, and FormC_Backups to named staff.
- Delete rows, photos, and old backups when the compliance period is over.

---

## Local preview

On your computer only, from this folder:

```
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/index.html?t=preview` to click through the form. Any email is accepted on your computer only. Nothing is saved. This preview does not exist on the public site.
