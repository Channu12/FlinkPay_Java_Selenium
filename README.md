# DataSimulationProject – Playwright + JavaScript

1:1 port of the FlinkPay **DataSimulationProject** (Selenium 4 + TestNG + Apache POI + JSch + RestAssured + Extent Reports)
to **Playwright Test + JavaScript**. Same package structure, class names, method names, locators, data files and flows.

## Prerequisites
- Node.js 18 or newer (20/22 recommended)
- Network access to the FlinkPay app, MySQL DB and Linux server configured in `CommonData.properties`

## Setup
```bash
npm install
npx playwright install chromium        # once (add "firefox" if you use browser=firefox)
```

## Run
| Command | Equivalent in Java project |
|---|---|
| `npm test` | run all test classes |
| `npm run test:swift` | `SimulateSwiftTxns.xml` |
| `npm run test:transfer` | `TransferAmountToOtherBank.xml` |
| `npm run test:json` | `SimulateJsonTxnsAndVerify_AllTxns_Test` |
| `npm run test:headed` | run with the browser visible |
| `npm run report` | open the latest report in `Execution_Reports/` |

Override from the command line: `BROWSER=edge npm test`, `HEADLESS=true npm test`

## Configuration – `CommonData.properties`
Same keys as before, plus `headless`:
```
browser=chrome          # chrome | edge | firefox
headless=false
url, adminUsername/adminPassword, bankUsername/bankPassword
dbUrl (jdbc:mysql://host:port/db), dbUsername, dbPassword
sshHost, sshUsername, sshPassword, sshPortNumber
jsonShFilePath, swiftShFilePath, jsonFolderPath, swiftFolderPath
```

## Project structure (Java → JS)
```
src/genericutility/
  IConstants.js            IConstants.java           (cross-platform paths)
  JavaUtility.js           JavaUtility.java          (+ SimpleDateFormat-compatible formatter)
  FileUtility.js           FileUtility.java          (properties / text files)
  ExcelUtility.js          ExcelUtility.java         (Apache POI → exceljs)
  DatabaseUtility.js       DatabaseUtility.java      (JDBC → mysql2)
  SshUtility.js            SshUtility.java           (JSch → ssh2: SFTP upload + exec)
  RestAssuredUtility.js    RestAssuredUtility.java   (RestAssured → Playwright request)
  WebDriverUtility.js      WebDriverUtility.java     (WebElement → Locator, alerts, downloads)
  AssertionUtility.js      AssertionUtility.java     (TestNG Assert → expect)
  UtilityObjectClass.js    UtilityObjectClass.java   (ThreadLocal → per-worker module state)
  ExtentReportUtility.js   Extent Reports            (→ Playwright HTML report)
src/objectrepository/      WelcomePage, HomePage, AmountTransferPage, InboundPage, OutboundPage
src/workflowutility/       FlinkPayWorkflowsUtility.js
src/fixtures/baseFixture.js  BaseClass + BaseClassForBank + ListenerImplementationClass
tests/
  simulateSwiftTxnsAndVerify_Inbound.spec.js   SimulateSwiftTxnsAndVerify_Inbound_Test
  simulateJsonTxnsAndVerify_AllTxns.spec.js    SimulateJsonTxnsAndVerify_AllTxns_Test
  transferAmountToOtherBankAndVerify.spec.js   TransferAmountToOtherBankAndVerifyTest
playwright.config.js       pom.xml + testng.xml + openBrowserWindow()
```

## TestNG lifecycle → Playwright fixtures
| TestNG | Playwright |
|---|---|
| `@BeforeSuite` / `@AfterSuite` (DB + SSH connect) | worker fixture `suiteSetup` |
| `@BeforeClass` (open browser, url, implicit wait 10s) | `page` fixture + `actionTimeout: 10000` |
| `@BeforeMethod` login / `@AfterMethod` logout | auto fixture `baseClass` |
| `extends BaseClass` | `const { test } = require('../src/fixtures/baseFixture')` (admin login + DB + SSH) |
| `extends BaseClassForBank` | `const { bankTest } = ...` (bank login, no DB/SSH) |
| `ITestListener` + Extent | Playwright HTML report in `Execution_Reports/MyReport_yyyyMMdd_HHmmss/` |

## Reporting
- `extentTest.info/pass` → log line + annotation in the HTML report
- `extentTest.fail` → also a **soft assertion**: the test is marked FAILED but continues, so every transaction gets checked (same as Extent `.fail()`)
- `createTest(txnId)` → each transaction appears as its own step (`TRxxxx - GUI Layer`, `- DB Layer`, `- API Layer`)
- On failure: screenshot, video and trace are attached automatically. The full log is attached as `Extent-Log.txt`.

## Behaviour kept identical to the Java framework
- Transaction ids `"TR" + yyyyMMddhhmmssSSS` (12-hour `hh`, as in Java), dates/times, 100 ms gap between rows
- Excel data files are updated with the new ids before generation (same as POI write-back)
- Generated SWIFT XML / JSON files are identical to the Java output, including number formatting (e.g. `15000.0`)
- Same remote command: `<shFilePath> /<remoteFilePath>`
- Same SQL (`select <col> from <table>;`) and API endpoints

## Deliberate fixes (bugs in the Java original)
1. `getEntireTcDataBasedOnTcId` used POI `Cell.toString()`, so the mobile number was typed as `9.586879545E9` and the amount as `1000.0`. It now uses the value as Excel displays it (`9586879545`, `1000`).
2. `RestAssuredUtility.pushTransactionsToDB` had `Assert.assertEquals(false, null)`, which always failed. It's removed (the method was unused anyway).
3. `TransferAmountToOtherBank.xml` pointed to a non-existent class `TranferAmount...`. `npm run test:transfer` runs the right test.
4. `verifyTxnInAll3Layers` (JSON flow) ignored the GUI and DB results. It now logs pass/fail like the SWIFT flow.
5. Paths used Windows `\\`. They now use `path.join`, so the framework runs on Windows, macOS and Linux.
6. JS alerts: Playwright freezes the page on an unhandled dialog, so alerts are accepted immediately and their text is returned by `getTextfromAlertAndClose()`.
