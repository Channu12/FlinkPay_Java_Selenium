// Port of org.tyss.flinkpay.genericutility.RestAssuredUtility (RestAssured -> Playwright APIRequestContext)
const fs = require('fs');
const path = require('path');
const { FileUtility } = require('./FileUtility');
const { IConstants } = require('./IConstants');
const { UtilityObjectClass } = require('./UtilityObjectClass');

class RestAssuredUtility {
  constructor() {
    this.fileUtility = new FileUtility();
  }

  baseURI() {
    return this.fileUtility.getDataFromPropertyFile(IConstants.COMMON_DATA_FILEPATH, 'url').replace(/\/$/, '');
  }

  async pushTransactionsToDB(filePath) {
    const response = await UtilityObjectClass.getRequest().post(this.baseURI() + '/transactions-xml', {
      multipart: { file: { name: path.basename(filePath), mimeType: 'text/plain', buffer: fs.readFileSync(filePath) } },
    });
    UtilityObjectClass.getExtentTest().info('Transactions pushed to DB. Status: ' + response.status());
    return response;
  }

  async verifyTxnInAPILayer(txnId) {
    const response = await UtilityObjectClass.getRequest().get(this.baseURI() + '/transaction?' + txnId);
    UtilityObjectClass.getExtentTest().info(txnId + ' is verified in API Layer. Status: ' + response.status());
    return response;
  }
}

module.exports = { RestAssuredUtility };
