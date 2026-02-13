const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTkazPligfvCUdrT1DsFECQc71sVfbAcYtInUHnnTiyBtU3AJDyjjRI9VeIeAmABNe/exec';

let allData = [];
let filteredData = [];
let searchTerm = '';
let spreadsheetHeaders = [];
let currentFilters = {
    bulan: '',
    tahun: ''
};

const UNIT_KERJA_LIST = [
    'Dep Keamanan',
    'Dep Manajemen Aset',
    'Dep Pelayanan Umum',
    'Dep. Administrasi Korporat',
    'Dep. Administrasi Pemasaran & Penjualan',
    'Dep. Akuntansi',
    'Dep. Anggaran',
    'Dep. Audit Bisnis & Keuangan',
    'Dep. Bengkel',
    'Dep. Bisnis dan Administrasi',
    'Dep. Hubungan Investor',
    'Dep. Hukum',
    'Dep. Inspeksi Teknik 1',
    'Dep. Inspeksi Teknik 2',
    'Dep. IT Service Business Partner',
    'Dep. Keandalan Pabrik',
    'Dep. Keselamatan & Kesehatan Kerja',
    'Dep. Keuangan',
    'Dep. Komunikasi Korporat',
    'Dep. Konsultasi & Jaminan Kualitas',
    'Dep. Laboratorium',
    'Dep. Lingkungan Hidup',
    'Dep. Manajemen & Pengembangan SDM',
    'Dep. Manajemen Risiko Korporasi',
    'Dep. Manufacturing',
    'Dep. Operasi Pabrik 1A',
    'Dep. Operasi Pabrik 2',
    'Dep. Operasi Pabrik 3',
    'Dep. Operasi Pabrik 4',
    'Dep. Operasi Pabrik 5',
    'Dep. Operasi Pabrik 6 / EX P1',
    'Dep. Operasi Pabrik 7',
    'Dep. Operasional SDM',
    'Dep. Pelabuhan dan Pengapalan',
    'Dep. Pelaporan Manajemen',
    'Dep. Pemeliharaan Instrumen',
    'Dep. Pemeliharaan Listrik',
    'Dep. Pemeliharaan Mekanik',
    'Dep. Pengadaan Barang',
    'Dep. Pengadaan Jasa',
    'Dep. Pengelolaan Pelanggan',
    'Dep. Pengembangan Korporat',
    'Dep. Perencanaan & Monitoring',
    'Dep. Perencanaan & Pengendalian Har.',
    'Dep. Perencanaan & Pengendalian TA',
    'Dep. Perencanaan Penerimaan& Pergudangan',
    'Dep. Portofolio Bisnis',
    'Dep. Proses & Pengelolaan Energi',
    'Dep. Rekayasa & Konstruksi',
    'Dep. Riset',
    'Dep. Sistem Manajemen Terpadu & Inovasi',
    'Dep. Strategic Delivery Unit',
    'Dep. Teknik dan Kontrol Kualitas',
    'Departemen TJSL',
    'Direktur Keuangan dan Umum',
    'Direktur Manajemen Risiko',
    'Direktur Operasi',
    'Direktur Pengembangan',
    'Direktur Utama',
    'Komp. Administrasi Keuangan',
    'Komp. HSE & Teknologi',
    'Komp. Operasi 1',
    'Komp. Operasi 2',
    'Komp. Pemeliharaan Pabrik',
    'Komp. Pengembangan & Portofolio Bisnis',
    'Komp. Rantai Pasok',
    'Komp. Satuan Pengawasan Intern',
    'Komp. SBU Jasa Pelayanan Pabrik',
    'Komp. SDM',
    'Komp. Sekretaris Perusahaan',
    'Komp. Tata Kelola & Manajemen Risiko',
    'Komp. Transformasi Bisnis',
    'Kompartemen Umum',
    'Proyek Soda Ash',
    'PT Katts',
    'PT KIE',
    'Sekretaris Dewan Komisaris',
    'VP Operasi Shift',
    'YKHT'
];

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        return;
    }
    loadData();
    setupEventListeners();
    setupLogout();
    loadUnitKerjaOptions();
});

function loadUnitKerjaOptions() {
    const unitKerjaDatalist = document.getElementById('unitKerjaList');
    if (!unitKerjaDatalist) return;
    
    UNIT_KERJA_LIST.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        unitKerjaDatalist.appendChild(option);
    });
}

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

    const addPerjanjianModal = document.getElementById('addPerjanjianModal');
    if (addPerjanjianModal) {
        addPerjanjianModal.addEventListener('click', (e) => {
            if (e.target.id === 'addPerjanjianModal') {
                closeAddPerjanjianModal();
            }
        });
    }

    const detailPerjanjianModal = document.getElementById('detailPerjanjianModal');
    if (detailPerjanjianModal) {
        detailPerjanjianModal.addEventListener('click', (e) => {
            if (e.target.id === 'detailPerjanjianModal') {
                closeDetailPerjanjianModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (addPerjanjianModal && addPerjanjianModal.classList.contains('show')) {
                closeAddPerjanjianModal();
            } else if (detailPerjanjianModal && detailPerjanjianModal.classList.contains('show')) {
                closeDetailPerjanjianModal();
            } else {
                closePopup();
            }
        }
    });

    const unitKerjaInput = document.getElementById('unitKerjaInput');
    const noSPInput = document.getElementById('noSPInput');
    const perihalInput = document.getElementById('perihalInput');
    
    if (unitKerjaInput) {
        unitKerjaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                noSPInput?.focus();
            }
        });
        
        unitKerjaInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            if (value.length > 0) {
                const matches = UNIT_KERJA_LIST.filter(unit => 
                    unit.toLowerCase().includes(value)
                );
                if (matches.length > 0) {
                    e.target.setCustomValidity('');
                }
            }
        });
    }
    
    if (noSPInput) {
        noSPInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                perihalInput?.focus();
            }
        });
    }
    
    if (perihalInput) {
        perihalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                savePerjanjian();
            }
        });
    }
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
            
            const nomorSuratKey = findColumnValue(row, 'Nomor Surat Backdate DOF') || 
                                  findColumnValue(row, 'Nomor Surat Permintaan Backdate') ||
                                  findColumnValue(row, 'NOMOR SURAT BACKDATE DOF') ||
                                  '';
            
            return {
                id: index,
                rowNumber: originalRowNumber,
                originalRowNumber: originalRowNumber,
                A: getColumnValue(0),
                B: getColumnValue(1),
                C: getColumnValue(2),
                D: getColumnValue(3),
                E: getColumnValue(4),
                G: getColumnValue(6),
                H: getColumnValue(7),
                I: getColumnValue(8),
                nomorSuratKey: nomorSuratKey,
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
            '<tr><td colspan="9" class="loading">' +
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
                row.A, row.B, row.E, row.G, row.H, row.I, row.nomorSuratKey
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
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Tidak ada data yang ditemukan</td></tr>';
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
    
    const displayColumns = [0, 6, 7, 4, 1];
    
    tbody.innerHTML = filteredData.map((row) => {
        const cells = displayColumns.map(index => {
            let headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
            const colLetter = index === 0 ? 'A' : index === 1 ? 'B' : index === 4 ? 'E' : index === 6 ? 'G' : index === 7 ? 'H' : 'I';
            
            if (index === 0) {
                headerName = 'Tanggal Input';
            } else if (index === 6) {
                headerName = 'Nama yang Dibuka Backdate';
            } else if (index === 7) {
                headerName = 'Unit kerja';
            } else if (index === 4) {
                headerName = 'Tanggal Backdate';
            } else if (index === 1) {
                headerName = 'Admin';
            }
            
            let value = row[colLetter] || '';
            value = formatValueForDisplay(value, headerName);
            return highlightText(value);
        });
        
        const nomorSuratCell = highlightText(row.nomorSuratKey || '');

        const statusCell = formatStatus(row.status);
        const flagCell = formatFlag(row.flag);

        return `
            <tr data-row-id="${row.id}" class="data-row">
                <td>${cells[0]}</td>
                <td>${nomorSuratCell}</td>
                ${cells.slice(1).map(cell => `<td>${cell}</td>`).join('')}
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
    const displayColumns = [0, 6, 7, 4, 1];
    
    cardsContainer.innerHTML = filteredData.map(row => {
        const headers = spreadsheetHeaders;
        const cardRowsArray = displayColumns.map(index => {
            let headerName = headers[index] || `Kolom ${String.fromCharCode(65 + index)}`;
            const colLetter = index === 0 ? 'A' : index === 1 ? 'B' : index === 4 ? 'E' : index === 6 ? 'G' : index === 7 ? 'H' : 'I';
            
            if (index === 0) {
                headerName = 'Tanggal Input';
            } else if (index === 6) {
                headerName = 'Nama yang Dibuka Backdate';
            } else if (index === 7) {
                headerName = 'Unit kerja';
            } else if (index === 4) {
                headerName = 'Tanggal Backdate';
            } else if (index === 1) {
                headerName = 'Admin';
            }
            
            let value = row[colLetter] || '';
            value = formatValueForDisplay(value, headerName);
            return `
                <div class="card-row">
                    <div class="card-label">${escapeHtml(headerName)}</div>
                    <div class="card-value">${highlightText(value)}</div>
                </div>
            `;
        });
        
        const nomorSuratRow = row.nomorSuratKey ? `
            <div class="card-row">
                <div class="card-label">Nomor Surat Permintaan</div>
                <div class="card-value">${highlightText(row.nomorSuratKey)}</div>
            </div>
        ` : '';
        
        const allCardRows = cardRowsArray[0] + nomorSuratRow + cardRowsArray.slice(1).join('');

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
                ${allCardRows}
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
    
    if (headerLower.includes('tanggal backdate') || headerLower.includes('tanggal pembukaan backdate')) {
        return formatDateOnly(value);
    }
    
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
    
    const displayColumns = [0, 6, 7, 4, 1];
    
    const headers = displayColumns.map(index => {
        let headerName = spreadsheetHeaders[index] || `Kolom ${String.fromCharCode(65 + index)}`;
        
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
    });
    
    headers.splice(1, 0, '<th>Nomor Surat Permintaan</th>');
    
    thead.innerHTML = headers.join('') + '<th>Status</th><th>Flag</th>';
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
    
    const columns = [];
    for (let i = 0; i < spreadsheetHeaders.length; i++) {
        columns.push(String.fromCharCode(65 + i));
    }
    
    detailContent.innerHTML = columns.map((col) => {
        const colIndex = col.charCodeAt(0) - 65;
        let headerName = spreadsheetHeaders[colIndex] || `Kolom ${col}`;
        
        if (colIndex === 0 && headerName.toLowerCase().includes('timestamp')) {
            headerName = 'Tanggal Input';
        } else if (colIndex === 1 && headerName.toLowerCase().includes('nama admin')) {
            headerName = 'Admin';
        } else if (colIndex === 2 && headerName.toLowerCase().includes('npk')) {
            headerName = 'NPK';
        } else if (colIndex === 3 && headerName.toLowerCase().includes('jabatan')) {
            headerName = 'Jabatan';
        } else if (colIndex === 4 && headerName.toLowerCase().includes('tanggal pembukaan')) {
            headerName = 'Tanggal Backdate';
        } else if (colIndex === 6 && headerName.toLowerCase().includes('nama yang dibuka')) {
            headerName = 'Nama yang Dibuka Backdate';
        } else if (colIndex === 7 && headerName.toLowerCase().includes('departemen')) {
            headerName = 'Unit kerja';
        } else if (colIndex !== 0 && headerName.toLowerCase().includes('timestamp') && !headerName.toLowerCase().includes('tanggal input')) {
            headerName = 'Tanggal Status';
        }
        
        if (colIndex === statusColIndex || colIndex === flagColIndex) {
            return '';
        }
        
        let value = row[col] || '';
        
        if (!value || value === '') {
            return '';
        }
        
        const headerLower = headerName.toLowerCase();
        
        if (headerLower.includes('tanggal backdate') || headerLower.includes('tanggal pembukaan backdate')) {
            value = formatDateOnly(value);
        } else {
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
        
        const isNomorSuratBackdateDOF = headerLower.includes('nomor surat backdate dof') || 
                                        headerLower.includes('nomor surat backdate') ||
                                        headerLower.includes('no surat backdate dof');
        
        if (isNomorSuratBackdateDOF && value) {
            return `
                <div class="detail-item">
                    <label>${escapeHtml(headerName)}</label>
                    <div class="value" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span style="flex: 1; min-width: 200px;">${value}</span>
                        <button class="btn-add-perjanjian" onclick="openAddPerjanjianForm('${escapeHtml(value)}')" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Add</button>
                        <button class="btn-detail-perjanjian" onclick="openDetailPerjanjian('${escapeHtml(value)}')" style="padding: 6px 12px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Detail</button>
                    </div>
                </div>
            `;
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
            const timestampHeader = 'Tanggal Status';
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

async function savePerjanjianData(nomorSurat, data) {
    try {
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('action', 'savePerjanjian');
        url.searchParams.append('unitKerja', data.unitKerja);
        url.searchParams.append('noSP', data.noSP);
        url.searchParams.append('perihal', data.perihal);
        url.searchParams.append('key', nomorSurat);
        
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
            throw new Error(result.error || 'Gagal menyimpan data perjanjian');
        }
        
        return result;
    } catch (error) {
        console.error('Error saving perjanjian data:', error);
        throw error;
    }
}

async function getPerjanjianData(nomorSurat) {
    try {
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('action', 'getPerjanjian');
        url.searchParams.append('key', nomorSurat);
        url.searchParams.append('_t', Date.now());
        
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
            throw new Error(result.error || 'Gagal mengambil data perjanjian');
        }
        
        return (result.data || []).map((item, index) => ({
            id: item.rowNumber || index,
            unitKerja: item['UNIT KERJA'] || item.unitKerja || '',
            noSP: item['NO SP'] || item.noSP || '',
            perihal: item['PERIHAL'] || item.perihal || '',
            createdAt: item.createdAt || new Date().toISOString(),
            rowNumber: item.rowNumber
        }));
    } catch (error) {
        console.error('Error getting perjanjian data:', error);
        return [];
    }
}

async function deletePerjanjianData(nomorSurat, rowNumber) {
    try {
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('action', 'deletePerjanjian');
        url.searchParams.append('rowNumber', rowNumber);
        url.searchParams.append('key', nomorSurat);
        
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
            throw new Error(result.error || 'Gagal menghapus data perjanjian');
        }
        
        return result;
    } catch (error) {
        console.error('Error deleting perjanjian data:', error);
        throw error;
    }
}

window.openAddPerjanjianForm = function(nomorSurat) {
    const modal = document.getElementById('addPerjanjianModal');
    if (!modal) {
        console.error('Modal addPerjanjianModal tidak ditemukan');
        return;
    }
    
    const saveBtn = document.querySelector('#addPerjanjianModal button[onclick="savePerjanjian()"]');
    const unitKerjaInput = document.getElementById('unitKerjaInput');
    const noSPInput = document.getElementById('noSPInput');
    const perihalInput = document.getElementById('perihalInput');
    
    document.getElementById('nomorSuratHidden').value = nomorSurat;
    document.getElementById('nomorSuratDisplay').textContent = nomorSurat;
    
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
    }
    if (unitKerjaInput) {
        unitKerjaInput.disabled = false;
        unitKerjaInput.value = '';
    }
    if (noSPInput) {
        noSPInput.disabled = false;
        noSPInput.value = '';
    }
    if (perihalInput) {
        perihalInput.disabled = false;
        perihalInput.value = '';
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

window.closeAddPerjanjianModal = function() {
    const modal = document.getElementById('addPerjanjianModal');
    const saveBtn = document.querySelector('#addPerjanjianModal button[onclick="savePerjanjian()"]');
    const unitKerjaInput = document.getElementById('unitKerjaInput');
    const noSPInput = document.getElementById('noSPInput');
    const perihalInput = document.getElementById('perihalInput');
    
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
    }
    if (unitKerjaInput) {
        unitKerjaInput.disabled = false;
        unitKerjaInput.value = '';
    }
    if (noSPInput) {
        noSPInput.disabled = false;
        noSPInput.value = '';
    }
    if (perihalInput) {
        perihalInput.disabled = false;
        perihalInput.value = '';
    }
    
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

window.savePerjanjian = async function() {
    const nomorSurat = document.getElementById('nomorSuratHidden').value;
    const unitKerjaInput = document.getElementById('unitKerjaInput');
    const unitKerja = unitKerjaInput ? unitKerjaInput.value.trim() : '';
    const noSP = document.getElementById('noSPInput').value.trim();
    const perihal = document.getElementById('perihalInput').value.trim();
    
    if (!unitKerja || !noSP || !perihal) {
        alert('Mohon lengkapi semua field!');
        return;
    }
    
    const isValidUnit = UNIT_KERJA_LIST.some(unit => unit.toLowerCase() === unitKerja.toLowerCase());
    if (!isValidUnit) {
        const confirmUse = confirm('Unit Kerja yang Anda masukkan tidak ada dalam daftar. Apakah Anda ingin tetap menggunakan "' + unitKerja + '"?');
        if (!confirmUse) {
            if (unitKerjaInput) unitKerjaInput.focus();
            return;
        }
    }
    
    const data = {
        unitKerja: unitKerja,
        noSP: noSP,
        perihal: perihal
    };
    
    const saveBtn = document.querySelector('#addPerjanjianModal button[onclick="savePerjanjian()"]');
    const noSPInput = document.getElementById('noSPInput');
    const perihalInput = document.getElementById('perihalInput');
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan...';
    }
    
    if (unitKerjaInput) unitKerjaInput.disabled = true;
    if (noSPInput) noSPInput.disabled = true;
    if (perihalInput) perihalInput.disabled = true;
    
    try {
        await savePerjanjianData(nomorSurat, data);
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
        }
        if (unitKerjaInput) unitKerjaInput.disabled = false;
        if (noSPInput) noSPInput.disabled = false;
        if (perihalInput) perihalInput.disabled = false;
        
        showNotification('Data berhasil disimpan!', 'success');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        closeAddPerjanjianModal();
    } catch (error) {
        console.error('Error saving perjanjian:', error);
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
        }
        if (unitKerjaInput) unitKerjaInput.disabled = false;
        if (noSPInput) noSPInput.disabled = false;
        if (perihalInput) perihalInput.disabled = false;
        
        showNotification('Error: ' + error.message, 'error');
    }
}

window.openDetailPerjanjian = async function(nomorSurat) {
    const modal = document.getElementById('detailPerjanjianModal');
    if (!modal) {
        console.error('Modal detailPerjanjianModal tidak ditemukan');
        return;
    }
    
    const content = document.getElementById('detailPerjanjianContent');
    const title = document.getElementById('detailPerjanjianTitle');
    const closeBtn = document.querySelector('#detailPerjanjianModal .close-btn');
    
    title.textContent = `DAFTAR SURAT BACKDATE - ${nomorSurat}`;
    content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;"><div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #1976d2; border-radius: 50%; animation: spin 1s linear infinite;"></div><div style="margin-top: 10px;">Memuat data...</div></div>';
    
    if (closeBtn) closeBtn.style.pointerEvents = 'none';
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    try {
        const data = await getPerjanjianData(nomorSurat);
        
        if (data.length === 0) {
            content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Belum ada data perjanjian untuk nomor surat ini.</div>';
        } else {
            content.innerHTML = `
                <div class="perjanjian-list">
                    ${data.map((item, index) => `
                        <div class="perjanjian-item" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0;">
                                <strong style="color: #1976d2; font-size: 0.95rem; font-weight: 600;">${index + 1}</strong>
                                <button onclick="deletePerjanjianItem('${escapeHtml(nomorSurat)}', ${item.rowNumber || item.id})" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.3s;" onmouseover="this.style.background='#d32f2f'" onmouseout="this.style.background='#f44336'">Hapus</button>
                            </div>
                            <div style="margin-bottom: 10px; padding: 8px 0;">
                                <div style="font-weight: 600; color: #666; font-size: 0.8rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">UNIT KERJA</div>
                                <div style="color: #333; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(item.unitKerja)}</div>
                            </div>
                            <div style="margin-bottom: 10px; padding: 8px 0;">
                                <div style="font-weight: 600; color: #666; font-size: 0.8rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">NOMOR SURAT BACKDATE</div>
                                <div style="color: #333; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(item.noSP)}</div>
                            </div>
                            <div style="margin-bottom: 10px; padding: 8px 0;">
                                <div style="font-weight: 600; color: #666; font-size: 0.8rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">PERIHAL</div>
                                <div style="color: #333; font-size: 0.95rem; line-height: 1.5; word-break: break-word;">${escapeHtml(item.perihal)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (closeBtn) closeBtn.style.pointerEvents = 'auto';
    } catch (error) {
        console.error('Error loading perjanjian data:', error);
        content.innerHTML = `<div style="text-align: center; padding: 40px; color: #f44336;"><strong>Error:</strong><br>${escapeHtml(error.message)}</div>`;
        if (closeBtn) closeBtn.style.pointerEvents = 'auto';
    }
}

window.deletePerjanjianItem = async function(nomorSurat, rowNumber) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        return;
    }
    
    const content = document.getElementById('detailPerjanjianContent');
    const originalContent = content ? content.innerHTML : '';
    
    if (content) {
        content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;"><div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #1976d2; border-radius: 50%; animation: spin 1s linear infinite;"></div><div style="margin-top: 10px;">Menghapus data...</div></div>';
    }
    
    try {
        await deletePerjanjianData(nomorSurat, rowNumber);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        await openDetailPerjanjian(nomorSurat);
        
        showNotification('Data berhasil dihapus!', 'success');
    } catch (error) {
        console.error('Error deleting perjanjian item:', error);
        
        if (content) {
            content.innerHTML = originalContent;
        }
        
        showNotification('Error: ' + error.message, 'error');
    }
}

window.closeDetailPerjanjianModal = function() {
    const modal = document.getElementById('detailPerjanjianModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}
