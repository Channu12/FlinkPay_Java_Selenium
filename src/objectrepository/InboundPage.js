// Port of org.tyss.flinkpay.objectrepository.InboundPage
class InboundPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.searchTextField = page.locator("xpath=//input[@placeholder='Search by Reference Id']");
  }

  getSearchTextField() { return this.searchTextField; }

  getStatusText(refId) {
    return this.page.locator(`xpath=//table/tbody/tr/td[text()='${refId}']/following-sibling::td[6]`);
  }

  getDownloadIcon(refId) {
    return this.page.locator(`xpath=//table/tbody/tr/td[text()='${refId}']/following-sibling::td[7]`);
  }

  getReferenceId(refId) {
    return this.page.locator(`xpath=//table/tbody/tr/td[text()='${refId}']`);
  }
}

module.exports = { InboundPage };
