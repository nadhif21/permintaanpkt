const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLv5k5tA8DAf_OjTRewxzDB79AD-Q0qHH1qaHjh6ORpmrILaJrYZt5EKMYa5K9KHd89Q/exec';

let allData = [];
let filteredData = [];
let searchTerm = '';
let spreadsheetHeaders = [];
let currentFilters = {
    jenis: '',
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

    document.getElementById('jenisFilter').addEventListener('change', (e) => {
        currentFilters.jenis = e.target.value;
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

        console.log('Loading fresh data from server...');
        
        allData = [];
        filteredData = [];
        
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('action', 'getData');
        url.searchParams.append('_t', Date.now());
        url.searchParams.append('_r', Math.random());
        
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
        
        console.log('Clearing old data and loading new data from server...');
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
                C: getColumnValue(2),
                D: getColumnValue(3),
                E: getColumnValue(4),
                F: getColumnValue(5),
                G: getColumnValue(6),
                H: getColumnValue(7),
                I: getColumnValue(8),
                J: getColumnValue(9),
                K: getColumnValue(10),
                L: getColumnValue(11),
                pilihPermintaan: findColumnValue(row, 'Pilih Permintaan'),
                timestamp: findColumnValue(row, 'Timestamp'),
                status: (findColumnValue(row, 'Status') || '').trim(),
                flag: (findColumnValue(row, 'Flag') || '').trim(),
                petugas: (findColumnValue(row, 'Petugas') || '').trim(),
                waktuSelesai: (findColumnValue(row, 'Waktu Selesai') || '').trim()
            };
        });

        console.log('Raw data from server - first row status:', result.data[0]?.Status || result.data[0]?.status || 'not found');
        
        const sortedData = sortDataByTimestamp([...allData]);
        allData = sortedData;
        filteredData = [];
        
        console.log('Data loaded from server, total rows:', allData.length);
        if (allData.length > 0) {
            console.log('First row after sort - status:', allData[0].status, 'rowNumber:', allData[0].rowNumber, 'NPK:', allData[0].B);
            const testRow = allData.find(r => r.B === 'KNEB241343');
            if (testRow) {
                console.log('Row with NPK KNEB241343:', {
                    id: testRow.id,
                    rowNumber: testRow.rowNumber,
                    originalRowNumber: testRow.originalRowNumber,
                    status: testRow.status,
                    flag: testRow.flag,
                    petugas: testRow.petugas,
                    waktuSelesai: testRow.waktuSelesai
                });
            } else {
                console.log('Row with NPK KNEB241343 NOT FOUND in loaded data!');
            }
        }

        setupFilterOptions();
        filterAndDisplayData();
        
        console.log('Data completely refreshed and displayed. Old data cleared.');
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
            console.log(`Found exact "Status" column: "${key}" =`, row[key]);
            return row[key] || '';
        }
        key = keys.find(k => {
            const kLower = k.toLowerCase().trim();
            return kLower === 'status' && !kLower.includes('surat');
        });
        if (key) {
            console.log(`Found "Status" column (not "Status Surat"): "${key}" =`, row[key]);
            return row[key] || '';
        }
    }
    
    let key = keys.find(k => k.toLowerCase().trim() === searchName);
    if (key) {
        console.log(`Found exact match for "${columnName}": "${key}" =`, row[key]);
        return row[key] || '';
    }
    
    key = keys.find(k => {
        const kLower = k.toLowerCase();
        return kLower.includes(searchName) && !(searchName === 'status' && kLower.includes('surat'));
    });
    if (key) {
        console.log(`Found partial match for "${columnName}": "${key}" =`, row[key]);
        return row[key] || '';
    }
    
    console.warn(`Column "${columnName}" not found. Available keys:`, keys);
    return '';
}

function setupFilterOptions() {
    const jenisSet = new Set();
    allData.forEach(row => {
        if (row.pilihPermintaan) {
            jenisSet.add(row.pilihPermintaan);
        }
    });
    
    const jenisFilter = document.getElementById('jenisFilter');
    Array.from(jenisSet).sort().forEach(jenis => {
        const option = document.createElement('option');
        option.value = jenis;
        option.textContent = jenis;
        jenisFilter.appendChild(option);
    });

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
        if (currentFilters.jenis && row.pilihPermintaan !== currentFilters.jenis) {
            return false;
        }

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
                row.A, row.B, row.C, row.D, row.F, row.G
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

function getPetugasColumnIndex() {
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        if (spreadsheetHeaders[i] && spreadsheetHeaders[i].toLowerCase().includes('petugas')) {
            return i;
        }
    }
    return -1;
}

function getWaktuSelesaiColumnIndex() {
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        if (spreadsheetHeaders[i] && (spreadsheetHeaders[i].toLowerCase().includes('waktu selesai') || spreadsheetHeaders[i].toLowerCase().includes('waktuselesai'))) {
            return i;
        }
    }
    return -1;
}

function formatStatus(status) {
    if (!status) return '<span class="status-badge status-empty">-</span>';
    const statusLower = status.toLowerCase();
    if (statusLower === 'open') {
        return '<span class="status-badge status-open">Open</span>';
    } else if (statusLower === 'closed') {
        return '<span class="status-badge status-closed">Closed</span>';
    } else if (statusLower === 'cancelled') {
        return '<span class="status-badge status-cancelled">Cancelled</span>';
    }
    return `<span class="status-badge">${escapeHtml(status)}</span>`;
}

function formatFlag(flag) {
    if (!flag) return '<span class="flag-badge flag-empty">-</span>';
    const flagLower = flag.toLowerCase();
    if (flagLower === 'hijau') {
        return '<span class="flag-badge flag-hijau">Hijau</span>';
    } else if (flagLower === 'kuning') {
        return '<span class="flag-badge flag-kuning">Kuning</span>';
    } else if (flagLower === 'merah') {
        return '<span class="flag-badge flag-merah">Merah</span>';
    }
    return `<span class="flag-badge">${escapeHtml(flag)}</span>`;
}

function displayTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const displayColumns = [0, 6, 1, 2, 3, 5];
    const statusColIndex = getStatusColumnIndex();
    
    tbody.innerHTML = filteredData.map((row) => {
        const cells = displayColumns.map(index => {
            let headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
            if (headerName === 'Pilih Permintaan') {
                headerName = 'Jenis Permintaan';
            }
            const colLetter = String.fromCharCode(65 + index);
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
                console.log('Row clicked, rowId:', rowId);
                showDetail(rowId);
            });
        }
    });
}

function displayCards() {
    const cardsContainer = document.getElementById('cardsContainer');
    const displayColumns = [0, 6, 1, 2, 3, 5];
    
    cardsContainer.innerHTML = filteredData.map(row => {
        const headers = spreadsheetHeaders;
        const cardRows = displayColumns.map(index => {
            let headerName = headers[index] || `Kolom ${String.fromCharCode(65 + index)}`;
            if (headerName === 'Pilih Permintaan') {
                headerName = 'Jenis Permintaan';
            }
            const colLetter = String.fromCharCode(65 + index);
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
                console.log('Card clicked, rowId:', rowId);
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

function formatValueForDisplay(value, headerName) {
    if (!value || value === '') return '';
    
    if (!headerName) return value;
    
    const headerLower = headerName.toLowerCase();
    const isTimestamp = headerLower.includes('timestamp') || 
                        (headerLower.includes('waktu') && !headerLower.includes('selesai')) ||
                        headerLower.includes('tanggal');
    
    const isWaktuSelesai = headerLower.includes('waktu selesai') || headerLower.includes('waktuselesai');
    
    if (isTimestamp || isWaktuSelesai) {
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
    
    const displayColumns = [0, 6, 1, 2, 3, 5];
    
    thead.innerHTML = displayColumns.map(index => {
        let headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
        if (headerName === 'Pilih Permintaan') {
            headerName = 'Jenis Permintaan';
        }
        return `<th>${escapeHtml(headerName)}</th>`;
    }).join('') + '<th>Status</th><th>Flag</th>';
}

function showDetail(rowId) {
    console.log('showDetail called with rowId:', rowId);
    const row = allData.find(r => r.id === rowId);
    console.log('Found row:', row);
    if (!row) {
        console.error('Row not found for id:', rowId);
        return;
    }

    let dataName = '';
    const nameHeaders = ['Nama Lengkap', 'Nama', 'Name', 'NAMA LENGKAP', 'NAMA'];
    
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        const header = spreadsheetHeaders[i];
        if (nameHeaders.some(nh => header && header.toLowerCase().includes(nh.toLowerCase()))) {
            const colLetter = String.fromCharCode(65 + i);
            dataName = row[colLetter] || '';
            if (dataName) break;
        }
    }
    
    if (!dataName && row.B) {
        dataName = row.B;
    }
    
    if (!dataName && row.C) {
        dataName = row.C;
    }

    const detailTitle = document.querySelector('#detailPopup h2');
    if (detailTitle) {
        detailTitle.textContent = dataName ? `Detail Data - ${dataName}` : 'Detail Data';
    }

    const detailContent = document.getElementById('detailContent');
    const statusColIndex = getStatusColumnIndex();
    const flagColIndex = getFlagColumnIndex();
    const petugasColIndex = getPetugasColumnIndex();
    const waktuSelesaiColIndex = getWaktuSelesaiColumnIndex();
    
    const currentStatus = (row.status || '').trim();
    const currentFlag = (row.flag || '').trim();
    const currentPetugas = (row.petugas || '').trim();
    const currentWaktuSelesai = (row.waktuSelesai || '').trim();
    
    const isCompleted = (currentStatus === 'Closed' || currentStatus === 'Cancelled') && 
                        currentFlag && currentPetugas;
    
    let maxColIndex = spreadsheetHeaders.length;
    if (isCompleted && waktuSelesaiColIndex !== -1) {
        maxColIndex = waktuSelesaiColIndex + 1;
    }
    
    const columns = [];
    for (let i = 0; i < maxColIndex; i++) {
        columns.push(String.fromCharCode(65 + i));
    }
    
    detailContent.innerHTML = columns.map((col) => {
        const colIndex = col.charCodeAt(0) - 65;
        let headerName = spreadsheetHeaders[colIndex] || `Kolom ${col}`;
        if (headerName === 'Pilih Permintaan') {
            headerName = 'Jenis Permintaan';
        }
        
        if (colIndex === statusColIndex || colIndex === flagColIndex || 
            colIndex === petugasColIndex) {
            return '';
        }
        
        let value = row[col];
        
        if (!value || value === '') {
            if (colIndex === waktuSelesaiColIndex && isCompleted) {
                return '';
            }
            return '';
        }
        
        const isTimestamp = headerName && (
            headerName.toLowerCase().includes('timestamp') || 
            (headerName.toLowerCase().includes('waktu') && !headerName.toLowerCase().includes('selesai')) ||
            headerName.toLowerCase().includes('tanggal')
        );
        
        if (isTimestamp) {
            value = formatTimestamp(value);
        } else {
            value = escapeHtml(value);
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
        const petugasHeader = spreadsheetHeaders[petugasColIndex] || 'Petugas';
        
        detailContent.innerHTML += `
            <div class="detail-item">
                <label>${escapeHtml(statusHeader)}</label>
                <div class="value">${formatStatus(currentStatus)}</div>
            </div>
            <div class="detail-item">
                <label>${escapeHtml(flagHeader)}</label>
                <div class="value">${formatFlag(currentFlag)}</div>
            </div>
            <div class="detail-item">
                <label>${escapeHtml(petugasHeader)}</label>
                <div class="value">${escapeHtml(currentPetugas)}</div>
            </div>
        `;
        
        if (currentWaktuSelesai) {
            const waktuSelesaiHeader = spreadsheetHeaders[waktuSelesaiColIndex] || 'Waktu Selesai';
            let waktuSelesaiValue = formatTimestamp(currentWaktuSelesai);
            if (!waktuSelesaiValue || waktuSelesaiValue === currentWaktuSelesai || !waktuSelesaiValue.includes(':')) {
                try {
                    const date = new Date(currentWaktuSelesai);
                    if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        waktuSelesaiValue = `${day}-${month}-${year}<br>${hours}:${minutes}:${seconds}`;
                    } else {
                        waktuSelesaiValue = escapeHtml(currentWaktuSelesai);
                    }
                } catch (e) {
                    waktuSelesaiValue = escapeHtml(currentWaktuSelesai);
                }
            }
            detailContent.innerHTML += `
                <div class="detail-item">
                    <label>${escapeHtml(waktuSelesaiHeader)}</label>
                    <div class="value">${waktuSelesaiValue}</div>
                </div>
            `;
        }
    }

    const statusSelect = document.getElementById('statusSelect');
    const flagSelect = document.getElementById('flagSelect');
    const petugasSelect = document.getElementById('petugasSelect');
    const saveBtn = document.getElementById('saveBtn');
    const statusSection = document.getElementById('statusSection');
    const flagSection = document.getElementById('flagSection');
    const petugasSection = document.getElementById('petugasSection');
    
    saveBtn.textContent = 'Simpan';
    
    if (currentStatus) {
        statusSelect.value = currentStatus;
    } else {
        statusSelect.value = 'Open';
    }
    
    if (currentFlag) {
        flagSelect.value = currentFlag;
    } else {
        flagSelect.value = 'Hijau';
    }
    
    if (currentPetugas) {
        petugasSelect.value = currentPetugas;
    } else {
        petugasSelect.value = 'Jalal';
    }
    
    currentDetailRow = row;
    
    function toggleDropdowns() {
        const selectedStatus = statusSelect.value;
        const isClosedOrCancelled = selectedStatus === 'Closed' || selectedStatus === 'Cancelled';
        
        if (isCompleted) {
            statusSection.style.display = 'none';
            flagSection.style.display = 'none';
            petugasSection.style.display = 'none';
            saveBtn.style.display = 'none';
        } else if (isClosedOrCancelled) {
            statusSection.style.display = 'flex';
            flagSection.style.display = 'flex';
            petugasSection.style.display = 'flex';
            saveBtn.style.display = 'block';
        } else {
            statusSection.style.display = 'flex';
            flagSection.style.display = 'none';
            petugasSection.style.display = 'none';
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
        const selectedFlag = flagSelect.value;
        const selectedPetugas = petugasSelect.value;
        
        const statusChanged = selectedStatus !== currentStatus;
        const flagChanged = selectedFlag !== currentFlag;
        const petugasChanged = selectedPetugas !== currentPetugas;
        
        const isClosedOrCancelled = selectedStatus === 'Closed' || selectedStatus === 'Cancelled';
        
        let hasChanges = false;
        
        if (statusChanged) {
            hasChanges = true;
        }
        
        if (isClosedOrCancelled) {
            if (flagChanged || petugasChanged) {
                hasChanges = true;
            }
            if (!currentWaktuSelesai) {
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
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
    
    flagSelect.onchange = checkChanges;
    petugasSelect.onchange = checkChanges;
    
    toggleDropdowns();
    
    setTimeout(() => {
        checkChanges();
    }, 0);
    
    saveBtn.onclick = async () => {
        if (saveBtn.disabled) return;
        
        const newStatus = statusSelect.value;
        const newFlag = flagSelect.value;
        const newPetugas = petugasSelect.value;
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Menyimpan...';
            
            const rowNumberToUpdate = row.originalRowNumber || row.rowNumber;
            console.log('=== UPDATE INFO ===');
            console.log('Row data:', {
                id: row.id,
                rowNumber: row.rowNumber,
                originalRowNumber: row.originalRowNumber,
                NPK: row.B,
                currentStatus: currentStatus,
                newStatus: newStatus
            });
            console.log('Using rowNumber for update:', rowNumberToUpdate);
            console.log('===================');
            
            const promises = [];
            
            if (newStatus !== currentStatus) {
                console.log('Updating status from', currentStatus, 'to', newStatus, 'on row', rowNumberToUpdate);
                promises.push(updateStatus(rowNumberToUpdate, newStatus));
            } else {
                console.log('Status unchanged, skipping update');
            }
            
            const isClosedOrCancelled = newStatus === 'Closed' || newStatus === 'Cancelled';
            
            if (isClosedOrCancelled) {
                if (newFlag !== currentFlag) {
                    console.log('Updating flag from', currentFlag, 'to', newFlag, 'on row', rowNumberToUpdate);
                    promises.push(updateFlag(rowNumberToUpdate, newFlag));
                }
                
                if (newPetugas !== currentPetugas) {
                    console.log('Updating petugas from', currentPetugas, 'to', newPetugas, 'on row', rowNumberToUpdate);
                    promises.push(updatePetugas(rowNumberToUpdate, newPetugas));
                }
                
                if (isClosedOrCancelled && !currentWaktuSelesai) {
                    const now = new Date();
                    const waktuSelesai = now.toISOString();
                    console.log('Updating waktu selesai on row', rowNumberToUpdate);
                    promises.push(updateWaktuSelesai(rowNumberToUpdate, waktuSelesai));
                }
            }
            
            await Promise.all(promises);
            
            console.log('All updates completed, waiting before reload...');
            
            saveBtn.textContent = 'Memuat ulang...';
            saveBtn.disabled = true;
            saveBtn.classList.add('disabled');
            
            showNotification('Data berhasil diupdate! Memuat ulang data...', 'success');
            
            setTimeout(async () => {
                console.log('Clearing all local data...');
                allData = [];
                filteredData = [];
                currentDetailRow = null;
                
                console.log('Force reloading data from server (no cache)...');
                try {
                    await loadData();
                    console.log('Data reloaded successfully from server');
                    
                    showNotification('Data berhasil diupdate!', 'success');
                    
                    setTimeout(() => {
                        closePopup();
                    }, 1000);
                } catch (error) {
                    console.error('Error reloading data:', error);
                    showNotification('Data diupdate tapi gagal reload. Silakan refresh halaman.', 'error');
                    saveBtn.textContent = 'Simpan';
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('disabled');
                    setTimeout(() => {
                        closePopup();
                    }, 2000);
                }
            }, 2000);
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

async function updateStatus(rowNumber, status) {
    console.log('Updating status:', { rowNumber, status, currentDetailRow: currentDetailRow });
    
    if (!rowNumber || isNaN(rowNumber)) {
        throw new Error('RowNumber tidak valid: ' + rowNumber);
    }
    
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', 'updateStatus');
    url.searchParams.append('rowNumber', rowNumber);
    url.searchParams.append('status', status);
    url.searchParams.append('_t', Date.now());
    
    let result;
    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            throw new Error('HTTP Error: ' + response.status);
        }

        const text = await response.text();
        console.log('Response text:', text);
        result = JSON.parse(text);
        console.log('Parsed result:', result);
    } catch (e) {
        console.error('Fetch error:', e);
        throw new Error('Gagal mengupdate status: ' + e.message);
    }

    if (!result.success) {
        throw new Error(result.error || 'Gagal mengupdate status');
    }

    console.log('Status berhasil diupdate di spreadsheet, rowNumber:', rowNumber, 'status:', status);
    
    return result;
}

async function updateFlag(rowNumber, flag) {
    console.log('Updating flag:', { rowNumber, flag });
    
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', 'updateFlag');
    url.searchParams.append('rowNumber', rowNumber);
    url.searchParams.append('flag', flag);
    
    let result;
    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            throw new Error('HTTP Error: ' + response.status);
        }

        const text = await response.text();
        console.log('Response text:', text);
        result = JSON.parse(text);
        console.log('Parsed result:', result);
    } catch (e) {
        console.error('Fetch error:', e);
        throw new Error('Gagal mengupdate flag: ' + e.message);
    }

    if (!result.success) {
        throw new Error(result.error || 'Gagal mengupdate flag');
    }

    return result;
}

async function updatePetugas(rowNumber, petugas) {
    console.log('Updating petugas:', { rowNumber, petugas });
    
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', 'updatePetugas');
    url.searchParams.append('rowNumber', rowNumber);
    url.searchParams.append('petugas', petugas);
    
    let result;
    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            throw new Error('HTTP Error: ' + response.status);
        }

        const text = await response.text();
        console.log('Response text:', text);
        result = JSON.parse(text);
        console.log('Parsed result:', result);
    } catch (e) {
        console.error('Fetch error:', e);
        throw new Error('Gagal mengupdate petugas: ' + e.message);
    }

    if (!result.success) {
        throw new Error(result.error || 'Gagal mengupdate petugas');
    }

    return result;
}

async function updateWaktuSelesai(rowNumber, waktuSelesai) {
    console.log('Updating waktu selesai:', { rowNumber, waktuSelesai });
    
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', 'updateWaktuSelesai');
    url.searchParams.append('rowNumber', rowNumber);
    url.searchParams.append('waktuSelesai', waktuSelesai);
    
    let result;
    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            throw new Error('HTTP Error: ' + response.status);
        }

        const text = await response.text();
        console.log('Response text:', text);
        result = JSON.parse(text);
        console.log('Parsed result:', result);
    } catch (e) {
        console.error('Fetch error:', e);
        throw new Error('Gagal mengupdate waktu selesai: ' + e.message);
    }

    if (!result.success) {
        throw new Error(result.error || 'Gagal mengupdate waktu selesai');
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
