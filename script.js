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

    const backdateCard = document.getElementById('backdateCard');
    const backdatePopup = document.getElementById('backdatePopup');
    const backdateCloseBtn = document.querySelector('.backdate-close-btn');
    const googleFormLink = document.getElementById('googleFormLink');

    const GOOGLE_FORM_URL = 'https://forms.gle/ActGYFQTv7WxVCMv6';
    
    if (googleFormLink) {
        googleFormLink.href = GOOGLE_FORM_URL;
    }

    if (backdateCard) {
        backdateCard.addEventListener('click', function(e) {
            e.preventDefault();
            if (backdatePopup) {
                backdatePopup.classList.add('show');
            }
        });
    }

    if (backdateCloseBtn) {
        backdateCloseBtn.addEventListener('click', function() {
            if (backdatePopup) {
                backdatePopup.classList.remove('show');
            }
        });
    }

    if (backdatePopup) {
        backdatePopup.addEventListener('click', function(e) {
            if (e.target === backdatePopup) {
                backdatePopup.classList.remove('show');
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && backdatePopup && backdatePopup.classList.contains('show')) {
            backdatePopup.classList.remove('show');
        }
    });
});
