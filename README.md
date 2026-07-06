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

## Running the site

It's a fully static site — no build step, no dependencies.

```bash
# open directly
open index.html

# or serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

It can be hosted on GitHub Pages, Netlify, SharePoint or any static host.

## Scoring

- 36 scored questions × max 5 points = 180 raw points, scaled to /100.
- Section scores are each question-set's raw total scaled to /100.
- Bands: 0–39 Early-stage · 40–59 Developing · 60–79 Strong · 80–100 Advanced.

## Data storage and privacy

- Responses are stored in the **browser's localStorage** only — no data
  leaves the device unless exported (JSON / CSV / text / print).
- The consent checkbox and repeated notices instruct respondents not to
  submit confidential, personal, sensitive or identifiable employee
  information.
- For centralised collection, wire the `submit()` function in `js/app.js`
  to a backend or form service (e.g. Microsoft Forms/Power Automate flow,
  Formspree, or an internal API) — the record object it builds contains
  everything needed.
- The admin view is intentionally simple and unauthenticated because data
  is device-local. If you add a backend, put the admin view behind
  authentication.

## Project structure

```
index.html      All views and page copy
css/styles.css  Enlightened People brand styling (placeholder palette/typography)
js/data.js      Questionnaire content: sections, questions, scale, bands
js/app.js       Routing, questionnaire flow, scoring, results, admin summary, exports
```

To change questions or copy, edit `js/data.js` — scoring and the admin
summary adapt automatically.
