const CONFIG = {
  ROOT_FOLDER_NAME: 'TierShift Recruitment',
  REGISTER_NAME: 'TierShift Applicant Register',
  MAX_RESUME_BYTES: 5 * 1024 * 1024
};

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.turnstileSiteKey = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SITE_KEY') || '';
  return template.evaluate()
    .setTitle('Apply to TierShift Technologies')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupRecruitmentStorage() {
  const props = PropertiesService.getScriptProperties();
  let rootId = props.getProperty('ROOT_FOLDER_ID');
  let registerId = props.getProperty('REGISTER_ID');
  let root = rootId ? DriveApp.getFolderById(rootId) : null;
  if (!root) {
    root = DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
    props.setProperty('ROOT_FOLDER_ID', root.getId());
  }
  let register;
  if (registerId) {
    try { register = SpreadsheetApp.openById(registerId); } catch (err) { register = null; }
  }
  if (!register) {
    register = SpreadsheetApp.create(CONFIG.REGISTER_NAME);
    DriveApp.getFileById(register.getId()).moveTo(root);
    props.setProperty('REGISTER_ID', register.getId());
  }
  let sheet = register.getSheetByName('Applicants');
  if (!sheet) sheet = register.getSheets()[0].setName('Applicants');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Applicant ID', 'Submitted At', 'Full Name', 'Email', 'Phone',
      'Location', 'Experience', 'Skills', 'LinkedIn', 'GitHub / Portfolio',
      'Notice Period', 'Role', 'Drive Folder URL', 'Resume File URL'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
  }
  return 'Setup complete. Recruitment folder: ' + root.getUrl() + ' | Register: ' + register.getUrl();
}

function submitApplication(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!form || String(form.website || '').trim() !== '') {
      throw new Error('Unable to submit this application. Please refresh and try again.');
    }

    const props = PropertiesService.getScriptProperties();
    const siteKey = props.getProperty('TURNSTILE_SITE_KEY') || '';
    const secretKey = props.getProperty('TURNSTILE_SECRET_KEY') || '';
    if (!siteKey || !secretKey) {
      throw new Error('The application portal is not fully configured yet. Please try again later.');
    }
    verifyTurnstile(form.turnstileToken, secretKey);

    const name = cleanText(form.name, 100);
    const email = cleanText(form.email, 160).toLowerCase();
    const phone = cleanText(form.phone, 40);
    const location = cleanText(form.location, 120);
    const experience = cleanText(form.experience, 50);
    const skills = cleanText(form.skills, 1200);
    const linkedin = cleanUrl(form.linkedin);
    const portfolio = cleanUrl(form.portfolio);
    const notice = cleanText(form.notice, 120);
    const consent = form.consent === 'on' || form.consent === true || form.consent === 'true';
    const resume = form.resume;

    if (!name || !email || !location || !experience || !skills || !consent) {
      throw new Error('Please complete all required fields and confirm the privacy consent.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!resume || typeof resume.getBytes !== 'function') {
      throw new Error('Please attach your PDF resume.');
    }
    const bytes = resume.getBytes();
    if (bytes.length > CONFIG.MAX_RESUME_BYTES) throw new Error('Your resume must be 5 MB or smaller.');
    const resumeType = String(resume.getContentType() || '').toLowerCase();
    const resumeName = String(resume.getName() || 'resume.pdf');
    const signature = Utilities.newBlob(bytes).getDataAsString().slice(0, 4);
    if ((resumeType && resumeType !== 'application/pdf') || !/\.pdf$/i.test(resumeName) || signature !== '%PDF') {
      throw new Error('Please upload a valid PDF file.');
    }

    const rootId = props.getProperty('ROOT_FOLDER_ID');
    const registerId = props.getProperty('REGISTER_ID');
    if (!rootId || !registerId) throw new Error('Recruitment storage has not been initialised. Please contact the site administrator.');

    const root = DriveApp.getFolderById(rootId);
    const register = SpreadsheetApp.openById(registerId);
    const sheet = register.getSheetByName('Applicants');
    const nextNumber = Number(props.getProperty('NEXT_APPLICANT_NUMBER') || '0') + 1;
    props.setProperty('NEXT_APPLICANT_NUMBER', String(nextNumber));
    const applicantId = 'TS-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy') + '-' + String(nextNumber).padStart(4, '0');
    const safeName = name.normalize('NFKD').replace(/[^\w -]/g, '').trim().replace(/[ -]+/g, '_').slice(0, 70) || 'Applicant';
    const applicantFolder = root.createFolder(applicantId + '_' + safeName);
    const resumeFile = applicantFolder.createFile(Utilities.newBlob(bytes, 'application/pdf', 'Resume.pdf'));

    createApplicantWorkbook(applicantFolder, applicantId, {
      'Applicant ID': applicantId, 'Submitted At': new Date(), 'Full Name': name,
      'Email': email, 'Phone': phone || 'Not provided', 'Location': location,
      'Experience': experience, 'Skills': skills, 'LinkedIn': linkedin || 'Not provided',
      'GitHub / Portfolio': portfolio || 'Not provided', 'Notice Period': notice || 'Not provided',
      'Role': 'Software Engineer'
    });

    sheet.appendRow([
      applicantId, new Date(), name, email, phone, location, experience, skills,
      linkedin, portfolio, notice, 'Software Engineer', applicantFolder.getUrl(), resumeFile.getUrl()
    ]);
    return {
      success: true,
      applicantId: applicantId,
      message: 'Thank you, ' + name + '. Your application has been submitted successfully. Your reference ID is ' + applicantId + '.'
    };
  } finally {
    lock.releaseLock();
  }
}

function verifyTurnstile(token, secret) {
  if (!token) throw new Error('Please complete the anti-spam verification and try again.');
  const response = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: { secret: secret, response: String(token) },
    muteHttpExceptions: true
  });
  const result = JSON.parse(response.getContentText() || '{}');
  if (!result.success) throw new Error('Anti-spam verification failed. Please refresh the page and try again.');
}

function createApplicantWorkbook(folder, applicantId, details) {
  const temp = SpreadsheetApp.create(applicantId + '_Applicant_Details');
  const sheet = temp.getSheets()[0];
  sheet.setName('Applicant Details');
  sheet.getRange(1, 1, 1, 2).setValues([['Field', 'Details']]);
  const rows = Object.keys(details).map(function(key) {
    return [key, details[key] instanceof Date ? details[key] : String(details[key])];
  });
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 420);
  sheet.getRange(1, 1, rows.length + 1, 2).setWrap(true);
  SpreadsheetApp.flush();
  const xlsxBlob = DriveApp.getFileById(temp.getId()).getAs(MimeType.MICROSOFT_EXCEL).setName('Applicant_Details.xlsx');
  folder.createFile(xlsxBlob);
  DriveApp.getFileById(temp.getId()).setTrashed(true);
}

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
}
function cleanUrl(value) {
  const url = cleanText(value, 300);
  if (!url) return '';
  if (!/^https:\/\//i.test(url)) throw new Error('Please enter profile links beginning with https://');
  return url;
}
