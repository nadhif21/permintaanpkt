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

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });

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
        
        allData = result.data.map((row, index) => {
            const getColumnValue = (position) => {
                if (position < headers.length) {
                    const headerName = headers[position];
                    return row[headerName] || '';
                }
                return '';
            };

            return {
                id: index,
                rowNumber: index + 2,
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
                status: findColumnValue(row, 'Status') || '',
                flag: findColumnValue(row, 'Flag') || ''
            };
        });

        allData = sortDataByTimestamp(allData);

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
    
    let key = keys.find(k => k.toLowerCase().trim() === searchName);
    if (key) return row[key];
    
    key = keys.find(k => k.toLowerCase().includes(searchName) || searchName.includes(k.toLowerCase()));
    if (key) return row[key];
    
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

function formatStatus(status) {
    if (!status) return '<span class="status-badge status-empty">-</span>';
    const statusLower = status.toLowerCase();
    if (statusLower === 'open') {
        return '<span class="status-badge status-open">Open</span>';
    } else if (statusLower === 'closed') {
        return '<span class="status-badge status-closed">Closed</span>';
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
    
    const displayColumns = [0, 1, 2, 3, 5, 6];
    const statusColIndex = getStatusColumnIndex();
    
    tbody.innerHTML = filteredData.map((row) => {
        const cells = displayColumns.map(index => {
            const headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
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
    const displayColumns = [0, 1, 2, 3, 5, 6];
    
    cardsContainer.innerHTML = filteredData.map(row => {
        const headers = spreadsheetHeaders;
        const cardRows = displayColumns.map(index => {
            const headerName = headers[index] || `Kolom ${String.fromCharCode(65 + index)}`;
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
    
    const isTimestamp = headerName && (
        headerName.toLowerCase().includes('timestamp') || 
        headerName.toLowerCase().includes('waktu') ||
        headerName.toLowerCase().includes('tanggal')
    );
    
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
    
    const displayColumns = [0, 1, 2, 3, 5, 6];
    
    thead.innerHTML = displayColumns.map(index => {
        const headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
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
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const statusColIndex = getStatusColumnIndex();
    
    detailContent.innerHTML = columns.map((col) => {
        const colIndex = col.charCodeAt(0) - 65;
        const headerName = spreadsheetHeaders[colIndex] || `Kolom ${col}`;
        
        if (colIndex === statusColIndex) {
            return '';
        }
        
        let value = row[col];
        
        if (!value || value === '') return '';
        
        const isTimestamp = headerName && (
            headerName.toLowerCase().includes('timestamp') || 
            headerName.toLowerCase().includes('waktu') ||
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

    const statusSelect = document.getElementById('statusSelect');
    const flagSelect = document.getElementById('flagSelect');
    const saveBtn = document.getElementById('saveBtn');
    
    saveBtn.textContent = 'Simpan';
    saveBtn.disabled = false;
    saveBtn.classList.remove('disabled');
    
    const currentStatus = (row.status || '').trim();
    if (currentStatus) {
        statusSelect.value = currentStatus;
    } else {
        statusSelect.value = 'Open';
    }
    
    const currentFlag = (row.flag || '').trim();
    if (currentFlag) {
        flagSelect.value = currentFlag;
    } else {
        flagSelect.value = 'Hijau';
    }
    
    currentDetailRow = row;
    
    function checkChanges() {
        const selectedStatus = statusSelect.value;
        const selectedFlag = flagSelect.value;
        const originalStatus = (currentStatus || '').trim();
        const originalFlag = (currentFlag || '').trim();
        
        const statusChanged = selectedStatus !== originalStatus;
        const flagChanged = selectedFlag !== originalFlag;
        
        if (statusChanged || flagChanged) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('disabled');
        } else {
            saveBtn.disabled = true;
            saveBtn.classList.add('disabled');
        }
    }
    
    statusSelect.onchange = checkChanges;
    flagSelect.onchange = checkChanges;
    checkChanges();
    
    saveBtn.onclick = async () => {
        if (saveBtn.disabled) return;
        
        const newStatus = statusSelect.value;
        const newFlag = flagSelect.value;
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Menyimpan...';
            
            const promises = [];
            
            if (newStatus !== currentStatus) {
                promises.push(updateStatus(row.rowNumber, newStatus));
            }
            
            if (newFlag !== currentFlag) {
                promises.push(updateFlag(row.rowNumber, newFlag));
            }
            
            await Promise.all(promises);
            
            showNotification('Data berhasil diupdate!', 'success');
            
            setTimeout(() => {
                loadData();
                setTimeout(() => {
                    closePopup();
                }, 500);
            }, 1500);
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
    console.log('Updating status:', { rowNumber, status });
    
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append('action', 'updateStatus');
    url.searchParams.append('rowNumber', rowNumber);
    url.searchParams.append('status', status);
    
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

    if (currentDetailRow) {
        currentDetailRow.status = status;
        const rowIndex = allData.findIndex(r => r.id === currentDetailRow.id);
        if (rowIndex !== -1) {
            allData[rowIndex].status = status;
        }
    }

    filterAndDisplayData();
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

    if (currentDetailRow) {
        currentDetailRow.flag = flag;
        const rowIndex = allData.findIndex(r => r.id === currentDetailRow.id);
        if (rowIndex !== -1) {
            allData[rowIndex].flag = flag;
        }
    }

    filterAndDisplayData();
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
