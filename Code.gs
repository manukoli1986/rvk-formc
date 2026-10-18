/**
 * Raj Vidya Kender — private passport-photo links for Form C.
 * Shahurpur Chhatarpur, New Delhi 110074
 *
 * Guest flow: staff register a name and one explicit email. The form link can
 * be forwarded, but it opens only when that same email is entered. The guest
 * then completes registration (details, transport, passport, visa, photo,
 * country, departure). Answers land in FormC_Submissions.
 *
 * DO NOT publish this file on GitHub Pages. It holds the staff password.
 * The public site is only index.html, staff.html, config.js, robots.txt, CNAME.
 *
 * DEPLOY:
 * 1. Put your values in the CONFIG block below.
 * 2. Extensions → Apps Script. Paste this file. Save.
 * 3. Run setupWorkflow once and authorize.
 * 4. Run installBackupTrigger once.
 * 5. Deploy → New deployment → Web app.
 *      Execute as: Me.  Who has access: Anyone.
 * 6. Copy the /exec URL into config.js (RVK_SCRIPT_URL).
 * 7. After later edits: Deploy → Manage deployments → pencil → Version: New.
 */

/* ============================ CONFIG ============================ */
const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const STAFF_PIN = 'PASTE_A_STAFF_PIN_HERE'; // at least 8 characters
const FORM_BASE_URL = 'https://formc.rajvidyakender.org'; // no slash at the end
const VERIFY_EMAIL = 'indiaogm@gmail.com';
const LINK_VALID_DAYS = 14;
const TIMEZONE = 'Asia/Kolkata';

const SHEET_NAME = 'FormC_Submissions';
const INVITE_SHEET = 'Invites';
const PHOTO_FOLDER = 'FormC_Photos';

const HEADERS = [
  'Timestamp', 'Status', 'Application ID', 'ACK No', 'Punched By',
  'SmartCard', 'Verified Name',
  'Surname', 'Given Name', 'Sex', 'Date of Birth', 'Nationality', 'Special Category',
  'Perm Address', 'Perm City', 'Perm Country',
  'India Address', 'India State', 'India City/District', 'India Pin',
  'Passport No', 'Passport Place (City)', 'Passport Place (Country)', 'Passport Issue Date', 'Passport Valid Till',
  'Visa No', 'Visa Place (City)', 'Visa Place (Country)', 'Visa Issue Date', 'Visa Valid Till', 'Visa Type', 'Visa Sub Type',
  'Arrived From Country', 'Arrived From City', 'Arrived From Place', 'Arrival Date India', 'Arrival Date Hotel', 'Arrival Time', 'Duration (days)',
  'Departure Date', 'Departure Time',
  'Employed in India', 'Purpose of Visit', 'Next Destination', 'Next Dest Detail',
  'Passport Photo', 'Passport Front', 'Passport Last', 'Visa Photo',
  'Booking Ref', 'Guest Email', 'Residential Mobile', 'Temp/New Mobile', 'Form Language',
  'Capture Method',
  'Full Name', 'Contact Number', 'Emergency Contact Name', 'Emergency Contact Number',
  'Airport Pickup', 'Pickup Place', 'Airline', 'Flight Number', 'Flight From',
  'Flight Arrival Date', 'Flight Arrival Time', 'RVK Arrival Date', 'RVK Arrival Time',
  'Coming From Country', 'Drop Facility', 'Drop Place', 'Drop Date', 'Drop Time',
  'Next Country', 'Next State', 'Next City'
];

const INVITE_HEADERS = [
  'Name', 'Email', 'Token', 'Created', 'Expires', 'Status', 'Used At', 'Submission Row'
];

const INVITE_HEADER_NOTES = {
  'Status': 'SENT = email created. OPENED = they opened the link. USED = photos are in FormC_Submissions. REPLACED = a newer link was sent for the same person. EXPIRED = the date passed.',
  'Token': 'Hidden on purpose. Staff resend from the staff page. Unhide this column only if you must recover a link.'
};

const SUBMISSION_HEADER_NOTES = {
  'Status': 'PENDING = photos are in, not yet filed on e-FRRO. DONE = filed. Paste Application ID, ACK No, and Punched By.',
  'Passport Photo': 'Passport-size photo from the guest. Confirm it is clear. The e-FRRO portal needs it under 50 KB.',
  'Capture Method': 'Guest registration form. Check the photos, then punch the remaining portal fields and mark DONE.',
  'Passport Front': 'Photo page of the passport (the page with the photograph).',
  'Passport Last': 'Last page of the passport.',
  'Visa Photo': 'Visa sticker or e-Visa. "No visa page" means the guest said they do not have one.'
};

function setupWorkflow() {
  const ready = configStatus_();
  if (ready !== 'Config looks ready.') return notify_(ready);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sub = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaders_(sub, HEADERS);
  applyHeaderNotes_(sub, SUBMISSION_HEADER_NOTES);
  sub.setFrozenRows(1);
  formatDateColumn_(sub, 'Timestamp');

  const inv = ss.getSheetByName(INVITE_SHEET) || ss.insertSheet(INVITE_SHEET);
  ensureHeaders_(inv, INVITE_HEADERS);
  applyHeaderNotes_(inv, INVITE_HEADER_NOTES);
  inv.setFrozenRows(1);
  formatDateColumn_(inv, 'Created');
  formatDateColumn_(inv, 'Expires');
  formatDateColumn_(inv, 'Used At');
  const tokenCol = headerMap_(inv)['Token'];
  if (tokenCol) inv.hideColumns(tokenCol);

  return notify_('Photo workflow is ready. Existing submission rows were kept. Invites has its own tab.');
}

/** Old menu name. Does not erase rows. */
function setupSheet() {
  return setupWorkflow();
}

/** Smartcards are no longer the gate. */
function setupLookup() {
  return 'Smartcards are no longer used. Run setupWorkflow, then send private links from the staff page.';
}

function checkConfig() {
  return notify_(configStatus_());
}

function configStatus_() {
  const problems = [];
  if (!SHEET_ID || String(SHEET_ID).indexOf('PASTE_') === 0) problems.push('Set SHEET_ID');
  if (!STAFF_PIN || String(STAFF_PIN).indexOf('PASTE_') === 0 || String(STAFF_PIN).length < 8) {
    problems.push('Set STAFF_PIN to a password of at least 8 characters');
  }
  try { assertBaseUrl_(); } catch (e) { problems.push(e.message); }
  if (!VERIFY_EMAIL || validEmail_(VERIFY_EMAIL) === false) problems.push('Set VERIFY_EMAIL');
  if (!problems.length) return 'Config looks ready.';
  return problems.join(' | ');
}

function notify_(message) {
  Logger.log(message);
  try { SpreadsheetApp.getUi().alert(message); } catch (ignore) {}
  return message;
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Form C')
    .addItem('Set up photo workflow', 'setupWorkflow')
    .addItem('Check config', 'checkConfig')
    .addItem('Back up now', 'backupData')
    .addToUi();
}

function doGet() {
  return json_({ ok: true, service: 'RVK passport photo links' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, code: 'bad-request' });
    if (!lock.tryLock(30000)) return json_({ ok: false, code: 'busy' });
    locked = true;
    const data = JSON.parse(e.postData.contents);
    return json_(handle_(data || {}));
  } catch (err) {
    const code = (err && err.code) ? err.code : 'error';
    return json_({ ok: false, code: code, error: publicError_(err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function handle_(d) {
  const action = String(d.action || '');
  if (action === 'unlockEmail') return unlockEmail_(d);
  if (action === 'submitForm') return submitForm_(d);
  if (action === 'openInvite' || action === 'submitPhotos') {
    return { ok: false, code: 'email', error: 'Enter the email address this registration was sent to.' };
  }
  if (action === 'listInvites') return listInvites_(d.pin);
  if (action === 'createInvite') return createInvite_(d);
  if (action === 'resendInvite') return resendInvite_(d);
  return { ok: false, code: 'bad-request', error: 'Unknown action.' };
}

function checkPin_(pin) {
  if (!STAFF_PIN || String(STAFF_PIN).indexOf('PASTE_') === 0 || String(STAFF_PIN).length < 8) {
    return {
      ok: false,
      code: 'config',
      error: 'Set STAFF_PIN in Code.gs to a password of at least 8 characters, then redeploy the web app.'
    };
  }
  const cache = CacheService.getScriptCache();
  let fails = 0;
  try { fails = Number(cache.get('staffPinFails') || 0); } catch (ignore) { fails = 0; }
  if (fails >= 5) {
    return { ok: false, code: 'locked', error: 'Too many tries. Please wait 10 minutes.' };
  }
  if (String(pin || '') !== String(STAFF_PIN)) {
    try { cache.put('staffPinFails', String(fails + 1), 600); } catch (ignore) {}
    return { ok: false, code: 'pin', error: 'That password is not correct.' };
  }
  try { cache.remove('staffPinFails'); } catch (ignore) {}
  return { ok: true };
}

function emailGateBlocked_() {
  try {
    return Number(CacheService.getScriptCache().get('emailGateFails') || 0) >= 30;
  } catch (ignore) {
    return false;
  }
}

function noteEmailFail_() {
  try {
    const cache = CacheService.getScriptCache();
    const n = Number(cache.get('emailGateFails') || 0);
    cache.put('emailGateFails', String(n + 1), 900);
  } catch (ignore) {}
}

function unlockEmail_(d) {
  if (emailGateBlocked_()) {
    return { ok: false, code: 'locked', error: 'Too many tries. Please wait 15 minutes.' };
  }
  const email = normEmail_(d.email);
  if (!validEmail_(email)) {
    return { ok: false, code: 'email', error: 'Enter the email address this registration was sent to.' };
  }
  const token = normalizeToken_(d.token);
  const pack = readInvites_();
  if (token) {
    const linked = findInvite_(pack.rows, token);
    if (linked && normEmail_(linked.email) !== email) {
      noteEmailFail_();
      return { ok: false, code: 'email-mismatch', error: 'This email does not match this invitation. Use the email Raj Vidya Kender registered.' };
    }
  }
  const open = [];
  let used = null;
  for (let i = 0; i < pack.rows.length; i++) {
    const row = pack.rows[i];
    if (normEmail_(row.email) !== email) continue;
    if (token && row.token !== token) continue;
    if (row.status === 'REPLACED') continue;
    if (row.status === 'USED') { used = row; continue; }
    if (row.status === 'EXPIRED' || isExpired_(row.expires)) {
      if (row.status !== 'EXPIRED' && (row.status === 'SENT' || row.status === 'OPENED')) {
        setCell_(pack.sh, pack.map, row.row, 'Status', 'EXPIRED');
      }
      continue;
    }
    if (row.status === 'SENT' || row.status === 'OPENED') open.push(row);
  }
  if (!open.length) {
    if (used) return { ok: true, state: 'used', name: used.name };
    noteEmailFail_();
    if (token) return { ok: false, code: 'expired', error: 'This invitation is no longer active. Ask Raj Vidya Kender to send a new one.' };
    return { ok: false, code: 'email', error: 'This email is not registered. Only the email given to Raj Vidya Kender can open this form.' };
  }
  if (open.length > 1) {
    const guests = [];
    for (let i = 0; i < open.length; i++) guests.push({ name: open[i].name, token: open[i].token });
    return { ok: true, state: 'choose', guests: guests };
  }
  const row = open[0];
  if (row.status === 'SENT') setCell_(pack.sh, pack.map, row.row, 'Status', 'OPENED');
  return { ok: true, state: 'open', name: row.name, email: row.email, token: row.token };
}

function submitForm_(d) {
  const email = normEmail_(d.email);
  const tokenCheck = normalizeToken_(d.token);
  if (!validEmail_(email) || !tokenCheck) return { ok: false, code: 'email', error: 'Enter the email address this registration was sent to.' };
  const pack = readInvites_();
  const row = findInvite_(pack.rows, tokenCheck);
  if (!row || normEmail_(row.email) !== email) {
    noteEmailFail_();
    return { ok: false, code: 'email-mismatch', error: 'This email does not match this invitation.' };
  }
  if (row.status === 'REPLACED') return { ok: false, code: 'replaced' };
  if (row.status === 'USED') return { ok: false, code: 'used' };
  if (row.status === 'EXPIRED' || isExpired_(row.expires)) {
    setCell_(pack.sh, pack.map, row.row, 'Status', 'EXPIRED');
    return { ok: false, code: 'expired' };
  }
  if (row.status !== 'SENT' && row.status !== 'OPENED') return { ok: false, code: 'expired' };

  const name = oneLine_(d.name);
  const contact = oneLine_(d.contact);
  const emergencyName = oneLine_(d.emergencyName);
  const emergencyPhone = oneLine_(d.emergencyPhone);
  const address = oneLine_(d.address);
  const city = oneLine_(d.city);
  const country = oneLine_(d.country);
  const pickup = oneLine_(d.airportPickup);
  const dropNeeded = oneLine_(d.dropNeeded);
  const nextKind = oneLine_(d.nextKind);
  const comingFrom = oneLine_(d.comingFrom);
  if (name.length < 2) return { ok: false, code: 'missing', field: 'name', error: 'Enter your full name.' };
  if (contact.length < 6) return { ok: false, code: 'missing', field: 'contact', error: 'Enter your contact number.' };
  if (emergencyName.length < 2 || emergencyPhone.length < 6) return { ok: false, code: 'missing', field: 'emergency', error: 'Enter an emergency contact name and number.' };
  if (!address || !city || !country) return { ok: false, code: 'missing', field: 'address', error: 'Enter your home address, city, and country.' };
  if (pickup !== 'Yes' && pickup !== 'No') return { ok: false, code: 'missing', field: 'pickup', error: 'Say whether you need an airport pickup.' };
  if (pickup === 'Yes') {
    if (!oneLine_(d.pickupPlace) || !oneLine_(d.airline) || !oneLine_(d.flightNo) || !oneLine_(d.flightFrom) || !oneLine_(d.flightDate) || !oneLine_(d.flightTime)) {
      return { ok: false, code: 'missing', field: 'flight', error: 'Enter the full flight and pickup details.' };
    }
  } else if (!oneLine_(d.rvkDate) || !oneLine_(d.rvkTime)) {
    return { ok: false, code: 'missing', field: 'rvk', error: 'Enter the date and time you will arrive at Raj Vidya Kender.' };
  }
  if (!comingFrom) return { ok: false, code: 'missing', field: 'comingFrom', error: 'Enter the country you are coming from.' };
  if (dropNeeded !== 'Yes' && dropNeeded !== 'No') return { ok: false, code: 'missing', field: 'drop', error: 'Say whether you need a drop from Raj Vidya Kender.' };
  if (dropNeeded === 'Yes' && (!oneLine_(d.dropPlace) || !oneLine_(d.dropDate) || !oneLine_(d.dropTime))) {
    return { ok: false, code: 'missing', field: 'drop', error: 'Enter where and when you need the drop.' };
  }
  if (nextKind !== 'country' && nextKind !== 'state') return { ok: false, code: 'missing', field: 'next', error: 'Say whether you go to another country or another state.' };
  if (nextKind === 'country' && !oneLine_(d.nextCountry)) return { ok: false, code: 'missing', field: 'next', error: 'Enter the country you will go to.' };
  if (nextKind === 'state' && !oneLine_(d.nextState)) return { ok: false, code: 'missing', field: 'next', error: 'Enter the state you will go to.' };
  if (!oneLine_(d.departDate) || !oneLine_(d.departTime)) return { ok: false, code: 'missing', field: 'depart', error: 'Enter the date and time you leave Raj Vidya Kender.' };
  if (!isJpeg_(d.ppFront) || !isJpeg_(d.ppLast) || !isJpeg_(d.visaImg) || !isJpeg_(d.portrait)) {
    return { ok: false, code: 'missing-photo', error: 'Add the passport, visa, and your photo.' };
  }

  const folder = getPhotoFolder_();
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss');
  const base = safeName_(name) + '_' + stamp;
  const frontLink = saveImage_(folder, d.ppFront, 'passport_front_' + base + '.jpg');
  const lastLink = saveImage_(folder, d.ppLast, 'passport_last_' + base + '.jpg');
  const visaLink = saveImage_(folder, d.visaImg, 'visa_' + base + '.jpg');
  const portraitLink = saveImage_(folder, d.portrait, 'portrait_' + base + '.jpg');
  const nextDetail = nextKind === 'country'
    ? oneLine_(d.nextCountry)
    : [oneLine_(d.nextState), oneLine_(d.nextCity)].filter(function (s) { return !!s; }).join(', ');
  const lang = String(d.formLang || '') === 'es' ? 'Español' : 'English';

  const sub = submissionSheet_();
  const submissionRow = appendSubmission_(sub, {
    'Timestamp': new Date(),
    'Status': 'PENDING',
    'SmartCard': 'Registered email',
    'Verified Name': row.name,
    'Full Name': name,
    'Given Name': name,
    'Perm Address': address,
    'Perm City': city,
    'Perm Country': country,
    'India Address': 'Raj Vidya Kender, Shahurpur Chhatarpur, New Delhi',
    'India State': 'Delhi',
    'India City/District': 'Delhi',
    'India Pin': '110074',
    'Arrived From Country': comingFrom,
    'Arrival Date India': pickup === 'Yes' ? fmtDate_(d.flightDate) : '',
    'Arrival Date Hotel': pickup === 'No' ? fmtDate_(d.rvkDate) : '',
    'Arrival Time': pickup === 'Yes' ? oneLine_(d.flightTime) : oneLine_(d.rvkTime),
    'Departure Date': fmtDate_(d.departDate),
    'Departure Time': oneLine_(d.departTime),
    'Next Destination': nextKind === 'country' ? 'Outside India' : 'Inside India',
    'Next Dest Detail': nextDetail,
    'Passport Photo': portraitLink,
    'Passport Front': frontLink,
    'Passport Last': lastLink,
    'Visa Photo': visaLink,
    'Guest Email': row.email,
    'Residential Mobile': contact,
    'Form Language': lang,
    'Capture Method': 'Guest registration form',
    'Contact Number': contact,
    'Emergency Contact Name': emergencyName,
    'Emergency Contact Number': emergencyPhone,
    'Airport Pickup': pickup,
    'Pickup Place': pickup === 'Yes' ? oneLine_(d.pickupPlace) : '',
    'Airline': pickup === 'Yes' ? oneLine_(d.airline) : '',
    'Flight Number': pickup === 'Yes' ? oneLine_(d.flightNo) : '',
    'Flight From': pickup === 'Yes' ? oneLine_(d.flightFrom) : '',
    'Flight Arrival Date': pickup === 'Yes' ? fmtDate_(d.flightDate) : '',
    'Flight Arrival Time': pickup === 'Yes' ? oneLine_(d.flightTime) : '',
    'RVK Arrival Date': pickup === 'No' ? fmtDate_(d.rvkDate) : '',
    'RVK Arrival Time': pickup === 'No' ? oneLine_(d.rvkTime) : '',
    'Coming From Country': comingFrom,
    'Drop Facility': dropNeeded,
    'Drop Place': dropNeeded === 'Yes' ? oneLine_(d.dropPlace) : '',
    'Drop Date': dropNeeded === 'Yes' ? fmtDate_(d.dropDate) : '',
    'Drop Time': dropNeeded === 'Yes' ? oneLine_(d.dropTime) : '',
    'Next Country': nextKind === 'country' ? oneLine_(d.nextCountry) : '',
    'Next State': nextKind === 'state' ? oneLine_(d.nextState) : '',
    'Next City': nextKind === 'state' ? oneLine_(d.nextCity) : ''
  });

  setCell_(pack.sh, pack.map, row.row, 'Status', 'USED');
  setCell_(pack.sh, pack.map, row.row, 'Used At', new Date());
  setCell_(pack.sh, pack.map, row.row, 'Submission Row', submissionRow);

  try {
    sendReceivedEmails_({
      name: name,
      email: row.email,
      contact: contact,
      emergencyName: emergencyName,
      emergencyPhone: emergencyPhone,
      address: address + ', ' + city + ', ' + country,
      comingFrom: comingFrom,
      pickup: pickup,
      pickupDetail: pickup === 'Yes'
        ? [oneLine_(d.pickupPlace), oneLine_(d.airline), oneLine_(d.flightNo), oneLine_(d.flightFrom), fmtDate_(d.flightDate), oneLine_(d.flightTime)].join(' · ')
        : 'Arrives at RVK ' + fmtDate_(d.rvkDate) + ' ' + oneLine_(d.rvkTime),
      dropNeeded: dropNeeded,
      dropDetail: dropNeeded === 'Yes'
        ? [oneLine_(d.dropPlace), fmtDate_(d.dropDate), oneLine_(d.dropTime)].join(' · ')
        : 'No drop',
      nextDetail: nextDetail,
      depart: fmtDate_(d.departDate) + ' ' + oneLine_(d.departTime),
      frontLink: frontLink,
      lastLink: lastLink,
      visaLink: visaLink,
      portraitLink: portraitLink
    });
  } catch (mailErr) {
    Logger.log('Received-mail failed: ' + publicError_(mailErr));
  }
  return { ok: true, state: 'used', name: name };
}

function fmtDate_(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : oneLine_(iso);
}

function listInvites_(pin) {
  const auth = checkPin_(pin);
  if (!auth.ok) return auth;
  assertBaseUrl_();
  const pack = readInvites_();
  const items = [];
  for (let i = pack.rows.length - 1; i >= 0 && items.length < 40; i--) {
    items.push(toListItem_(pack.rows[i]));
  }
  return { ok: true, validDays: validDays_(), invites: items };
}

function createInvite_(d) {
  const auth = checkPin_(d.pin);
  if (!auth.ok) return auth;
  const name = oneLine_(d.name);
  const email = oneLine_(d.email).toLowerCase();
  if (name.length < 2 || name.length > 120) {
    return { ok: false, code: 'name', error: 'Enter the guest full name.' };
  }
  if (!validEmail_(email)) {
    return { ok: false, code: 'email', error: 'Enter a valid email address.' };
  }
  const base = assertBaseUrl_();
  const pack = readInvites_();
  const token = newToken_();
  const created = new Date();
  const expires = new Date(created.getTime() + validDays_() * 24 * 60 * 60 * 1000);

  for (let i = 0; i < pack.rows.length; i++) {
    const row = pack.rows[i];
    const open = row.status === 'SENT' || row.status === 'OPENED';
    if (open && normEmail_(row.email) === email && normName_(row.name) === normName_(name) && !isExpired_(row.expires)) {
      setCell_(pack.sh, pack.map, row.row, 'Status', 'REPLACED');
    }
  }

  const values = {
    'Name': name,
    'Email': email,
    'Token': token,
    'Created': created,
    'Expires': expires,
    'Status': 'SENT',
    'Used At': '',
    'Submission Row': ''
  };
  appendByHeader_(pack.sh, values);
  const link = base + '/?t=' + token;
  const mail = sendInviteEmail_(name, email, link, expires);
  return {
    ok: true,
    emailSent: mail.ok,
    emailError: mail.error || '',
    link: link,
    name: name,
    email: email,
    expires: formatDay_(expires),
    validDays: validDays_()
  };
}

function resendInvite_(d) {
  const auth = checkPin_(d.pin);
  if (!auth.ok) return auth;
  const tokenCheck = normalizeToken_(d.token);
  if (!tokenCheck) return { ok: false, code: 'invalid', error: 'That link is no longer active. Send a new one.' };
  const base = assertBaseUrl_();
  const pack = readInvites_();
  const row = findInvite_(pack.rows, tokenCheck);
  if (!row) return { ok: false, code: 'invalid', error: 'That link is no longer active. Send a new one.' };
  if (row.status === 'USED') {
    return { ok: false, code: 'used', error: 'Photos are already in the sheet. Send a new link only if they must take the photos again.' };
  }
  if (row.status === 'REPLACED' || row.status === 'EXPIRED' || isExpired_(row.expires)) {
    if (row.status !== 'REPLACED' && isExpired_(row.expires)) {
      setCell_(pack.sh, pack.map, row.row, 'Status', 'EXPIRED');
    }
    return { ok: false, code: 'expired', error: 'That link has expired. Send a new one.' };
  }
  const expires = new Date(Date.now() + validDays_() * 24 * 60 * 60 * 1000);
  setCell_(pack.sh, pack.map, row.row, 'Expires', expires);
  const link = base + '/?t=' + tokenCheck;
  const mail = sendInviteEmail_(row.name, row.email, link, expires);
  return {
    ok: true,
    emailSent: mail.ok,
    emailError: mail.error || '',
    link: link,
    name: row.name,
    email: row.email,
    expires: formatDay_(expires)
  };
}

function sendInviteEmail_(name, email, link, expires) {
  const day = formatDay_(expires);
  const safeName = escapeHtml_(name);
  const safeLink = escapeHtml_(link);
  const html =
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a;font-size:17px;line-height:1.45">'
    + '<div style="background:#1a3a6b;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0">'
    + '<div style="color:#e2c57a;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Raj Vidya Kender</div>'
    + '<div style="font-size:20px;margin-top:4px">Guest Registration Form</div></div>'
    + '<div style="border:1px solid #e4ddd0;border-top:none;padding:20px;border-radius:0 0 12px 12px">'
    + '<p style="background:#7a1f1f;color:#fff;padding:10px 12px;border-radius:8px;font-weight:700">Do not pass this form to anyone else. You will be blacklisted for future events.</p>'
    + '<p>Please complete the guest registration for <b>' + safeName + '</b> before arrival.</p>'
    + '<p>The form opens only when you enter this email address: <b>' + escapeHtml_(email) + '</b></p>'
    + '<p style="margin:18px 0"><a href="' + safeLink + '" style="display:inline-block;background:#1a3a6b;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-size:18px;font-weight:700">Open the registration form</a></p>'
    + '<p style="font-size:15px;word-break:break-all">' + safeLink + '</p>'
    + '<p>A shared link does not open the form by itself. It stops working on <b>' + escapeHtml_(day) + '</b>, and it stops after you submit.</p>'
    + '<p>Please also bring a photocopy of your passport and visa.</p>'
    + '<hr style="border:none;border-top:1px solid #e4ddd0;margin:22px 0">'
    + '<p>No pase este formulario a nadie. Si lo hace, quedará en la lista negra para futuros eventos.</p>'
    + '<p>Complete el registro de <b>' + safeName + '</b>. El formulario se abre solo con este correo: <b>' + escapeHtml_(email) + '</b></p>'
    + '<p style="font-size:15px;word-break:break-all">' + safeLink + '</p>'
    + '<p>Traiga también una fotocopia del pasaporte y del visado. Deja de funcionar el <b>' + escapeHtml_(day) + '</b>.</p>'
    + '<p style="color:#3d4a5c;font-size:14px">Raj Vidya Kender · Shahurpur Chhatarpur, New Delhi 110074</p>'
    + '</div></div>';
  const plain = invitePlain_(name, link, day, email);
  const opts = {
    to: email,
    subject: 'Raj Vidya Kender — Guest Registration for ' + name,
    body: plain,
    htmlBody: html,
    name: 'Raj Vidya Kender',
    replyTo: VERIFY_EMAIL
  };
  if (email !== String(VERIFY_EMAIL).toLowerCase()) opts.bcc = VERIFY_EMAIL;
  try {
    MailApp.sendEmail(opts);
    return { ok: true };
  } catch (e) {
    Logger.log('Invite mail failed: ' + publicError_(e));
    return { ok: false, error: publicError_(e) };
  }
}

function invitePlain_(name, link, day, email) {
  return 'Do not pass this form to anyone else. You will be blacklisted for future events.\n\n'
    + 'Please complete guest registration for ' + name + ' before arrival at Raj Vidya Kender.\n\n'
    + 'Open the form and enter this email address:\n' + email + '\n\n'
    + link + '\n\n'
    + 'The link alone does not open the form. It stops working on ' + day + '.\n'
    + 'Please also bring a photocopy of your passport and visa.\n\n'
    + 'Raj Vidya Kender\nGovernment of India — Form C\nShahurpur Chhatarpur, New Delhi 110074\n';
}

function sendReceivedEmails_(info) {
  const guestHtml =
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a;font-size:17px;line-height:1.45">'
    + '<div style="background:#1a3a6b;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0">'
    + '<div style="color:#e2c57a;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Government of India · Form C</div>'
    + '<div style="font-size:20px;margin-top:4px">Registration received</div></div>'
    + '<div style="border:1px solid #e4ddd0;border-top:none;padding:20px;border-radius:0 0 12px 12px">'
    + '<p>We have the registration for <b>' + escapeHtml_(info.name) + '</b>.</p>'
    + '<p>Please bring your passport, your visa, and a <b>photocopy of both</b> to reception.</p>'
    + '<p style="color:#3d4a5c;font-size:14px">Raj Vidya Kender · Shahurpur Chhatarpur, New Delhi 110074</p>'
    + '</div></div>';
  const guestPlain = 'We have the registration for ' + info.name + '.\n\n'
    + 'Please bring your passport, your visa, and a photocopy of both to reception.\n\n'
    + 'Raj Vidya Kender\nShahurpur Chhatarpur, New Delhi 110074\n';

  if (validEmail_(info.email)) {
    MailApp.sendEmail({
      to: info.email,
      subject: 'Raj Vidya Kender received the registration for ' + info.name,
      body: guestPlain,
      htmlBody: guestHtml,
      name: 'Raj Vidya Kender',
      replyTo: VERIFY_EMAIL
    });
  }

  const staffPlain = 'Guest registration received for ' + info.name + ' (' + info.email + ').\n\n'
    + 'Contact: ' + info.contact + '\n'
    + 'Emergency: ' + info.emergencyName + ' ' + info.emergencyPhone + '\n'
    + 'Address: ' + info.address + '\n'
    + 'Coming from: ' + info.comingFrom + '\n'
    + 'Pickup: ' + info.pickup + ' — ' + info.pickupDetail + '\n'
    + 'Drop: ' + info.dropNeeded + ' — ' + info.dropDetail + '\n'
    + 'Next: ' + info.nextDetail + '\n'
    + 'Departs RVK: ' + info.depart + '\n\n'
    + 'Portrait: ' + info.portraitLink + '\n'
    + 'Passport front: ' + info.frontLink + '\n'
    + 'Passport last: ' + info.lastLink + '\n'
    + 'Visa: ' + info.visaLink + '\n\n'
    + 'At check-in, match the physical passport and collect the photocopies.\n'
    + 'Within 24 hours, punch e-FRRO, paste Application ID and ACK No, set Status to DONE.\n';
  const staffHtml =
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;color:#1a1a1a;font-size:15px;line-height:1.45">'
    + '<p><b>Guest registration received</b> for ' + escapeHtml_(info.name) + ' (' + escapeHtml_(info.email) + ').</p>'
    + '<p>Contact: ' + escapeHtml_(info.contact) + '<br>Emergency: ' + escapeHtml_(info.emergencyName) + ' ' + escapeHtml_(info.emergencyPhone) + '<br>'
    + 'Address: ' + escapeHtml_(info.address) + '<br>Coming from: ' + escapeHtml_(info.comingFrom) + '<br>'
    + 'Pickup: ' + escapeHtml_(info.pickup) + ' — ' + escapeHtml_(info.pickupDetail) + '<br>'
    + 'Drop: ' + escapeHtml_(info.dropNeeded) + ' — ' + escapeHtml_(info.dropDetail) + '<br>'
    + 'Next: ' + escapeHtml_(info.nextDetail) + '<br>Departs RVK: ' + escapeHtml_(info.depart) + '</p>'
    + '<p><a href="' + escapeHtml_(info.portraitLink) + '">Passport-size photo</a><br>'
    + '<a href="' + escapeHtml_(info.frontLink) + '">Passport front</a><br>'
    + '<a href="' + escapeHtml_(info.lastLink) + '">Passport last page</a><br>'
    + '<a href="' + escapeHtml_(info.visaLink) + '">Visa</a></p>'
    + '<p>At check-in, match the physical passport and collect photocopies of the passport and visa. Within 24 hours, punch e-FRRO and set Status to DONE.</p></div>';

  MailApp.sendEmail({
    to: VERIFY_EMAIL,
    subject: 'Guest registration — ' + info.name,
    body: staffPlain,
    htmlBody: staffHtml,
    name: 'Raj Vidya Kender Form C'
  });
}

function toListItem_(row) {
  let status = row.status;
  if ((status === 'SENT' || status === 'OPENED') && isExpired_(row.expires)) status = 'EXPIRED';
  const active = status === 'SENT' || status === 'OPENED';
  let link = '';
  if (active) {
    try { link = assertBaseUrl_() + '/?t=' + row.token; } catch (ignore) { link = ''; }
  }
  return {
    name: row.name,
    email: row.email,
    status: status,
    created: formatWhen_(row.created),
    expires: formatDay_(row.expires),
    link: link,
    token: active ? row.token : ''
  };
}

function readInvites_() {
  const sh = inviteSheet_();
  const map = headerMap_(sh);
  requireHeaders_(map, INVITE_HEADERS);
  const last = sh.getLastRow();
  if (last < 2) return { sh: sh, map: map, rows: [] };
  const values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  const rows = [];
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    rows.push({
      row: i + 2,
      name: String(cell_(r, map, 'Name') || ''),
      email: String(cell_(r, map, 'Email') || ''),
      token: String(cell_(r, map, 'Token') || '').trim().toLowerCase(),
      created: cell_(r, map, 'Created'),
      expires: cell_(r, map, 'Expires'),
      status: String(cell_(r, map, 'Status') || ''),
      usedAt: cell_(r, map, 'Used At'),
      submissionRow: cell_(r, map, 'Submission Row')
    });
  }
  return { sh: sh, map: map, rows: rows };
}

function findInvite_(rows, token) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].token === token) return rows[i];
  }
  return null;
}

function inviteSheet_() {
  assertConfigured_(true);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(INVITE_SHEET);
  if (!sh) fail_('config', 'Run setupWorkflow once in Apps Script.');
  return sh;
}

function submissionSheet_() {
  assertConfigured_(true);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    ensureHeaders_(sh, HEADERS);
  }
  return sh;
}

function appendSubmission_(sh, byHeader) {
  ensureHeaders_(sh, HEADERS);
  return appendByHeader_(sh, byHeader);
}

function appendByHeader_(sh, byHeader) {
  const width = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, width).getValues()[0];
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    if (key && Object.prototype.hasOwnProperty.call(byHeader, key)) row.push(byHeader[key]);
    else row.push('');
  }
  sh.appendRow(row);
  return sh.getLastRow();
}

function ensureHeaders_(sh, headers) {
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1a3a6b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return;
  }
  const width = Math.max(sh.getLastColumn(), 1);
  const current = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h || ''); });
  const missing = [];
  for (let i = 0; i < headers.length; i++) {
    if (current.indexOf(headers[i]) === -1) missing.push(headers[i]);
  }
  if (!missing.length) return;
  let last = 0;
  for (let c = 0; c < current.length; c++) if (current[c]) last = c + 1;
  sh.getRange(1, last + 1, 1, missing.length).setValues([missing])
    .setFontWeight('bold').setBackground('#1a3a6b').setFontColor('#ffffff');
}

function applyHeaderNotes_(sh, notes) {
  const map = headerMap_(sh);
  for (const key in notes) {
    if (map[key]) sh.getRange(1, map[key]).setNote(notes[key]);
  }
}

function formatDateColumn_(sh, header) {
  const col = headerMap_(sh)[header];
  if (!col) return;
  sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('dd/mm/yyyy hh:mm');
}

function headerMap_(sh) {
  const width = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, width).getValues()[0];
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]) map[String(headers[i])] = i + 1;
  }
  return map;
}

function requireHeaders_(map, headers) {
  for (let i = 0; i < headers.length; i++) {
    if (!map[headers[i]]) fail_('config', 'Run setupWorkflow once in Apps Script.');
  }
}

function cell_(row, map, header) {
  const col = map[header];
  if (!col) return '';
  return row[col - 1];
}

function setCell_(sh, map, row, header, value) {
  if (!map[header]) return;
  sh.getRange(row, map[header]).setValue(value);
}

function saveImage_(folder, dataUrl, filename) {
  if (!isJpeg_(dataUrl)) fail_('bad-image', 'A photo could not be read. Please take it again.');
  const b64 = String(dataUrl).split(',')[1];
  let bytes;
  try { bytes = Utilities.base64Decode(b64); } catch (e) {
    fail_('bad-image', 'A photo could not be read. Please take it again.');
  }
  const blob = Utilities.newBlob(bytes, 'image/jpeg', filename);
  const file = folder.createFile(blob);
  return file.getUrl();
}

function isJpeg_(value) {
  const s = String(value || '');
  if (s.indexOf('data:image/jpeg;base64,') !== 0) return false;
  const b64 = s.split(',')[1] || '';
  if (b64.length < 100 || b64.length > 500000) return false;
  return true;
}

function getPhotoFolder_() {
  const folder = getOrCreateFolder_(PHOTO_FOLDER);
  try { folder.addViewer(VERIFY_EMAIL); } catch (ignore) {}
  return folder;
}

function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function assertConfigured_(needSheet) {
  if (!SHEET_ID || String(SHEET_ID).indexOf('PASTE_') === 0) {
    fail_('config', 'Set SHEET_ID in Code.gs.');
  }
  if (needSheet === false) return;
}

function assertBaseUrl_() {
  const base = String(FORM_BASE_URL || '').replace(/\/+$/, '');
  const httpsOk = /^https:\/\/.+/i.test(base) && base.indexOf('PASTE_') === -1;
  const localOk = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(base);
  if (!httpsOk && !localOk) {
    fail_('config', 'Set FORM_BASE_URL in Code.gs to the guest page address, starting with https:// and with no slash at the end.');
  }
  return base;
}

function newToken_() {
  const raw = Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + new Date().getTime() + '|' + Math.random();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function (b) {
    const v = (b + 256) % 256;
    const hex = v.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function normalizeToken_(token) {
  const t = String(token || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(t)) return '';
  return t;
}

function validEmail_(email) {
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(String(email || ''));
}

function oneLine_(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
}

function normName_(value) {
  return oneLine_(value).replace(/\s+/g, ' ').toLowerCase();
}

function normEmail_(value) {
  return oneLine_(value).toLowerCase();
}

function validDays_() {
  const n = Number(LINK_VALID_DAYS);
  if (!n || n < 1) return 14;
  if (n > 60) return 60;
  return Math.floor(n);
}

function isExpired_(value) {
  if (!value) return true;
  const d = (value instanceof Date) ? value : new Date(value);
  if (isNaN(d.getTime())) return true;
  return d.getTime() <= Date.now();
}

function formatWhen_(value) {
  return formatWith_(value, 'dd/MM/yyyy HH:mm');
}

function formatDay_(value) {
  return formatWith_(value, 'dd/MM/yyyy');
}

function formatWith_(value, pattern) {
  if (!value) return '';
  const d = (value instanceof Date) ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, TIMEZONE, pattern);
}

function safeName_(value) {
  const s = String(value || 'guest').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return s || 'guest';
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function publicError_(err) {
  const message = String(err && err.message ? err.message : err || 'Error');
  return message.slice(0, 240);
}

function fail_(code, message) {
  const err = new Error(message || code);
  err.code = code;
  throw err;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   DATA BACKUP
   backupData() copies the whole spreadsheet (submissions + invites).
   exportCsvBackup() writes a CSV of FormC_Submissions.
   Run installBackupTrigger() ONCE.
   ============================================================ */

function backupData() {
  const src = DriveApp.getFileById(SHEET_ID);
  const folder = getOrCreateFolder_('FormC_Backups');
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HHmm');
  const copy = src.makeCopy('FormC_Backup_' + stamp, folder);
  pruneOldBackups_(folder, 60);
  return 'Backup created: ' + copy.getName();
}

function exportCsvBackup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return 'No submissions sheet.';
  const data = sh.getDataRange().getValues();
  const csv = data.map(function (row) {
    return row.map(function (cell) {
      let s = (cell === null || cell === undefined) ? '' : String(cell);
      if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',');
  }).join('\n');
  const folder = getOrCreateFolder_('FormC_Backups');
  const stamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HHmm');
  folder.createFile('FormC_Submissions_' + stamp + '.csv', csv, MimeType.CSV);
  return 'CSV backup created.';
}

function pruneOldBackups_(folder, keep) {
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (let i = keep; i < files.length; i++) files[i].setTrashed(true);
}

function installBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const fn = t.getHandlerFunction();
    if (fn === 'backupData' || fn === 'exportCsvBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupData').timeBased().everyDays(1).atHour(2).create();
  ScriptApp.newTrigger('exportCsvBackup').timeBased().everyDays(1).atHour(2).create();
  return 'Nightly backup scheduled (full copy + CSV) at ~2 AM.';
}
