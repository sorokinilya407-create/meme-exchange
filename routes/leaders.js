const express = require('express');
const db = require('../db/pool');
const router = express.Router();

router.get('/capital', async (req, res) => {
  const result = await db.query(`
    SELECT u.username, u.balance, COALESCE(c.name, 'Без клана') as clan
    FROM users u
    LEFT JOIN clans c ON u.clan_id = c.id
    ORDER BY u.balance DESC
    LIMIT 20
  `);
  res.json(result.rows);
});

router.get('/traders', async (req, res) => {
  const result = await db.query(`
    SELECT u.username, COALESCE(c.name, 'Без клана') as clan, COUNT(t.id) as trades_count, SUM(t.total) as volume
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN clans c ON u.clan_id = c.id
    WHERE t.created_at > NOW() - INTERVAL '7 days'
    GROUP BY u.id, c.name
    ORDER BY trades_count DESC
    LIMIT 20
  `);
  res.json(result.rows);
});

router.get('/clans', async (req, res) => {
  const result = await db.query('SELECT name, members_count, capital, wins FROM clans ORDER BY wins DESC, capital DESC LIMIT 20');
  res.json(result.rows);
});

module.exports = router;