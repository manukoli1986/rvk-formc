/**
 * e-FRRO Form C — Guest Pre-Registration Backend
 * Raj Vidya Kender, Shahurpur Chhatarpur, New Delhi 110074
 *
 * DEPLOY:
 * 1. Create a Google Sheet. Note its ID (from the URL).
 * 2. Extensions → Apps Script. Paste this file.
 * 3. Set SHEET_ID below.
 * 4. Run setupSheet() once (authorize when prompted) to create headers.
 * 5. Deploy → New deployment → Web app.
 *      Execute as: Me.  Who has access: Anyone.
 * 6. Copy the /exec URL → paste into the HTML form's SCRIPT_URL.
 */

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'FormC_Submissions';

// Lookup sheet you fill manually: Column A = Name, Column B = SmartCard code.
// A header row is assumed (row 1). Put data from row 2 onward.
const LOOKUP_SHEET_NAME = 'SmartCards';

// A filled copy of every submission is emailed to the guest and to this address.
const VERIFY_EMAIL = 'indiaogm@gmail.com';

const HEADERS = [
  'Timestamp','Status','Application ID','ACK No','Punched By',
  // Verification
  'SmartCard','Verified Name',
  // Personal
  'Surname','Given Name','Sex','Date of Birth','Nationality','Special Category',
  // Permanent address abroad
  'Perm Address','Perm City','Perm Country',
  // Address in India
  'India Address','India State','India City/District','India Pin',
  // Passport
  'Passport No','Passport Place (City)','Passport Place (Country)','Passport Issue Date','Passport Valid Till',
  // Visa
  'Visa No','Visa Place (City)','Visa Place (Country)','Visa Issue Date','Visa Valid Till','Visa Type','Visa Sub Type',
  // Arrival
  'Arrived From Country','Arrived From City','Arrived From Place','Arrival Date India','Arrival Date Hotel','Arrival Time','Duration (days)',
  // Departure
  'Departure Date','Departure Time',
  // Other
  'Employed in India','Purpose of Visit','Next Destination','Next Dest Detail',
  // Meta
  'Passport Photo','Passport Front','Passport Last','Visa Photo','Booking Ref','Guest Email','Residential Mobile','Temp/New Mobile','Form Language'
];

function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.clear();
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#1a3a6b').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, HEADERS.length);
  return 'Sheet ready.';
}

/**
 * Verify a smartcard code against the SmartCards lookup sheet.
 * Returns the mapped Name on success. Called with {action:'verify', smartcard:'JHJ038'}.
 */
function verifyCard(smartcard) {
  const code = String(smartcard || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Please enter your smartcard code.' };
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lk = ss.getSheetByName(LOOKUP_SHEET_NAME);
  if (!lk) return { ok: false, error: 'Verification list not set up.' };
  const rows = lk.getRange(2, 1, Math.max(lk.getLastRow() - 1, 0), 2).getValues();
  for (const r of rows) {
    const name = String(r[0] || '').trim();
    const card = String(r[1] || '').trim().toUpperCase();
    if (card && card === code) {
      return { ok: true, name: name, smartcard: code };
    }
  }
  return { ok: false, error: 'Smartcard not found. Please check the code or contact the front desk.' };
}

/**
 * Run once to create the SmartCards lookup sheet with headers + a sample row.
 * Then fill it manually: Column A = Name, Column B = SmartCard.
 */
function setupLookup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let lk = ss.getSheetByName(LOOKUP_SHEET_NAME) || ss.insertSheet(LOOKUP_SHEET_NAME);
  lk.clear();
  lk.getRange(1, 1, 1, 2).setValues([['Name', 'SmartCard']])
    .setFontWeight('bold').setBackground('#1a3a6b').setFontColor('#ffffff');
  lk.getRange(2, 1, 1, 2).setValues([['Mayank Koli', 'JHJ038']]);
  lk.setFrozenRows(1);
  lk.autoResizeColumns(1, 2);
  return 'SmartCards lookup sheet ready. Fill Column A (Name) and Column B (SmartCard).';
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);

    // --- Verification gate (runs before the form is shown to the guest) ---
    if (d.action === 'verify') {
      lock.releaseLock();
      return json(verifyCard(d.smartcard));
    }

    // --- Full submission: re-verify server-side so the gate can't be bypassed ---
    const v = verifyCard(d.smartcard);
    if (!v.ok) return json({ ok: false, error: 'Smartcard verification failed. ' + (v.error || '') });

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME);

    let portraitLink = '', ppFrontLink = '', ppLastLink = '', visaLink = '';
    const folder = getOrCreateFolder('FormC_Photos');
    const idTag = (d.passportNo || d.surname || Date.now());
    if (d.portrait) {
      const b = Utilities.newBlob(Utilities.base64Decode(d.portrait.split(',').pop()), 'image/jpeg', 'portrait_' + idTag + '.jpg');
      const f = folder.createFile(b);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      portraitLink = f.getUrl();
    }
    if (d.ppFront) {
      const b = Utilities.newBlob(Utilities.base64Decode(d.ppFront.split(',').pop()), 'image/jpeg', 'front_' + idTag + '.jpg');
      const f = folder.createFile(b);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      ppFrontLink = f.getUrl();
    }
    if (d.ppLast) {
      const b = Utilities.newBlob(Utilities.base64Decode(d.ppLast.split(',').pop()), 'image/jpeg', 'last_' + idTag + '.jpg');
      const f = folder.createFile(b);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      ppLastLink = f.getUrl();
    }
    if (d.visaImg) {
      const b = Utilities.newBlob(Utilities.base64Decode(d.visaImg.split(',').pop()), 'image/jpeg', 'visa_' + idTag + '.jpg');
      const f = folder.createFile(b);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      visaLink = f.getUrl();
    }

    const nextDetail = (d.nextDestination === 'Outside India')
      ? [d.nextOutsideCountry, d.nextOutsideState].filter(String).join(', ')
      : [d.nextInsideState, d.nextInsideCity].filter(String).join(', ');

    const row = [
      new Date(), 'PENDING', '', '', '',
      v.smartcard, v.name,
      d.surname, d.givenName, d.sex, d.dob, d.nationality, d.specialCategory || 'Others',
      d.permAddress, d.permCity, d.permCountry,
      d.indiaAddress, d.indiaState, d.indiaCity, d.indiaPin,
      d.passportNo, d.passportCity, d.passportCountry, d.passportIssue, d.passportValid,
      d.visaNo, d.visaCity, d.visaCountry, d.visaIssue, d.visaValid, d.visaType, d.visaSubType,
      d.arrivedCountry, d.arrivedCity, d.arrivedPlace, d.arrivalIndia, d.arrivalHotel, d.arrivalTime, d.duration,
      d.departureDate, d.departureTime,
      d.employed, d.purpose, d.nextDestination, nextDetail,
      portraitLink, ppFrontLink, ppLastLink, visaLink, d.bookingRef || '', d.email || '', d.mobile || '', d.tempMobile || '', (d.formLang === 'es' ? 'Español' : 'English')
    ];
    sh.appendRow(row);

    // --- Email a printable filled copy to the guest + verification mailbox ---
    try {
      sendConfirmationEmail(d, v, portraitLink, ppFrontLink, ppLastLink, visaLink, nextDetail);
    } catch (mailErr) {
      // Don't fail the whole submission if email hiccups; row is already saved.
    }

    return json({ ok: true, message: 'Submitted. A copy has been emailed to you. Please show this at the front desk.' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Builds a printable HTML Form C copy and emails it to the guest and VERIFY_EMAIL.
 */
function sendConfirmationEmail(d, v, portraitLink, ppFrontLink, ppLastLink, visaLink, nextDetail) {
  const rows = [
    ['Registered Name (Smartcard)', v.name],
    ['Smartcard Code', v.smartcard],
    ['— Personal —', ''],
    ['Surname', d.surname],
    ['Given Name', d.givenName],
    ['Sex', d.sex],
    ['Date of Birth', fmtDate(d.dob)],
    ['Nationality', d.nationality],
    ['Special Category', d.specialCategory || 'Others'],
    ['— Permanent Address (Abroad) —', ''],
    ['Address', d.permAddress],
    ['City', d.permCity],
    ['Country', d.permCountry],
    ['— Address / Reference in India —', ''],
    ['Address', d.indiaAddress],
    ['State', d.indiaState],
    ['City/District', d.indiaCity],
    ['Pin Code', d.indiaPin],
    ['— Passport —', ''],
    ['Passport No', d.passportNo],
    ['Place of Issue (City)', d.passportCity],
    ['Place of Issue (Country)', d.passportCountry],
    ['Date of Issue', fmtDate(d.passportIssue)],
    ['Valid Till', fmtDate(d.passportValid)],
    ['— Visa —', ''],
    ['Visa No', d.visaNo],
    ['Place of Issue (City)', d.visaCity],
    ['Place of Issue (Country)', d.visaCountry],
    ['Date of Issue', fmtDate(d.visaIssue)],
    ['Valid Till', fmtDate(d.visaValid)],
    ['Type of Visa', d.visaType],
    ['Visa Sub Type', d.visaSubType],
    ['— Arrival —', ''],
    ['Arrived From Country', d.arrivedCountry],
    ['Arrived From City', d.arrivedCity],
    ['Arrived From Place', d.arrivedPlace],
    ['Date of Arrival in India', fmtDate(d.arrivalIndia)],
    ['Date of Arrival at Hotel', fmtDate(d.arrivalHotel)],
    ['Time of Arrival', d.arrivalTime],
    ['Duration of Stay (days)', d.duration],
    ['— Departure from RVK —', ''],
    ['Date of Departure', fmtDate(d.departureDate)],
    ['Time of Departure', d.departureTime],
    ['— Other —', ''],
    ['Employed in India', d.employed],
    ['Purpose of Visit', d.purpose],
    ['Next Destination', d.nextDestination],
    ['Next Destination Detail', nextDetail],
    ['— Contact —', ''],
    ['Email', d.email],
    ['Residential Mobile Number', d.mobile],
    ['New / Temporary Number', d.tempMobile || ''],
    ['Booking Reference', d.bookingRef || '']
  ];

  let body = '';
  rows.forEach(r => {
    if (r[1] === '' && r[0].indexOf('—') === 0) {
      body += '<tr><td colspan="2" style="background:#1a3a6b;color:#fff;font-weight:bold;padding:7px 10px;letter-spacing:.04em">'
            + r[0].replace(/—/g, '').trim() + '</td></tr>';
    } else {
      body += '<tr>'
        + '<td style="padding:7px 10px;border:1px solid #d7deea;background:#f5f7fb;font-weight:600;width:42%">' + escapeHtml(r[0]) + '</td>'
        + '<td style="padding:7px 10px;border:1px solid #d7deea">' + escapeHtml(r[1] || '—') + '</td></tr>';
    }
  });

  const html =
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:auto;color:#12233f">'
    + '<div style="background:#1a3a6b;color:#fff;padding:18px;text-align:center;border-radius:10px 10px 0 0">'
    + '<div style="color:#c9a24b;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Government of India · Form C</div>'
    + '<h2 style="margin:6px 0 2px">Raj Vidya Kender</h2>'
    + '<div style="font-size:13px;opacity:.9">Shahurpur Chhatarpur, New Delhi 110074</div></div>'
    + '<div style="padding:14px 16px;border:1px solid #d7deea;border-top:none">'
    + '<p style="font-size:13px">This is your filled <b>Form C — Arrival Report of Foreigner</b>. '
    + 'Please keep it for your records and present it at check-in. You can print this email.</p>'
    + '<table style="border-collapse:collapse;width:100%;font-size:13px">' + body + '</table>'
    + ((portraitLink || ppFrontLink || ppLastLink || visaLink) ? '<p style="font-size:12px;margin-top:12px">Images on file: '
        + [portraitLink ? '<a href="' + portraitLink + '">photo</a>' : '',
           ppFrontLink ? '<a href="' + ppFrontLink + '">passport front</a>' : '',
           ppLastLink ? '<a href="' + ppLastLink + '">passport last</a>' : '',
           visaLink ? '<a href="' + visaLink + '">visa</a>' : ''].filter(String).join(' · ')
        + '</p>' : '')
    + '<p style="font-size:11px;color:#6b7688;margin-top:14px">Generated ' + new Date().toLocaleString('en-IN') + '. '
    + 'For corrections, contact the front desk before check-in.</p></div></div>';

  const subject = 'Form C — ' + (d.givenName || '') + ' ' + (d.surname || '') + ' (' + v.smartcard + ')';
  const recipients = [];
  if (d.email) recipients.push(d.email);
  recipients.push(VERIFY_EMAIL);

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: subject,
    htmlBody: html
  });
}

function fmtDate(iso) {
  if (!iso) return '';
  const p = String(iso).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso; // DD/MM/YYYY
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getOrCreateFolder(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json({ ok: true, service: 'FormC backend live' });
}

/* ============================================================
   DATA BACKUP
   Two layers:
   1) backupData()    — full dated copy of the whole spreadsheet
                        into a "FormC_Backups" Drive folder.
   2) exportCsvBackup() — a dated CSV snapshot of the submissions
                        tab (easy to open anywhere, small file).
   Run installBackupTrigger() ONCE to schedule both nightly (~2 AM).
   ============================================================ */

// Full spreadsheet copy, dated, into FormC_Backups.
function backupData() {
  const src = DriveApp.getFileById(SHEET_ID);
  const folder = getOrCreateFolder('FormC_Backups');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const copy = src.makeCopy('FormC_Backup_' + stamp, folder);
  pruneOldBackups(folder, 60); // keep ~60 most recent
  return 'Backup created: ' + copy.getName();
}

// Lightweight CSV snapshot of the submissions tab.
function exportCsvBackup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return 'No submissions sheet.';
  const data = sh.getDataRange().getValues();
  const csv = data.map(row =>
    row.map(cell => {
      let s = (cell === null || cell === undefined) ? '' : String(cell);
      if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',')
  ).join('\n');
  const folder = getOrCreateFolder('FormC_Backups');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  folder.createFile('FormC_Submissions_' + stamp + '.csv', csv, MimeType.CSV);
  return 'CSV backup created.';
}

// Keep only the newest N backup files; delete older ones.
function pruneOldBackups(folder, keep) {
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  for (let i = keep; i < files.length; i++) files[i].setTrashed(true);
}

// Run ONCE to schedule nightly backups (~2 AM script timezone).
function installBackupTrigger() {
  // Remove any existing backup triggers first to avoid duplicates.
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'backupData' || fn === 'exportCsvBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupData').timeBased().everyDays(1).atHour(2).create();
  ScriptApp.newTrigger('exportCsvBackup').timeBased().everyDays(1).atHour(2).create();
  return 'Nightly backup scheduled (full copy + CSV) at ~2 AM.';
}

