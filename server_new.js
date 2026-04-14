require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

// Подключение к базе данных
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Настройки CORS (ВАЖНО ДЛЯ КУК)
app.use(cors({
    origin: 'https://meme-exchange-frontend.onrender.com',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// РЕГИСТРАЦИЯ
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, balance) VALUES ($1, $2, $3, 10000) RETURNING id, username',
            [username, email, hashed]
        );
        const token = jwt.sign({ userId: result.rows[0].id }, 'SECRET_KEY');
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax' });
        res.json({ success: true, username: result.rows[0].username, balance: 10000 });
    } catch (err) {
        res.status(400).json({ error: 'Ошибка регистрации' });
    }
});

// ЛОГИН (С КУКОЙ)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT id, username, password_hash, balance FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        const token = jwt.sign({ userId: user.id }, 'SECRET_KEY');
        // КУКА ОТПРАВЛЯЕТСЯ ЗДЕСЬ
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax' });
        res.json({ success: true, username: user.username, balance: user.balance });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ПРОВЕРКА ПРОФИЛЯ
app.get('/api/user/profile', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    try {
        const { userId } = jwt.verify(token, 'SECRET_KEY');
        const result = await pool.query('SELECT id, username, balance FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Пользователь не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(401).json({ error: 'Неверный токен' });
    }
});

app.get('/api/user/balance', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    try {
        const { userId } = jwt.verify(token, 'SECRET_KEY');
        const result = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
        res.json({ balance: result.rows[0].balance });
    } catch (err) {
        res.status(401).json({ error: 'Неверный токен' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ Сервер на ${PORT}`));
