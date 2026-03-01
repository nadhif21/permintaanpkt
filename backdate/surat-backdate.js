const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTkazPligfvCUdrT1DsFECQc71sVfbAcYtInUHnnTiyBtU3AJDyjjRI9VeIeAmABNe/exec';
const PERJANJIAN_SHEET_NAME = 'LIST NO PERJANJIAN BACKDATE';

let allData = [];
let filteredData = [];
let searchTerm = '';

// Pagination state
let currentPage = 1;
let itemsPerPage = 25;
let paginatedData = [];

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

    // Pagination event listeners
    document.getElementById('paginationFirst').addEventListener('click', () => goToPage(1));
    document.getElementById('paginationPrev').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('paginationNext').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('paginationLast').addEventListener('click', () => goToPage(getTotalPages()));
    document.getElementById('paginationSizeSelect').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        applyPagination();
        displayData();
    });
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

    currentPage = 1;
    applyPagination();
    displayData();
    updateResultCount();
    updatePagination();
}

function displayData() {
    const tbody = document.getElementById('tableBody');
    const cardsContainer = document.getElementById('cardsContainer');
    const paginationContainer = document.getElementById('paginationContainer');
    const isMobile = window.innerWidth <= 768;
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Tidak ada data yang ditemukan</td></tr>';
        cardsContainer.innerHTML = '<div class="loading">Tidak ada data yang ditemukan</div>';
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    
    if (isMobile) {
        displayCards();
    } else {
        displayTable();
    }
}

function displayTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = paginatedData.map((row) => {
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
    
    cardsContainer.innerHTML = paginatedData.map(row => {
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

// Pagination functions
function applyPagination() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    paginatedData = filteredData.slice(startIndex, endIndex);
}

function getTotalPages() {
    return Math.ceil(filteredData.length / itemsPerPage) || 1;
}

function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    currentPage = page;
    applyPagination();
    displayData();
    updatePagination();
    
    // Scroll to top of table
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updatePagination() {
    const totalPages = getTotalPages();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    
    document.getElementById('paginationStart').textContent = filteredData.length > 0 ? startIndex + 1 : 0;
    document.getElementById('paginationEnd').textContent = endIndex;
    document.getElementById('paginationTotal').textContent = filteredData.length;
    document.getElementById('paginationPageInfo').textContent = `Halaman ${currentPage} dari ${totalPages}`;
    
    const firstBtn = document.getElementById('paginationFirst');
    const prevBtn = document.getElementById('paginationPrev');
    const nextBtn = document.getElementById('paginationNext');
    const lastBtn = document.getElementById('paginationLast');
    
    firstBtn.disabled = currentPage === 1;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    lastBtn.disabled = currentPage === totalPages;
    
    firstBtn.classList.toggle('disabled', currentPage === 1);
    prevBtn.classList.toggle('disabled', currentPage === 1);
    nextBtn.classList.toggle('disabled', currentPage === totalPages);
    lastBtn.classList.toggle('disabled', currentPage === totalPages);
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
