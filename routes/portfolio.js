const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/assets', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.meme_id, m.name, m.icon, m.image_url, p.quantity, p.avg_price, m.price as current_price
      FROM portfolio p
      JOIN memes m ON p.meme_id = m.id
      WHERE p.user_id = $1
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Portfolio assets error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.created_at as date, t.type, m.name as asset, t.quantity, t.price
      FROM transactions t
      JOIN memes m ON t.meme_id = m.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Portfolio history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
