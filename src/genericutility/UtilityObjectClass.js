// Port of org.tyss.flinkpay.genericutility.UtilityObjectClass
// Java used ThreadLocal; Playwright runs each worker in its own process, so module-level
// state is already isolated per worker (same effect as ThreadLocal).

let page = null;            // WebDriver driver  -> Playwright Page
let request = null;         // RestAssured       -> Playwright APIRequestContext
let extentTest = null;
let extentReports = null;
let dbConnection = null;
let sshSession = null;
let txnExtentObj = new Map();

const UtilityObjectClass = {
  // Map of txnId -> ExtentTest
  getTxnExtentObj: () => txnExtentObj,
  put: (key, value) => txnExtentObj.set(key, value),
  get: (key) => txnExtentObj.get(key),
  clear: () => { txnExtentObj = new Map(); },

  getDriver: () => page,
  setDriver: (actPage) => { page = actPage; },
  getPage: () => page,
  setPage: (actPage) => { page = actPage; },

  getRequest: () => request,
  setRequest: (actRequest) => { request = actRequest; },

  getExtentTest: () => extentTest,
  setExtentTest: (actExtentTest) => { extentTest = actExtentTest; },

  getExtentReports: () => extentReports,
  setExtentReports: (actExtentReports) => { extentReports = actExtentReports; },

  getDbConnection: () => dbConnection,
  setDbConnection: (actDbConnection) => { dbConnection = actDbConnection; },

  getSshSession: () => sshSession,
  setSshSession: (actSshSession) => { sshSession = actSshSession; },
};

module.exports = { UtilityObjectClass };
