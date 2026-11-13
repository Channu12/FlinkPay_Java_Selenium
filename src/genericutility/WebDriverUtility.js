// Port of org.tyss.flinkpay.genericutility.WebDriverUtility (Selenium WebDriver -> Playwright Page/Locator)
// Browser launch (openBrowserWindow / maximize / implicitWait) lives in playwright.config.js,
// which reads `browser` from CommonData.properties exactly like the Java BaseClass did.
const fs = require('fs');
const path = require('path');
const { IConstants } = require('./IConstants');
const { JavaUtility } = require('./JavaUtility');
const { UtilityObjectClass } = require('./UtilityObjectClass');

const IMPLICIT_WAIT_MS = IConstants.IMPLICIT_WAIT_TIME * 1000;

// JS dialogs (alert/confirm). Playwright freezes the page until a dialog is handled (the click that
// opened it never completes), so every dialog is accepted immediately and its text is queued.
// getTextfromAlertAndClose() then returns that text - same result as Selenium switchTo().alert().
const dialogQueue = [];
const dialogWaiters = [];

function registerDialogHandler(page) {
  dialogQueue.length = 0;
  dialogWaiters.length = 0;
  page.on('dialog', async (dialog) => {
    const message = dialog.message();
    await dialog.accept().catch(() => {});
    const waiter = dialogWaiters.shift();
    if (waiter) waiter(message);
    else dialogQueue.push(message);
  });
}

class WebDriverUtility {
  constructor() {
    this.javaUtility = new JavaUtility();
  }

  get page() { return UtilityObjectClass.getDriver(); }

  async navigateToUrl(url) { await this.page.goto(url); }

  async maximizeBrowserWindow() { /* handled by viewport:null + --start-maximized in playwright.config.js */ }

  async refreshBrowserWindow() { await this.page.reload(); }

  implicitWait(seconds) { this.page.setDefaultTimeout(seconds * 1000); }

  async enterInputIntoElement(locator, input) { await locator.pressSequentially(String(input ?? '')); }

  async clearAndEnterInputIntoElement(input, locator) {
    await locator.clear();
    await locator.pressSequentially(String(input ?? ''));
  }

  async clickOnElement(locator) { await locator.click(); }

  async getTextFromElement(locator) { return (await locator.innerText()).trim(); }

  async selectByVisibleText(locator, visibleText) { await locator.selectOption({ label: String(visibleText) }); }

  async waitForSeconds(seconds) { await this.page.waitForTimeout(seconds * 1000); }

  async waitForMillis(milliSeconds) { await this.page.waitForTimeout(milliSeconds); }

  /** findElement (implicit wait 10s) + isDisplayed(). Returns false instead of throwing when absent. */
  async verifyElementIsDisplayed(locator, timeout = IMPLICIT_WAIT_MS) {
    try {
      await locator.first().waitFor({ state: 'visible', timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  /** switchTo().alert().getText() + accept() */
  async getTextfromAlertAndClose(timeout = IMPLICIT_WAIT_MS) {
    if (dialogQueue.length) return dialogQueue.shift();
    return new Promise((resolve, reject) => {
      const waiter = (msg) => { clearTimeout(timer); resolve(msg); };
      const timer = setTimeout(() => {
        const i = dialogWaiters.indexOf(waiter);
        if (i >= 0) dialogWaiters.splice(i, 1);
        reject(new Error('NoAlertPresentException: no alert opened within ' + timeout + 'ms'));
      }, timeout);
      dialogWaiters.push(waiter);
    });
  }

  async getScreenshotOfCurrentPage(fileName, directory) {
    fs.mkdirSync(directory, { recursive: true });
    const destinationFile = path.resolve(directory, fileName + '_' + this.javaUtility.getDateAndTimeInSpecifiedFormat('yyyyMMdd_HHmmss') + '.png');
    await this.page.screenshot({ path: destinationFile, fullPage: true });
    UtilityObjectClass.getExtentTest()?.info('Screenshot saved to: ' + destinationFile);
    console.log('Screenshot saved to: ' + destinationFile);
    return destinationFile;
  }

  async getScreenshotAsBase64() {
    return (await this.page.screenshot()).toString('base64');
  }

  async getTextFromListOfWebElementsInString(locator) {
    const texts = await locator.allInnerTexts();
    return texts.join(' ').trim();
  }

  /** Clicks an element that triggers a download and saves it into ./Downloads. Returns the saved file path. */
  async clickAndDownload(locator, directory = IConstants.DOWNLOADS_PATH) {
    const downloadPromise = this.page.waitForEvent('download', { timeout: IMPLICIT_WAIT_MS });
    await locator.click();
    const download = await downloadPromise;
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(directory, download.suggestedFilename());
    await download.saveAs(target);
    UtilityObjectClass.getExtentTest()?.info('File ' + path.basename(target) + ' downloaded successfully.');
    return target;
  }

  async closeBrowser() {
    if (this.page && !this.page.isClosed()) await this.page.close();
  }
}

module.exports = { WebDriverUtility, registerDialogHandler };
