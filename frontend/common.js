const API_BASE = 'https://meme-exchange-backend.onrender.com';

async function apiRequest(url, method = 'GET', body = null) {
    const fullUrl = url.startsWith('/api') ? API_BASE + url : url;
    const opts = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(fullUrl, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

async function checkAuth() {
    try {
        await apiRequest('/api/user/profile');
        return true;
    } catch (e) {
        window.location.href = '/login.html';
        return false;
    }
}
