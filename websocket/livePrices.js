const db = require('../db/pool');

module.exports = (io) => {
  io.on('connection', async (socket) => {
    console.log('🔌 Client connected to WebSocket');
    
    try {
      const result = await db.query(
        'SELECT id, CAST(price AS FLOAT) as price FROM memes WHERE is_active = true'
      );
      socket.emit('priceUpdate', result.rows);
    } catch (err) {
      console.error('WebSocket initial price error:', err);
    }
    
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected');
    });
  });
  
  setInterval(async () => {
    try {
      const result = await db.query(
        'SELECT id, CAST(price AS FLOAT) as price, change_24h FROM memes WHERE is_active = true'
      );
      io.emit('priceUpdate', result.rows);
    } catch (err) {
      console.error('WebSocket price update error:', err.message);
    }
  }, 5000);
};
