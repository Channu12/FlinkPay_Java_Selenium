// @ts-check
// Replaces pom.xml + testng suite XMLs + WebDriverUtility.openBrowserWindow
const path = require('path');
const { defineConfig } = require('@playwright/test');
const { FileUtility } = require('./src/genericutility/FileUtility');
const { IConstants } = require('./src/genericutility/IConstants');
const { formatDate } = require('./src/genericutility/JavaUtility');

const fileUtility = new FileUtility();
const prop = (key, def) => { try { return fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, key); } catch (e) { return def; } };

// browser=chrome | edge | firefox   (same key as the Java framework)
const browserName = (process.env.BROWSER || prop('browser', 'chrome')).toLowerCase();
const headless = (process.env.HEADLESS || prop('headless', 'false')).toLowerCase() === 'true';

const browserUse = {
  chrome: { browserName: 'chromium' },
  chromium: { browserName: 'chromium' },
  edge: { browserName: 'chromium', channel: 'msedge' },
  firefox: { browserName: 'firefox' },
}[browserName] || { browserName: 'chromium' };

const isChromium = browserUse.browserName === 'chromium';

// Execution_Reports/MyReport_yyyyMMdd_HHmmss  (same naming as the Extent report)
const reportFolder = path.join(IConstants.EXECUTION_REPORTS_PATH, 'MyReport_' + formatDate(new Date(), 'yyyyMMdd_HHmmss'));

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15 * 60 * 1000,          // simulation + SSH + 3-layer verification can take a while
  expect: { timeout: IConstants.EXPLICIT_WAIT_TIME * 1000 },
  fullyParallel: false,
  workers: 1,                        // Excel data files are re-written during each run
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: reportFolder, open: 'never' }],
  ],
  outputDir: path.join('test-results'),
  use: {
    ...browserUse,
    headless,
    viewport: null,                  // maximizeBrowserWindow()
    launchOptions: isChromium ? { args: ['--start-maximized'] } : {},
    actionTimeout: IConstants.IMPLICIT_WAIT_TIME * 1000,   // implicitWait(10)
    navigationTimeout: 30 * 1000,
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  metadata: {
    'Customer Name': 'Mashreq Bank',
    Environment: 'Production',
    'Browser Name': browserName,
    User: 'Channa S',
  },
});
