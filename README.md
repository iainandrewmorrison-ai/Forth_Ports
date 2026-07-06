# Enlightened People — AI Readiness Portal (Forth Ports HR)

A pre-scoping portal supporting a Microsoft Copilot and AI readiness training
programme for senior HR leaders at Forth Ports Authority.

The site helps HR leaders understand the purpose of the programme, complete a
scored AI readiness questionnaire, reflect on workload, data, risks, culture
and priority use cases, and gives Enlightened People a structured admin
summary to prepare the senior HR scoping call.

## What's included

| Page / view | Purpose |
| --- | --- |
| **Home** | Programme introduction, why the questionnaire matters, reassurance that it is not an audit, confidentiality notice, call to action. |
| **The programme** | What the training is designed around, example HR use cases (communications, policies, job adverts, safe summarising, manager guidance, workforce trends, FAQs, reporting), and the four-step scoping process. |
| **AI Readiness Assessment** | Data-capture fields (name, role, email, site, team, Copilot access, prior AI use, consent), six scored sections (36 questions, 1–5 scale) and seven open-text scoping groups (35 questions). Progress bar, per-step validation, draft auto-saved to the browser. |
| **Results** | Overall readiness score out of 100, band interpretation (Early-stage / Developing / Strong / Advanced), personalised constructive summary and six section score bars. Printable. |
| **Thank you / next steps** | Confirms submission, explains how insights will be used, asks respondents to bring safe non-confidential examples, repeats the data reminder. |
| **Admin view** (`#admin`) | Table of all stored responses; per-respondent scoping-call summary (strengths, risks, use cases, governance flags, Copilot access issues, training design implications, suggested follow-up questions); exports as printable PDF, plain text, JSON and CSV. |

## Hosting (GitHub Pages)

The repo includes `.github/workflows/deploy-pages.yml`, which deploys the
site to GitHub Pages on every push. If the first run cannot enable Pages
by itself, enable it once in **Settings → Pages → Source: GitHub Actions**
and re-run the workflow. The site is then live at:

```
https://iainandrewmorrison-ai.github.io/Forth_Ports/
```

To run locally instead:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Receiving submissions (Google Sheet backend)

Every submission is POSTed to the URL in `js/config.js` and appended as
**one row in a Google Sheet** — one column per answer. One-time setup,
about 5 minutes:

1. Create a Google Sheet (e.g. *Enlightened People — Forth Ports AI
   Readiness Submissions*).
2. In the Sheet: **Extensions → Apps Script**, delete the placeholder and
   paste the whole of [`backend/google-apps-script.gs`](backend/google-apps-script.gs). Save.
3. **Deploy → New deployment → Web app**, with *Execute as: Me* and
   *Who has access: Anyone*. Authorise when prompted.
4. Copy the web app URL (ends in `/exec`) into `js/config.js` as
   `SUBMIT_ENDPOINT`, commit and push — the site redeploys automatically.

The first submission writes the header row; every response after that is
a new row: respondent details, overall score, band, six section scores,
all 36 question scores and all 35 open-text answers (88 columns).
Duplicate deliveries (network retries) are ignored via the Submission ID
column. If a respondent is offline when they submit, the response is
kept in their browser and sent automatically next time they open the site.

Until `SUBMIT_ENDPOINT` is set, responses are stored only in the
respondent's browser (visible via the `#admin` view on that device).

## Scoring

- 36 scored questions × max 5 points = 180 raw points, scaled to /100.
- Section scores are each question-set's raw total scaled to /100.
- Bands: 0–39 Early-stage · 40–59 Developing · 60–79 Strong · 80–100 Advanced.

## Data storage and privacy

- Submissions go to the Google Sheet (above) and are also kept in the
  respondent's browser localStorage, which powers the on-device `#admin`
  view and offline retry.
- The consent checkbox and repeated notices instruct respondents not to
  submit confidential, personal, sensitive or identifiable employee
  information.
- The Apps Script endpoint is append-only: anyone with the URL can add a
  row, nobody can read the sheet through it. Keep the sheet itself
  restricted to Enlightened People.
- The on-device admin view is unauthenticated because it only ever shows
  data stored in that same browser.

## Project structure

```
index.html                      All views and page copy
css/styles.css                  Enlightened People brand styling (placeholder palette/typography)
js/config.js                    Deployment config: submission endpoint URL
js/data.js                      Questionnaire content: sections, questions, scale, bands
js/app.js                       Routing, questionnaire flow, scoring, results, submission sync, admin summary, exports
backend/google-apps-script.gs   Google Sheet receiver (paste into Apps Script, deploy as web app)
.github/workflows/deploy-pages.yml  GitHub Pages deployment
```

To change questions or copy, edit `js/data.js` — scoring and the admin
summary adapt automatically.
