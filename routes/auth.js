const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const router = express.Router();

// ВРЕМЕННО БЕЗ BCRYPT И С ЛОГАМИ

router.post('/register', async (req, res) => {
    console.log('📝 REGISTER BODY:', req.body);
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        console.log('❌ Отсутствуют поля');
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        console.log('🔍 Проверка существующего:', existing.rowCount);

        if (existing.rows.length) {
            console.log('❌ Пользователь уже существует');
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        const result = await db.query(
            'INSERT INTO users (username, email, password_hash, balance) VALUES ($1, $2, $3, 10000) RETURNING id',
            [username, email, password] // пароль в открытом виде (для теста)
        );
        console.log('✅ Пользователь создан, id:', result.rows[0].id);

        const token = jwt.sign(
            { userId: result.rows[0].id },
            process.env.JWT_SECRET || 'frog5678321_super_secret',
            { expiresIn: '7d' }
        );
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });

        res.json({ success: true, username, balance: 10000 });
    } catch (err) {
        console.error('💥 REGISTER ERROR:', err);
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

router.post('/login', async (req, res) => {
    console.log('🔐 LOGIN BODY:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('❌ Отсутствуют поля');
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
        const user = await db.query(
            'SELECT id, username, password_hash, balance FROM users WHERE email = $1',
            [email]
        );
        console.log('🔍 Пользователь найден:', user.rowCount);

        if (!user.rows.length) {
            console.log('❌ Пользователь не найден');
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Прямое сравнение (без bcrypt)
        if (password !== user.rows[0].password_hash) {
            console.log('❌ Пароль не совпадает. Введено:', password, 'В базе:', user.rows[0].password_hash);
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { userId: user.rows[0].id },
            process.env.JWT_SECRET || 'frog5678321_super_secret',
            { expiresIn: '7d' }
        );
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });

        console.log('✅ Вход выполнен');
        res.json({ success: true, username: user.rows[0].username, balance: user.rows[0].balance });
    } catch (err) {
        console.error('💥 LOGIN ERROR:', err);
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

module.exports = router;
