const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/pool');
const { sendVerificationCode } = require('../services/email');
const router = express.Router();

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Регистрация
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existing = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existing.rows.length) return res.status(400).json({ error: 'Пользователь уже существует' });

        const hashed = await bcrypt.hash(password, 12);
        const verificationCode = generateCode();
        const codeExpires = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            `INSERT INTO users (username, email, password_hash, balance, is_verified, verification_code, code_expires_at)
             VALUES ($1, $2, $3, 10000, false, $4, $5)`,
            [username, email, hashed, verificationCode, codeExpires]
        );

        await sendVerificationCode(email, verificationCode);
        res.json({ success: true, message: 'Код отправлен на email', email });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Подтверждение email
router.post('/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await db.query(
            `SELECT id, username, balance FROM users WHERE email = $1 AND verification_code = $2 AND code_expires_at > NOW() AND is_verified = false`,
            [email, code]
        );
        if (!user.rows.length) return res.status(400).json({ error: 'Неверный или истёкший код' });

        await db.query(`UPDATE users SET is_verified = true, verification_code = NULL, code_expires_at = NULL WHERE id = $1`, [user.rows[0].id]);

        const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });
        res.json({ success: true, username: user.rows[0].username, balance: user.rows[0].balance });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Повторная отправка кода
router.post('/resend-code', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await db.query('SELECT id FROM users WHERE email = $1 AND is_verified = false', [email]);
        if (!user.rows.length) return res.status(400).json({ error: 'Пользователь не найден или уже подтверждён' });

        const verificationCode = generateCode();
        const codeExpires = new Date(Date.now() + 10 * 60 * 1000);
        await db.query(`UPDATE users SET verification_code = $1, code_expires_at = $2 WHERE email = $3`, [verificationCode, codeExpires, email]);
        await sendVerificationCode(email, verificationCode);
        res.json({ success: true, message: 'Новый код отправлен' });
    } catch (err) {
        console.error('Resend error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.query('SELECT id, username, password_hash, balance, is_verified FROM users WHERE email = $1', [email]);
        if (!user.rows.length) return res.status(401).json({ error: 'Неверный email или пароль' });
        if (!user.rows[0].is_verified) return res.status(403).json({ error: 'Email не подтверждён. Проверьте почту.' });

        const valid = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

        const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });
        res.json({ success: true, username: user.rows[0].username, balance: user.rows[0].balance });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

module.exports = router;
