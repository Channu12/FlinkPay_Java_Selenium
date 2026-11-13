// Port of org.tyss.flinkpay.genericutility.ExcelUtility (Apache POI -> exceljs)
const ExcelJS = require('exceljs');
const { JavaUtility } = require('./JavaUtility');
const { UtilityObjectClass } = require('./UtilityObjectClass');

// ---------------------------------------------------------------------------
// Cell value helpers - reproduce Apache POI behaviour so generated files match
// ---------------------------------------------------------------------------

/** BigDecimal.valueOf(double).toPlainString()  e.g. 15000 -> "15000.0", 2101857898956890 -> "2101857898956890" */
function javaPlainNumber(num) {
  const abs = Math.abs(num);
  if (num === 0) return '0.0';
  if (abs >= 1e-3 && abs < 1e7) {
    // Double.toString() always keeps at least one decimal digit
    return Number.isInteger(num) ? num.toFixed(1) : String(num);
  }
  // Double.toString() gives scientific notation -> toPlainString() expands it, no trailing ".0"
  if (Number.isInteger(num)) return BigInt(num).toString();
  return num.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
}

function colToNumber(col) {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

/** Tiny FormulaEvaluator: supports arithmetic with cell references (e.g. "=-A20", "=B2+1"). */
function evaluateFormula(ws, formula, cachedResult) {
  try {
    const expr = formula.replace(/\$?([A-Z]{1,3})\$?(\d+)/g, (m, col, row) => {
      // findRow/findCell do NOT create missing rows (getRow/getCell would grow the sheet)
      const r = ws.findRow(parseInt(row, 10));
      const c = r ? r.findCell(colToNumber(col)) : undefined;
      const v = c ? c.value : null;
      const n = typeof v === 'number' ? v : (v && typeof v.result === 'number' ? v.result : parseFloat(v));
      return Number.isFinite(n) ? `(${n})` : '(0)';
    });
    if (/^[\d.+\-*/() ]+$/.test(expr)) {
      // eslint-disable-next-line no-new-func
      const r = Function(`"use strict"; return (${expr});`)();
      return Object.is(r, -0) ? 0 : r;
    }
  } catch (e) { /* fall through */ }
  return cachedResult !== undefined ? cachedResult : '';
}

function rawValue(cell) {
  const v = cell ? cell.value : null;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && !(v instanceof Date)) {
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.text !== undefined) return v.text;
    if (v.error) return v.error;
  }
  return v;
}

/** DataFormatter.formatCellValue(cell, evaluator) - value as displayed in Excel (formulas evaluated). */
function formatCellValue(ws, cell) {
  let v = rawValue(cell);
  if (v && typeof v === 'object' && (v.formula || v.sharedFormula)) {
    v = evaluateFormula(ws, v.formula || v.sharedFormula, v.result);
  }
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(parseFloat(v.toPrecision(10)));
  if (v instanceof Date) return v.toLocaleDateString('en-US');
  return String(v);
}

/** ExcelUtility.getCellValue(Cell) from the Java code */
function getCellValue(cell) {
  const v = rawValue(cell);
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && (v.formula || v.sharedFormula)) return v.formula || v.sharedFormula; // getCellFormula()
  if (typeof v === 'number') return javaPlainNumber(v);
  if (typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toString();
  return String(v);
}

async function loadWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
}

function getSheet(workbook, sheetName) {
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet '${sheetName}' not found`);
  return ws;
}

class ExcelUtility {
  async getDataFromExcelCellBasedOnUniqueDataAndHeader(excelPath, sheetName, uniqueData, header) {
    const ws = getSheet(await loadWorkbook(excelPath), sheetName);
    const headerRow = ws.getRow(1);
    for (let i = 2; i <= ws.actualRowCount; i++) {
      const row = ws.getRow(i);
      if (formatCellValue(ws, row.getCell(1)).toLowerCase() === String(uniqueData).toLowerCase()) {
        for (let j = 2; j <= headerRow.cellCount; j++) {
          if (formatCellValue(ws, headerRow.getCell(j)).toLowerCase() === String(header).toLowerCase()) {
            const value = formatCellValue(ws, row.getCell(j));
            if (value) return value;
          }
        }
      }
    }
    return '';
  }

  async generateAndWriteDataToExcelForJson(filePath, sheetName) {
    const javaUtility = new JavaUtility();
    const transactionsList = [];
    const workbook = await loadWorkbook(filePath);
    const ws = getSheet(workbook, sheetName);
    const rowCount = ws.actualRowCount;
    const headerRow = ws.getRow(1);
    const columnCount = headerRow.actualCellCount;

    let tatDateColumn = 1;
    for (let c = 1; c <= columnCount; c++) {
      if (formatCellValue(ws, headerRow.getCell(c)).trim().toLowerCase() === 'tat_date') { tatDateColumn = c; break; }
    }

    for (let i = 2; i <= rowCount; i++) {
      const row = ws.getRow(i);
      const tatDate = formatCellValue(ws, row.getCell(tatDateColumn)).trim();
      const transactionId = 'TR' + javaUtility.generateDateWithOffset(tatDate, 'yyyyMMddhhmmssSSS');
      transactionsList.push(transactionId);
      const transactionDate = javaUtility.generateDateWithOffset(tatDate, 'dd-MM-yyyy');
      const transactionTime = javaUtility.generateDateWithOffset(tatDate, 'hh:mm:ss:SSS');

      for (let j = 1; j <= columnCount; j++) {
        const cellData = formatCellValue(ws, headerRow.getCell(j)).toLowerCase();
        if (cellData === 'txn_id_var') row.getCell(j).value = transactionId;
        else if (cellData === 'txn_date_var') row.getCell(j).value = transactionDate;
        else if (cellData === 'txn_time_var') row.getCell(j).value = transactionTime;
      }
      row.commit();
      await javaUtility.sleep(100); // Thread.sleep(100) - keeps the ms part of the ids unique
    }
    await workbook.xlsx.writeFile(filePath);
    return transactionsList;
  }

  async getDataFromExcel(excelPath, sheetName) {
    const entireData = [];
    const ws = getSheet(await loadWorkbook(excelPath), sheetName);
    const headerRow = ws.getRow(1);
    if (!headerRow || headerRow.cellCount === 0) throw new Error('The sheet is empty.');
    const columnCount = headerRow.cellCount;

    for (let i = 2; i <= ws.rowCount; i++) {
      const currentRow = ws.getRow(i);
      if (!currentRow || currentRow.cellCount === 0) continue; // Skip empty rows
      const singleRowData = {};
      for (let j = 1; j <= columnCount; j++) {
        singleRowData[getCellValue(headerRow.getCell(j))] = getCellValue(currentRow.getCell(j));
      }
      entireData.push(singleRowData);
    }
    return entireData;
  }

  async generateAndWriteDataToExcelForSwift(filePath, sheetName) {
    const javaUtility = new JavaUtility();
    const workbook = await loadWorkbook(filePath);
    const ws = getSheet(workbook, sheetName);
    const rowCount = ws.actualRowCount;
    const headerRow = ws.getRow(1);
    const columnCount = headerRow.actualCellCount;

    let tatDateColumn = 1;
    for (let c = 1; c <= columnCount; c++) {
      if (formatCellValue(ws, headerRow.getCell(c)).trim().toLowerCase() === 'tat_date') { tatDateColumn = c; break; }
    }

    for (let i = 2; i <= rowCount; i++) {
      const row = ws.getRow(i);
      const tatDate = formatCellValue(ws, row.getCell(tatDateColumn)).trim();
      const txnRefId = 'TR' + javaUtility.generateDateWithOffset(tatDate, 'yyyyMMddhhmmssSSS');
      const txnDateTime = javaUtility.generateDateWithOffset(tatDate, "yyyy-MM-dd'T'HH:mm:ss");
      const paymentSettlementDate = javaUtility.generateDateWithOffset(tatDate, 'yyyy-MM-dd');

      for (let j = 1; j <= columnCount; j++) {
        const cellData = formatCellValue(ws, headerRow.getCell(j)).toLowerCase();
        if (cellData === 'txn_ref_id_var') row.getCell(j).value = txnRefId;
        else if (cellData === 'txn_date_time_var') row.getCell(j).value = txnDateTime;
        else if (cellData === 'payment_settlement_date_var') row.getCell(j).value = paymentSettlementDate;
      }
      row.commit();
      await javaUtility.sleep(100);
    }
    await workbook.xlsx.writeFile(filePath);
  }

  async getEntireTcDataBasedOnTcId(excelPath, sheetName, tcId) {
    const map = {};
    try {
      const ws = getSheet(await loadWorkbook(excelPath), sheetName);
      const headerRow = ws.getRow(1);
      for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        if (formatCellValue(ws, row.getCell(1)).toLowerCase() === String(tcId).toLowerCase()) {
          for (let j = 1; j <= headerRow.cellCount; j++) {
            const key = formatCellValue(ws, headerRow.getCell(j)).trim();
            if (key) map[key] = formatCellValue(ws, row.getCell(j)).trim();
          }
          break;
        }
      }
    } catch (e) {
      UtilityObjectClass.getExtentTest()?.warning('Error reading test data: ' + e.message);
    }
    if (Object.keys(map).length === 0) {
      UtilityObjectClass.getExtentTest()?.warning('No data found for Test Case ID: ' + tcId);
    } else {
      UtilityObjectClass.getExtentTest()?.info('Data retrieved for Test Case ID: ' + tcId + ' - ' + JSON.stringify(map));
    }
    return map;
  }

  async getTxnDataFromExcelBasedOnIndex(excelPath, sheetName, index) {
    const entireData = [];
    const ws = getSheet(await loadWorkbook(excelPath), sheetName);
    const row = ws.getRow(index + 2); // POI index+1 (0-based) -> exceljs index+2 (1-based)
    for (let i = 2; i <= row.cellCount; i++) {
      entireData.push(getCellValue(row.getCell(i)));
    }
    return entireData;
  }

  async getColumnDataBasedOnHeader(excelPath, sheetName, header) {
    const columnData = [];
    const ws = getSheet(await loadWorkbook(excelPath), sheetName);
    const headerRow = ws.getRow(1);
    let cellIndex = 1;
    for (let c = 1; c <= headerRow.cellCount; c++) {
      if (formatCellValue(ws, headerRow.getCell(c)).toLowerCase() === String(header).toLowerCase()) { cellIndex = c; break; }
    }
    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.findRow(i);
      if (!row || row.cellCount === 0) continue; // skip empty rows
      columnData.push(formatCellValue(ws, row.getCell(cellIndex)));
    }
    return columnData;
  }
}

module.exports = { ExcelUtility, javaPlainNumber, formatCellValue, getCellValue };
