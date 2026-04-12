const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Абсолютный путь к папке uploads/memes
        const uploadDir = path.join(__dirname, '..', 'uploads', 'memes');
        
        console.log('📁 Проверяю папку:', uploadDir);
        
        // Создаём папку, если её нет
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('✅ Папка создана:', uploadDir);
            } catch (err) {
                console.error('❌ Ошибка создания папки:', err.message);
                return cb(err, null);
            }
        } else {
            console.log('✅ Папка существует:', uploadDir);
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        console.log('📸 Сохраняю файл:', uniqueName);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения!'));
        }
    }
});

// GET /api/memes — все активные мемы
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, icon, 
                   CAST(price AS FLOAT) as price, 
                   CAST(change_24h AS FLOAT) as change_24h,
                   volume_24h, image_url
            FROM memes 
            WHERE is_active = true
            ORDER BY volume_24h DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /memes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/memes/create — создать мем (500 MC)
router.post('/create', auth, upload.single('image'), async (req, res) => {
    const { name, icon } = req.body;
    
    console.log('🆕 Создание мема:', { name, icon, hasFile: !!req.file });
    
    if (!name) {
        return res.status(400).json({ error: 'Название обязательно' });
    }
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Проверка баланса
        const user = await client.query(
            'SELECT balance FROM users WHERE id = $1 FOR UPDATE', 
            [req.userId]
        );
        
        if (user.rows[0].balance < 500) {
            throw new Error('Недостаточно MC (нужно 500)');
        }
        
        // Списываем 500 MC
        await client.query(
            'UPDATE users SET balance = balance - 500 WHERE id = $1',
            [req.userId]
        );
        
        // Начальная цена
        const initialPrice = 30 + Math.random() * 120;
        
        // URL загруженной картинки (если есть)
        let imageUrl = null;
        if (req.file) {
            imageUrl = '/uploads/memes/' + req.file.filename;
            console.log('🖼️ Картинка сохранена:', imageUrl);
        }
        
        // Иконка по умолчанию
        const memeIcon = icon || '🖼️';
        
        // Создаём мем
        const newMeme = await client.query(
            `INSERT INTO memes (name, icon, price, creator_id, change_24h, volume_24h, image_url) 
             VALUES ($1, $2, $3, $4, 0, 0, $5) RETURNING id`,
            [name, memeIcon, initialPrice.toFixed(2), req.userId, imageUrl]
        );
        
        await client.query('COMMIT');
        
        console.log('✅ Мем создан, ID:', newMeme.rows[0].id);
        
        res.json({ 
            success: true, 
            memeId: newMeme.rows[0].id,
            price: initialPrice.toFixed(2),
            imageUrl: imageUrl
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Create meme error:', err);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Функция обновления цены (для trades.js)
async function updateMemePrice(client, memeId, tradeType, quantity, currentPrice) {
    const VOLATILITY = 0.05;
    const impact = (quantity / 10) * VOLATILITY;
    let priceChange = tradeType === 'buy' ? currentPrice * impact : -currentPrice * impact;
    let newPrice = currentPrice + priceChange;
    if (newPrice < 1) newPrice = 1;
    
    await client.query(
        `UPDATE memes 
         SET price = $1, 
             change_24h = change_24h + $2,
             volume_24h = volume_24h + $3
         WHERE id = $4`,
        [newPrice.toFixed(4), priceChange.toFixed(4), quantity * currentPrice, memeId]
    );
    
    return newPrice;
}

module.exports = router;
module.exports.updateMemePrice = updateMemePrice;