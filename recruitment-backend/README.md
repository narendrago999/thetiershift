# TierShift recruitment application backend

Google Apps Script source for the Careers application form. The public website stays on GitHub Pages; applicant records and CVs are stored in a private Google Drive folder.

## What it creates
- Private Drive folder: `TierShift Recruitment`
- Central Google Sheets register: `TierShift Applicant Register`
- One uniquely named folder per application, such as `TS-2026-0001_Jane_Doe`
- `Resume.pdf` and `Applicant_Details.xlsx` in each applicant folder

## Setup and deployment
1. Sign in to the Google account that should own recruitment records.
2. Open [Google Apps Script](https://script.google.com/) and create a standalone project named **TierShift Recruitment**.
3. Paste `Code.gs` into the default script file.
4. Add an HTML file named **Index** and paste `Index.html`.
5. In [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/), create a widget for `thetiershift.com` and `script.google.com` if the dashboard asks for allowed hostnames. Copy its site key and secret key.
6. In Apps Script, open **Project Settings → Script Properties** and add:
   - `TURNSTILE_SITE_KEY` = your public Turnstile site key
   - `TURNSTILE_SECRET_KEY` = your private Turnstile secret key
   Keep the secret only in Script Properties. Never put it in GitHub or page JavaScript.
7. In the editor, select `setupRecruitmentStorage` and click **Run**. Review and approve the Google Drive and Sheets permissions. Check that the private folder and register exist in Drive.
8. Select **Deploy → New deployment → Web app**.
9. Set **Execute as** to **Me** and **Who has access** to **Anyone**, so applicants do not need a Google sign-in. Deploy and copy the URL ending in `/exec`.
10. Share that deployment URL with the site administrator to connect it to the Careers page.

## Privacy and operations
- The web app runs as the deploying owner. Uploaded records are created in that owner's Drive.
- Keep the root recruitment folder private; grant access only to authorised reviewers.
- The server validates required fields, email format, PDF extension and signature, 5 MB maximum, consent, a honeypot, and Cloudflare Turnstile.
- The central register contains applicant details and links to the private applicant folder and CV.
- The form creates a spreadsheet, exports an Excel `.xlsx` copy into the applicant folder, then trashes the temporary Google Sheet.
- Apply a documented retention period and delete records when no longer required. The GitHub repository must never contain applicant CVs or personal data.
- Google Apps Script and Drive have account-specific quotas and storage limits; this is not unlimited free hosting.

## Testing
Before publicising the role, submit one test application using a test PDF. Confirm the applicant folder, resume, Excel file, register row, and on-screen reference ID. Then remove the test record from Drive and the register.
