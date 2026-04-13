const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const router = express.Router();

// Регистрация (без подтверждения email)
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existing.rows.length) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        const hashed = await bcrypt.hash(password, 12);
        
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, balance, is_verified) 
             VALUES ($1, $2, $3, 10000, true) RETURNING id`,
            [username, email, hashed]
        );
        
        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });
        
        res.json({ success: true, username, balance: 10000 });
        
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await db.query(
            'SELECT id, username, password_hash, balance FROM users WHERE email = $1',
            [email]
        );
        
        if (!user.rows.length) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const valid = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });
        
        res.json({ success: true, username: user.rows[0].username, balance: user.rows[0].balance });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});
res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });

module.exports = router;
