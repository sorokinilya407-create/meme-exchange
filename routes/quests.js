const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const quests = await db.query(`
    SELECT q.id, q.name, q.description, q.reward_mc, COALESCE(uq.completed, false) as completed
    FROM quests q
    LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $1
  `, [req.userId]);
  res.json(quests.rows);
});

router.post('/complete', auth, async (req, res) => {
  const { questId } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const quest = await client.query('SELECT reward_mc FROM quests WHERE id = $1', [questId]);
    if (!quest.rows.length) throw new Error('Quest not found');
    const already = await client.query('SELECT completed FROM user_quests WHERE user_id = $1 AND quest_id = $2', [req.userId, questId]);
    if (already.rows.length && already.rows[0].completed) throw new Error('Already completed');
    await client.query('INSERT INTO user_quests (user_id, quest_id, completed, completed_at) VALUES ($1, $2, true, NOW()) ON CONFLICT DO UPDATE SET completed = true, completed_at = NOW()', [req.userId, questId]);
    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [quest.rows[0].reward_mc, req.userId]);
    await client.query('COMMIT');
    res.json({ success: true, reward: quest.rows[0].reward_mc });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;