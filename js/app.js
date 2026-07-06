/* =============================================================
   Enlightened People — AI Readiness Portal
   App logic: routing, questionnaire flow, scoring, results,
   admin summary generation and exports.

   Responses are stored in the browser (localStorage) and can be
   exported as JSON / CSV / printable summaries. No data leaves
   the browser unless the respondent exports and shares it.
   ============================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "ep_forthports_responses_v1";
  const DRAFT_KEY = "ep_forthports_draft_v1";
  const MAX_QUESTION_SCORE = 5;
  const TOTAL_QUESTIONS = SECTIONS.reduce((n, s) => n + s.questions.length, 0);

  /* ---------------- State ---------------- */

  let state = {
    intake: {},
    scores: {},   // e.g. { "A1": 4 }
    texts: {},    // e.g. { "world_0": "..." }
    stepIndex: 0
  };

  let lastResult = null; // most recent submission record

  // Steps: intake, 6 scored sections, 7 open-text groups
  const steps = [{ type: "intake" }]
    .concat(SECTIONS.map((s) => ({ type: "section", section: s })))
    .concat(OPEN_GROUPS.map((g) => ({ type: "open", group: g })));

  /* ---------------- Utilities ---------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function loadResponses() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveResponses(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }

  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (d && d.intake) state = Object.assign(state, d);
    } catch (e) { /* ignore corrupt draft */ }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  }

  function slug(str) {
    return String(str || "response").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "response";
  }

  /* ---------------- Routing ---------------- */

  const VIEWS = ["home", "programme", "assessment", "results", "thanks", "admin"];

  function route() {
    let hash = (location.hash || "#home").replace("#", "");
    if (!VIEWS.includes(hash)) hash = "home";
    // Results/thanks need a submission in this browser session
    if ((hash === "results" || hash === "thanks") && !lastResult) hash = "home";
    VIEWS.forEach((v) => {
      const el = $("#view-" + v);
      if (el) el.classList.toggle("active", v === hash);
    });
    if (hash === "assessment") renderStep();
    if (hash === "admin") renderAdminList();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- Assessment rendering ---------------- */

  function renderStep() {
    const step = steps[state.stepIndex];
    const total = steps.length;
    const pct = Math.round((state.stepIndex / (total - 1)) * 100);

    $("#progress-fill").style.width = pct + "%";
    $("#progress-count").textContent = "Step " + (state.stepIndex + 1) + " of " + total;
    $("#progress-label").textContent =
      step.type === "intake" ? "About you"
        : step.type === "section" ? "Readiness questions — Section " + step.section.id
          : "Scoping questions";

    const panel = $("#step-panel");
    if (step.type === "intake") panel.innerHTML = intakeHTML();
    else if (step.type === "section") panel.innerHTML = sectionHTML(step.section);
    else panel.innerHTML = openGroupHTML(step.group);

    bindStepEvents(step);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function intakeHTML() {
    const i = state.intake;
    const chip = (name, value, label, checked) =>
      '<span class="choice-chip">' +
      '<input type="radio" name="' + name + '" id="' + name + "_" + value + '" value="' + value + '"' + (checked ? " checked" : "") + ">" +
      '<label for="' + name + "_" + value + '">' + label + "</label></span>";

    return (
      '<p class="step-kicker">Before we begin</p>' +
      "<h2>About you</h2>" +
      '<p class="step-intro">A few details so we can tailor the scoping conversation to your role, site and team. This takes about 20 minutes in total, and your progress is saved in this browser as you go.</p>' +
      '<div class="notice notice-warn"><span class="notice-icon">🔒</span><span><strong>Please do not include confidential, personal, sensitive or identifiable employee information</strong> anywhere in this questionnaire. Describe tasks and patterns, not people or cases.</span></div>' +
      '<div class="form-grid">' +
      field("name", "Your name", "text", i.name, "e.g. Alex Smith") +
      field("role", "Your role", "text", i.role, "e.g. HR Business Partner") +
      field("email", "Email address", "email", i.email, "e.g. alex.smith@forthports.co.uk") +
      field("site", "Site or location", "text", i.site, "e.g. Grangemouth, Tilbury, Edinburgh, multi-site") +
      '<div class="form-field full" data-field="team"><label for="f_team">HR team or function</label>' +
      '<input type="text" id="f_team" value="' + esc(i.team) + '" placeholder="e.g. HR Operations, Talent, Employee Relations, Reward, L&amp;D">' +
      '<span class="field-error">Please tell us your team or function.</span></div>' +
      '<div class="form-field full" data-field="copilotAccess"><label>Do you currently have access to Microsoft Copilot?</label>' +
      '<div class="choice-row">' +
      chip("copilotAccess", "yes", "Yes", i.copilotAccess === "yes") +
      chip("copilotAccess", "partial", "Some of the team do", i.copilotAccess === "partial") +
      chip("copilotAccess", "no", "No", i.copilotAccess === "no") +
      chip("copilotAccess", "unsure", "Not sure", i.copilotAccess === "unsure") +
      "</div><span class=\"field-error\">Please choose an option.</span></div>" +
      '<div class="form-field full" data-field="usedAI"><label>Have you used Copilot or another AI tool before?</label>' +
      '<div class="choice-row">' +
      chip("usedAI", "regularly", "Yes, regularly", i.usedAI === "regularly") +
      chip("usedAI", "occasionally", "Yes, occasionally", i.usedAI === "occasionally") +
      chip("usedAI", "no", "Not yet", i.usedAI === "no") +
      "</div><span class=\"field-error\">Please choose an option.</span></div>" +
      '<div class="form-field full" data-field="consent">' +
      '<label class="consent-box" for="f_consent"><input type="checkbox" id="f_consent"' + (i.consent ? " checked" : "") + ">" +
      "<span><strong>I understand that I should not submit confidential, personal, sensitive or identifiable employee information in this questionnaire.</strong></span></label>" +
      '<span class="field-error">Please confirm you understand before continuing.</span></div>' +
      "</div>" +
      '<p class="step-error" id="step-error">Please complete the highlighted fields before continuing.</p>' +
      '<div class="step-actions"><a class="btn btn-ghost" href="#home">Back to home</a>' +
      '<button class="btn btn-primary" id="btn-next">Begin the questionnaire →</button></div>'
    );

    function field(key, label, type, value, placeholder) {
      return (
        '<div class="form-field" data-field="' + key + '"><label for="f_' + key + '">' + label + "</label>" +
        '<input type="' + type + '" id="f_' + key + '" value="' + esc(value) + '" placeholder="' + esc(placeholder) + '">' +
        '<span class="field-error">' + (key === "email" ? "Please enter a valid email address." : "This field helps us tailor the session — please fill it in.") + "</span></div>"
      );
    }
  }

  function sectionHTML(section) {
    const idx = SECTIONS.indexOf(section);
    let html =
      '<p class="step-kicker">Section ' + section.id + " of F &middot; Readiness questions</p>" +
      "<h2>" + esc(section.title) + "</h2>" +
      '<p class="step-intro">' + esc(section.intro) + "</p>" +
      '<div class="scale-key"><strong>Rating scale:</strong>' +
      SCALE.map((s) => "<span><strong>" + s.value + "</strong> = " + s.label + "</span>").join("") +
      "</div>";

    section.questions.forEach((q, qi) => {
      const key = section.id + (qi + 1);
      const current = state.scores[key];
      html +=
        '<div class="q-block" data-qkey="' + key + '">' +
        '<p class="q-text"><span class="q-num">' + section.id + (qi + 1) + ".</span>" + esc(q.text) + "</p>" +
        '<div class="rating-row" role="radiogroup" aria-label="Question ' + key + '">' +
        SCALE.map((s) =>
          '<span class="rating-option">' +
          '<input type="radio" name="q_' + key + '" id="q_' + key + "_" + s.value + '" value="' + s.value + '"' + (current === s.value ? " checked" : "") + ">" +
          '<label for="q_' + key + "_" + s.value + '"><span class="rating-num">' + s.value + '</span><span class="rating-text">' + s.label + "</span></label></span>"
        ).join("") +
        "</div></div>";
    });

    html +=
      '<p class="step-error" id="step-error">Please answer the highlighted questions before continuing. There are no wrong answers — an honest picture is the most useful one.</p>' +
      '<div class="step-actions"><button class="btn btn-ghost" id="btn-back">← Back</button>' +
      '<button class="btn btn-primary" id="btn-next">' + (idx === SECTIONS.length - 1 ? "Continue to scoping questions →" : "Next section →") + "</button></div>";
    return html;
  }

  function openGroupHTML(group) {
    const gi = OPEN_GROUPS.indexOf(group);
    const isLast = gi === OPEN_GROUPS.length - 1;
    let html =
      '<p class="step-kicker">Scoping questions &middot; Part ' + (gi + 1) + " of " + OPEN_GROUPS.length + "</p>" +
      "<h2>" + esc(group.title) + '<span class="optional-tag">Optional but valuable</span></h2>' +
      '<p class="step-intro">' + esc(group.intro) + " Answer in your own words — bullet points are fine. Please describe tasks and patterns rather than named individuals or specific cases.</p>";

    group.questions.forEach((q, qi) => {
      const key = group.key + "_" + qi;
      html +=
        '<div class="form-field full" style="margin-bottom:1.3rem;">' +
        '<label for="t_' + key + '">' + (qi + 1) + ". " + esc(q) + "</label>" +
        '<textarea id="t_' + key + '" data-tkey="' + key + '" placeholder="Your thoughts…">' + esc(state.texts[key]) + "</textarea></div>";
    });

    html +=
      '<div class="step-actions"><button class="btn btn-ghost" id="btn-back">← Back</button>' +
      '<button class="btn btn-primary" id="btn-next">' + (isLast ? "Submit my responses ✓" : "Next →") + "</button></div>";
    return html;
  }

  function bindStepEvents(step) {
    const next = $("#btn-next");
    const back = $("#btn-back");
    if (back) back.addEventListener("click", () => { state.stepIndex--; saveDraft(); renderStep(); });

    if (step.type === "intake") {
      next.addEventListener("click", () => {
        collectIntake();
        if (validateIntake()) { state.stepIndex++; saveDraft(); renderStep(); }
      });
    } else if (step.type === "section") {
      $$('input[type="radio"]', $("#step-panel")).forEach((r) =>
        r.addEventListener("change", () => {
          state.scores[r.name.replace("q_", "")] = parseInt(r.value, 10);
          r.closest(".q-block").classList.remove("unanswered");
          saveDraft();
        })
      );
      next.addEventListener("click", () => {
        const missing = step.section.questions
          .map((q, qi) => step.section.id + (qi + 1))
          .filter((key) => !state.scores[key]);
        $$(".q-block").forEach((b) => b.classList.toggle("unanswered", missing.includes(b.dataset.qkey)));
        const err = $("#step-error");
        if (missing.length) {
          err.classList.add("show");
          $('.q-block[data-qkey="' + missing[0] + '"]').scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        err.classList.remove("show");
        state.stepIndex++;
        saveDraft();
        renderStep();
      });
    } else {
      $$("textarea", $("#step-panel")).forEach((t) =>
        t.addEventListener("input", () => { state.texts[t.dataset.tkey] = t.value; })
      );
      $$("textarea", $("#step-panel")).forEach((t) =>
        t.addEventListener("blur", saveDraft)
      );
      next.addEventListener("click", () => {
        $$("textarea", $("#step-panel")).forEach((t) => { state.texts[t.dataset.tkey] = t.value; });
        saveDraft();
        if (state.stepIndex === steps.length - 1) submit();
        else { state.stepIndex++; renderStep(); }
      });
    }
  }

  function collectIntake() {
    const val = (id) => { const el = $("#" + id); return el ? el.value.trim() : ""; };
    const radio = (name) => { const el = $('input[name="' + name + '"]:checked'); return el ? el.value : ""; };
    state.intake = {
      name: val("f_name"),
      role: val("f_role"),
      email: val("f_email"),
      site: val("f_site"),
      team: val("f_team"),
      copilotAccess: radio("copilotAccess"),
      usedAI: radio("usedAI"),
      consent: $("#f_consent").checked
    };
  }

  function validateIntake() {
    const i = state.intake;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email);
    const checks = {
      name: !!i.name, role: !!i.role, email: emailOk, site: !!i.site,
      team: !!i.team, copilotAccess: !!i.copilotAccess, usedAI: !!i.usedAI, consent: i.consent
    };
    let ok = true;
    Object.keys(checks).forEach((k) => {
      const wrap = $('.form-field[data-field="' + k + '"]');
      if (wrap) wrap.classList.toggle("invalid", !checks[k]);
      if (!checks[k]) ok = false;
    });
    $("#step-error").classList.toggle("show", !ok);
    return ok;
  }

  /* ---------------- Scoring ---------------- */

  function bandFor(score) {
    return BANDS.find((b) => score >= b.min && score <= b.max) || BANDS[0];
  }

  function computeResults() {
    const sectionScores = SECTIONS.map((s) => {
      const values = s.questions.map((q, qi) => state.scores[s.id + (qi + 1)] || 0);
      const sum = values.reduce((a, b) => a + b, 0);
      return {
        id: s.id, key: s.key, title: s.title, short: s.short,
        raw: sum,
        max: s.questions.length * MAX_QUESTION_SCORE,
        pct: Math.round((sum / (s.questions.length * MAX_QUESTION_SCORE)) * 100)
      };
    });
    const totalRaw = sectionScores.reduce((a, s) => a + s.raw, 0);
    const overall = Math.round((totalRaw / (TOTAL_QUESTIONS * MAX_QUESTION_SCORE)) * 100);
    return { overall, band: bandFor(overall), sections: sectionScores };
  }

  function submit() {
    const results = computeResults();
    const record = {
      id: "ep-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      submittedAt: new Date().toISOString(),
      intake: state.intake,
      scores: Object.assign({}, state.scores),
      texts: Object.assign({}, state.texts),
      results,
      synced: false
    };
    const all = loadResponses();
    all.push(record);
    saveResponses(all);
    lastResult = record;
    clearDraft();
    state = { intake: {}, scores: {}, texts: {}, stepIndex: 0 };
    renderResults(record);
    location.hash = "#results";
    setSyncStatus("sending");
    syncRecord(record).then((ok) => setSyncStatus(ok ? "sent" : "local"));
  }

  /* ---------------- Central submission (Google Sheet backend) ---------------- */

  function buildSubmissionPayload(record) {
    const i = record.intake;
    const cols = [
      { h: "Submitted", v: record.submittedAt },
      { h: "Submission ID", v: record.id },
      { h: "Name", v: i.name || "" },
      { h: "Role", v: i.role || "" },
      { h: "Email", v: i.email || "" },
      { h: "Site / location", v: i.site || "" },
      { h: "Team / function", v: i.team || "" },
      { h: "Copilot access", v: labelAccess(i.copilotAccess) },
      { h: "Used AI before", v: labelUsedAI(i.usedAI) },
      { h: "Overall /100", v: record.results.overall },
      { h: "Band", v: record.results.band.name }
    ];
    record.results.sections.forEach((s) => cols.push({ h: s.title + " /100", v: s.pct }));
    SECTIONS.forEach((s) => s.questions.forEach((q, qi) => {
      const key = s.id + (qi + 1);
      cols.push({ h: key + " — " + q.theme, v: record.scores[key] || "" });
    }));
    OPEN_GROUPS.forEach((g) => g.questions.forEach((q, qi) => {
      cols.push({ h: "[" + g.title + "] " + q, v: record.texts[g.key + "_" + qi] || "" });
    }));
    return { kind: "ep-readiness-submission", id: record.id, columns: cols };
  }

  function syncRecord(record) {
    if (!window.EP_CONFIG || !EP_CONFIG.SUBMIT_ENDPOINT) return Promise.resolve(false);
    return fetch(EP_CONFIG.SUBMIT_ENDPOINT, {
      method: "POST",
      // text/plain keeps this a "simple request" (no CORS preflight),
      // which is what Google Apps Script web apps require.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(buildSubmissionPayload(record)),
      redirect: "follow"
    })
      .then((res) => res.ok)
      .catch(() => false)
      .then((ok) => {
        if (ok) markSynced(record.id);
        return ok;
      });
  }

  function markSynced(id) {
    const all = loadResponses();
    const rec = all.find((r) => r.id === id);
    if (rec) { rec.synced = true; saveResponses(all); }
    if (lastResult && lastResult.id === id) lastResult.synced = true;
  }

  function retryUnsynced() {
    if (!window.EP_CONFIG || !EP_CONFIG.SUBMIT_ENDPOINT) return;
    const pending = loadResponses().filter((r) => !r.synced);
    // Sequential, fire-and-forget: quietly delivers anything that failed
    // to send at submission time (offline, network blip).
    pending.reduce((p, rec) => p.then(() => syncRecord(rec)), Promise.resolve());
  }

  function setSyncStatus(status) {
    const el = $("#sync-status");
    if (!el) return;
    if (status === "sending") {
      el.textContent = "Sending your responses to Enlightened People…";
    } else if (status === "sent") {
      el.textContent = "✓ Your responses have been sent securely to Enlightened People.";
    } else {
      el.textContent = window.EP_CONFIG && EP_CONFIG.SUBMIT_ENDPOINT
        ? "Your responses are saved on this device and will be sent to Enlightened People automatically the next time you open this site online."
        : "Your responses are saved on this device.";
    }
  }

  /* ---------------- Results view ---------------- */

  function renderResults(record) {
    const r = record.results;
    const deg = Math.round((r.overall / 100) * 360);
    $("#score-dial").style.background =
      "conic-gradient(var(--blue) 0deg " + deg + "deg, var(--line) " + deg + "deg 360deg)";
    $("#score-big").textContent = r.overall;
    $("#band-chip").textContent = r.band.name;
    $("#band-blurb").textContent = r.band.blurb;
    $("#result-name").textContent = record.intake.name ? "Thank you, " + record.intake.name.split(" ")[0] + "." : "Thank you.";
    $("#result-message").textContent = r.band.message;

    $("#section-scores").innerHTML = r.sections.map((s) =>
      '<div class="score-row">' +
      '<span class="score-name">' + esc(s.title) + "</span>" +
      '<span class="score-track"><span class="score-fill" style="width:' + s.pct + '%"></span></span>' +
      '<span class="score-val">' + s.pct + "</span></div>"
    ).join("");
  }

  /* ---------------- Admin summary generation ---------------- */

  function allQuestionScores(record) {
    const out = [];
    SECTIONS.forEach((s) => {
      s.questions.forEach((q, qi) => {
        const key = s.id + (qi + 1);
        out.push({ key, section: s.title, short: s.short, theme: q.theme, score: record.scores[key] || 0 });
      });
    });
    return out;
  }

  function textAnswers(record, groupKey) {
    const group = OPEN_GROUPS.find((g) => g.key === groupKey);
    return group.questions.map((q, qi) => ({
      question: q,
      answer: (record.texts[groupKey + "_" + qi] || "").trim()
    })).filter((a) => a.answer);
  }

  function buildAdminSummary(record) {
    const r = record.results;
    const i = record.intake;
    const qs = allQuestionScores(record);

    const strengths = qs.slice().sort((a, b) => b.score - a.score || a.key.localeCompare(b.key)).slice(0, 3);
    const risks = qs.slice().sort((a, b) => a.score - b.score || a.key.localeCompare(b.key)).slice(0, 3);

    const useCases = textAnswers(record, "usecases").concat(
      textAnswers(record, "world").filter((a) => /task|repetitive|time/i.test(a.question))
    );
    const governanceNotes = textAnswers(record, "governance");
    const aiReality = textAnswers(record, "aireality");
    const successNotes = textAnswers(record, "success");

    // Copilot access issues
    const access = [];
    if (i.copilotAccess === "no") access.push("Respondent reports no current Microsoft Copilot access.");
    if (i.copilotAccess === "partial") access.push("Only some of the team currently have Copilot access.");
    if (i.copilotAccess === "unsure") access.push("Respondent is unsure whether they have Copilot access — verify licences before delivery.");
    if ((record.scores["C5"] || 0) <= 2) access.push("Low score on access to approved AI tools (C5) — team may be relying on free or personal accounts.");
    if ((record.scores["C6"] || 0) <= 3) access.push("Not everyone expected at training has confirmed working Copilot access (C6).");
    const accessText = aiReality.find((a) => /access/i.test(a.question));
    if (accessText) access.push("In their words: “" + accessText.answer + "”");
    if (!access.length) access.push("No access issues flagged — confirm licence coverage as a formality before delivery.");

    // Governance flags
    const govFlags = [];
    const govSection = r.sections.find((s) => s.key === "governance");
    if (govSection.pct < 60) govFlags.push("Governance section scored " + govSection.pct + "/100 — build a substantial responsible-AI and data protection module into the training.");
    if ((record.scores["D1"] || 0) <= 2) govFlags.push("No written AI policy or clear guidance in place (D1).");
    if ((record.scores["D3"] || 0) <= 3) govFlags.push("Awareness of not pasting sensitive data into public AI tools is not yet reliable (D3).");
    governanceNotes.forEach((a) => govFlags.push("On “" + a.question.replace(/\?$/, "") + "”: “" + a.answer + "”"));
    const nearMiss = aiReality.find((a) => /risk|near miss/i.test(a.question));
    if (nearMiss) govFlags.push("Reported risks / near misses to shape governance content: “" + nearMiss.answer + "”");
    if (!govFlags.length) govFlags.push("No specific governance issues raised — validate in the scoping call.");

    // Training design implications (rule-based)
    const implications = [];
    r.sections.forEach((s) => {
      if (s.pct >= 60) return;
      const map = {
        data: "Include practical guidance on finding, organising and preparing HR documents and data so Copilot has good material to work with (SharePoint/OneDrive hygiene, what to keep out of AI tools).",
        process: "Use the training to map one or two core HR processes and show how Copilot supports each step — the team may benefit from process capture before automation.",
        skills: "Pitch the training at foundation level: what Copilot can and cannot do, a shared prompting method, and how to review AI output — assume limited hands-on experience.",
        governance: "Dedicate meaningful time to responsible AI: UK GDPR, what may and may not go into AI tools, fairness and bias in people decisions, and when human sign-off is required.",
        culture: "Build in confidence and adoption work: address fears openly, identify champions, and agree how learning time will be protected after the session.",
        experience: "Include a segment on communicating AI use to employees and managers in plain English, and on defining what success looks like three months out."
      };
      implications.push(map[s.key]);
    });
    if (i.usedAI === "no") implications.push("Respondent has not used Copilot or other AI tools before — plan for a gentle, hands-on introduction with no assumed knowledge.");
    if (i.copilotAccess !== "yes") implications.push("Resolve Copilot licensing/access before the training date so every attendee can participate hands-on.");
    if (r.overall >= 80) implications.push("Advanced readiness — focus on champions, playbooks, repeatable use-case libraries and measuring impact rather than introductory content.");
    else if (r.overall >= 60) implications.push("Strong readiness — move quickly into hands-on work on priority use cases; keep introductory theory brief.");
    if (i.site) implications.push("Tailor examples to the " + i.site + " context (and check for site-to-site differences raised in the workload answers).");
    if (!implications.length) implications.push("Scores are consistently strong — design an advanced, use-case-driven session.");

    // Follow-up questions for the scoping call
    const followUps = [];
    risks.forEach((rk) => followUps.push("Their lowest-scoring area was “" + rk.theme + "” (" + rk.score + "/5, " + rk.short + ") — what does that look like day to day, and what would improvement look like?"));
    if (i.copilotAccess !== "yes") followUps.push("Who owns Copilot licensing, and what is the realistic timeline for getting every attendee working access?");
    if (!useCases.length) followUps.push("No priority use cases were written down — ask them to bring two or three recent tasks that took longer than they should have.");
    if (!governanceNotes.length) followUps.push("Governance questions were left blank — explore what guidance (formal or informal) the team currently follows.");
    const siteDiff = textAnswers(record, "world").find((a) => /sites, teams or locations/i.test(a.question));
    if (siteDiff) followUps.push("They flagged site/team differences: “" + siteDiff.answer + "” — how should the training reflect these?");
    if (successNotes.length) followUps.push("Test their success measures: “" + successNotes[0].answer + "” — how would we evidence this three months after training?");
    followUps.push("What safe, non-confidential documents or templates can they share as raw material for the practical exercises?");

    return {
      strengths, risks,
      useCases: useCases.map((a) => a.answer),
      governance: govFlags,
      access,
      implications,
      followUps
    };
  }

  /* ---------------- Admin views ---------------- */

  function renderAdminList() {
    const listEl = $("#admin-list");
    const detailEl = $("#admin-detail");
    detailEl.innerHTML = "";
    const responses = loadResponses();

    if (!responses.length) {
      listEl.innerHTML =
        '<div class="empty-state"><p><strong>No responses yet.</strong></p>' +
        "<p>Completed assessments will appear here. Responses are stored in this browser — collect exports from each respondent, or complete the assessment on a shared device.</p></div>";
      return;
    }

    listEl.innerHTML =
      '<div class="admin-actions">' +
      '<button class="btn btn-secondary" id="btn-export-json">Download all responses (JSON)</button>' +
      '<button class="btn btn-secondary" id="btn-export-csv">Download score summary (CSV)</button>' +
      '<button class="btn btn-ghost" id="btn-clear-all">Clear stored responses</button>' +
      "</div>" +
      '<div class="table-scroll"><table class="admin-table"><thead><tr>' +
      "<th>Submitted</th><th>Name</th><th>Role</th><th>Site</th><th>Team</th><th>Score</th><th>Band</th><th></th>" +
      "</tr></thead><tbody>" +
      responses.slice().reverse().map((rec) =>
        "<tr><td>" + new Date(rec.submittedAt).toLocaleDateString("en-GB") + "</td>" +
        "<td>" + esc(rec.intake.name) + "</td><td>" + esc(rec.intake.role) + "</td>" +
        "<td>" + esc(rec.intake.site) + "</td><td>" + esc(rec.intake.team) + "</td>" +
        "<td><strong>" + rec.results.overall + "</strong>/100</td>" +
        "<td>" + esc(rec.results.band.name) + "</td>" +
        '<td><button class="btn btn-primary" data-view-id="' + rec.id + '">View summary</button></td></tr>'
      ).join("") +
      "</tbody></table></div>";

    $("#btn-export-json").addEventListener("click", () =>
      download("enlightened-people-forth-ports-responses.json", JSON.stringify(responses, null, 2), "application/json"));
    $("#btn-export-csv").addEventListener("click", () => download("enlightened-people-forth-ports-scores.csv", buildCSV(responses), "text/csv"));
    $("#btn-clear-all").addEventListener("click", () => {
      if (confirm("Delete all stored responses from this browser? Export them first if you need them.")) {
        saveResponses([]);
        renderAdminList();
      }
    });
    $$("[data-view-id]").forEach((btn) =>
      btn.addEventListener("click", () => renderAdminDetail(responses.find((r) => r.id === btn.dataset.viewId)))
    );
  }

  function buildCSV(responses) {
    const head = ["Submitted", "Name", "Role", "Email", "Site", "Team", "Copilot access", "Used AI before", "Overall /100"]
      .concat(SECTIONS.map((s) => s.title + " /100"));
    const rows = responses.map((rec) =>
      [rec.submittedAt, rec.intake.name, rec.intake.role, rec.intake.email, rec.intake.site, rec.intake.team,
        rec.intake.copilotAccess, rec.intake.usedAI, rec.results.overall]
        .concat(rec.results.sections.map((s) => s.pct))
    );
    return [head].concat(rows)
      .map((row) => row.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(","))
      .join("\r\n");
  }

  function renderAdminDetail(rec) {
    if (!rec) return;
    const s = buildAdminSummary(rec);
    const r = rec.results;
    const i = rec.intake;
    const li = (items) => items.map((x) => "<li>" + (x.indexOf("<") === 0 ? x : esc(x)) + "</li>").join("");

    $("#admin-detail").innerHTML =
      '<div class="admin-summary" id="printable-summary">' +
      '<p class="step-kicker">Scoping call preparation — confidential to Enlightened People</p>' +
      "<h2>Readiness summary: " + esc(i.name || "Unnamed respondent") + "</h2>" +
      '<p style="color:var(--ink-faint);font-size:0.9rem;margin-bottom:1.2rem;">Submitted ' + new Date(rec.submittedAt).toLocaleString("en-GB") + "</p>" +

      "<h3>Respondent</h3>" +
      '<div class="meta-grid">' +
      metaItem("Name", i.name) + metaItem("Role", i.role) + metaItem("Site / location", i.site) +
      metaItem("Team / function", i.team) + metaItem("Copilot access", labelAccess(i.copilotAccess)) +
      metaItem("Prior AI use", labelUsedAI(i.usedAI)) +
      "</div>" +

      "<h3>Scores</h3>" +
      '<div class="meta-grid">' +
      metaItem("Overall readiness", r.overall + " / 100 — " + r.band.name) +
      r.sections.map((sec) => metaItem(sec.title, sec.pct + " / 100")).join("") +
      "</div>" +

      "<h3>Top three readiness strengths</h3><ul>" +
      li(s.strengths.map((x) => x.theme + " — " + x.score + "/5 (" + x.short + ")")) + "</ul>" +

      "<h3>Top three risk / development areas</h3><ul>" +
      li(s.risks.map((x) => x.theme + " — " + x.score + "/5 (" + x.short + ")")) + "</ul>" +

      "<h3>Priority use cases mentioned</h3>" +
      (s.useCases.length ? "<ul>" + li(s.useCases) + "</ul>" : "<p style='color:var(--ink-faint)'>None provided — explore in the scoping call.</p>") +

      "<h3>Governance issues</h3><ul>" + li(s.governance) + "</ul>" +
      "<h3>Copilot access</h3><ul>" + li(s.access) + "</ul>" +
      "<h3>Suggested training design implications</h3><ul>" + li(s.implications) + "</ul>" +
      "<h3>Suggested scoping call follow-up questions</h3><ul>" + li(s.followUps) + "</ul>" +

      "<h3>Full open-text responses</h3>" +
      OPEN_GROUPS.map((g) => {
        const answers = textAnswers(rec, g.key);
        if (!answers.length) return "";
        return "<p><strong>" + esc(g.title) + "</strong></p><ul>" +
          answers.map((a) => "<li><em>" + esc(a.question) + "</em><br>" + esc(a.answer) + "</li>").join("") + "</ul>";
      }).join("") +
      "</div>" +
      '<div class="admin-actions no-print">' +
      '<button class="btn btn-primary" id="btn-print-summary">Print / save as PDF</button>' +
      '<button class="btn btn-secondary" id="btn-download-summary">Download summary (text)</button>' +
      '<button class="btn btn-ghost" id="btn-back-list">← Back to all responses</button>' +
      "</div>";

    $("#btn-print-summary").addEventListener("click", () => window.print());
    $("#btn-download-summary").addEventListener("click", () =>
      download("readiness-summary-" + slug(i.name) + ".txt", summaryAsText(rec, s), "text/plain"));
    $("#btn-back-list").addEventListener("click", () => { $("#admin-detail").innerHTML = ""; window.scrollTo(0, 0); });
    $("#admin-detail").scrollIntoView({ behavior: "smooth" });

    function metaItem(k, v) {
      return '<div class="meta-item"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v || "—") + "</div></div>";
    }
  }

  function labelAccess(v) {
    return { yes: "Yes", partial: "Some of the team", no: "No", unsure: "Not sure" }[v] || "—";
  }
  function labelUsedAI(v) {
    return { regularly: "Yes, regularly", occasionally: "Yes, occasionally", no: "Not yet" }[v] || "—";
  }

  function summaryAsText(rec, s) {
    const r = rec.results;
    const i = rec.intake;
    const L = [];
    const push = (x) => L.push(x);
    push("ENLIGHTENED PEOPLE — AI READINESS SUMMARY (Forth Ports HR)");
    push("Confidential — scoping call preparation");
    push("Submitted: " + new Date(rec.submittedAt).toLocaleString("en-GB"));
    push("");
    push("RESPONDENT");
    push("  Name: " + (i.name || "—"));
    push("  Role: " + (i.role || "—"));
    push("  Site / location: " + (i.site || "—"));
    push("  Team / function: " + (i.team || "—"));
    push("  Copilot access: " + labelAccess(i.copilotAccess));
    push("  Prior AI use: " + labelUsedAI(i.usedAI));
    push("");
    push("SCORES");
    push("  Overall readiness: " + r.overall + "/100 — " + r.band.name);
    r.sections.forEach((sec) => push("  " + sec.title + ": " + sec.pct + "/100"));
    push("");
    const block = (title, items) => {
      push(title.toUpperCase());
      items.forEach((x) => push("  - " + x));
      push("");
    };
    block("Top three readiness strengths", s.strengths.map((x) => x.theme + " — " + x.score + "/5 (" + x.short + ")"));
    block("Top three risk / development areas", s.risks.map((x) => x.theme + " — " + x.score + "/5 (" + x.short + ")"));
    block("Priority use cases mentioned", s.useCases.length ? s.useCases : ["None provided — explore in the scoping call."]);
    block("Governance issues", s.governance);
    block("Copilot access", s.access);
    block("Suggested training design implications", s.implications);
    block("Suggested scoping call follow-up questions", s.followUps);
    push("FULL OPEN-TEXT RESPONSES");
    OPEN_GROUPS.forEach((g) => {
      const answers = textAnswers(rec, g.key);
      if (!answers.length) return;
      push("  " + g.title);
      answers.forEach((a) => { push("    Q: " + a.question); push("    A: " + a.answer); });
      push("");
    });
    return L.join("\n");
  }

  /* ---------------- Init ---------------- */

  function init() {
    loadDraft();
    window.addEventListener("hashchange", route);

    $$("[data-start]").forEach((el) =>
      el.addEventListener("click", () => { location.hash = "#assessment"; })
    );

    const printBtn = $("#btn-print-results");
    if (printBtn) printBtn.addEventListener("click", () => window.print());

    retryUnsynced();
    route();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
