function doGet(e) {
    try {
        const action = e.parameter.action;
        
        let result;
        if (!action || action === 'getData') {
            result = getData();
        } else if (action === 'updateStatus') {
            result = handleStatusUpdate(e.parameter);
        } else if (action === 'updateFlag') {
            result = handleFlagUpdate(e.parameter);
        } else if (action === 'updatePetugas') {
            result = handlePetugasUpdate(e.parameter);
        } else if (action === 'updateWaktuSelesai') {
            result = handleWaktuSelesaiUpdate(e.parameter);
        } else {
            result = ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Action tidak dikenali: ' + action
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        return result;
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doOptions(e) {
    return ContentService.createTextOutput('')
        .setMimeType(ContentService.MimeType.JSON);
}

function getActiveSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    for (let i = 0; i < sheets.length; i++) {
        const sheetName = sheets[i].getName();
        if (sheetName.includes('Form Responses') || sheetName.includes('Responses')) {
            return sheets[i];
        }
    }
    
    return sheets[0];
}

function getData() {
    const sheet = getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            headers: [],
            data: []
        })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    const rows = data.slice(1).map((row, index) => {
        const rowObj = {};
        headers.forEach((header, colIndex) => {
            rowObj[header] = row[colIndex] || '';
        });
        rowObj.rowNumber = index + 2;
        return rowObj;
    });
    
    return ContentService.createTextOutput(JSON.stringify({
        success: true,
        headers: headers,
        data: rows
    })).setMimeType(ContentService.MimeType.JSON);
}

function findColumnIndex(sheet, columnName) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const searchName = columnName.toLowerCase().trim();
    
    if (searchName === 'status') {
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i] ? headers[i].toString().toLowerCase().trim() : '';
            if (header === 'status' && header !== 'status surat') {
                Logger.log('Found exact "Status" column at index: ' + (i + 1));
                return i + 1;
            }
        }
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i] ? headers[i].toString().toLowerCase().trim() : '';
            if (header === 'status' && !header.includes('surat')) {
                Logger.log('Found "Status" column (not "Status Surat") at index: ' + (i + 1));
                return i + 1;
            }
        }
    }
    
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i] ? headers[i].toString().toLowerCase().trim() : '';
        if (header === searchName) {
            Logger.log('Found exact match for "' + columnName + '" at index: ' + (i + 1));
            return i + 1;
        }
    }
    
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i] ? headers[i].toString().toLowerCase() : '';
        if (header.includes(searchName) && !(searchName === 'status' && header.includes('surat'))) {
            Logger.log('Found partial match for "' + columnName + '" at index: ' + (i + 1));
            return i + 1;
        }
    }
    
    Logger.log('Column "' + columnName + '" not found');
    return -1;
}

function handleStatusUpdate(params) {
    try {
        const sheet = getActiveSheet();
        const rowNumber = parseInt(params.rowNumber);
        const status = params.status;
        
        Logger.log('handleStatusUpdate called with rowNumber: ' + rowNumber + ', status: ' + status);
        
        if (!rowNumber || isNaN(rowNumber) || !status) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Parameter tidak lengkap: rowNumber=' + rowNumber + ', status=' + status
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const colIndex = findColumnIndex(sheet, 'Status');
        Logger.log('Status column index: ' + colIndex);
        
        if (colIndex === -1) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Kolom Status tidak ditemukan'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const oldValue = sheet.getRange(rowNumber, colIndex).getValue();
        Logger.log('Old value at row ' + rowNumber + ', col ' + colIndex + ': ' + oldValue);
        
        if (String(oldValue).trim() === String(status).trim()) {
            Logger.log('Status already ' + status + ', no update needed');
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                rowNumber: rowNumber,
                oldValue: oldValue,
                newValue: status,
                message: 'Status sudah ' + status
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        Logger.log('Setting status to: ' + status + ' at row ' + rowNumber + ', col ' + colIndex);
        sheet.getRange(rowNumber, colIndex).setValue(status);
        SpreadsheetApp.flush();
        
        Utilities.sleep(1000);
        
        const newValue = sheet.getRange(rowNumber, colIndex).getValue();
        Logger.log('New value at row ' + rowNumber + ', col ' + colIndex + ': ' + newValue);
        
        if (String(newValue).trim() !== String(status).trim()) {
            Logger.log('WARNING: Value not saved correctly! Expected: ' + status + ', Got: ' + newValue);
            sheet.getRange(rowNumber, colIndex).setValue(status);
            SpreadsheetApp.flush();
            Utilities.sleep(1000);
            const retryValue = sheet.getRange(rowNumber, colIndex).getValue();
            Logger.log('Retry value: ' + retryValue);
            
            if (String(retryValue).trim() !== String(status).trim()) {
                Logger.log('ERROR: Failed to save after retry!');
                return ContentService.createTextOutput(JSON.stringify({
                    success: false,
                    error: 'Gagal menyimpan status. Expected: ' + status + ', Got: ' + retryValue
                })).setMimeType(ContentService.MimeType.JSON);
            }
        }
        
        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            rowNumber: rowNumber,
            oldValue: oldValue,
            newValue: newValue
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        Logger.log('Error in handleStatusUpdate: ' + error.toString());
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleFlagUpdate(params) {
    try {
        const sheet = getActiveSheet();
        const rowNumber = parseInt(params.rowNumber);
        const flag = params.flag;
        
        if (!rowNumber || !flag) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Parameter tidak lengkap'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const colIndex = findColumnIndex(sheet, 'Flag');
        if (colIndex === -1) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Kolom Flag tidak ditemukan'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        sheet.getRange(rowNumber, colIndex).setValue(flag);
        SpreadsheetApp.flush();
        
        return ContentService.createTextOutput(JSON.stringify({
            success: true
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handlePetugasUpdate(params) {
    try {
        const sheet = getActiveSheet();
        const rowNumber = parseInt(params.rowNumber);
        const petugas = params.petugas;
        
        if (!rowNumber || !petugas) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Parameter tidak lengkap'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const colIndex = findColumnIndex(sheet, 'Petugas');
        if (colIndex === -1) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Kolom Petugas tidak ditemukan'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        sheet.getRange(rowNumber, colIndex).setValue(petugas);
        SpreadsheetApp.flush();
        
        return ContentService.createTextOutput(JSON.stringify({
            success: true
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleWaktuSelesaiUpdate(params) {
    try {
        const sheet = getActiveSheet();
        const rowNumber = parseInt(params.rowNumber);
        const waktuSelesai = params.waktuSelesai;
        
        if (!rowNumber || !waktuSelesai) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Parameter tidak lengkap'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const colIndex = findColumnIndex(sheet, 'Waktu Selesai');
        if (colIndex === -1) {
            return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Kolom Waktu Selesai tidak ditemukan'
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const dateValue = new Date(waktuSelesai);
        sheet.getRange(rowNumber, colIndex).setValue(dateValue);
        SpreadsheetApp.flush();
        
        return ContentService.createTextOutput(JSON.stringify({
            success: true
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

