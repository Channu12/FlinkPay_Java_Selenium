// Replacement for Extent Reports (com.aventstack.extentreports) on top of the Playwright HTML report.
//
//   ExtentReports.createTest(name)  -> new ExtentTest node (a named section of the log)
//   extentTest.info/pass/warning     -> console + annotation in Playwright HTML report
//   extentTest.fail                  -> same + expect.soft() so the Playwright test is marked FAILED
//                                       but execution continues (same as Extent .fail()).
//   Every node's log is attached to the test as "Extent-Log.txt" when the test finishes.
const { test, expect } = require('@playwright/test');

const Status = { INFO: 'INFO', PASS: 'PASS', FAIL: 'FAIL', SKIP: 'SKIP', WARNING: 'WARNING' };

function currentTestInfo() {
  try { return test.info(); } catch (e) { return null; }
}

class ExtentTest {
  constructor(name, reports) {
    this.name = name;
    this.reports = reports;
    this.logs = [];
  }

  log(status, message) {
    const line = `[${new Date().toISOString()}] [${status}] [${this.name}] ${message}`;
    this.logs.push(line);
    this.reports.lines.push(line);
    console.log(line);
    const ti = currentTestInfo();
    if (ti) ti.annotations.push({ type: `${status} - ${this.name}`, description: String(message) });
    if (status === Status.FAIL) {
      expect.soft(false, `[${this.name}] ${message}`).toBe(true);
    }
    return this;
  }

  info(message) { return this.log(Status.INFO, message); }
  pass(message) { return this.log(Status.PASS, message); }
  fail(message) { return this.log(Status.FAIL, message); }
  warning(message) { return this.log(Status.WARNING, message); }
  skip(message) { return this.log(Status.SKIP, message); }

  assignAuthor(author) { const ti = currentTestInfo(); if (ti) ti.annotations.push({ type: 'Author', description: author }); return this; }
  assignCategory(category) { const ti = currentTestInfo(); if (ti) ti.annotations.push({ type: 'Category', description: category }); return this; }

  async addScreenCaptureFromBase64String(base64, title = 'Screenshot') {
    const ti = currentTestInfo();
    if (ti) await ti.attach(title, { body: Buffer.from(base64, 'base64'), contentType: 'image/png' });
    return this;
  }
}

class ExtentReports {
  constructor() {
    this.lines = [];
    this.systemInfo = {};
  }

  setSystemInfo(key, value) { this.systemInfo[key] = value; }

  createTest(name) { return new ExtentTest(name, this); }

  /** Attaches the collected log to the current Playwright test (called from the fixture teardown). */
  async flush() {
    const ti = currentTestInfo();
    if (ti && this.lines.length) {
      const header = Object.entries(this.systemInfo).map(([k, v]) => `${k}: ${v}`).join('\n');
      await ti.attach('Extent-Log.txt', { body: header + '\n\n' + this.lines.join('\n'), contentType: 'text/plain' });
    }
    this.lines = [];
  }
}

module.exports = { ExtentReports, ExtentTest, Status };
