require('dotenv').config({ path: '../.env' });
const db = require('../db/pool');

async function resetDailyChanges() {
  try {
    await db.query('UPDATE memes SET change_24h = 0');
    console.log('✅ Daily changes reset at', new Date().toISOString());
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset daily changes error:', err);
    process.exit(1);
  }
}

resetDailyChanges();