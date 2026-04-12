let currentUser = null;

function showToast(msg, success = true) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = success ? '#00FF88' : '#FF3366';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function apiRequest(url, method = 'GET', body = null) {
    const fullUrl = url.startsWith('/api') ? 'https://meme-exchange-backend.onrender.com' + url : url;
    const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(fullUrl, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Îøèáêà');
    return data;
} };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(fullUrl, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Îøèáêà');
    return data;
}
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

async function loadBalance() {
    try {
        const data = await apiRequest('/api/user/balance');
        document.querySelectorAll('.balance').forEach(el => {
            el.innerHTML = `<i class="fas fa-coins"></i> ${data.balance.toLocaleString()} MC`;
        });
        return data.balance;
    } catch (e) {
        return null;
    }
}

async function checkAuth() {
    try {
        const user = await apiRequest('/api/user/profile');
        currentUser = user;
        loadBalance();
        return user;
    } catch (e) {
        window.location.href = '/login.html';
        return null;
    }
}


