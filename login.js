function getIndexPath() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/permintaan/') || currentPath.includes('/backdate/')) {
        return '../index.html';
    }
    return 'index.html';
}

document.addEventListener('DOMContentLoaded', function() {
    if (isAuthenticated()) {
        window.location.href = getIndexPath();
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const togglePassword = document.getElementById('togglePassword');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.classList.toggle('active');
        
        const eyeIcon = togglePassword.querySelector('.eye-icon');
        if (type === 'text') {
            eyeIcon.textContent = '🙈';
            togglePassword.setAttribute('title', 'Sembunyikan password');
        } else {
            eyeIcon.textContent = '👁️';
            togglePassword.setAttribute('title', 'Tampilkan password');
        }
    });

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const password = passwordInput.value.trim();
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';

        if (password === PASSWORD) {
            setSession();
            window.location.href = getIndexPath();
        } else {
            errorMessage.textContent = 'Password salah. Silakan coba lagi.';
            errorMessage.classList.add('show');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});
