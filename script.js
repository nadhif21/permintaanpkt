document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) {
        return;
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                logout();
            }
        });
    }
});
