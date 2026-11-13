// Port of org.tyss.flinkpay.objectrepository.WelcomePage
class WelcomePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.usernameTextfield = page.locator('#username');
    this.passwordTextfield = page.locator('#inputPassword');
    this.logInButton = page.locator("xpath=//button[@type='submit']");
  }

  getUsernameTextfield() { return this.usernameTextfield; }
  getPasswordTextfield() { return this.passwordTextfield; }
  getLogInButton() { return this.logInButton; }
}

module.exports = { WelcomePage };
