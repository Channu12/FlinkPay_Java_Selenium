// Port of org.tyss.flinkpay.testcases.TransferAmountToOtherBankAndVerifyTest (extends BaseClassForBank)
const { bankTest: test } = require('../src/fixtures/baseFixture');
const { HomePage } = require('../src/objectrepository/HomePage');

test.describe('TransferAmountToOtherBankAndVerifyTest', () => {
  test('transferAmountToOtherBankAndVerify', async ({ driver, webDriverUtility, workflowUtility }) => {
    // Create objects for POM Pages
    const homePage = new HomePage(driver);

    // Go to amount transfer module
    await webDriverUtility.clickOnElement(homePage.getAmountTransferLink());

    // Transfer amount to Bank B
    await workflowUtility.transferAmount('Outbound_Data.xlsx', 'Test_Data', 'TC001');
  });
});
