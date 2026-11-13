// Port of org.tyss.flinkpay.objectrepository.AmountTransferPage
class AmountTransferPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.senderAccountNumberTextfield = page.locator("[name='senderAccountNumber']");
    this.senderAccountNameTextfield = page.locator("[name='senderAccountName']");
    this.chargesCodeDropdown = page.locator("[name='chargesCode']");
    this.beneficiaryAccountNumberTextfield = page.locator("[name='beneficiaryCreditAccountNumber']");
    this.beneficiaryAccountNameTextfield = page.locator("[name='beneficiaryAccountName']");
    this.transferAmountTextfield = page.locator("[name='transferAmount']");
    this.beneficiaryMobileNumberTextfield = page.locator("[name='beneficiaryMobileNumber']");
    this.beneficiarybankBranchTextfield = page.locator("[name='bankBranch']");
    this.beneficiarybankNameTextfield = page.locator("[name='bankName']");
    this.transferButton = page.locator("xpath=//button[@type='submit']");
  }

  getSenderAccountNumberTextfield() { return this.senderAccountNumberTextfield; }
  getSenderAccountNameTextfield() { return this.senderAccountNameTextfield; }
  getChargesCodeDropdown() { return this.chargesCodeDropdown; }
  getBeneficiaryAccountNumberTextfield() { return this.beneficiaryAccountNumberTextfield; }
  getBeneficiaryAccountNameTextfield() { return this.beneficiaryAccountNameTextfield; }
  getTransferAmountTextfield() { return this.transferAmountTextfield; }
  getBeneficiaryMobileNumberTextfield() { return this.beneficiaryMobileNumberTextfield; }
  getBeneficiarybankBranchTextfield() { return this.beneficiarybankBranchTextfield; }
  getBeneficiarybankNameTextfield() { return this.beneficiarybankNameTextfield; }
  getTransferButton() { return this.transferButton; }
}

module.exports = { AmountTransferPage };
