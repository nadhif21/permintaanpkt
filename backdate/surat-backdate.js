const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTkazPligfvCUdrT1DsFECQc71sVfbAcYtInUHnnTiyBtU3AJDyjjRI9VeIeAmABNe/exec';
const PERJANJIAN_SHEET_NAME = 'LIST NO PERJANJIAN BACKDATE';

let allData = [];
let filteredData = [];
let searchTerm = '';

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
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = (e.target.value || '').trim();
            filterAndDisplayData();
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadData();
        });
    }
}

async function loadData() {
    try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL') {
            throw new Error('URL Apps Script belum dikonfigurasi');
        }

        allData = [];
        filteredData = [];
        
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('action', 'getAllPerjanjian');
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
            throw new Error('Tidak dapat terhubung ke Apps Script: ' + fetchError.message);
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Error dari Apps Script');
        }

        allData = (result.data || []).map((item, index) => ({
            id: index,
            no: item['No'] || item.no || (index + 1),
            unitKerja: String(item['UNIT KERJA'] || item.unitKerja || '').trim(),
            noSP: String(item['NO SP'] || item.noSP || '').trim(),
            perihal: String(item['PERIHAL'] || item.perihal || '').trim(),
            key: String(item['Key'] || item.key || '').trim()
        }));

        filterAndDisplayData();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="5" class="loading">' +
            '<strong style="color: #dc3545;">Error: ' + escapeHtml(error.message) + '</strong>' +
            '</td></tr>';
        document.getElementById('cardsContainer').innerHTML = 
            '<div class="loading"><strong style="color: #dc3545;">Error: ' + escapeHtml(error.message) + '</strong></div>';
    }
}

function filterAndDisplayData() {
    filteredData = allData.filter(row => {
        if (searchTerm && searchTerm.trim() !== '') {
            const searchable = [
                String(row.unitKerja || ''),
                String(row.noSP || ''),
                String(row.perihal || ''),
                String(row.key || '')
            ].join(' ').toLowerCase();
            
            if (!searchable.includes(searchTerm.toLowerCase())) {
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
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Tidak ada data yang ditemukan</td></tr>';
        cardsContainer.innerHTML = '<div class="loading">Tidak ada data yang ditemukan</div>';
        return;
    }

    if (isMobile) {
        displayCards();
    } else {
        displayTable();
    }
}

function displayTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = filteredData.map((row) => {
        return `
            <tr>
                <td>${escapeHtml(row.no)}</td>
                <td>${highlightText(row.unitKerja)}</td>
                <td>${highlightText(row.noSP)}</td>
                <td>${highlightText(row.perihal)}</td>
                <td>${highlightText(row.key)}</td>
            </tr>
        `;
    }).join('');
}

function displayCards() {
    const cardsContainer = document.getElementById('cardsContainer');
    
    cardsContainer.innerHTML = filteredData.map(row => {
        return `
            <div class="card">
                <div class="card-row">
                    <div class="card-label">UNIT KERJA</div>
                    <div class="card-value">${highlightText(row.unitKerja)}</div>
                </div>
                <div class="card-row">
                    <div class="card-label">NOMOR SURAT BACKDATE</div>
                    <div class="card-value">${highlightText(row.noSP)}</div>
                </div>
                <div class="card-row">
                    <div class="card-label">PERIHAL</div>
                    <div class="card-value">${highlightText(row.perihal)}</div>
                </div>
                <div class="card-row">
                    <div class="card-label">Key</div>
                    <div class="card-value">${highlightText(row.key)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateResultCount() {
    document.getElementById('resultCount').textContent = filteredData.length;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text) {
    if (!text) return '';
    
    if (typeof text !== 'string') {
        text = String(text);
    }
    
    if (!searchTerm || searchTerm.trim() === '') {
        return escapeHtml(text);
    }

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

window.addEventListener('resize', () => {
    if (filteredData.length > 0) {
        displayData();
    }
});
