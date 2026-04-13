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
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Статика
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
app.use('/api/profile', require('./routes/profile')); // новый роут

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// WebSocket
require('./websocket/livePrices')(io);

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
