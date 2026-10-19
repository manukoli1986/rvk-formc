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

The copy of `Code.gs` in this repo has placeholders for the sheet id and the staff password. The live script in Apps Script has the real values. Do not commit those.

## What a guest does

Reception sends one email. The link can be forwarded, but the form stays closed until that same email is typed. A different email is refused.

The pages are:

1. Name, email, contact, emergency contact, and home address. The India address is Raj Vidya Kender.
2. Airport pickup and flight details. Optional. If the guest does not have the flight yet, they can email it later, or reception can add it on arrival.
3. Passport photo page and a passport-size photo. Then visa, e-Visa, or an OCI card. A photo or a PDF. Optional. Passport issue and expiry dates, visa country, visa city, and visa type (Tourist or Other) are optional. Smart card sits after the name and is optional. If the passport and visa were not uploaded, the guest brings a soft copy of each. Reception can also upload them at the desk.
4. Country they are coming from.
5. Drop from RVK or not, the next country or Indian state, and when they leave RVK. Optional. They can email the details later, or reception can add them on arrival.

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
| `Code.gs` | Apps Script only. Placeholders in git. Real password stays in Apps Script. |

After a change to `Code.gs`, paste it into Apps Script and use **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The `/exec` URL stays the same. After a change to the HTML, push this branch. GitHub Pages publishes `guest-registration-form`.
