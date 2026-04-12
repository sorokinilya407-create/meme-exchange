const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { updateMemePrice } = require('./memes');
const router = express.Router();

router.post('/buy', auth, async (req, res) => {
  const { memeId, quantity } = req.body;
  
  if (!memeId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Неверные данные' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Получаем мем с блокировкой
    const meme = await client.query(
      'SELECT id, price, name, icon FROM memes WHERE id = $1 AND is_active = true FOR UPDATE',
      [memeId]
    );
    if (!meme.rows.length) throw new Error('Мем не найден');
    
    const price = parseFloat(meme.rows[0].price);
    const total = price * quantity;
    
    // Проверяем баланс пользователя
    const user = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [req.userId]
    );
    if (user.rows[0].balance < total) {
      throw new Error('Недостаточно MC');
    }
    
    // Списываем баланс
    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [total, req.userId]
    );
    
    // Обновляем портфель
    const existing = await client.query(
      'SELECT quantity, avg_price FROM portfolio WHERE user_id = $1 AND meme_id = $2',
      [req.userId, memeId]
    );
    
    if (existing.rows.length) {
      const oldQ = parseFloat(existing.rows[0].quantity);
      const oldAvg = parseFloat(existing.rows[0].avg_price);
      const newQ = oldQ + quantity;
      const newAvg = (oldAvg * oldQ + price * quantity) / newQ;
      
      await client.query(
        'UPDATE portfolio SET quantity = $1, avg_price = $2 WHERE user_id = $3 AND meme_id = $4',
        [newQ, newAvg, req.userId, memeId]
      );
    } else {
      await client.query(
        'INSERT INTO portfolio (user_id, meme_id, quantity, avg_price) VALUES ($1, $2, $3, $4)',
        [req.userId, memeId, quantity, price]
      );
    }
    
    // Записываем транзакцию
    await client.query(
      'INSERT INTO transactions (user_id, meme_id, type, quantity, price, total) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.userId, memeId, 'buy', quantity, price, total]
    );
    
    // Обновляем цену мема (динамика!)
    const newPrice = await updateMemePrice(client, memeId, 'buy', quantity, price);
    
    // Квест "первая покупка"
    const firstBuyQuest = await client.query(
      `SELECT q.id FROM quests q 
       LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $1 
       WHERE q.action_type = $2 AND (uq.completed IS NULL OR uq.completed = false)`,
      [req.userId, 'first_buy']
    );
    
    if (firstBuyQuest.rows.length) {
      await client.query(
        'INSERT INTO user_quests (user_id, quest_id, completed, completed_at) VALUES ($1, $2, true, NOW()) ON CONFLICT DO NOTHING',
        [req.userId, firstBuyQuest.rows[0].id]
      );
      const reward = await client.query(
        'SELECT reward_mc FROM quests WHERE id = $1',
        [firstBuyQuest.rows[0].id]
      );
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [reward.rows[0].reward_mc, req.userId]
      );
    }
    
    // Обновляем счёт клана в войне (если есть активная война)
    await updateClanWarScore(client, req.userId, quantity);
    
    await client.query('COMMIT');
    
    const newBalance = user.rows[0].balance - total;
    
    res.json({ 
      success: true, 
      newBalance: parseFloat(newBalance),
      newPrice: parseFloat(newPrice.toFixed(2))
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Buy error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/sell', auth, async (req, res) => {
  const { memeId, quantity } = req.body;
  
  if (!memeId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Неверные данные' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Получаем мем с блокировкой
    const meme = await client.query(
      'SELECT id, price, name FROM memes WHERE id = $1 AND is_active = true FOR UPDATE',
      [memeId]
    );
    if (!meme.rows.length) throw new Error('Мем не найден');
    
    const price = parseFloat(meme.rows[0].price);
    const total = price * quantity;
    
    // Проверяем портфель
    const portfolioItem = await client.query(
      'SELECT quantity FROM portfolio WHERE user_id = $1 AND meme_id = $2 FOR UPDATE',
      [req.userId, memeId]
    );
    
    if (!portfolioItem.rows.length || portfolioItem.rows[0].quantity < quantity) {
      throw new Error('Недостаточно мемов в портфеле');
    }
    
    // Уменьшаем количество в портфеле
    await client.query(
      'UPDATE portfolio SET quantity = quantity - $1 WHERE user_id = $2 AND meme_id = $3',
      [quantity, req.userId, memeId]
    );
    
    // Удаляем запись если количество = 0
    await client.query(
      'DELETE FROM portfolio WHERE quantity <= 0 AND user_id = $1 AND meme_id = $2',
      [req.userId, memeId]
    );
    
    // Начисляем баланс
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [total, req.userId]
    );
    
    // Записываем транзакцию
    await client.query(
      'INSERT INTO transactions (user_id, meme_id, type, quantity, price, total) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.userId, memeId, 'sell', quantity, price, total]
    );
    
    // Обновляем цену мема (динамика!)
    const newPrice = await updateMemePrice(client, memeId, 'sell', quantity, price);
    
    // Обновляем счёт клана в войне
    await updateClanWarScore(client, req.userId, quantity);
    
    await client.query('COMMIT');
    
    const newBalance = (await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [req.userId]
    )).rows[0].balance;
    
    res.json({ 
      success: true, 
      newBalance: parseFloat(newBalance),
      newPrice: parseFloat(newPrice.toFixed(2))
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sell error:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Вспомогательная функция для обновления счёта клана в войне
async function updateClanWarScore(client, userId, tradeQuantity) {
  try {
    // Получаем клан пользователя
    const userClan = await client.query(
      'SELECT clan_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userClan.rows[0].clan_id) return;
    
    const clanId = userClan.rows[0].clan_id;
    
    // Ищем активную войну с участием этого клана
    const war = await client.query(
      `SELECT id, clan1_id, clan2_id FROM clan_wars 
       WHERE status = 'active' 
       AND (clan1_id = $1 OR clan2_id = $1)
       FOR UPDATE`,
      [clanId]
    );
    
    if (!war.rows.length) return;
    
    const w = war.rows[0];
    
    // Начисляем очки (1 сделка = 1 очко × количество)
    const pointsToAdd = Math.floor(tradeQuantity);
    
    if (w.clan1_id === clanId) {
      await client.query(
        'UPDATE clan_wars SET clan1_score = clan1_score + $1 WHERE id = $2',
        [pointsToAdd, w.id]
      );
    } else {
      await client.query(
        'UPDATE clan_wars SET clan2_score = clan2_score + $1 WHERE id = $2',
        [pointsToAdd, w.id]
      );
    }
  } catch (err) {
    console.error('Update clan war score error:', err);
    // Не прерываем основную транзакцию
  }
}

module.exports = router;