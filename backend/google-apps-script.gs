/**
 * Enlightened People — AI Readiness Portal
 * Submission receiver: appends each questionnaire submission as one
 * row in the Google Sheet this script is bound to.
 *
 * ONE-TIME SETUP (about 5 minutes):
 *  1. Create a new Google Sheet (sheets.new), e.g.
 *     "Enlightened People — Forth Ports AI Readiness Submissions".
 *  2. In the Sheet: Extensions → Apps Script.
 *  3. Delete the placeholder code and paste this entire file. Save.
 *  4. Click Deploy → New deployment → type: Web app.
 *       - Description:  Readiness submissions
 *       - Execute as:   Me
 *       - Who has access: Anyone
 *     Click Deploy and authorise when prompted.
 *  5. Copy the Web app URL (ends in /exec) and paste it into
 *     js/config.js as SUBMIT_ENDPOINT, then commit/redeploy the site.
 *
 * Each submission becomes one row; the first submission writes the
 * header row (respondent details, overall score, band, six section
 * scores, all 36 question scores, all 35 open-text answers).
 *
 * "Anyone" access means anyone with the URL can append rows — they
 * cannot read the sheet. The site collects no confidential employee
 * data by design.
 */

var SHEET_NAME = "Submissions";
var ID_COLUMN = 2; // "Submission ID" — used to ignore duplicate retries

// Email alert for each new submission. Set to "" to disable.
var NOTIFY_EMAIL = "iain@enlightenedpeople.co.uk";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return respond({ ok: false, error: "Invalid JSON" });
    }
    if (!data || data.kind !== "ep-readiness-submission" || !Array.isArray(data.columns)) {
      return respond({ ok: false, error: "Unrecognised payload" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      var headers = data.columns.map(function (c) { return String(c.h); });
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setWrap(true);
      sheet.setFrozenRows(1);
    }

    // Ignore duplicate deliveries (e.g. a retry after a network blip).
    if (data.id && sheet.getLastRow() > 1) {
      var ids = sheet.getRange(2, ID_COLUMN, sheet.getLastRow() - 1, 1).getValues();
      for (var r = 0; r < ids.length; r++) {
        if (String(ids[r][0]) === String(data.id)) {
          return respond({ ok: true, duplicate: true });
        }
      }
    }

    sheet.appendRow(data.columns.map(function (c) {
      var v = c.v;
      return v === null || v === undefined ? "" : v;
    }));
    notify(data, ss);
    return respond({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Sends a short alert email for each stored submission. Failures are
// swallowed so a mail problem never loses the data itself.
function notify(data, ss) {
  if (!NOTIFY_EMAIL) return;
  try {
    var get = function (header) {
      for (var i = 0; i < data.columns.length; i++) {
        if (String(data.columns[i].h) === header) return String(data.columns[i].v || "");
      }
      return "";
    };
    var name = get("Name") || "Unnamed respondent";
    var score = get("Overall /100");
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: "New AI Readiness submission — " + name + " (" + score + "/100)",
      body:
        "A new AI Readiness Assessment has been submitted.\n\n" +
        "Name: " + name + "\n" +
        "Role: " + get("Role") + "\n" +
        "Site / location: " + get("Site / location") + "\n" +
        "Team / function: " + get("Team / function") + "\n" +
        "Copilot access: " + get("Copilot access") + "\n" +
        "Overall readiness: " + score + "/100 — " + get("Band") + "\n\n" +
        "Full details are in the Submissions sheet:\n" + ss.getUrl()
    });
  } catch (e) {
    // Never fail the submission because of a mail error.
  }
}

// Visiting the web app URL in a browser confirms it is deployed.
function doGet() {
  return respond({ ok: true, service: "Enlightened People readiness receiver" });
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
