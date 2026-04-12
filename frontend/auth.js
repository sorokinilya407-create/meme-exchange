document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch('https://meme-exchange-backend.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Успешный вход!', true);
            window.location.href = '/index.html';
        } else {
            showToast(data.error, false);
        }
    } catch (err) {
        showToast('Ошибка соединения', false);
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    try {
        const res = await fetch('https://meme-exchange-backend.onrender.com/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Регистрация успешна!', true);
            window.location.href = '/index.html';
        } else {
            showToast(data.error, false);
        }
    } catch (err) {
        showToast('Ошибка соединения', false);
    }
});


