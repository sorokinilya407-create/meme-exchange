const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();

// Загрузка аватарок
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.userId}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// Получить свой профиль
router.get('/', auth, async (req, res) => {
    try {
        const user = await db.query(
            `SELECT id, username, email, balance, level, exp, bio, avatar_url, created_at,
                    (SELECT COUNT(*) FROM transactions WHERE user_id = $1) as trades_count,
                    (SELECT COALESCE(SUM(total),0) FROM transactions WHERE user_id = $1 AND type='buy') as total_bought,
                    (SELECT COALESCE(SUM(total),0) FROM transactions WHERE user_id = $1 AND type='sell') as total_sold
             FROM users WHERE id = $1`,
            [req.userId]
        );
        res.json(user.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить профиль (bio, аватар)
router.post('/update', auth, upload.single('avatar'), async (req, res) => {
    const { bio } = req.body;
    try {
        let avatarUrl;
        if (req.file) {
            avatarUrl = '/uploads/avatars/' + req.file.filename;
            await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.userId]);
        }
        if (bio !== undefined) {
            await db.query('UPDATE users SET bio = $1 WHERE id = $2', [bio, req.userId]);
        }
        res.json({ success: true, avatar_url: avatarUrl });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;