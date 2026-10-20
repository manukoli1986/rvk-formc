# Guest Registration Form — Raj Vidya Kender

Government of India Form C, filled before a foreign guest arrives at Raj Vidya Kender, Shahurpur Chhatarpur, New Delhi 110074.

The public site is [formc.parakhforpr.org](https://formc.parakhforpr.org/). Reception uses [formc.parakhforpr.org/staff.html](https://formc.parakhforpr.org/staff.html).

Day-to-day steps are in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## How this was built

The first version asked every guest to type the full government form and to pass a short smartcard code. That was too long for older guests, and a public link or lobby QR could be opened by anyone.

It was rebuilt as a short registration that still lands in the same Google Sheet, in e-FRRO column order, so staff can punch the portal within 24 hours.

Three pieces:

1. **Website** — `index.html` and `staff.html` are static files on GitHub Pages, branch `guest-registration-form`, custom domain `formc.parakhforpr.org`. DNS is a CNAME: `formc` → `manukoli1986.github.io`.
2. **Apps Script web app** — `Code.gs` runs as the Google account that owns the sheet. Deploy it as a web app, **Execute as: Me**, **Who has access: Anyone**. “Anyone” only means a guest does not need a Google login. The `/exec` address goes in `config.js` as `RVK_SCRIPT_URL`.
3. **Google Sheet** — `FormC_Submissions` holds the answers. `Invites` holds the name, email, and one-time token. Photos go in the private Drive folder `FormC_Photos`. A nightly copy goes to `FormC_Backups`.

`Code.gs` is not in this repo. It stays on the computer that edits the form, and in Apps Script, because it holds the sheet id and the staff password.

## What a guest does

Reception sends one email. The link can be forwarded, but the form stays closed until that same email is typed. A different email is refused.

The pages are:

1. Name, email, contact, emergency contact, and home address. The India address is Raj Vidya Kender.
2. Airport pickup and flight details. Optional. If the guest does not have the flight yet, they can email it later, or reception can add it on arrival.
3. Passport photo page and a passport-size photo. Then visa, e-Visa, or an OCI card. A photo or a PDF. Optional. Passport number, issued country and city, and dates are optional. Visa number, issued country and city, dates, and type are optional. If the passport and visa were not uploaded, the guest brings a soft copy of each.
4. Country and city they are coming from. Optional.
5. Drop from RVK or not, the next country and city, and when they leave RVK. Optional. The first page is the only page that must be completed. It includes nationality, date of birth with the age shown on the form, the home phone, and an optional phone number in India.
6. A review of every answer. Empty fields can be left and filled in later. The guest checks the page, goes back to change anything, then submits.

Every page says the form is only for that guest: do not pass it on, or they will be blacklisted for future events, and please cooperate with the volunteers. English and Español. If the passport and visa were not uploaded, the guest brings a soft copy of both.

Nepal and Bhutan passports do not need this link.

## What reception does

The staff page can stay open on two or three computers at once. Each one enters the staff password. Locking one screen does not sign the others out.

- **New guest** — name and the one email allowed to open the form. The email works once and expires after 14 days.
- **Guest at reception** — search the name or email, fill anything left blank, upload missing photos, save, and print Form C.
- Within 24 hours, punch e-FRRO from the sheet, paste Application ID and ACK No, and set Status to DONE.

## Files

| File | Where it lives |
|---|---|
| `index.html` | Guest form. Published. |
| `staff.html` | Reception. Published. |
| `config.js` | Web app `/exec` URL only. No password. Published. |
| `CNAME` | `formc.parakhforpr.org` |
| `robots.txt` | Asks search engines not to index the site. |
| `Code.gs` | Not in git. Apps Script only. The sheet id and staff password stay there. |

After a change to `Code.gs`, paste it into Apps Script and use **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The `/exec` URL stays the same. After a change to the HTML, push this branch. GitHub Pages publishes `guest-registration-form`.
