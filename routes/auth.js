const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, referrer } = req.body;
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashed]
    );
    const userId = result.rows[0].id;

    // Referral bonus
    if (referrer) {
      const refUser = await db.query('SELECT id FROM users WHERE username = $1', [referrer]);
      if (refUser.rows.length) {
        await db.query('UPDATE users SET balance = balance + 500 WHERE id = $1', [refUser.rows[0].id]);
      }
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });
    res.json({ success: true, token, username, balance: 1000 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('🔐 Попытка входа:', email, password);
  
  try {
    const user = await db.query(
      'SELECT id, username, password_hash, balance FROM users WHERE email = $1', 
      [email]
    );
    
    console.log('👤 Найден пользователь:', user.rows[0]);
    
    if (!user.rows.length) {
      console.log('❌ Пользователь не найден');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // ВРЕМЕННО: сравниваем пароль напрямую, без bcrypt
    if (password !== user.rows[0].password_hash) {
      console.log('❌ Пароль не совпадает. Введено:', password, 'В базе:', user.rows[0].password_hash);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ Вход успешен!');
    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' });
    res.json({ success: true, token, username: user.rows[0].username, balance: user.rows[0].balance });
  } catch (err) {
    console.error('💥 Ошибка сервера:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});
//лол
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await db.query(
      'SELECT id, username, password_hash, balance FROM users WHERE email = $1',
      [email]
    );
    
    if (!user.rows.length) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    
    console.log('🔍 Сравниваем:');
    console.log('  Введённый пароль:', password);
    console.log('  Хеш из базы:', user.rows[0].password_hash);
    console.log('  Длина хеша:', user.rows[0].password_hash.length);
    
    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    console.log('  Результат bcrypt.compare():', valid);
    
    if (!valid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }
    
    // ... остальной код
  } catch (err) {
    // ...
  }
});

module.exports = router;