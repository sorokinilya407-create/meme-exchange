require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.CLIENT_URL || 'http://localhost:3000', 
    credentials: true 
  }
});

// ========== Безопасность (CSP ОТКЛЮЧЕН ДЛЯ ТЕСТОВ) ==========
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({ 
  origin: process.env.CLIENT_URL || 'http://localhost:3000', 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ========== Rate limiting (ОТКЛЮЧЕНО ДЛЯ ТЕСТИРОВАНИЯ) ==========
// ВКЛЮЧИТЬ ПЕРЕД ПРОДАКШЕНОМ!
/*
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 200,
  message: { error: 'Слишком много запросов, подождите' }
});
app.use('/api/', limiter);
*/

// ========== Статика (фронтенд) ==========

// app.use(express.static(path.join(__dirname, '../frontend')));

// ========== Раздача загруженных изображений ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== API маршруты ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/memes', require('./routes/memes'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/clans', require('./routes/clans'));
app.use('/api/leaders', require('./routes/leaders'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/quests', require('./routes/quests'));

// ========== Health check ==========
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== 404 Handler ==========
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ========== WebSocket ==========
require('./websocket/livePrices')(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Frontend: ${path.join(__dirname, '../frontend')}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET!'}`);
  console.log(`⚠️  Rate limiting: DISABLED (для тестирования)`);
  console.log(`⚠️  CSP: DISABLED (для тестирования)`);
});
