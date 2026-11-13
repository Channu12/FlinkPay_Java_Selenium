// Port of org.tyss.flinkpay.testcases.SimulateSwiftTxnsAndVerify_Inbound_Test (extends BaseClass)
const { test } = require('../src/fixtures/baseFixture');
const { IConstants } = require('../src/genericutility/IConstants');

test.describe('SimulateSwiftTxnsAndVerify_Inbound_Test', () => {
  test('simulateSwiftTxnsAndVerify', async ({ workflowUtility, excelUtility }) => {
    // TRXN creation
    const filePaths = await test.step('TRXN creation', () =>
      workflowUtility.SMART_SWIFT_TRXN_Creation_Simulation_tool('Txn_Info'));

    // TRXN Initiation
    await test.step('TRXN initiation', () => workflowUtility.initiateTrxns(filePaths));

    // Read TRXNS From Excel
    const txnList = await excelUtility.getColumnDataBasedOnHeader(IConstants.SWIFT_EXCEL_DATA_FILEPATH, 'Txn_Info', 'TXN_REF_ID_VAR');
    
    // Verify TRXN details in BANK GUI portal
    await test.step('Verify in GUI layer', () => workflowUtility.verifySwiftTxnsInGUI(txnList));

  });
});