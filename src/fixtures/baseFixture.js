// Port of BaseClass + BaseClassForBank + ListenerImplementationClass (TestNG) to Playwright fixtures.
//
//  TestNG                         Playwright
//  ---------------------------    -------------------------------------------------------
//  @BeforeSuite / @AfterSuite  -> worker-scoped fixture `suiteSetup`   (DB + SSH connect / disconnect)
//  @BeforeClass / @AfterClass  -> Playwright `page` fixture             (browser opened from playwright.config.js)
//  @BeforeMethod               -> `baseClass` auto fixture: open url + login
//  @AfterMethod                -> `baseClass` auto fixture teardown: logout
//  ITestListener               -> Extent-style logging + screenshot on failure + log attachment
const { test: base } = require('@playwright/test');
const { AssertionUtility } = require('../genericutility/AssertionUtility');
const { DatabaseUtility } = require('../genericutility/DatabaseUtility');
const { ExcelUtility } = require('../genericutility/ExcelUtility');
const { ExtentReports, Status } = require('../genericutility/ExtentReportUtility');
const { FileUtility } = require('../genericutility/FileUtility');
const { IConstants } = require('../genericutility/IConstants');
const { JavaUtility } = require('../genericutility/JavaUtility');
const { RestAssuredUtility } = require('../genericutility/RestAssuredUtility');
const { SshUtility } = require('../genericutility/SshUtility');
const { UtilityObjectClass } = require('../genericutility/UtilityObjectClass');
const { WebDriverUtility, registerDialogHandler } = require('../genericutility/WebDriverUtility');
const { FlinkPayWorkflowsUtility } = require('../workflowutility/FlinkPayWorkflowsUtility');
const { HomePage } = require('../objectrepository/HomePage');

const fileUtility = new FileUtility();
const prop = (key) => fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, key);

/** ListenerImplementationClass.convertToTitleCase */
function convertToTitleCase(input) {
  let titleCase = '';
  let nextTitleCase = true;
  for (let c of input) {
    if (c >= 'A' && c <= 'Z') titleCase += ' ';
    if (nextTitleCase) { c = c.toUpperCase(); nextTitleCase = false; } else { c = c.toLowerCase(); }
    titleCase += c;
  }
  return titleCase.trim();
}

/**
 * @param {object} options
 * @param {boolean} options.connectBackends  true = BaseClass (DB + SSH), false = BaseClassForBank
 * @param {string}  options.usernameKey      property key of the login user
 * @param {string}  options.passwordKey      property key of the login password
 */
function createBaseTest({ connectBackends, usernameKey, passwordKey }) {
  return base.extend({
    // ---------------------------------------------------------------- @BeforeSuite / @AfterSuite
    suiteSetup: [async ({}, use) => {
      const databaseUtilty = new DatabaseUtility();
      const sshUtility = new SshUtility();
      let connection = null;
      let session = null;
      if (connectBackends) {
        console.log('*********Connect to the Database*********');
        connection = await databaseUtilty.connectDB(prop('dbUrl'), prop('dbUsername'), prop('dbPassword'));
        UtilityObjectClass.setDbConnection(connection);

        console.log('*********Connect to the Linux Server*********');
        session = await sshUtility.connectToUnixServer(prop('sshHost'), prop('sshPortNumber'), prop('sshUsername'), prop('sshPassword'));
        UtilityObjectClass.setSshSession(session);
      }
      await use({ connection, session });
      if (connectBackends) {
        console.log('*********Disconnect from the Database*********');
        await databaseUtilty.closeDB(connection);
        console.log('*********Disconnect from the Linux Server*********');
        await sshUtility.disconnectFromUnixServer(session);
      }
    }, { scope: 'worker', auto: true }],

    // --------------------------------------------------------- utility objects (BaseClass fields)
    excelUtility: async ({}, use) => use(new ExcelUtility()),
    fileUtility: async ({}, use) => use(new FileUtility()),
    javaUtility: async ({}, use) => use(new JavaUtility()),
    assertionUtility: async ({}, use) => use(new AssertionUtility()),
    restAssuredUtility: async ({}, use) => use(new RestAssuredUtility()),
    webDriverUtility: async ({}, use) => use(new WebDriverUtility()),
    databaseUtilty: async ({}, use) => use(new DatabaseUtility()),
    sshUtility: async ({}, use) => use(new SshUtility()),
    workflowUtility: async ({}, use) => use(new FlinkPayWorkflowsUtility()),
    driver: async ({ page }, use) => use(page),
    connection: async ({ suiteSetup }, use) => use(suiteSetup.connection),
    session: async ({ suiteSetup }, use) => use(suiteSetup.session),

    // ------------------------------------- @BeforeMethod / @AfterMethod + listener callbacks
    baseClass: [async ({ page, request }, use, testInfo) => {
      const webDriverUtility = new WebDriverUtility();
      const workflowUtility = new FlinkPayWorkflowsUtility();

      // Listener.onStart
      const extentReports = new ExtentReports();
      extentReports.setSystemInfo('Report Name', 'SimulationProject Automation Suite Report');
      extentReports.setSystemInfo('Customer Name', 'Mashreq Bank');
      extentReports.setSystemInfo('Environment', 'Production');
      extentReports.setSystemInfo('Browser Name', prop('browser'));
      extentReports.setSystemInfo('User', 'Channa S');
      UtilityObjectClass.setExtentReports(extentReports);
      UtilityObjectClass.clear();

      // Listener.onTestStart
      const extentTest = extentReports.createTest(convertToTitleCase(testInfo.title));
      UtilityObjectClass.setExtentTest(extentTest);
      extentTest.assignAuthor('Channa S');
      extentTest.assignCategory('Generic Test Scripts');

      // @BeforeClass - browser is opened by Playwright; open the application url
      console.log('*********Open Browser*********');
      UtilityObjectClass.setDriver(page);
      UtilityObjectClass.setRequest(request);
      registerDialogHandler(page);
      webDriverUtility.implicitWait(IConstants.IMPLICIT_WAIT_TIME);
      await webDriverUtility.navigateToUrl(prop('url'));

      // @BeforeMethod
      console.log('*********SignIn to the Application*********');
      await workflowUtility.loginToApplication(prop(usernameKey), prop(passwordKey));

      await use(undefined);

      // @AfterMethod
      console.log('*********Sign out from the Application*********');
      try {
        if (!connectBackends) await page.waitForTimeout(2000); // BaseClassForBank: Thread.sleep(2000)
        await webDriverUtility.clickOnElement(new HomePage(page).getLogoutButton());
      } catch (e) {
        console.log('Logout failed: ' + e.message);
      }

      // Listener.onTestSuccess / onTestFailure / onTestSkipped
      const finalTest = extentReports.createTest(convertToTitleCase(testInfo.title));
      if (testInfo.status === 'passed' && testInfo.errors.length === 0) {
        finalTest.log(Status.PASS, 'Test Passed');
      } else if (testInfo.status === 'skipped') {
        finalTest.log(Status.SKIP, 'Test Skipped');
      } else {
        finalTest.log(Status.INFO, 'Test Failed: ' + (testInfo.errors.map((e) => e.message).join('\n') || testInfo.status));
        try { await finalTest.addScreenCaptureFromBase64String(await webDriverUtility.getScreenshotAsBase64(), 'Failure screenshot'); } catch (e) { /* page closed */ }
      }

      // Listener.onFinish
      await extentReports.flush();
      console.log('*********Close browser*********');
    }, { auto: true }],
  });
}

/** extends BaseClass  -> admin login + DB + SSH */
const test = createBaseTest({ connectBackends: true, usernameKey: 'adminUsername', passwordKey: 'adminPassword' });

/** extends BaseClassForBank -> bank login, no DB / SSH */
const bankTest = createBaseTest({ connectBackends: false, usernameKey: 'bankUsername', passwordKey: 'bankPassword' });

module.exports = { test, bankTest, expect: base.expect, convertToTitleCase };
