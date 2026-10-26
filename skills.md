# Guest registration — working rules

Use this when changing the Raj Vidya Kender guest form, the staff page, or the Apps Script behind them. The public site is `formc.parakhforpr.org`. Reception is `formc.parakhforpr.org/staff.html`. Day-to-day setup is in `DEPLOYMENT_GUIDE.md`.

## What is published

`guest-registration-form` is the GitHub Pages branch. It publishes `index.html`, `staff.html`, `config.js`, `CNAME`, and `robots.txt`.

`Code.gs` is not in git. `.gitignore` keeps it out because it holds the spreadsheet id and the staff password. Edit the copy on the computer that deploys the form, then paste the whole file into Apps Script.

After a script change: **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The `/exec` address stays the same. Do not create a new deployment, and do not change `config.js`, unless the web app address itself has changed.

After an HTML change: push this branch.

## Guest links

A link is `https://formc.parakhforpr.org/?t=` plus the token stored on the **Invites** tab. The form opens only when the guest types the email on that same row.

`LINK_VALID_DAYS` is 30. The first request after that script is deployed updates **Expires** to **Created** plus 30 days for rows whose status is still **SENT** or **OPENED**. It does not shorten a date, and it does not change **Token**, **Email**, or **Status**. Rows marked **USED**, **REPLACED**, or **EXPIRED** stay as they are.

Do not replace the spreadsheet file. Do not restore or edit the **Invites** tab while repairing submissions. That is what invalidates links already sent.

## The submissions sheet

`FormC_Submissions` is written by header name. Staff search reads **Full Name** and **Guest Email** only. If **Full Name** has any text, **Verified Name** is not used. The **Email** column is not searched.

Do not move, insert, or delete columns on this sheet. Do not call `moveColumns`. New headers belong at the end of row 1. **OCI Card** and **Document Type** were added after **Next City**. Dragging them, or any other column, moves every guest’s cells with the title.

When copying from a backup, match the title in row 1. Do not paste a block by column letter. Leave **Timestamp** unchanged. Keep **Application ID**, **ACK No**, **Punched By**, and a **PENDING** or **DONE** status if staff have already filled them.

A backup in `FormC_Backups` is safe to restore from only when **Guest Email** still contains real email addresses. A later copy can already have the values in the wrong columns. Put a safety copy outside `FormC_Backups` before a repair. The nightly job keeps about the newest 60 files in that folder.

## Dates

The staff page prints a sheet date through `showCell_` in `Code.gs`. A time-only cell is stored in 1899 and prints as a clock time. Any later year, including a date of birth in 1940 or 1970, prints as `dd/MM/yyyy`. A cutoff of 1971 prints those birth dates as `00:00`.

The guest page formats the date the guest picked. It does not read the saved sheet.

## Do not

- Commit or push `Code.gs`.
- Put the staff password in `config.js` or in this repo.
- Run **Back up now** while repairing the live sheet.
- Press **Save** on the staff page while a row is still under the wrong titles. Save writes the screen back into those columns.
