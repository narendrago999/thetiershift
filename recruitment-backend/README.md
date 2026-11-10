# TierShift recruitment application backend

This folder contains the Google Apps Script source for the Careers application form. The website remains on GitHub Pages; applicant records and resumes are stored in a private Google Drive folder.

## What it creates

- A private Drive folder named `TierShift Recruitment`
- A central Google Sheets register named `TierShift Applicant Register`
- One folder per application, named with a generated reference ID and a sanitised applicant name
- `Resume.pdf` and `Applicant_Details.xlsx` inside each applicant folder

## One-time setup

1. Sign in to the Google account that should own the recruitment records.
2. Open [Google Apps Script](https://script.google.com/) and create a new standalone project called **TierShift Recruitment**.
3. Replace the contents of `Code.gs` with the code in this folder.
4. Add an HTML file named **Index** and paste the contents of `Index.html`.
5. In the Apps Script editor, select `setupRecruitmentStorage` and click **Run**. Review and approve the requested Google Drive and Sheets permissions.
6. Confirm that the private Drive folder and central register were created in your Google Drive.
7. Select **Deploy → New deployment → Web app**.
8. Set **Execute as** to **Me**. Set **Who has access** to **Anyone** so applicants can submit without signing in. Deploy and copy the web app URL ending in `/exec`.
9. Send that URL to the site administrator so it can be embedded on the Careers page.

## Important launch protection

The form includes server-side validation, a PDF signature check, a 5 MB limit, a honeypot field and a unique application reference. Before advertising the form publicly, add Cloudflare Turnstile protection:

1. Create a free Turnstile widget in Cloudflare for the form's deployment domain.
2. In Apps Script, open **Project Settings → Script Properties** and add:
   - `TURNSTILE_SITE_KEY`: the public site key
   - `TURNSTILE_SECRET_KEY`: the private secret key
3. Redeploy the web app after saving the script properties.

The current source template renders the Turnstile widget when a site key is configured. The server-side verification should be enabled before public launch by adding the verification check in `submitApplication` (do not put the secret in the HTML or GitHub Pages source). Do not publish or share the Drive folder or register.

## Privacy and access

The web app runs as the owner, so uploaded files are created in the owner's Drive. Keep the recruitment folder private and grant access only to authorised reviewers. The GitHub repository must never contain actual applicant records, resumes, or exports. Apply a documented retention period and delete applications when no longer needed.

Google Apps Script and Drive have account-specific quotas and storage limits; this is not a guarantee of unlimited free storage.
