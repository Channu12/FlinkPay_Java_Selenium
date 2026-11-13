// Port of org.tyss.flinkpay.testcases.SimulateJsonTxnsAndVerify_AllTxns_Test (extends BaseClass)
const { test } = require('../src/fixtures/baseFixture');

test.describe('SimulateJsonTxnsAndVerify_AllTxns_Test', () => {
  test('simulateJsonTxnsAndVerify', async ({ workflowUtility }) => {
    // TRXN Creation
    const jsonFile = await test.step('TRXN creation', () =>
      workflowUtility.json_Txns_Creation_Simulation_Tool('Txn_Info'));

    // TRXN Initiation
    await test.step('TRXN initiation', () => workflowUtility.initiateJsonTxns(jsonFile));
    
    // Verify in GUI, Database and API Layer
    await test.step('Verify in GUI, Database and API layer', () => workflowUtility.verifyTxnInAll3Layers());
  });
});
