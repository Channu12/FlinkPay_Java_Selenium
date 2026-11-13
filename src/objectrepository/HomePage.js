// Port of org.tyss.flinkpay.objectrepository.HomePage
class HomePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.logoutButton = page.locator("xpath=//div[normalize-space(text())='Logout']");
    this.allTransactionsLink = page.locator("xpath=//a[normalize-space(text())='All Transactions']");
    this.amountTransferLink = page.locator("xpath=//a[normalize-space(text())='Amount Transfer']");
    this.outBoundsLink = page.locator("xpath=//a[normalize-space(text())='Outbounds']");
    this.inBoundsLink = page.locator("xpath=//a[normalize-space(text())='Inbounds']");
    this.searchTextField = page.locator("xpath=//input[@placeholder='Search by Transaction Id']");
  }

  getTransactionId(transactionId) {
    return this.page.locator(`xpath=//th[text()='TransactionId']/ancestor::table/descendant::td[text()='${transactionId}']`);
  }

  getLogoutButton() { return this.logoutButton; }
  getAllTransactionsLink() { return this.allTransactionsLink; }
  getSearchTextField() { return this.searchTextField; }
  getAmountTransferLink() { return this.amountTransferLink; }
  getOutBoundsLink() { return this.outBoundsLink; }
  getInBoundsLink() { return this.inBoundsLink; }
}

module.exports = { HomePage };
