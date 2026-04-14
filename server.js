require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.CLIENT_URL || 'https://meme-exchange-frontend.onrender.com', 
    credentials: true 
  }
});

// Безопасность
app.use(helmet({ contentSecurityPolicy: false }));

// CORS с поддержкой credentials (ВАЖНО ДЛЯ КУК)
app.use(cors({ 
    origin: process.env.CLIENT_URL || 'https://meme-exchange-frontend.onrender.com', 
    credentials: true 
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Статика для загруженных изображений
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/memes', require('./routes/memes'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/clans', require('./routes/clans'));
app.use('/api/leaders', require('./routes/leaders'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/quests', require('./routes/quests'));
app.use('/api/profile', require('./routes/profile'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 для API
app.use('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

// Отдача фронтенда (если нужна)
app.use(express.static(path.join(__dirname, 'frontend')));

// Все остальные запросы — на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// WebSocket
require('./websocket/livePrices')(io);

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
