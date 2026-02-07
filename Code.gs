const SHEET_NAME = 'Sheet1';

function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!spreadsheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false,
          error: 'Tidak dapat mengakses spreadsheet. Pastikan script dibuka dari Extensions > Apps Script di spreadsheet.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false,
          error: 'Sheet tidak ditemukan: ' + SHEET_NAME 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false,
          error: 'Tidak ada data di sheet: ' + SHEET_NAME 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    
    const result = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j] || '';
      }
      result.push(row);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        headers: headers
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}
