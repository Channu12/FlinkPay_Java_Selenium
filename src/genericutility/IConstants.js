// Port of org.tyss.flinkpay.genericutility.IConstants
// Paths are built with path.join so the framework runs on Windows, macOS and Linux.
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const IConstants = {
  PROJECT_ROOT: ROOT,

  // Common Data file path
  COMMON_DATA_FILEPATH: path.join(ROOT, 'CommonData.properties'),

  // Outbound data file path
  OUTBOUND_DATA_EXCEL_FILEPATH: path.join(ROOT, 'Outbound_Data.xlsx'),

  // Swift simulation file paths - Flink Pay
  SWIFT_SCHEMA_FILEPATH: path.join(ROOT, 'Swift_Simuation_Files', 'Swift_Message_SchemaFile.txt'),
  SWIFT_EXCEL_DATA_FILEPATH: path.join(ROOT, 'Swift_Simuation_Files', 'Swift_Message_DataFile.xlsx'),
  GENERATED_SWIFT_MESSAGEPATH: path.join(ROOT, 'Swift_Simuation_Files'),

  // Json simulation file paths - Ninza Pay
  JSON_SCHEMA_FILEPATH: path.join(ROOT, 'Json_Simualtion_Files', 'Json_SchemaFile.txt'),
  JSON_EXCEL_DATA_FILEPATH: path.join(ROOT, 'Json_Simualtion_Files', 'Json_DataFile.xlsx'),
  GENERATED_JSON_FILEPATH: path.join(ROOT, 'Json_Simualtion_Files'),

  // Reports / downloads
  EXECUTION_REPORTS_PATH: path.join(ROOT, 'Execution_Reports'),
  DOWNLOADS_PATH: path.join(ROOT, 'Downloads'),

  // Wait times (seconds) - same as Java
  IMPLICIT_WAIT_TIME: 10,
  EXPLICIT_WAIT_TIME: 10,
};

module.exports = { IConstants };
