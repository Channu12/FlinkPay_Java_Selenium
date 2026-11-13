// Port of org.tyss.flinkpay.workflowutility.FlinkPayWorkflowsUtility
const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');
const { DatabaseUtility } = require('../genericutility/DatabaseUtility');
const { ExcelUtility } = require('../genericutility/ExcelUtility');
const { FileUtility } = require('../genericutility/FileUtility');
const { IConstants } = require('../genericutility/IConstants');
const { JavaUtility } = require('../genericutility/JavaUtility');
const { RestAssuredUtility } = require('../genericutility/RestAssuredUtility');
const { SshUtility } = require('../genericutility/SshUtility');
const { UtilityObjectClass } = require('../genericutility/UtilityObjectClass');
const { WebDriverUtility } = require('../genericutility/WebDriverUtility');
const { AmountTransferPage } = require('../objectrepository/AmountTransferPage');
const { HomePage } = require('../objectrepository/HomePage');
const { InboundPage } = require('../objectrepository/InboundPage');
const { OutboundPage } = require('../objectrepository/OutboundPage');
const { WelcomePage } = require('../objectrepository/WelcomePage');

/** String.replaceAll with a literal search (Java replaceAll used the header text as the pattern). */
const replaceLiteral = (text, search, replacement) => (search ? text.split(search).join(replacement) : text);

class FlinkPayWorkflowsUtility {
  constructor() {
    this.webDriverUtility = new WebDriverUtility();
    this.excelUtility = new ExcelUtility();
    this.fileUtility = new FileUtility();
    this.databaseUtility = new DatabaseUtility();
    this.restAssuredUtility = new RestAssuredUtility();
    this.sshUtility = new SshUtility();
    this.javaUtility = new JavaUtility();
  }

  async loginToApplication(username, password) {
    const welcomePage = new WelcomePage(UtilityObjectClass.getDriver());
    await this.webDriverUtility.enterInputIntoElement(welcomePage.getUsernameTextfield(), username);
    await this.webDriverUtility.enterInputIntoElement(welcomePage.getPasswordTextfield(), password);
    await this.webDriverUtility.clickOnElement(welcomePage.getLogInButton());
  }
  
  // ------------------------------------------------------------------ JSON
  async json_Txns_Creation_Simulation_Tool(sheetName) {
    await this.excelUtility.generateAndWriteDataToExcelForJson(IConstants.JSON_EXCEL_DATA_FILEPATH, sheetName);
    const entireData = await this.excelUtility.getDataFromExcel(IConstants.JSON_EXCEL_DATA_FILEPATH, sheetName);

    const copyStaticData = this.fileUtility.readDataFromTextFile(IConstants.JSON_SCHEMA_FILEPATH);
    const jsonObjects = [];
    for (const map of entireData) {
      let jsonStaticData = copyStaticData;
      for (const [key, value] of Object.entries(map)) {
        jsonStaticData = replaceLiteral(jsonStaticData, key.trim(), value.trim());
      }
      jsonObjects.push(jsonStaticData.trim());
    }

    const jsonFilePath = this.fileUtility.writeDataToTxtFile(
      IConstants.GENERATED_JSON_FILEPATH,
      'Json_txns_' + this.javaUtility.getDateAndTimeInSpecifiedFormat('yyyy_MM_dd_hh_mm_ss'),
      '[' + jsonObjects.join(',') + ']',
    );
    UtilityObjectClass.getExtentTest().info('Json file Generated.' + jsonFilePath);
    return jsonFilePath;
  }

  async initiateJsonTxns(jsonFilePath) {
    // Get Remote Directory
    const remoteFolderDirectory = this.fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, 'jsonFolderPath');

    // Transfer Json file from local to unix server
    const remoteFilePath = await this.sshUtility.ftpFromLocalToRemote(UtilityObjectClass.getSshSession(), jsonFilePath, remoteFolderDirectory);

    // Push Transactions to Kafka by running shell script
    const shellScriptPath = this.fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, 'jsonShFilePath');
    const command = shellScriptPath + ' /' + remoteFilePath;
    console.log(command);
    await this.sshUtility.executeUnixCommand(UtilityObjectClass.getSshSession(), command);
  }

  // ----------------------------------------------------------------- SWIFT
  async SMART_SWIFT_TRXN_Creation_Simulation_tool(sheetName) {
    const pathsList = [];

    await this.excelUtility.generateAndWriteDataToExcelForSwift(IConstants.SWIFT_EXCEL_DATA_FILEPATH, sheetName);
    const entireData = await this.excelUtility.getDataFromExcel(IConstants.SWIFT_EXCEL_DATA_FILEPATH, sheetName);
    const copyStaticData = this.fileUtility.readDataFromTextFile(IConstants.SWIFT_SCHEMA_FILEPATH);

    const folder = path.join(IConstants.GENERATED_SWIFT_MESSAGEPATH, this.javaUtility.getDateAndTimeInSpecifiedFormat('yyyy_MM_dd_hh_mm_ss'));
    fs.mkdirSync(folder, { recursive: true });

    for (const map of entireData) {
      let xmlStaticData = copyStaticData;
      for (const [key, value] of Object.entries(map)) {
        xmlStaticData = replaceLiteral(xmlStaticData, key.trim(), value.trim());
      }
      const finalString = '\t<Transaction>\n' + xmlStaticData + '\t</Transaction>\n';
      const txtFilePath = this.fileUtility.writeDataToTxtFile(
        folder,
        map.TXN_REF_ID_VAR,
        '<?xml version="1.0" encoding="UTF-8"?>\n<Transactions>\n' + finalString + '</Transactions>',
      );
      pathsList.push(txtFilePath);
    }
    UtilityObjectClass.getExtentTest()?.info('Swift files generated in: ' + folder);
    return pathsList;
  }

  async initiateTrxns(filePaths) {
    // Get Remote folder path from property file
    const remoteFolderDirectory = this.fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, 'swiftFolderPath');

    for (const filePath of filePaths) {
      // File transfer from local to remote
      const remoteFilePath = await this.sshUtility.ftpFromLocalToRemote(UtilityObjectClass.getSshSession(), filePath, remoteFolderDirectory);

      // Get Shell script path from property file
      const shellScriptPath = this.fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, 'swiftShFilePath');

      // Create command to push Txns to Kafka
      const command = shellScriptPath + ' /' + remoteFilePath;

      // Push Txns to Kafka by running shell script
      await this.sshUtility.executeUnixCommand(UtilityObjectClass.getSshSession(), command);

      // await this.restAssuredUtility.pushTransactionsToDB(filePath);
    }
  }

  // ------------------------------------------------- JSON verification (3 layers)
  async verifyTxnInAll3Layers() {
    const txnList = await this.excelUtility.getColumnDataBasedOnHeader(IConstants.JSON_EXCEL_DATA_FILEPATH, 'Txn_Info', 'TXN_ID_VAR');
    await this.webDriverUtility.waitForSeconds(5);
    await this.webDriverUtility.refreshBrowserWindow();

    for (const txnId of txnList) {
      await test.step(txnId, async () => {
        UtilityObjectClass.setExtentTest(UtilityObjectClass.getExtentReports().createTest(txnId));

        // Verification in GUI Layer
        const homepage = new HomePage(UtilityObjectClass.getDriver());
        await this.webDriverUtility.clickOnElement(homepage.getAllTransactionsLink());
        await this.webDriverUtility.waitForMillis(500);
        await this.webDriverUtility.clearAndEnterInputIntoElement(txnId, homepage.getSearchTextField());
        const inGui = await this.webDriverUtility.verifyElementIsDisplayed(homepage.getTransactionId(txnId));
        if (inGui) UtilityObjectClass.getExtentTest().pass(txnId + ' is verified in GUI Layer.');
        else UtilityObjectClass.getExtentTest().fail(txnId + ' is NOT available in GUI Layer.');

        // Verification in DB Layer
        const inDb = await this.databaseUtility.verifyColumnContainsData(UtilityObjectClass.getDbConnection(), 'transaction', 'transaction_id', txnId);
        if (inDb) UtilityObjectClass.getExtentTest().pass(txnId + ' is verified in DB Layer.');
        else UtilityObjectClass.getExtentTest().fail(txnId + ' is NOT available in DB.');

        // Verification in API Layer
        await this.restAssuredUtility.verifyTxnInAPILayer(txnId);
      });
    }
  }

  // --------------------------------------------------------- Amount transfer
  async transferAmountWithValues(senderAccountNumber, senderAccountName, chargesCode, beneficiaryAccountNumber,
    beneficiaryAccountName, transferAmount, mobileNumber, bankBranch, bankName) {
    const w = this.webDriverUtility;
    const amountTransferPage = new AmountTransferPage(UtilityObjectClass.getDriver());
    await w.enterInputIntoElement(amountTransferPage.getSenderAccountNumberTextfield(), senderAccountNumber);
    await w.enterInputIntoElement(amountTransferPage.getSenderAccountNameTextfield(), senderAccountName);
    await w.selectByVisibleText(amountTransferPage.getChargesCodeDropdown(), chargesCode);
    await w.enterInputIntoElement(amountTransferPage.getBeneficiaryAccountNumberTextfield(), beneficiaryAccountNumber);
    await w.enterInputIntoElement(amountTransferPage.getBeneficiaryAccountNameTextfield(), beneficiaryAccountName);
    await w.enterInputIntoElement(amountTransferPage.getTransferAmountTextfield(), transferAmount);
    await w.enterInputIntoElement(amountTransferPage.getBeneficiaryMobileNumberTextfield(), mobileNumber);
    await w.enterInputIntoElement(amountTransferPage.getBeneficiarybankBranchTextfield(), bankBranch);
    await w.enterInputIntoElement(amountTransferPage.getBeneficiarybankNameTextfield(), bankName);
    await w.clickOnElement(amountTransferPage.getTransferButton());
    await w.waitForSeconds(1);

    const refId = (await w.getTextfromAlertAndClose()).split('is')[1].trim();
    UtilityObjectClass.getExtentTest().pass('Transfered amount and Ref Id is: ' + refId);
    return refId;
  }

  /**
   * Java had two overloads: transferAmount(9 values) and transferAmount(fileName, sheetName, tcId).
   * JS has no overloading, so this dispatches on the argument count.
   */
  async transferAmount(...args) {
    if (args.length !== 3) return this.transferAmountWithValues(...args);
    const [fileName, sheetName, tcId] = args;

    const tcDataMap = await this.excelUtility.getEntireTcDataBasedOnTcId(path.join(IConstants.PROJECT_ROOT, fileName), sheetName, tcId);
    return this.transferAmountWithValues(
      tcDataMap.Sender_Account_Number, tcDataMap.Sender_Account_Name, tcDataMap.Charges_Code,
      tcDataMap.Benificiary_Account_Number, tcDataMap.Benificiary_Account_Name, tcDataMap.Transfer_Amount,
      tcDataMap.Mobile_Number, tcDataMap.Bank_Branch, tcDataMap.Bank_Name,
    );
  }

  async transferAmountToMultipleAccounts(fileName, sheetName) {
    const refIdList = [];
    const outboundDataList = await this.excelUtility.getDataFromExcel(path.join(IConstants.PROJECT_ROOT, fileName), sheetName);

    // Create object for POM Pages
    const homePage = new HomePage(UtilityObjectClass.getDriver());

    for (const d of outboundDataList) {
      // Click on amount transfer link
      await this.webDriverUtility.clickOnElement(homePage.getAmountTransferLink());
      const refId = await this.transferAmountWithValues(
        d.Sender_Account_Number, d.Sender_Account_Name, d.Charges_Code, d.Benificiary_Account_Number,
        d.Benificiary_Account_Name, d.Transfer_Amount, d.Mobile_Number, d.Bank_Branch, d.Bank_Name,
      );
      refIdList.push(refId);
    }
    return refIdList;
  }

  // ------------------------------------------------- SWIFT outbound verification
  async verifySwiftMessageTxnsBulk(fileName, sheetName, refIdList) {
    const outboundPage = new OutboundPage(UtilityObjectClass.getDriver());
    const homePage = new HomePage(UtilityObjectClass.getDriver());
    await this.webDriverUtility.clickOnElement(homePage.getOutBoundsLink());

    let index = 0;
    for (const refId of refIdList) {
      const status = await this.webDriverUtility.getTextFromElement(outboundPage.getStatusText(refId));
      UtilityObjectClass.getExtentTest().info('Reference Id: ' + refId + ' status is: ' + status);
      const isVerified = await this.webDriverUtility.verifyElementIsDisplayed(outboundPage.getReferenceId(refId));
      if (isVerified) UtilityObjectClass.getExtentTest().pass(refId + ' is verified in GUI Layer.');
      else UtilityObjectClass.getExtentTest().fail(refId + ' is NOT available in GUI Layer.');

      const downloadedFilePath = await this.webDriverUtility.clickAndDownload(outboundPage.getDownloadIcon(refId));
      const fileData = this.fileUtility.readDataFromTextFile(downloadedFilePath);
      const txnDataList = await this.excelUtility.getTxnDataFromExcelBasedOnIndex(path.join(IConstants.PROJECT_ROOT, fileName), sheetName, index);

      for (const data of txnDataList) {
        if (fileData.includes(data)) UtilityObjectClass.getExtentTest().info(data + ' is present in swift file.');
        else UtilityObjectClass.getExtentTest().info(data + ' is NOT present in swift file.');
      }
      index++;
    }
  }

  // --------------------------------------------- SWIFT inbound verification (3 layers)
  async verifySwiftTxnsInGUI(txnList) {
    const inboundPage = new InboundPage(UtilityObjectClass.getDriver());
    const homepage = new HomePage(UtilityObjectClass.getDriver());
    await this.webDriverUtility.refreshBrowserWindow();
    await this.webDriverUtility.waitForSeconds(1);

    for (const txnId of txnList) {
      await test.step(`${txnId} - GUI Layer`, async () => {
        UtilityObjectClass.setExtentTest(UtilityObjectClass.getExtentReports().createTest(txnId));
        UtilityObjectClass.put(txnId, UtilityObjectClass.getExtentTest());

        // Verification in GUI Layer
        await this.webDriverUtility.clickOnElement(homepage.getInBoundsLink());
        await this.webDriverUtility.waitForMillis(500);
        await this.webDriverUtility.clearAndEnterInputIntoElement(txnId, inboundPage.getSearchTextField());
        const isVerified = await this.webDriverUtility.verifyElementIsDisplayed(inboundPage.getReferenceId(txnId));
        if (isVerified) UtilityObjectClass.getExtentTest().pass(txnId + ' is verified in GUI Layer.');
        else UtilityObjectClass.getExtentTest().fail(txnId + ' is NOT available in GUI Layer.');
      });
    }
  }
  
  async verifySwiftTxnsInDatabase(txnList) {
    for (const txnId of txnList) {
      await test.step(`${txnId} - DB Layer`, async () => {
        UtilityObjectClass.setExtentTest(UtilityObjectClass.get(txnId) || UtilityObjectClass.getExtentReports().createTest(txnId));
        const isVerified = await this.databaseUtility.verifyColumnContainsData(UtilityObjectClass.getDbConnection(), 'inbound_transactions', 'reference_number', txnId);
        if (isVerified) UtilityObjectClass.getExtentTest().pass(txnId + ' is verified in DB Layer.');
        else UtilityObjectClass.getExtentTest().fail(txnId + ' is NOT available in DB.');
      });
    }
  }

  async verifySwiftTxnsInAPILayer(txnList) {
    const baseURI = this.fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, 'url').replace(/\/$/, '');
    let txnListResponse = [];
    try {
      const response = await UtilityObjectClass.getRequest().get(baseURI + '/inbound-transaction/all-inbounds/rmgyantra');
      const body = await response.json();
      // JsonPath "$.[*].referenceNumber"
      txnListResponse = (Array.isArray(body) ? body : []).map((o) => o.referenceNumber);
    } catch (e) {
      console.error('API call failed: ' + e.message);
    }
    for (const txnId of txnList) {
      await test.step(`${txnId} - API Layer`, async () => {
        UtilityObjectClass.setExtentTest(UtilityObjectClass.get(txnId) || UtilityObjectClass.getExtentReports().createTest(txnId));
        if (txnListResponse.includes(txnId)) UtilityObjectClass.getExtentTest().pass(txnId + ' is verified in API Layer.');
        else UtilityObjectClass.getExtentTest().fail(txnId + ' is NOT available in API Layer.');
      });
    }
  }
}

module.exports = { FlinkPayWorkflowsUtility };