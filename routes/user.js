const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/profile', auth, async (req, res) => {
  const user = await db.query('SELECT id, username, email, balance, level, exp, clan_id, clan_role FROM users WHERE id = $1', [req.userId]);
  if (!user.rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(user.rows[0]);
});

router.get('/balance', auth, async (req, res) => {
  const user = await db.query('SELECT balance FROM users WHERE id = $1', [req.userId]);
  res.json({ balance: parseFloat(user.rows[0].balance) });
});

module.exports = router;