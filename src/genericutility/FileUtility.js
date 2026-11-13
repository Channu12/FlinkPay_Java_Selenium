// Port of org.tyss.flinkpay.genericutility.FileUtility
const fs = require('fs');
const path = require('path');
const os = require('os');
const { UtilityObjectClass } = require('./UtilityObjectClass');

/** Minimal java.util.Properties parser (key=value / key:value, # and ! comments). */
function parseProperties(text) {
  const props = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const m = line.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (m) props[m[1].trim()] = m[2];
  }
  return props;
}

class FileUtility {
  /**
   * This method is used to fetch the data from Property File
   */
  getDataFromPropertyFile(filePath, key) {
    const props = parseProperties(fs.readFileSync(filePath, 'utf8'));
    if (props[key] === undefined) {
      throw new Error(`Key '${key}' not found in property file ${filePath}`);
    }
    return props[key].trim();
  }

  readDataFromTextFile(txtFilePath) {
    try {
      const data = fs.readFileSync(txtFilePath, 'utf8');
      // Java reads line by line and appends "\n" after every line
      const lines = data.split(/\r?\n/);
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      return lines.map((l) => l + '\n').join('');
    } catch (e) {
      return '';
    }
  }

  writeDataToTxtFile(directoryPath, fileName, data) {
    fs.mkdirSync(directoryPath, { recursive: true });
    const file = path.resolve(directoryPath, fileName + '.txt');
    fs.writeFileSync(file, data, 'utf8');
    return file;
  }

  /**
   * Waits for the latest downloaded file in the downloads directory.
   * (In Playwright prefer `page.waitForEvent('download')` - see WebDriverUtility.clickAndDownload)
   */
  async getDownloadedFilePath(maxWaitTime, downloadDirectory = path.join(os.homedir(), 'Downloads')) {
    UtilityObjectClass.getExtentTest().info('File download directory is : ' + downloadDirectory);
    for (let count = 0; count < maxWaitTime; count++) {
      const latestFile = FileUtility.getLatestFile(downloadDirectory);
      if (latestFile && !latestFile.endsWith('.crdownload') && !latestFile.endsWith('.tmp')) {
        UtilityObjectClass.getExtentTest().info('File ' + path.basename(latestFile) + ' downloaded successfully.');
        return latestFile;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    UtilityObjectClass.getExtentTest().info('No files downloaded within the last ' + maxWaitTime + ' seconds.');
    return '';
  }

  static getLatestFile(directoryPath) {
    if (!fs.existsSync(directoryPath)) return null;
    const threshold = Date.now() - 1000; // 1 second ago
    for (const name of fs.readdirSync(directoryPath)) {
      const full = path.join(directoryPath, name);
      const st = fs.statSync(full);
      if (st.isFile() && st.mtimeMs > threshold) return full;
    }
    return null;
  }
}

module.exports = { FileUtility, parseProperties };
