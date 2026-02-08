const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTkazPligfvCUdrT1DsFECQc71sVfbAcYtInUHnnTiyBtU3AJDyjjRI9VeIeAmABNe/exec';

let allData = [];
let filteredData = [];
let searchTerm = '';
let spreadsheetHeaders = [];
let currentFilters = {
    bulan: '',
    tahun: ''
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }
    loadData();
    setupEventListeners();
    setupLogout();
});

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                logout();
            }
        });
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        filterAndDisplayData();
    });

    document.getElementById('bulanFilter').addEventListener('change', (e) => {
        currentFilters.bulan = e.target.value;
        filterAndDisplayData();
    });

    document.getElementById('tahunFilter').addEventListener('change', (e) => {
        currentFilters.tahun = e.target.value;
        filterAndDisplayData();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadData();
    });

    document.querySelector('.close-btn').addEventListener('click', closePopup);
    document.getElementById('detailPopup').addEventListener('click', (e) => {
        if (e.target.id === 'detailPopup') {
            closePopup();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePopup();
        }
    });
}

function sortDataByTimestamp(data) {
    return data.sort((a, b) => {
        const dateA = parseTimestamp(a.timestamp);
        const dateB = parseTimestamp(b.timestamp);
        return dateB - dateA;
    });
}

function parseTimestamp(timestamp) {
    if (!timestamp) return 0;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 0 : date.getTime();
}

async function loadData() {
    try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL') {
            throw new Error('URL Apps Script belum dikonfigurasi. Silakan isi APPS_SCRIPT_URL di script.js');
        }

        allData = [];
        filteredData = [];
        
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('action', 'getData');
        url.searchParams.append('_t', Date.now());
        
        let response;
        try {
            response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
        } catch (fetchError) {
            console.error('Fetch error details:', fetchError);
            if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
                throw new Error('CORS Error: Pastikan Apps Script sudah di-deploy sebagai Web App dengan "Who has access: Anyone". Silakan update deployment di Apps Script Editor.');
            }
            throw new Error('Tidak dapat terhubung ke Apps Script: ' + fetchError.message);
        }

        if (!response) {
            throw new Error('Tidak dapat terhubung ke Apps Script. Pastikan URL benar dan Apps Script sudah di-deploy.');
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result) {
            throw new Error('Response kosong dari Apps Script');
        }

        if (!result.success) {
            throw new Error(result.error || 'Error dari Apps Script');
        }

        const headers = result.headers || (result.data.length > 0 ? Object.keys(result.data[0]) : []);
        spreadsheetHeaders = headers;
        updateTableHeaders();
        
        allData = [];
        filteredData = [];
        
        allData = result.data.map((row, index) => {
            const getColumnValue = (position) => {
                if (position < headers.length) {
                    const headerName = headers[position];
                    return row[headerName] || '';
                }
                return '';
            };

            const originalRowNumber = row.rowNumber || (index + 2);
            
            return {
                id: index,
                rowNumber: originalRowNumber,
                originalRowNumber: originalRowNumber,
                A: getColumnValue(0),
                B: getColumnValue(1),
                E: getColumnValue(4),
                G: getColumnValue(6),
                H: getColumnValue(7),
                I: getColumnValue(8),
                timestamp: findColumnValue(row, 'Timestamp'),
                status: (findColumnValue(row, 'Status') || '').trim(),
                flag: (findColumnValue(row, 'Flag') || '').trim(),
                timestampSelesai: (findColumnValue(row, 'Timestamp') || '').trim()
            };
        });

        const sortedData = sortDataByTimestamp([...allData]);
        allData = sortedData;
        filteredData = [];
        
        setupFilterOptions();
        filterAndDisplayData();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="8" class="loading">' +
            '<strong style="color: #dc3545;">Error: ' + escapeHtml(error.message) + '</strong>' +
            '</td></tr>';
        document.getElementById('cardsContainer').innerHTML = 
            '<div class="loading"><strong style="color: #dc3545;">Error: ' + escapeHtml(error.message) + '</strong></div>';
    }
}

function findColumnValue(row, columnName) {
    const keys = Object.keys(row);
    const searchName = columnName.toLowerCase().trim();
    
    if (searchName === 'status') {
        let key = keys.find(k => {
            const kLower = k.toLowerCase().trim();
            return kLower === 'status' && kLower !== 'status surat';
        });
        if (key) {
            return row[key] || '';
        }
        key = keys.find(k => {
            const kLower = k.toLowerCase().trim();
            return kLower === 'status' && !kLower.includes('surat');
        });
        if (key) {
            return row[key] || '';
        }
    }
    
    let key = keys.find(k => k.toLowerCase().trim() === searchName);
    if (key) {
        return row[key] || '';
    }
    
    key = keys.find(k => {
        const kLower = k.toLowerCase();
        return kLower.includes(searchName) && !(searchName === 'status' && kLower.includes('surat'));
    });
    if (key) {
        return row[key] || '';
    }
    
    console.warn(`Column "${columnName}" not found. Available keys:`, keys);
    return '';
}

function setupFilterOptions() {
    const tahunSet = new Set();
    allData.forEach(row => {
        if (row.timestamp) {
            const tahun = extractYear(row.timestamp);
            if (tahun) {
                tahunSet.add(tahun);
            }
        }
    });
    
    const tahunFilter = document.getElementById('tahunFilter');
    Array.from(tahunSet).sort((a, b) => b - a).forEach(tahun => {
        const option = document.createElement('option');
        option.value = tahun;
        option.textContent = tahun;
        tahunFilter.appendChild(option);
    });
}

function extractYear(timestamp) {
    if (!timestamp) return null;
    
    const dateStr = timestamp.toString().trim();
    const dateMatch = dateStr.match(/\d{4}/);
    if (dateMatch) {
        return dateMatch[0];
    }
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date.getFullYear().toString();
    }
    
    return null;
}

function extractMonth(timestamp) {
    if (!timestamp) return null;
    
    const dateStr = timestamp.toString().trim();
    const date = new Date(dateStr);
    
    if (!isNaN(date.getTime())) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return month;
    }
    
    const match = dateStr.match(/(\d{1,2})\/\d{1,2}\/\d{4}/);
    if (match) {
        return match[1].padStart(2, '0');
    }
    
    return null;
}

function filterAndDisplayData() {
    filteredData = allData.filter(row => {
        if (currentFilters.bulan) {
            const month = extractMonth(row.timestamp);
            if (month !== currentFilters.bulan) {
                return false;
            }
        }

        if (currentFilters.tahun) {
            const year = extractYear(row.timestamp);
            if (year !== currentFilters.tahun) {
                return false;
            }
        }

        if (searchTerm) {
            const searchable = [
                row.A, row.B, row.E, row.G, row.H, row.I
            ].join(' ').toLowerCase();
            
            if (!searchable.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    displayData();
    updateResultCount();
}

function displayData() {
    const tbody = document.getElementById('tableBody');
    const cardsContainer = document.getElementById('cardsContainer');
    const isMobile = window.innerWidth <= 768;
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Tidak ada data yang ditemukan</td></tr>';
        cardsContainer.innerHTML = '<div class="loading">Tidak ada data yang ditemukan</div>';
        return;
    }

    if (isMobile) {
        displayCards();
    } else {
        displayTable();
    }
}

function getStatusColumnIndex() {
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        if (spreadsheetHeaders[i] && spreadsheetHeaders[i].toLowerCase().includes('status')) {
            return i;
        }
    }
    return -1;
}

function getFlagColumnIndex() {
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        if (spreadsheetHeaders[i] && spreadsheetHeaders[i].toLowerCase().includes('flag')) {
            return i;
        }
    }
    return -1;
}

function getTimestampColumnIndex() {
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        if (spreadsheetHeaders[i] && (spreadsheetHeaders[i].toLowerCase().includes('timestamp') || spreadsheetHeaders[i].toLowerCase().includes('tanggal backdate'))) {
            return i;
        }
    }
    return -1;
}

function formatStatus(status) {
    if (!status) return '<span class="status-badge status-empty">-</span>';
    const statusLower = status.toLowerCase();
    if (statusLower === 'closed') {
        return '<span class="status-badge status-closed">Closed</span>';
    } else if (statusLower === 'cancelled') {
        return '<span class="status-badge status-cancelled">Cancelled</span>';
    }
    return `<span class="status-badge">${escapeHtml(status)}</span>`;
}

function formatFlag(flag) {
    if (!flag) return '<span class="flag-badge flag-empty">-</span>';
    const flagLower = flag.toLowerCase();
    if (flagLower === 'merah') {
        return '<span class="flag-badge flag-merah">Merah</span>';
    }
    return `<span class="flag-badge">${escapeHtml(flag)}</span>`;
}

function displayTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    // Urutan: A (Tanggal Input), G (Nama), H (Unit kerja), E (Tanggal Backdate), B (Petugas)
    const displayColumns = [0, 6, 7, 4, 1];
    
    tbody.innerHTML = filteredData.map((row) => {
        const cells = displayColumns.map(index => {
            let headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
            const colLetter = index === 0 ? 'A' : index === 1 ? 'B' : index === 4 ? 'E' : index === 6 ? 'G' : index === 7 ? 'H' : 'I';
            
            // Mapping header name
            if (index === 0) {
                headerName = 'Tanggal Input';
            } else if (index === 6) {
                headerName = 'Nama yang Dibuka Backdate';
            } else if (index === 7) {
                headerName = 'Unit kerja';
            } else if (index === 4) {
                headerName = 'Tanggal Backdate';
            } else if (index === 1) {
                headerName = 'Petugas';
            }
            
            let value = row[colLetter] || '';
            value = formatValueForDisplay(value, headerName);
            return highlightText(value);
        });

        const statusCell = formatStatus(row.status);
        const flagCell = formatFlag(row.flag);

        return `
            <tr data-row-id="${row.id}" class="data-row">
                ${cells.map(cell => `<td>${cell}</td>`).join('')}
                <td onclick="event.stopPropagation()">${statusCell}</td>
                <td onclick="event.stopPropagation()">${flagCell}</td>
            </tr>
        `;
    }).join('');
    
    tbody.querySelectorAll('.data-row').forEach(row => {
        row.style.cursor = 'pointer';
        const rowId = parseInt(row.getAttribute('data-row-id'));
        if (rowId !== null && !isNaN(rowId)) {
            row.addEventListener('click', function(e) {
                const clickedTd = e.target.closest('td');
                if (clickedTd && clickedTd.hasAttribute('onclick')) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                showDetail(rowId);
            });
        }
    });
}

function displayCards() {
    const cardsContainer = document.getElementById('cardsContainer');
    // Urutan: A (Tanggal Input), G (Nama), H (Unit kerja), E (Tanggal Backdate), B (Petugas)
    const displayColumns = [0, 6, 7, 4, 1];
    
    cardsContainer.innerHTML = filteredData.map(row => {
        const headers = spreadsheetHeaders;
        const cardRows = displayColumns.map(index => {
            let headerName = headers[index] || `Kolom ${String.fromCharCode(65 + index)}`;
            const colLetter = index === 0 ? 'A' : index === 1 ? 'B' : index === 4 ? 'E' : index === 6 ? 'G' : index === 7 ? 'H' : 'I';
            
            // Mapping header name
            if (index === 0) {
                headerName = 'Tanggal Input';
            } else if (index === 6) {
                headerName = 'Nama yang Dibuka Backdate';
            } else if (index === 7) {
                headerName = 'Unit kerja';
            } else if (index === 4) {
                headerName = 'Tanggal Backdate';
            } else if (index === 1) {
                headerName = 'Petugas';
            }
            
            let value = row[colLetter] || '';
            value = formatValueForDisplay(value, headerName);
            return `
                <div class="card-row">
                    <div class="card-label">${escapeHtml(headerName)}</div>
                    <div class="card-value">${highlightText(value)}</div>
                </div>
            `;
        }).join('');

        const statusRow = `
            <div class="card-row">
                <div class="card-label">Status</div>
                <div class="card-value">${formatStatus(row.status)}</div>
            </div>
        `;

        const flagRow = `
            <div class="card-row">
                <div class="card-label">Flag</div>
                <div class="card-value">${formatFlag(row.flag)}</div>
            </div>
        `;

        return `
            <div class="card" data-row-id="${row.id}">
                ${cardRows}
                ${statusRow}
                ${flagRow}
            </div>
        `;
    }).join('');
    
    cardsContainer.querySelectorAll('.card').forEach(card => {
        card.style.cursor = 'pointer';
        const rowId = parseInt(card.getAttribute('data-row-id'));
        if (rowId !== null && !isNaN(rowId)) {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showDetail(rowId);
            });
        }
    });
}

window.addEventListener('resize', () => {
    if (filteredData.length > 0) {
        displayData();
    }
});

function highlightText(text) {
    if (!text) return '';
    
    if (typeof text !== 'string') {
        text = String(text);
    }
    
    if (text.includes('<br>')) {
        const parts = text.split('<br>');
        return parts.map(part => {
            if (!searchTerm) return escapeHtml(part);
            const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
            return escapeHtml(part).replace(regex, '<span class="highlight">$1</span>');
        }).join('<br>');
    }
    
    if (!searchTerm) {
        return escapeHtml(text);
    }

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return timestamp;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${day}-${month}-${year}<br>${hours}:${minutes}:${seconds}`;
    } catch (e) {
        return timestamp;
    }
}

function formatDateOnly(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return timestamp;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
    } catch (e) {
        return timestamp;
    }
}

function formatValueForDisplay(value, headerName) {
    if (!value || value === '') return '';
    
    if (!headerName) return value;
    
    const headerLower = headerName.toLowerCase();
    
    // Tanggal Backdate (kolom E) - tanpa jam
    if (headerLower.includes('tanggal backdate') || headerLower.includes('tanggal pembukaan backdate')) {
        return formatDateOnly(value);
    }
    
    // Tanggal Input dan timestamp lainnya - dengan jam
    const isTimestamp = headerLower.includes('tanggal input') ||
                        headerLower.includes('timestamp') ||
                        (headerLower.includes('waktu') && !headerLower.includes('selesai')) ||
                        (headerLower.includes('tanggal') && !headerLower.includes('backdate'));
    
    if (isTimestamp) {
        return formatTimestamp(value);
    }
    
    return value;
}

function updateResultCount() {
    document.getElementById('resultCount').textContent = filteredData.length;
}

function updateTableHeaders() {
    const thead = document.querySelector('#dataTable thead tr');
    if (!thead || spreadsheetHeaders.length === 0) return;
    
    // Urutan: A (Tanggal Input), G (Nama), H (Unit kerja), E (Tanggal Backdate), B (Petugas)
    const displayColumns = [0, 6, 7, 4, 1];
    
    thead.innerHTML = displayColumns.map(index => {
        let headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
        
        // Mapping header name
        if (index === 0) {
            headerName = 'Tanggal Input';
        } else if (index === 6) {
            headerName = 'Nama yang Dibuka Backdate';
        } else if (index === 7) {
            headerName = 'Unit kerja';
        } else if (index === 4) {
            headerName = 'Tanggal Backdate';
        } else if (index === 1) {
            headerName = 'Petugas';
        }
        
        return `<th>${escapeHtml(headerName)}</th>`;
    }).join('') + '<th>Status</th><th>Flag</th>';
}

function showDetail(rowId) {
    const row = allData.find(r => r.id === rowId);
    if (!row) {
        return;
    }

    let dataName = '';
    const nameHeaders = ['Nama Lengkap', 'Nama', 'Name', 'NAMA LENGKAP', 'NAMA'];
    
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        const header = spreadsheetHeaders[i];
        if (nameHeaders.some(nh => header && header.toLowerCase().includes(nh.toLowerCase()))) {
            const colLetter = String.fromCharCode(65 + i);
            if (colLetter === 'A' || colLetter === 'B') {
                dataName = row[colLetter] || '';
                if (dataName) break;
            }
        }
    }
    
    // Cari nama dari kolom G (Nama yang Dibuka Backdate)
    if (!dataName && row.G) {
        dataName = row.G;
    }
    
    if (!dataName && row.B) {
        dataName = row.B;
    }
    
    if (!dataName && row.A) {
        dataName = row.A;
    }

    const detailTitle = document.querySelector('#detailPopup h2');
    if (detailTitle) {
        detailTitle.textContent = dataName ? `Detail Data - ${dataName}` : 'Detail Data';
    }

    const detailContent = document.getElementById('detailContent');
    const statusColIndex = getStatusColumnIndex();
    const flagColIndex = getFlagColumnIndex();
    const timestampColIndex = getTimestampColumnIndex();
    
    const currentStatus = (row.status || '').trim();
    const currentFlag = (row.flag || '').trim();
    const currentTimestampSelesai = (row.timestampSelesai || '').trim();
    
    const isCompleted = (currentStatus === 'Closed' || currentStatus === 'Cancelled') && 
                        currentFlag && currentTimestampSelesai && currentFlag.toLowerCase() === 'merah';
    
    // Tampilkan semua kolom dari spreadsheet
    const columns = [];
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        columns.push(String.fromCharCode(65 + i));
    }
    
    detailContent.innerHTML = columns.map((col) => {
        const colIndex = col.charCodeAt(0) - 65;
        let headerName = spreadsheetHeaders[colIndex] || `Kolom ${col}`;
        
        // Mapping header name untuk tampilan yang lebih user-friendly
        if (colIndex === 0 && headerName.toLowerCase().includes('timestamp')) {
            headerName = 'Tanggal Input';
        } else if (colIndex === 6 && headerName.toLowerCase().includes('nama yang dibuka')) {
            headerName = 'Nama yang Dibuka Backdate';
        } else if (colIndex === 7 && headerName.toLowerCase().includes('departemen')) {
            headerName = 'Unit kerja';
        } else if (colIndex === 4 && headerName.toLowerCase().includes('tanggal pembukaan')) {
            headerName = 'Tanggal Backdate';
        } else if (colIndex === 1 && headerName.toLowerCase().includes('nama admin')) {
            headerName = 'Petugas';
        }
        
        // Skip Status dan Flag (akan ditampilkan di bawah jika completed)
        if (colIndex === statusColIndex || colIndex === flagColIndex) {
            return '';
        }
        
        let value = row[col] || '';
        
        if (!value || value === '') {
            return '';
        }
        
        const headerLower = headerName.toLowerCase();
        
        // Tanggal Backdate (kolom E) - tanpa jam
        if (headerLower.includes('tanggal backdate') || headerLower.includes('tanggal pembukaan backdate')) {
            value = formatDateOnly(value);
        } else {
            // Tanggal Input dan timestamp lainnya - dengan jam
            const isTimestamp = headerLower.includes('tanggal input') ||
                                headerLower.includes('timestamp') ||
                                (headerLower.includes('waktu') && !headerLower.includes('selesai')) ||
                                (headerLower.includes('tanggal') && !headerLower.includes('backdate'));
            
            if (isTimestamp) {
                value = formatTimestamp(value);
            } else {
                value = escapeHtml(value);
            }
        }
        
        return `
            <div class="detail-item">
                <label>${escapeHtml(headerName)}</label>
                <div class="value">${value}</div>
            </div>
        `;
    }).filter(item => item !== '').join('');
    
    if (isCompleted) {
        const statusHeader = spreadsheetHeaders[statusColIndex] || 'Status';
        const flagHeader = spreadsheetHeaders[flagColIndex] || 'Flag';
        
        detailContent.innerHTML += `
            <div class="detail-item">
                <label>${escapeHtml(statusHeader)}</label>
                <div class="value">${formatStatus(currentStatus)}</div>
            </div>
            <div class="detail-item">
                <label>${escapeHtml(flagHeader)}</label>
                <div class="value">${formatFlag(currentFlag)}</div>
            </div>
        `;
        
        if (currentTimestampSelesai) {
            const timestampHeader = spreadsheetHeaders[timestampColIndex] || 'Timestamp';
            let timestampValue = formatTimestamp(currentTimestampSelesai);
            if (!timestampValue || timestampValue === currentTimestampSelesai || !timestampValue.includes(':')) {
                try {
                    const date = new Date(currentTimestampSelesai);
                    if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        timestampValue = `${day}-${month}-${year}<br>${hours}:${minutes}:${seconds}`;
                    } else {
                        timestampValue = escapeHtml(currentTimestampSelesai);
                    }
                } catch (e) {
                    timestampValue = escapeHtml(currentTimestampSelesai);
                }
            }
            detailContent.innerHTML += `
                <div class="detail-item">
                    <label>${escapeHtml(timestampHeader)}</label>
                    <div class="value">${timestampValue}</div>
                </div>
            `;
        }
    }

    const statusSelect = document.getElementById('statusSelect');
    const saveBtn = document.getElementById('saveBtn');
    const statusSection = document.getElementById('statusSection');
    
    saveBtn.textContent = 'Simpan';
    
    if (currentStatus) {
        statusSelect.value = currentStatus;
    } else {
        statusSelect.value = '';
    }
    
    currentDetailRow = row;
    
    function toggleDropdowns() {
        const selectedStatus = statusSelect.value;
        const isClosedOrCancelled = selectedStatus === 'Closed' || selectedStatus === 'Cancelled';
        
        if (isCompleted) {
            statusSection.style.display = 'none';
            saveBtn.style.display = 'none';
        } else if (isClosedOrCancelled) {
            statusSection.style.display = 'flex';
            saveBtn.style.display = 'block';
        } else {
            statusSection.style.display = 'flex';
            saveBtn.style.display = 'none';
        }
    }
    
    function checkChanges() {
        if (isCompleted) {
            saveBtn.disabled = true;
            saveBtn.classList.add('disabled');
            return;
        }
        
        const selectedStatus = statusSelect.value;
        const statusChanged = selectedStatus !== currentStatus;
        
        const isClosedOrCancelled = selectedStatus === 'Closed' || selectedStatus === 'Cancelled';
        
        let hasChanges = false;
        
        if (statusChanged) {
            hasChanges = true;
        }
        
        if (isClosedOrCancelled) {
            if (!currentTimestampSelesai) {
                hasChanges = true;
            }
        }
        
        if (hasChanges && isClosedOrCancelled) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('disabled');
        } else {
            saveBtn.disabled = true;
            saveBtn.classList.add('disabled');
        }
    }
    
    statusSelect.onchange = () => {
        toggleDropdowns();
        checkChanges();
    };
    
    toggleDropdowns();
    checkChanges();
    
    saveBtn.onclick = async () => {
        if (saveBtn.disabled) return;
        
        const newStatus = statusSelect.value;
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Menyimpan...';
            
            const rowNumberToUpdate = row.originalRowNumber || row.rowNumber;
            const isClosedOrCancelled = newStatus === 'Closed' || newStatus === 'Cancelled';
            
            const updateData = {};
            if (newStatus !== currentStatus) {
                updateData.status = newStatus;
            }
            
            if (isClosedOrCancelled) {
                updateData.flag = 'Merah';
                
                // Selalu update timestamp saat simpan (untuk waktu selesai)
                updateData.timestamp = new Date().toISOString();
            }
            
            if (Object.keys(updateData).length === 0) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Simpan';
                return;
            }
            
            await batchUpdate(rowNumberToUpdate, updateData);
            
            row.status = newStatus || row.status;
            row.flag = 'Merah';
            if (updateData.timestamp) {
                row.timestampSelesai = updateData.timestamp;
            }
            
            const rowIndex = allData.findIndex(r => r.id === row.id);
            if (rowIndex !== -1) {
                allData[rowIndex] = { ...allData[rowIndex], ...row };
            }
            
            filterAndDisplayData();
            
            showNotification('Data berhasil diupdate!', 'success');
            setTimeout(() => {
                closePopup();
            }, 500);
        } catch (error) {
            console.error('Error saving:', error);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
            showNotification('Error: ' + error.message, 'error');
        }
    };

    const popup = document.getElementById('detailPopup');
    popup.classList.add('show');
    document.body.style.overflow = 'hidden';
}

let currentDetailRow = null;

async function batchUpdate(rowNumber, updateData) {
    if (!rowNumber || isNaN(rowNumber)) {
        throw new Error('RowNumber tidak valid: ' + rowNumber);
    }
    
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', 'batchUpdate');
    url.searchParams.append('rowNumber', rowNumber);
    
    if (updateData.status !== undefined) {
        url.searchParams.append('status', updateData.status);
    }
    if (updateData.flag !== undefined) {
        url.searchParams.append('flag', updateData.flag);
    }
    if (updateData.timestamp !== undefined) {
        url.searchParams.append('timestamp', updateData.timestamp);
    }
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
    });

    if (!response.ok) {
        throw new Error('HTTP Error: ' + response.status);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || 'Gagal mengupdate data');
    }
    
    return result;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('popupNotification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = 'popup-notification ' + type;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translate(-50%, -50%)';
    }, 10);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -50%) translateY(-10px)';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

function closePopup() {
    const popup = document.getElementById('detailPopup');
    popup.classList.remove('show');
    document.body.style.overflow = 'auto';
}
