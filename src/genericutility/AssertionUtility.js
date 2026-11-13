// Port of org.tyss.flinkpay.genericutility.AssertionUtility (TestNG Assert -> Playwright expect)
const { expect } = require('@playwright/test');
const { UtilityObjectClass } = require('./UtilityObjectClass');

class AssertionUtility {
  assertTwoStrings(string1, string2) {
    try {
      expect(string1).toBe(string2);
      UtilityObjectClass.getExtentTest().pass('Both the Strings are Same.');
    } catch (e) {
      UtilityObjectClass.getExtentTest().log('INFO', 'There is a difference between both the strings. -' + e.message);
      throw e;
    }
  }

  assertBooleanValue(value) {
    try {
      expect(value).toBeTruthy();
      UtilityObjectClass.getExtentTest().pass('Output result value is TRUE.');
    } catch (e) {
      UtilityObjectClass.getExtentTest().log('INFO', 'Output result value is FALSE. -' + e.message);
      throw e;
    }
  }
}

module.exports = { AssertionUtility };
