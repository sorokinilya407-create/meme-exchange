const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  const clans = await db.query('SELECT id, name, avatar, members_count, capital, wins FROM clans ORDER BY wins DESC, capital DESC');
  res.json(clans.rows);
});

router.post('/join', auth, async (req, res) => {
  const { clanId } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET clan_id = $1 WHERE id = $2', [clanId, req.userId]);
    await client.query('UPDATE clans SET members_count = members_count + 1 WHERE id = $1', [clanId]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/war', async (req, res) => {
  const war = await db.query('SELECT * FROM clan_wars WHERE status = $1 ORDER BY id DESC LIMIT 1', ['active']);
  if (!war.rows.length) return res.json({ active: false });
  const clan1 = await db.query('SELECT name, avatar FROM clans WHERE id = $1', [war.rows[0].clan1_id]);
  const clan2 = await db.query('SELECT name, avatar FROM clans WHERE id = $1', [war.rows[0].clan2_id]);
  res.json({ active: true, clan1: clan1.rows[0], clan2: clan2.rows[0], clan1_score: war.rows[0].clan1_score, clan2_score: war.rows[0].clan2_score, ends_at: war.rows[0].ends_at });
});

module.exports = router;